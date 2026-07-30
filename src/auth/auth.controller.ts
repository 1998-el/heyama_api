import { Controller, Get, Post, Body, UseGuards, Req, Res, Patch, BadRequestException, Query, Redirect, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OAuthGoogleDto } from './dto/oauth-google.dto';
import { OAuthFacebookDto } from './dto/oauth-facebook.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Response, Request } from 'express';
import type { UserEntity } from '../users/schemas/user.schema';
import * as crypto from 'crypto';

const ALLOWED_FRONTEND_ORIGINS = (process.env.ALLOWED_FRONTEND_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('oauth/google/redirect')
  @Redirect(undefined, 302)
  googleRedirect(@Query('frontend_url') frontendUrl?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/oauth/google/callback';

    const safeFrontendUrl = this.validateFrontendUrl(frontendUrl);
    const state = this.signState({ frontend_url: safeFrontendUrl, nonce: crypto.randomBytes(16).toString('hex') });

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
    });

    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  }

  @Get('oauth/facebook/redirect')
  @Redirect(undefined, 302)
  facebookRedirect(@Query('frontend_url') frontendUrl?: string) {
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5000/api/auth/oauth/facebook/callback';

    const safeFrontendUrl = this.validateFrontendUrl(frontendUrl);
    const state = this.signState({ frontend_url: safeFrontendUrl, nonce: crypto.randomBytes(16).toString('hex') });

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    });

    return { url: `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}` };
  }

  @Get('oauth/google/callback')
  @Redirect()
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const frontendUrl = this.readStateOrFallback(state);

    if (!code) {
      return { url: `${frontendUrl}/auth/error?message=${encodeURIComponent('Authorization code is required')}` };
    }

    try {
      const profile = await this.fetchGoogleProfile(code);
      const user = await this.authService.validateUserFromOAuth({
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        provider: 'google',
        providerId: profile.sub,
      });

      const tokens = await this.authService.login((user as any)._id.toString());
      res.cookie(REFRESH_COOKIE_NAME, tokens.refresh_token, REFRESH_COOKIE_OPTIONS);

      return {
        url: `${frontendUrl}/auth/callback?token=${tokens.access_token}&expires_in=${tokens.expires_in}`,
      };
    } catch (err) {
      console.error('Google OAuth callback failed:', (err as Error).message);
      return { url: `${frontendUrl}/auth/error?message=${encodeURIComponent('Authentication failed')}` };
    }
  }

  @Get('oauth/facebook/callback')
  @Redirect()
  async facebookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const frontendUrl = this.readStateOrFallback(state);

    if (!code) {
      return { url: `${frontendUrl}/auth/error?message=${encodeURIComponent('Authorization code is required')}` };
    }

    try {
      const profile = await this.fetchFacebookProfile(code);
      const user = await this.authService.validateUserFromOAuth({
        email: profile.email,
        name: profile.name,
        picture: profile.picture.data.url,
        provider: 'facebook',
        providerId: profile.id,
      });

      const tokens = await this.authService.login((user as any)._id.toString());
      res.cookie(REFRESH_COOKIE_NAME, tokens.refresh_token, REFRESH_COOKIE_OPTIONS);

      return {
        url: `${frontendUrl}/auth/callback?token=${tokens.access_token}&expires_in=${tokens.expires_in}`,
      };
    } catch (err) {
      console.error('Facebook OAuth callback failed:', (err as Error).message);
      return { url: `${frontendUrl}/auth/error?message=${encodeURIComponent('Authentication failed')}` };
    }
  }

  @Post('oauth/google')
  async google(@Body() dto: OAuthGoogleDto, @Res({ passthrough: true }) res: Response) {
    if (!dto.code) {
      throw new BadRequestException('Authorization code is required');
    }
    const profile = await this.fetchGoogleProfile(dto.code);
    const user = await this.authService.validateUserFromOAuth({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      provider: 'google',
      providerId: profile.sub,
    });

    const tokens = await this.authService.login((user as any)._id.toString());
    res.cookie(REFRESH_COOKIE_NAME, tokens.refresh_token, REFRESH_COOKIE_OPTIONS);

    return { user, access_token: tokens.access_token, expires_in: tokens.expires_in };
  }

  @Post('oauth/facebook')
  async facebook(@Body() dto: OAuthFacebookDto, @Res({ passthrough: true }) res: Response) {
    if (!dto.code) {
      throw new BadRequestException('Authorization code is required');
    }
    const profile = await this.fetchFacebookProfile(dto.code);
    const user = await this.authService.validateUserFromOAuth({
      email: profile.email,
      name: profile.name,
      picture: profile.picture.data.url,
      provider: 'facebook',
      providerId: profile.id,
    });

    const tokens = await this.authService.login((user as any)._id.toString());
    res.cookie(REFRESH_COOKIE_NAME, tokens.refresh_token, REFRESH_COOKIE_OPTIONS);

    return { user, access_token: tokens.access_token, expires_in: tokens.expires_in };
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async session(@CurrentUser() user: UserEntity) {
    return { user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const tokens = await this.authService.refresh(refreshToken);
    res.cookie(REFRESH_COOKIE_NAME, tokens.refresh_token, REFRESH_COOKIE_OPTIONS);

    return { access_token: tokens.access_token, expires_in: tokens.expires_in };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: UserEntity, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout((user as any)._id.toString());
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/complete-profile')
  async completeProfile(@CurrentUser() user: UserEntity, @Body() dto: CompleteProfileDto) {
    await this.authService.usersService.update((user as any)._id.toString(), {
      ...dto,
      isProfileComplete: true,
    });

    await this.authService.promoteToAuthor((user as any)._id.toString(), {
      name: user.name,
      bio: dto.bio || user.bio || '',
      avatar: user.avatar,
    });

    const updated = await this.authService.usersService.findById((user as any)._id.toString());
    return { user: updated };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/become-author')
  async becomeAuthor(@CurrentUser() user: UserEntity) {
    const result = await this.authService.promoteToAuthor((user as any)._id.toString(), {
      name: user.name,
      bio: user.bio || '',
      avatar: user.avatar,
    });

    return result;
  }

  private async fetchGoogleProfile(code: string): Promise<any> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/oauth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in .env');
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      } as any),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      const extra = tokens.error_description ? `: ${tokens.error_description}` : '';
      console.error('Google token exchange failed', tokens);
      throw new Error(`Google OAuth failed${extra}`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      const error = await userRes.json().catch(() => ({}));
      throw new Error(error.error_description || `Google profile fetch failed with status ${userRes.status}`);
    }

    const profile = await userRes.json();
    if (!profile?.id) {
      throw new Error('Invalid Google profile: missing id');
    }

    return {
      sub: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    };
  }

  private async fetchFacebookProfile(code: string): Promise<any> {
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5000/api/auth/oauth/facebook/callback';

    if (!clientId || !clientSecret) {
      throw new Error('FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET must be configured in .env');
    }

    const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}`);

    const tokens = await tokenRes.json();
    if (tokens.error) {
      const extra = tokens.error?.message ? `: ${tokens.error.message}` : '';
      console.error('Facebook token exchange failed', tokens);
      throw new Error(`Facebook OAuth failed${extra}`);
    }

    const userRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${tokens.access_token}`);
    if (!userRes.ok) {
      const error = await userRes.json().catch(() => ({}));
      throw new Error(error.error?.message || `Facebook profile fetch failed with status ${userRes.status}`);
    }
    const profile = await userRes.json();
    return profile;
  }

  private validateFrontendUrl(url?: string): string {
    const fallback = ALLOWED_FRONTEND_ORIGINS[0] || 'http://localhost:3000';
    if (!url) return fallback;
    try {
      const parsed = new URL(url);
      const origin = `${parsed.protocol}//${parsed.host}`;
      if (ALLOWED_FRONTEND_ORIGINS.includes(origin)) {
        return origin;
      }
    } catch {
      // URL invalide
    }
    return fallback;
  }

  private signState(data: Record<string, any>): string {
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
    const secret = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || '';
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  private readStateOrFallback(state?: string): string {
    const fallback = ALLOWED_FRONTEND_ORIGINS[0] || 'http://localhost:3000';
    if (!state) return fallback;

    try {
      const [payload, signature] = state.split('.');
      const secret = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || '';
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');

      if (signature !== expectedSignature) {
        console.warn('OAuth state signature mismatch — possible CSRF attempt');
        return fallback;
      }

      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      return this.validateFrontendUrl(decoded.frontend_url);
    } catch {
      return fallback;
    }
  }
}

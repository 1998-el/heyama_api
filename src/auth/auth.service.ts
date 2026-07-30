import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { AuthorsService } from '../authors/authors.service';
import { RefreshTokenEntity, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { UserRole } from '../users/schemas/user.schema';

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret-change-me';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    public readonly usersService: UsersService,
    private readonly authorsService: AuthorsService,
    @InjectModel(RefreshTokenEntity.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async validateUserFromOAuth(profile: {
    email: string;
    name: string;
    picture: string;
    provider: 'google' | 'facebook';
    providerId: string;
  }) {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      user = await this.usersService.create({
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
        provider: profile.provider,
        providerId: profile.providerId,
      });
    } else {
      user = await this.usersService.update(user._id.toString(), {
        name: profile.name,
        avatar: profile.picture,
        provider: profile.provider,
        providerId: profile.providerId,
        lastActiveAt: new Date(),
      });
    }

    return user;
  }

  async login(userId: string) {
    const payload = { sub: userId };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = crypto.randomBytes(64).toString('hex');
    const expiresIn = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

    const hashedToken = this.hashToken(refresh_token);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      hashedToken,
      expiresAt,
    });

    return { access_token, refresh_token, expires_in: expiresIn };
  }

  async refresh(refreshToken: string) {
    const hashed = this.hashToken(refreshToken);
    const stored = await this.refreshTokenModel
      .findOne({ hashedToken: hashed, expiresAt: { $gt: new Date() } })
      .exec();

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokenModel.deleteOne({ _id: stored._id }).exec();
    return this.login(stored.userId.toString());
  }

  async logout(userId: string) {
    await this.refreshTokenModel.deleteMany({ userId: new Types.ObjectId(userId) }).exec();
  }

  async createAuthor(data: Record<string, any>) {
    return this.authorsService.create(data);
  }

  async promoteToAuthor(userId: string, userData: {
    name: string;
    bio?: string;
    avatar: string;
  }) {
    const existing = await this.usersService.findWithAuthor(userId);
    if (existing?.authorId) {
      return { author: existing.authorId };
    }

    const slug = `${userData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${userId.slice(-4)}`;

    const author = await this.authorsService.create({
      userId: new Types.ObjectId(userId),
      slug,
      name: userData.name,
      title: 'Auteur',
      bio: userData.bio || '',
      avatar: userData.avatar,
      gradient: 'from-blue-500 to-purple-600',
      socialLinks: {},
    });

    await this.usersService.update(userId, {
      role: UserRole.AUTHOR,
      authorId: author._id as any,
      isProfileComplete: true,
    });

    return { author };
  }

  private hashToken(token: string): string {
    return crypto.createHmac('sha256', REFRESH_TOKEN_SECRET).update(token).digest('hex');
  }
}

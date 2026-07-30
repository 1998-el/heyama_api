import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserEntity } from '../users/schemas/user.schema';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('me')
  async myAnalytics(@CurrentUser() user: UserEntity) {
    return this.analyticsService.getAuthorAnalytics((user as any).authorId || (user as any)._id.toString());
  }

  @Get('posts/:slug')
  async postAnalytics(@Param('slug') slug: string) {
    return this.analyticsService.getPostAnalytics(slug);
  }
}
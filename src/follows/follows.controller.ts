import { Controller, Get, Post, Delete, UseGuards, Param, Query, BadRequestException } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserEntity } from '../users/schemas/user.schema';

@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':authorId')
  async follow(@CurrentUser() user: UserEntity, @Param('authorId') authorId: string) {
    const follow = await this.followsService.create((user as any)._id.toString(), authorId);
    return { follow };
  }

  @Delete(':authorId')
  async unfollow(@CurrentUser() user: UserEntity, @Param('authorId') authorId: string) {
    const result = await this.followsService.delete((user as any)._id.toString(), authorId);
    return { success: !!result };
  }

  @Get('status/:authorId')
  async followStatus(@CurrentUser() user: UserEntity, @Param('authorId') authorId: string) {
    const isFollowing = await this.followsService.isFollowing((user as any)._id.toString(), authorId);
    return { isFollowing };
  }

  // GET /follows/status?authorIds=a1,a2,a3,a4
  @Get('status')
  async followStatusBatch(@CurrentUser() user: UserEntity, @Query('authorIds') authorIds?: string) {
    if (!authorIds) {
      throw new BadRequestException('authorIds query param requis (liste séparée par des virgules)');
    }
    const ids = authorIds.split(',').map((id) => id.trim()).filter(Boolean);
    const status = await this.followsService.getFollowingStatusBatch((user as any)._id.toString(), ids);
    return { status };
  }
}
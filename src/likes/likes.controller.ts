import { Controller, Get, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserEntity } from '../users/schemas/user.schema';

@Controller('likes')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Get('me')
  async getMyLikes(@CurrentUser() user: UserEntity) {
    return this.likesService.getMyLikes((user as any)._id.toString());
  }
}

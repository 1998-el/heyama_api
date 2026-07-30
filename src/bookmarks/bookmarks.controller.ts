import { Controller, Get, Post, Delete, UseGuards, Param, Body } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserEntity } from '../users/schemas/user.schema';

@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  async findAll(@CurrentUser() user: UserEntity) {
    return this.bookmarksService.findByUser((user as any)._id.toString());
  }

  @Post(':postId')
  async create(@CurrentUser() user: UserEntity, @Param('postId') postId: string, @Body() body?: { collection?: string; notes?: string }) {
    return this.bookmarksService.create({
      userId: (user as any)._id.toString(),
      postId,
      collection: body?.collection,
      notes: body?.notes,
    });
  }

  @Delete(':postId')
  async remove(@CurrentUser() user: UserEntity, @Param('postId') postId: string) {
    await this.bookmarksService.delete((user as any)._id.toString(), postId);
    return { success: true };
  }
}
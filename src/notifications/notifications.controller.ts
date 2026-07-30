import { Controller, Get, Patch, UseGuards, Param, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserEntity } from '../users/schemas/user.schema';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@CurrentUser() user: UserEntity, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notificationsService.findByUser((user as any)._id.toString(), Number(page) || 1, Number(limit) || 20);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: UserEntity) {
    return this.notificationsService.markAllAsRead((user as any)._id.toString());
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: UserEntity) {
    const count = await this.notificationsService.getUnreadCount((user as any)._id.toString());
    return { count };
  }
}
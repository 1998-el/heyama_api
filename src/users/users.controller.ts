import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserEntity } from './schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: UserEntity) {
    return { user };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    const target = await this.usersService.findById(id);
    return { user: target };
  }
}

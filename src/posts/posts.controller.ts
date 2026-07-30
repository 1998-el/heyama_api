import { Controller, Get, Param, Post, Body, Patch, Delete, UseGuards, Query, ForbiddenException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import type { UserEntity } from '../users/schemas/user.schema';
import { UserRole } from '../users/schemas/user.schema';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('feed')
  async feed(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('author') author?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
  ) {
    const result = await this.postsService.findAll({
      type,
      category,
      tag,
      author,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userId,
    });
    return result;
  }

  // IMPORTANT : cette route doit rester AVANT ':slug', sinon NestJS
  // interprète "me" comme la valeur du paramètre :slug.
  @Get('me/drafts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AUTHOR)
  async myDrafts(@CurrentUser() user: UserEntity) {
    return this.postsService.findByAuthorStatus((user as any).authorId?.toString());
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string, @Query('userId') userId?: string) {
    const result = await this.postsService.findOne(slug, userId);
    return result;
  }

  @Get()
  async findAll(@Query('userId') userId?: string) {
    const result = await this.postsService.findAll({});
    return result;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AUTHOR)
  async create(@CurrentUser() user: UserEntity, @Body() dto: CreatePostDto) {
    const authorId = (user as any).authorId;
    if (!authorId) {
      throw new ForbiddenException('Profil auteur requis pour créer un article');
    }
    const post = await this.postsService.create({
      ...dto,
      authorId: authorId.toString(),
    });
    return { post };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AUTHOR)
  async update(@Param('id') id: string, @CurrentUser() user: UserEntity, @Body() dto: UpdatePostDto) {
    const post = await this.postsService.update(id, dto as any, (user as any).authorId?.toString());
    return { post };
  }

  @Patch(':slug/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AUTHOR)
  async publish(@Param('slug') slug: string, @CurrentUser() user: UserEntity) {
    const post = await this.postsService.publish(slug, (user as any).authorId?.toString());
    return { post };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AUTHOR)
  async remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.postsService.remove(id, (user as any).authorId?.toString());
  }

  @Post(':slug/like')
  @UseGuards(JwtAuthGuard)
  async like(@Param('slug') slug: string, @CurrentUser() user: UserEntity) {
    const post = await this.postsService.findOne(slug);
    const result = await this.postsService.toggleLike(post.post._id.toString(), (user as any)._id.toString());
    return result;
  }

  @Delete(':slug/like')
  @UseGuards(JwtAuthGuard)
  async unlike(@Param('slug') slug: string, @CurrentUser() user: UserEntity) {
    const post = await this.postsService.findOne(slug);
    const result = await this.postsService.toggleLike(post.post._id.toString(), (user as any)._id.toString());
    return result;
  }

  @Get(':slug/likes')
  async getLikes(@Param('slug') slug: string, @Query('userId') userId?: string) {
    const post = await this.postsService.findOne(slug);
    const result = await this.postsService.getLikes(post.post._id.toString(), userId);
    return result;
  }

  @Post(':slug/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(@Param('slug') slug: string, @CurrentUser() user: UserEntity, @Body() dto: CreateCommentDto) {
    // Ordre des arguments corrigé pour matcher la signature du service :
    // (postSlug, userId, userName, content, userAvatar, parentId)
    const comment = await this.postsService.createComment(
      slug,
      (user as any)._id.toString(),
      user.name,
      dto.content,
      user.avatar,
      dto.parentId,
    );
    return { comment };
  }

  @Get(':slug/comments')
  async getComments(@Param('slug') slug: string, @Query('parentId') parentId?: string) {
    const result = await this.postsService.findComments(slug, parentId);
    return result;
  }

  @Patch(':slug/comments/:id')
  @UseGuards(JwtAuthGuard)
  async updateComment(@Param('slug') slug: string, @Param('id') commentId: string, @CurrentUser() user: UserEntity, @Body() dto: UpdateCommentDto) {
    const post = await this.postsService.findOne(slug);
    const result = await this.postsService.updateComment(post.post._id.toString(), commentId, dto.content);
    return result;
  }

  @Delete(':slug/comments/:id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('slug') slug: string, @Param('id') commentId: string) {
    const post = await this.postsService.findOne(slug);
    const result = await this.postsService.removeComment(post.post._id.toString(), commentId);
    return result;
  }

  @Post(':slug/comments/:id/like')
  async likeComment(@Param('slug') slug: string, @Param('id') commentId: string) {
    const post = await this.postsService.findOne(slug);
    const result = await this.postsService.toggleCommentLike(post.post._id.toString(), commentId);
    return result;
  }

  @Post(':slug/bookmark')
  @UseGuards(JwtAuthGuard)
  async bookmark(@Param('slug') slug: string, @CurrentUser() user: UserEntity) {
    const post = await this.postsService.findOne(slug);
    const result = await this.postsService.toggleBookmark(post.post._id.toString(), (user as any)._id.toString());
    return result;
  }

  @Delete(':slug/bookmark')
  @UseGuards(JwtAuthGuard)
  async unbookmark(@Param('slug') slug: string, @CurrentUser() user: UserEntity) {
    const post = await this.postsService.findOne(slug);
    const result = await this.postsService.toggleBookmark(post.post._id.toString(), (user as any)._id.toString());
    return result;
  }
}
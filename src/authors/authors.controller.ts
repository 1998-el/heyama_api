import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthorsService } from './authors.service';

@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get()
  async findAll(
    @Query('sort') sort?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.authorsService.findAll({
      sort,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const author = await this.authorsService.findBySlug(slug);
    if (!author) {
      throw new NotFoundException('Auteur introuvable');
    }
    return { author };
  }

  @Get(':slug/followers')
  async getFollowers(@Param('slug') slug: string) {
    const author = await this.authorsService.findBySlug(slug);
    if (!author) {
      throw new NotFoundException('Auteur introuvable');
    }
    return { followers: author.stats.totalFollowers };
  }
}

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async findAll() {
    const tags = await this.tagsService.findAll();
    return { tags };
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const tag = await this.tagsService.findBySlug(slug);
    if (!tag) {
      throw new Error('Tag introuvable');
    }
    return { tag };
  }
}

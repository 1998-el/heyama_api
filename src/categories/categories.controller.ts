import { Controller, Get, Param, Post, Body, Patch, Delete, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    const categories = await this.categoriesService.findAll();
    return { categories };
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const category = await this.categoriesService.findBySlug(slug);
    if (!category) {
      throw new Error('Catégorie introuvable');
    }
    return { category };
  }
}

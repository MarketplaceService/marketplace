import { Controller, Get } from '@nestjs/common';
import { ServiceService } from './service.service';

@Controller('categories')
export class CategoryController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  async getCategories() {
    return this.serviceService.getCategories();
  }
}

import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ServiceService } from './service.service';
import { SearchServicesDto } from './dto/search-services.dto';
import { NearbyServicesDto } from './dto/nearby-services.dto';

@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get('search')
  async search(@Query() query: SearchServicesDto) {
    return this.serviceService.searchServices(query);
  }

  @Get('nearby')
  async nearby(@Query() query: NearbyServicesDto) {
    return this.serviceService.getNearbyServices(query);
  }

  @Get()
  async findAll(@Query() query: SearchServicesDto) {
    return this.serviceService.searchServices(query);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.serviceService.getServiceDetail(id);
  }
}

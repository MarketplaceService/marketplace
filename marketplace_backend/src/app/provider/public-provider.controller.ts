import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProviderService } from './provider.service';

@ApiTags('Hồ sơ công khai của thợ (providers)')
@Controller('providers')
export class PublicProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Hồ sơ công khai của một thợ đã được duyệt' })
  getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.getPublicProfile(id);
  }
}

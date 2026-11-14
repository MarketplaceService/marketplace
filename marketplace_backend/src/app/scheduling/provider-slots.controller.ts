import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvailableSlotsQueryDto } from './dto/available-slots.dto';
import { SlotService } from './slot.service';

@ApiTags('Khung giờ trống của thợ (providers)')
@Controller('providers')
export class ProviderSlotsController {
  constructor(private readonly slotService: SlotService) {}

  @Get(':id/available-slots')
  @ApiOperation({
    summary:
      'Các khung giờ của một ngày, kèm trạng thái còn trống, tạm giữ hoặc đã kín',
  })
  getAvailableSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AvailableSlotsQueryDto,
  ) {
    return this.slotService.getAvailableSlots(id, query);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { RequireRoles } from 'src/core/decorators/role-with-guard.decorator';
import type { AuthenticatedRequest } from 'src/core/guards/auth.guard';
import { UserRole } from 'src/shared/types/user-role.enum';
import {
  AvailabilityBlockDto,
  AvailabilityResponseDto,
  ReplaceAvailabilityDto,
  UpdateAvailabilityDto,
} from './dto/availability.dto';
import { CreateTimeOffDto, TimeOffResponseDto } from './dto/time-off.dto';
import { ProviderAvailability } from './entities/provider-availability.entity';
import { ProviderTimeOff } from './entities/provider-time-off.entity';
import { ScheduleService } from './schedule.service';

const toAvailability = (value: ProviderAvailability | ProviderAvailability[]) =>
  plainToInstance(AvailabilityResponseDto, value, {
    excludeExtraneousValues: true,
  });

const toTimeOff = (value: ProviderTimeOff | ProviderTimeOff[]) =>
  plainToInstance(TimeOffResponseDto, value, { excludeExtraneousValues: true });

@ApiTags('Lịch làm việc của thợ (provider schedule)')
@ApiBearerAuth()
@Controller('provider')
@RequireRoles(UserRole.PROVIDER)
export class ProviderScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Lịch làm việc hàng tuần của tôi' })
  @ApiOkResponse({ type: [AvailabilityResponseDto] })
  async listAvailability(@Req() req: AuthenticatedRequest) {
    return toAvailability(
      await this.scheduleService.listAvailability(req.user.id),
    );
  }

  @Put('availability')
  @ApiOperation({ summary: 'Thay toàn bộ lịch làm việc hàng tuần' })
  @ApiOkResponse({ type: [AvailabilityResponseDto] })
  async replaceAvailability(
    @Req() req: AuthenticatedRequest,
    @Body() body: ReplaceAvailabilityDto,
  ) {
    return toAvailability(
      await this.scheduleService.replaceAvailability(req.user.id, body.blocks),
    );
  }

  @Post('availability')
  @ApiOperation({ summary: 'Thêm một ca làm việc' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  async addAvailability(
    @Req() req: AuthenticatedRequest,
    @Body() body: AvailabilityBlockDto,
  ) {
    return toAvailability(
      await this.scheduleService.addAvailability(req.user.id, body),
    );
  }

  @Patch('availability/:id')
  @ApiOperation({ summary: 'Bật, tắt hoặc sửa giờ một ca làm việc' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  async updateAvailability(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAvailabilityDto,
  ) {
    return toAvailability(
      await this.scheduleService.updateAvailability(req.user.id, id, body),
    );
  }

  @Get('time-off')
  @ApiOperation({ summary: 'Các khoảng nghỉ chưa kết thúc của tôi' })
  @ApiOkResponse({ type: [TimeOffResponseDto] })
  async listTimeOffs(@Req() req: AuthenticatedRequest) {
    return toTimeOff(await this.scheduleService.listTimeOffs(req.user.id));
  }

  @Post('time-off')
  @ApiOperation({ summary: 'Thêm khoảng nghỉ' })
  @ApiOkResponse({ type: TimeOffResponseDto })
  async addTimeOff(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateTimeOffDto,
  ) {
    return toTimeOff(await this.scheduleService.addTimeOff(req.user.id, body));
  }

  // Trả 200 kèm JSON thay vì 204 vì route /api/nest của frontend luôn đọc body
  @Delete('time-off/:id')
  @ApiOperation({ summary: 'Xóa khoảng nghỉ' })
  removeTimeOff(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scheduleService.removeTimeOff(req.user.id, id);
  }
}

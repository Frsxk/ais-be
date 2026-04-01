import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Roles('lecturer')
  @Post()
  create(
    @Body() dto: CreateScheduleDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.schedulesService.create(dto, req.user.id);
  }

  @Get('course/:courseId')
  findByCourse(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.schedulesService.findByCourse(courseId);
  }

  @Roles('lecturer')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.schedulesService.update(id, dto, req.user.id);
  }

  @Roles('lecturer')
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.schedulesService.remove(id, req.user.id);
  }
}

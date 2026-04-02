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
import { GradesService } from './grades.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { SetScoreDto } from './dto/set-score.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Roles('lecturer')
  @Post('components')
  createComponent(
    @Body() dto: CreateComponentDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.gradesService.createComponent(dto, req.user.id);
  }

  @Roles('lecturer')
  @Get('components/:courseId')
  findComponents(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.gradesService.findComponents(courseId);
  }

  @Roles('lecturer')
  @Put('components/:id')
  updateComponent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComponentDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.gradesService.updateComponent(id, dto, req.user.id);
  }

  @Roles('lecturer')
  @Delete('components/:id')
  deleteComponent(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.gradesService.deleteComponent(id, req.user.id);
  }

  @Roles('lecturer')
  @Post('scores')
  setScore(@Body() dto: SetScoreDto, @Request() req: { user: { id: number } }) {
    return this.gradesService.setScore(dto, req.user.id);
  }

  @Roles('lecturer')
  @Get('scores/:courseId')
  getScoresByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.gradesService.getScoresByCourse(courseId, req.user.id);
  }

  @Roles('lecturer')
  @Put('publish/:courseId')
  togglePublish(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.gradesService.togglePublish(courseId, req.user.id);
  }

  @Roles('lecturer')
  @Get('publish/:courseId/status')
  getPublishStatus(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.gradesService.getPublishStatus(courseId);
  }

  @Roles('student')
  @Get('my/summary')
  getMyGradeSummary(@Request() req: { user: { id: number } }) {
    return this.gradesService.getMyGradeSummary(req.user.id);
  }

  @Roles('student')
  @Get('my/:courseId')
  getMyGradesForCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.gradesService.getMyGradesForCourse(courseId, req.user.id);
  }
}

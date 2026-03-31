import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnrollmentsService } from './enrollments.service';
import { EnrollCourseDto } from './dto/enroll-course.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Roles('student')
  @Post()
  enroll(
    @Body() enrollCourseDto: EnrollCourseDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.enrollmentsService.enroll(
      req.user.id,
      enrollCourseDto.courseId,
    );
  }

  @Roles('student')
  @Delete(':courseId')
  drop(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.enrollmentsService.drop(req.user.id, courseId);
  }

  @Roles('student')
  @Get('me')
  getMyEnrollments(@Request() req: { user: { id: number } }) {
    return this.enrollmentsService.getMyEnrollments(req.user.id);
  }

  @Roles('lecturer')
  @Get('course/:courseId')
  getStudentsByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.enrollmentsService.getStudentsByCourse(courseId, req.user.id);
  }
}

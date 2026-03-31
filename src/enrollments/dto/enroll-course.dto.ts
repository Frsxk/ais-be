import { IsInt } from 'class-validator';

export class EnrollCourseDto {
  @IsInt()
  courseId!: number;
}

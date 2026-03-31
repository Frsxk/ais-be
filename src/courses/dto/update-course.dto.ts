import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  creditWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quota?: number;
}

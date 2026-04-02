import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsInt()
  creditWeight!: number;

  @IsInt()
  @Min(1)
  quota!: number;

  @IsInt()
  semesterId!: number;
}

import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class SetScoreDto {
  @IsInt()
  enrollmentId!: number;

  @IsInt()
  componentId!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;
}

import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSemesterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @Type(() => Date)
  startDate!: Date;

  @Type(() => Date)
  endDate!: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

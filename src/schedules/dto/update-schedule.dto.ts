import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export class UpdateScheduleDto {
  @IsOptional()
  @IsEnum(DAYS_OF_WEEK)
  dayOfWeek?: (typeof DAYS_OF_WEEK)[number];

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:MM format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:MM format' })
  endTime?: string;
}

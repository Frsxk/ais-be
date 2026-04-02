import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SemestersService } from './semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('semesters')
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @Roles('lecturer')
  @Post()
  create(@Body() dto: CreateSemesterDto) {
    return this.semestersService.create(dto);
  }

  @Get()
  findAll() {
    return this.semestersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.semestersService.findOne(id);
  }

  @Roles('lecturer')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSemesterDto,
  ) {
    return this.semestersService.update(id, dto);
  }

  @Roles('lecturer')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.semestersService.remove(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { JobsService } from './jobs.service';
import { CreateJobDto, ParseJobTextDto, UpdateJobDto } from './dto/job.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ContentSafetyGuard } from '@/common/guards/content-safety.guard';

class ParseImageDto {
  @IsString()
  @IsNotEmpty()
  imageBase64: string;
}

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  async create(@Request() req: { user: { id: string } }, @Body() dto: CreateJobDto) {
    return this.jobsService.create(req.user.id, dto);
  }

  @Post('parse')
  @UseGuards(ContentSafetyGuard)
  async parseJobText(@Body() dto: ParseJobTextDto) {
    return this.jobsService.parseJobText(dto);
  }

  @Post('parse-url')
  async parseJobUrl(@Body('url') url: string) {
    return this.jobsService.parseJobUrl(url);
  }

  @Post('parse-image')
  async parseJobImage(@Body() dto: ParseImageDto) {
    return this.jobsService.parseJobImage(dto.imageBase64);
  }

  @Post('import')
  async importJob(
    @Request() req: { user: { id: string } },
    @Body() body: { text: string; parsedData: Record<string, unknown>; sourceType?: string; sourceUrl?: string },
  ) {
    // 如果提供了解析数据，直接使用；否则重新解析
    const parsed = body.parsedData
      ? {
          title: body.parsedData.title as string,
          company: body.parsedData.company as string,
          location: body.parsedData.location as string,
          salary: body.parsedData.salary as string | undefined,
          experience: body.parsedData.experience as string | undefined,
          education: body.parsedData.education as string | undefined,
          requirements: (body.parsedData.requirements as string[]) || [],
          niceToHave: (body.parsedData.niceToHave as string[]) || [],
          skills: (body.parsedData.skills as string[]) || [],
          confidence: (body.parsedData.confidence as number) || 0.7,
        }
      : await this.jobsService.parseJobText({ text: body.text });

    return this.jobsService.createFromParsed(req.user.id, parsed, body.text, body.sourceType, body.sourceUrl);
  }

  @Get()
  async findAll(
    @Request() req: { user: { id: string } },
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('favorites') favorites?: string,
  ) {
    return this.jobsService.findAll(req.user.id, {
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      favorites: favorites === 'true',
    });
  }

  @Get('favorites/list')
  async getFavorites(@Request() req: { user: { id: string } }) {
    return this.jobsService.getFavorites(req.user.id);
  }

  @Post(':id/favorite')
  async toggleFavorite(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body('favorite') favorite?: boolean,
  ) {
    return this.jobsService.toggleFavorite(req.user.id, id, favorite);
  }

  @Get('stats/status')
  async getStatusStats(@Request() req: { user: { id: string } }) {
    return this.jobsService.getStatusStats(req.user.id);
  }

  @Post(':id/status')
  async updateStatus(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('note') note?: string,
  ) {
    return this.jobsService.updateStatus(req.user.id, id, status, note);
  }

  @Get(':id/status/history')
  async getStatusHistory(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.jobsService.getStatusHistory(req.user.id, id);
  }

  @Post('batch/status')
  async batchUpdateStatus(
    @Request() req: { user: { id: string } },
    @Body('jobIds') jobIds: string[],
    @Body('status') status: string,
    @Body('note') note?: string,
  ) {
    return this.jobsService.batchUpdateStatus(req.user.id, jobIds, status, note);
  }

  @Get(':id')
  async findOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.jobsService.findOne(req.user.id, id);
  }

  @Put(':id')
  async update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  async remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.jobsService.remove(req.user.id, id);
  }
}

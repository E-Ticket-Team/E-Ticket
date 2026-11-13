import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Event created successfully' })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve list of all events' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  findAll(
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.eventsService.findAll({ category, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of an event by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Event found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Event not found' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing event' })
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}

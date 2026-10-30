import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Scope, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ApiTags } from '@nestjs/swagger';
import { ConsoleService } from './console.service';
import { WorkspaceService } from './workspace.service';
import { SessionGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.types';

@ApiTags('project-eh')
@Controller({ path: 'console', scope: Scope.REQUEST })
@UseGuards(SessionGuard)
export class ConsoleController {
  constructor(private readonly workspaces: WorkspaceService, @Inject(REQUEST) private readonly request: AuthenticatedRequest) {}

  private get console(): ConsoleService { return this.workspaces.forUser(this.request.user.id); }

  @Get()
  snapshot() { return this.console.snapshot(); }

  @Get('inventory')
  inventory(@Query('propertyId') propertyId: string, @Query('start') start: string, @Query('days') days = '7') {
    return this.console.inventory(propertyId, start, Number(days));
  }

  @Post('properties')
  createProperty(@Body() body: unknown) { this.console.saveProperty(body); return this.snapshot(); }

  @Patch('properties/:id')
  updateProperty(@Param('id') id: string, @Body() body: unknown) { this.console.saveProperty(body, id); return this.snapshot(); }

  @Post('rooms')
  createRoom(@Body() body: unknown) { this.console.saveRoom(body); return this.snapshot(); }

  @Patch('rooms/:id')
  updateRoom(@Param('id') id: string, @Body() body: unknown) { this.console.saveRoom(body, id); return this.snapshot(); }

  @Post('reservations')
  createReservation(@Body() body: unknown) { this.console.saveReservation(body); return this.snapshot(); }

  @Patch('reservations/:id')
  updateReservation(@Param('id') id: string, @Body() body: unknown) { this.console.saveReservation(body, id); return this.snapshot(); }

  @Patch('reservations/:id/status')
  reservationStatus(@Param('id') id: string, @Body() body: unknown) { this.console.reservationStatus(id, body); return this.snapshot(); }

  @Patch('reservations/:id/settlement')
  settlement(@Param('id') id: string, @Body() body: unknown) { this.console.settlement(id, body); return this.snapshot(); }

  @Post('rates')
  rates(@Body() body: unknown) { this.console.saveRates(body); return this.snapshot(); }

  @Post('cleaning')
  createCleaning(@Body() body: unknown) { this.console.saveCleaning(body); return this.snapshot(); }

  @Patch('cleaning/:id')
  updateCleaning(@Param('id') id: string, @Body() body: unknown) { this.console.saveCleaning(body, id); return this.snapshot(); }

  @Post('issues')
  createIssue(@Body() body: unknown) { this.console.saveIssue(body); return this.snapshot(); }

  @Patch('issues/:id')
  updateIssue(@Param('id') id: string, @Body() body: unknown) { this.console.saveIssue(body, id); return this.snapshot(); }

  @Patch('guests/:id/note')
  guestNote(@Param('id') id: string, @Body() body: unknown) { this.console.guestNote(id, body); return this.snapshot(); }

  @Post('messages/drafts')
  saveDraft(@Body() body: unknown) { this.console.saveDraft(body); return this.snapshot(); }

  @Patch('messages/:reservationId/read')
  readMessages(@Param('reservationId') id: string) { this.console.readMessages(id); return this.snapshot(); }

  @Post('claims')
  createClaim(@Body() body: unknown) { this.console.saveClaim(body); return this.snapshot(); }

  @Patch('claims/:id')
  updateClaim(@Param('id') id: string, @Body() body: unknown) { this.console.saveClaim(body, id); return this.snapshot(); }

  @Post('claims/:id/evidence')
  evidence(@Param('id') id: string, @Body() body: unknown) { this.console.addEvidence(id, body); return this.snapshot(); }

  @Patch('connections/:id')
  connection(@Param('id') id: string, @Body() body: unknown) { this.console.saveConnection(id, body); return this.snapshot(); }

  @Post('connections/:id/sync')
  sync(@Param('id') id: string) { return this.console.sync(id); }
}

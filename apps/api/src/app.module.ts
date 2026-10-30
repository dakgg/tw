import { Module } from '@nestjs/common';
import { ConsoleController } from './console.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './auth.guard';
import { WorkspaceService } from './workspace.service';

@Module({ controllers: [AuthController, ConsoleController], providers: [AuthService, SessionGuard, WorkspaceService] })
export class AppModule {}

import { Injectable } from '@nestjs/common';
import { resolve } from 'node:path';
import { AuthService, dataDirectory } from './auth.service';
import { ConsoleService } from './console.service';

@Injectable()
export class WorkspaceService {
  private readonly workspaces = new Map<string, ConsoleService>();
  constructor(private readonly auth: AuthService) {}

  forUser(userId: string): ConsoleService {
    const demo = this.auth.demoForUser(userId);
    let workspace = this.workspaces.get(userId);
    if (!workspace) {
      workspace = new ConsoleService(resolve(dataDirectory(), 'workspaces', `${userId}.json`), demo);
      this.workspaces.set(userId, workspace);
    }
    return workspace;
  }
}

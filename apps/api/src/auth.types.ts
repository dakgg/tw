import type { FastifyRequest } from 'fastify';

export type PublicUser = { id: string; username: string; displayName: string; createdAt: string };
export type Account = PublicUser & { passwordHash: string; passwordSalt: string; demo: boolean };
export type Session = { tokenHash: string; userId: string; expiresAt: number };
export type AccountStore = { version: 1; users: Account[]; sessions: Session[] };
export type AuthenticatedRequest = FastifyRequest & { user: PublicUser };

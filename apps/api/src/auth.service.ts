import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Account, AccountStore, PublicUser } from './auth.types';
import * as v from './console.validation';

export function dataDirectory(): string {
  return process.env.EH_DATA_DIR || resolve(__dirname, '../../../.data/project-eh');
}

const lifetime = 12 * 60 * 60 * 1000;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const hashPassword = (password: string, salt: string): Promise<string> => new Promise((resolveHash, reject) => {
  scrypt(password, salt, 64, (error, derived) => error ? reject(error) : resolveHash(derived.toString('hex')));
});

@Injectable()
export class AuthService {
  private readonly file = resolve(dataDirectory(), 'accounts.json');
  private store: AccountStore;
  private readonly attempts = new Map<string, { count: number; expires: number }>();

  constructor() {
    this.store = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) as AccountStore : { version: 1, users: [], sessions: [] };
    if (this.store.version !== 1 || !Array.isArray(this.store.users) || !Array.isArray(this.store.sessions)) throw new Error('EH 계정 저장 파일 형식이 올바르지 않습니다.');
  }

  async register(body: unknown, address: string): Promise<{ user: PublicUser; token: string }> {
    if (process.env.EH_ALLOW_SIGNUP === 'false') throw new ForbiddenException('현재 계정 생성이 비활성화되어 있습니다. 운영자에게 문의해 주세요.');
    this.throttle(`signup:${address}`, 5, 60 * 60 * 1000);
    const data = v.object(body);
    const username = this.username(data.username);
    const displayName = v.text(data.displayName, '이름', 60);
    const password = this.password(data.password);
    const demo = data.demo === undefined ? false : v.bool(data.demo, '예시 데이터 사용');
    const passwordSalt = randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, passwordSalt);
    // Duplicate checks run after asynchronous hashing, immediately before the atomic write.
    if (this.store.users.some((user) => user.username === username)) throw new ConflictException('이미 사용 중인 아이디입니다.');
    const user: Account = { id: randomUUID(), username, displayName, passwordHash, passwordSalt, demo, createdAt: new Date().toISOString() };
    const next = structuredClone(this.store);
    next.users.push(user);
    const token = this.createSession(next, user.id);
    this.commit(next);
    return { user: this.publicUser(user), token };
  }

  async login(body: unknown, address: string): Promise<{ user: PublicUser; token: string }> {
    const data = v.object(body);
    const username = this.username(data.username);
    const password = this.password(data.password, false);
    this.throttle(`login-ip:${address}`, 40, 15 * 60 * 1000);
    const key = `login:${address}:${username}`;
    this.throttle(key, 10, 15 * 60 * 1000);
    const user = this.store.users.find((item) => item.username === username);
    const candidate = await hashPassword(password, user?.passwordSalt ?? '00000000000000000000000000000000');
    const expected = user?.passwordHash ?? '0'.repeat(128);
    if (!user || !timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(expected, 'hex')) || this.store.users.find((item) => item.id === user.id)?.passwordHash !== expected) throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    this.attempts.delete(key);
    const next = structuredClone(this.store);
    const token = this.createSession(next, user.id);
    this.commit(next);
    return { user: this.publicUser(user), token };
  }

  authenticate(token?: string): PublicUser {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new UnauthorizedException('로그인이 필요합니다.');
    const session = this.store.sessions.find((item) => item.tokenHash === tokenHash(token) && item.expiresAt > Date.now());
    const user = session && this.store.users.find((item) => item.id === session.userId);
    if (!user) throw new UnauthorizedException('로그인이 만료되었습니다. 다시 로그인해 주세요.');
    return this.publicUser(user);
  }

  demoForUser(id: string): boolean {
    const user = this.store.users.find((item) => item.id === id);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');
    return user.demo;
  }

  logout(token?: string): void {
    if (!token) return;
    const next = structuredClone(this.store);
    next.sessions = next.sessions.filter((item) => item.tokenHash !== tokenHash(token));
    this.commit(next);
  }

  async changePassword(userId: string, body: unknown): Promise<string> {
    const data = v.object(body);
    const current = this.password(data.currentPassword, false);
    const password = this.password(data.password);
    this.throttle(`password:${userId}`, 10, 15 * 60 * 1000);
    const account = this.store.users.find((user) => user.id === userId);
    if (!account) throw new UnauthorizedException('로그인이 필요합니다.');
    const oldHash = account.passwordHash;
    const currentHash = await hashPassword(current, account.passwordSalt);
    if (!timingSafeEqual(Buffer.from(currentHash, 'hex'), Buffer.from(oldHash, 'hex'))) throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    const salt = randomBytes(16).toString('hex');
    const hashed = await hashPassword(password, salt);
    const next = structuredClone(this.store);
    const user = next.users.find((item) => item.id === userId)!;
    if (user.passwordHash !== oldHash) throw new ConflictException('비밀번호가 변경되었습니다. 다시 로그인해 주세요.');
    user.passwordSalt = salt; user.passwordHash = hashed;
    next.sessions = next.sessions.filter((session) => session.userId !== userId);
    const token = this.createSession(next, userId);
    this.commit(next);
    return token;
  }

  private username(value: unknown): string {
    const username = v.text(value, '아이디', 40).toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) throw new BadRequestException('아이디는 영문·숫자로 시작하는 3~40자의 영문, 숫자, 점, 밑줄, 하이픈으로 입력해 주세요.');
    return username;
  }

  private password(value: unknown, creating = true): string {
    if (typeof value !== 'string' || value.length < (creating ? 10 : 1) || value.length > 128) throw new BadRequestException(creating ? '비밀번호는 10~128자로 입력해 주세요.' : '비밀번호를 입력해 주세요.');
    return value;
  }

  private publicUser(user: Account): PublicUser {
    return { id: user.id, username: user.username, displayName: user.displayName, createdAt: user.createdAt };
  }

  private createSession(store: AccountStore, userId: string): string {
    const token = randomBytes(32).toString('base64url');
    store.sessions = store.sessions.filter((item) => item.expiresAt > Date.now());
    const sameUser = store.sessions.filter((item) => item.userId === userId);
    if (sameUser.length >= 5) store.sessions = store.sessions.filter((item) => item !== sameUser[0]);
    store.sessions.push({ tokenHash: tokenHash(token), userId, expiresAt: Date.now() + lifetime });
    return token;
  }

  private throttle(key: string, limit: number, duration: number): void {
    const now = Date.now();
    for (const [entry, value] of this.attempts) if (value.expires <= now) this.attempts.delete(entry);
    const record = this.attempts.get(key) ?? { count: 0, expires: now + duration };
    if (record.count >= limit) throw new HttpException('시도 횟수가 많습니다. 잠시 후 다시 시도해 주세요.', 429);
    record.count++; this.attempts.set(key, record);
  }

  private commit(next: AccountStore): void {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    writeFileSync(`${this.file}.tmp`, JSON.stringify(next), { mode: 0o600 });
    renameSync(`${this.file}.tmp`, this.file);
    this.store = next;
  }
}

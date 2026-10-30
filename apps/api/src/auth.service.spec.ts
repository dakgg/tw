import { HttpException, UnauthorizedException } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthService } from './auth.service';

let directory: string;
let auth: AuthService;
const oldDirectory = process.env.EH_DATA_DIR;
const oldSignup = process.env.EH_ALLOW_SIGNUP;
const payload = { username: 'operator', displayName: '운영자', password: 'Only-a-test-password!' };

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'eh-auth-'));
  process.env.EH_DATA_DIR = directory;
  process.env.EH_ALLOW_SIGNUP = 'true';
  auth = new AuthService();
});

afterEach(() => {
  jest.restoreAllMocks();
  rmSync(directory, { recursive: true, force: true });
  if (oldDirectory === undefined) delete process.env.EH_DATA_DIR; else process.env.EH_DATA_DIR = oldDirectory;
  if (oldSignup === undefined) delete process.env.EH_ALLOW_SIGNUP; else process.env.EH_ALLOW_SIGNUP = oldSignup;
});

it('expires sessions after 12 hours', async () => {
  const result = await auth.register(payload, '127.0.0.1');
  const now = Date.now();
  jest.spyOn(Date, 'now').mockReturnValue(now + 12 * 60 * 60 * 1000 + 1);
  expect(() => auth.authenticate(result.token)).toThrow(UnauthorizedException);
});

it('does not create duplicate accounts during concurrent registration', async () => {
  const results = await Promise.allSettled([auth.register(payload, '127.0.0.1'), auth.register(payload, '127.0.0.1')]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
});

it('limits repeated wrong-password attempts', async () => {
  await auth.register(payload, '127.0.0.1');
  for (let i = 0; i < 10; i++) await expect(auth.login({ username: payload.username, password: 'wrong' }, '127.0.0.1')).rejects.toBeInstanceOf(UnauthorizedException);
  try { await auth.login(payload, '127.0.0.1'); throw new Error('Expected rate limit'); }
  catch (cause) { expect(cause).toBeInstanceOf(HttpException); expect((cause as HttpException).getStatus()).toBe(429); }
});

it('starts with an empty workspace by default and explicitly opts into examples', async () => {
  const first = await auth.register(payload, '127.0.0.1');
  const second = await auth.register({ ...payload, username: 'demo-user', demo: true }, '127.0.0.1');
  expect(auth.demoForUser(first.user.id)).toBe(false);
  expect(auth.demoForUser(second.user.id)).toBe(true);
});

it('can disable new account registration', async () => {
  process.env.EH_ALLOW_SIGNUP = 'false';
  await expect(auth.register(payload, '127.0.0.1')).rejects.toThrow('비활성화');
});

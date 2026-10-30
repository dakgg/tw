import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AppModule } from './app.module';
import { AuthService } from './auth.service';

let app: NestFastifyApplication;
let directory: string;
let cookieA: string;
let cookieB: string;
let propertyA: string;
let roomA: string;
let reservationA: string;
let connectionA: string;
const password = 'Test-only-password-2026!';
const oldDirectory = process.env.EH_DATA_DIR;
const oldSignup = process.env.EH_ALLOW_SIGNUP;
const cookieOf = (header: string | string[] | undefined) => (Array.isArray(header) ? header[0] : header)!.split(';')[0];

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'eh-http-'));
  process.env.EH_DATA_DIR = directory;
  process.env.EH_ALLOW_SIGNUP = 'true';
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter({ bodyLimit: 3 * 1024 * 1024 }));
  app.setGlobalPrefix('api');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const first = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'owner-a', displayName: '운영자 A', password } });
  expect(first.statusCode).toBe(201);
  cookieA = cookieOf(first.headers['set-cookie']);
  expect(first.headers['set-cookie']).toContain('HttpOnly');
  expect(first.headers['set-cookie']).toContain('SameSite=Strict');
  expect(first.json().user).not.toHaveProperty('passwordHash');
  const second = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'owner-b', displayName: '운영자 B', password } });
  cookieB = cookieOf(second.headers['set-cookie']);
});

afterAll(async () => {
  await app?.close();
  rmSync(directory, { recursive: true, force: true });
  if (oldDirectory === undefined) delete process.env.EH_DATA_DIR; else process.env.EH_DATA_DIR = oldDirectory;
  if (oldSignup === undefined) delete process.env.EH_ALLOW_SIGNUP; else process.env.EH_ALLOW_SIGNUP = oldSignup;
});

it('requires a valid session before reading the workspace or writing a property', async () => {
  expect((await app.inject({ method: 'GET', url: '/api/console' })).statusCode).toBe(401);
  expect((await app.inject({ method: 'POST', url: '/api/console/properties', payload: { name: 'denied' } })).statusCode).toBe(401);
  expect((await app.inject({ method: 'GET', url: '/api/console', headers: { cookie: 'eh_session=forged' } })).statusCode).toBe(401);
});

it('creates properties, rooms and reservations for the signed-in user through HTTP', async () => {
  const headers = { cookie: cookieA };
  const empty = await app.inject({ method: 'GET', url: '/api/console', headers });
  expect(empty.statusCode).toBe(200);
  expect(empty.json().properties).toEqual([]);
  const created = await app.inject({ method: 'POST', url: '/api/console/properties', headers, payload: { name: 'A 숙소', address: '서울' } });
  expect(created.statusCode).toBe(201);
  propertyA = created.json().properties[0].id;
  connectionA = created.json().connections[0].id;
  expect(created.json().connections).toHaveLength(5);
  const room = await app.inject({ method: 'POST', url: '/api/console/rooms', headers, payload: { propertyId: propertyA, name: '201호', type: '트윈', capacity: 2, baseRate: 150000 } });
  roomA = room.json().rooms[0].id;
  const booking = await app.inject({ method: 'POST', url: '/api/console/reservations', headers, payload: { propertyId: propertyA, roomId: roomA, guestName: 'A 게스트', channel: 'direct', checkIn: '2026-11-10', checkOut: '2026-11-12', guests: 2, total: 300000, commission: 0 } });
  expect(booking.statusCode).toBe(201);
  reservationA = booking.json().reservations[0].id;
});

it('does not return user A data in user B snapshots', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/console', headers: { cookie: cookieB } });
  expect(response.statusCode).toBe(200);
  expect(response.json().properties).toEqual([]);
  expect(response.json().reservations).toEqual([]);
  expect(response.json().connections).toEqual([]);
  expect(response.body).not.toContain('A 게스트');
});

it('saves OTA configuration per account and refuses another user updating it', async () => {
  const saved = await app.inject({ method: 'PATCH', url: `/api/console/connections/${connectionA}`, headers: { cookie: cookieA }, payload: { externalId: 'only-owner-a' } });
  expect(saved.statusCode).toBe(200);
  expect(saved.json().connections[0].externalId).toBe('only-owner-a');
  expect(saved.json().connections[0].status).toBe('setup-saved');
  const denied = await app.inject({ method: 'PATCH', url: `/api/console/connections/${connectionA}`, headers: { cookie: cookieB }, payload: { externalId: 'hijacked' } });
  expect(denied.statusCode).toBe(404);
  const state = (await app.inject({ method: 'GET', url: '/api/console', headers: { cookie: cookieA } })).json();
  expect(state.connections[0].externalId).toBe('only-owner-a');
});

it('rejects cross-account reservation, room, inventory and property access even with known IDs', async () => {
  const headers = { cookie: cookieB };
  expect((await app.inject({ method: 'PATCH', url: `/api/console/reservations/${reservationA}/status`, headers, payload: { status: 'cancelled' } })).statusCode).toBe(404);
  expect((await app.inject({ method: 'PATCH', url: `/api/console/rooms/${roomA}`, headers, payload: { name: 'stolen', type: 'room', capacity: 2, baseRate: 1 } })).statusCode).toBe(404);
  expect((await app.inject({ method: 'GET', url: `/api/console/inventory?propertyId=${propertyA}&start=2026-11-10&days=7`, headers })).statusCode).toBe(404);
  expect((await app.inject({ method: 'PATCH', url: `/api/console/properties/${propertyA}`, headers, payload: { name: 'stolen' } })).statusCode).toBe(404);
});

it('rejects cross-origin authenticated mutations and login attempts', async () => {
  const origin = 'https://untrusted.example';
  expect((await app.inject({ method: 'POST', url: '/api/console/properties', headers: { cookie: cookieA, origin }, payload: { name: 'CSRF' } })).statusCode).toBe(403);
  expect((await app.inject({ method: 'POST', url: '/api/auth/login', headers: { origin }, payload: { username: 'owner-a', password } })).statusCode).toBe(403);
});

it('rejects a stale tab submitting another account cookie after an account switch', async () => {
  const accountA = (await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookieA } })).json().user;
  const response = await app.inject({ method: 'POST', url: '/api/console/properties', headers: { cookie: cookieB, 'x-eh-account': accountA.id }, payload: { name: 'stale-tab-write' } });
  expect(response.statusCode).toBe(401);
});

it('rejects incorrect credentials, accepts correct ID/password and returns only public account fields', async () => {
  const invalid = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'owner-a', password: 'wrong-password' } });
  expect(invalid.statusCode).toBe(401);
  expect(invalid.headers['set-cookie']).toBeUndefined();
  const valid = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'OWNER-A', password } });
  expect(valid.statusCode).toBe(201);
  cookieA = cookieOf(valid.headers['set-cookie']);
  const account = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookieA } });
  expect(account.json().user.username).toBe('owner-a');
  expect(Object.keys(account.json().user).sort()).toEqual(['createdAt', 'displayName', 'id', 'username']);
});

it('stores salted password hashes and hashed session tokens, never plaintext passwords or cookie tokens', () => {
  const contents = readFileSync(join(directory, 'accounts.json'), 'utf8');
  expect(contents).not.toContain(password);
  expect(contents).not.toContain(cookieA.split('=')[1]);
  const saved = JSON.parse(contents);
  expect(saved.users[0].passwordHash).toHaveLength(128);
  expect(saved.users[0].passwordHash).not.toBe(saved.users[1].passwordHash);
  expect(saved.users[0].passwordSalt).not.toBe(saved.users[1].passwordSalt);
  const reopened = new AuthService();
  expect(reopened.authenticate(cookieA.split('=')[1]).username).toBe('owner-a');
});

it('rejects duplicate IDs and short passwords', async () => {
  expect((await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'OWNER-A', displayName: 'duplicate', password } })).statusCode).toBe(409);
  expect((await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'short-user', displayName: 'short', password: '1234' } })).statusCode).toBe(400);
});

it('changes passwords, revokes previous sessions and accepts only the new password', async () => {
  const previousCookie = cookieA;
  const changed = await app.inject({ method: 'POST', url: '/api/auth/password', headers: { cookie: cookieA }, payload: { currentPassword: password, password: 'New-test-password-2026!' } });
  expect(changed.statusCode).toBe(201);
  cookieA = cookieOf(changed.headers['set-cookie']);
  expect((await app.inject({ method: 'GET', url: '/api/console', headers: { cookie: previousCookie } })).statusCode).toBe(401);
  expect((await app.inject({ method: 'GET', url: '/api/console', headers: { cookie: cookieA } })).statusCode).toBe(200);
  expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'owner-a', password } })).statusCode).toBe(401);
  expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'owner-a', password: 'New-test-password-2026!' } })).statusCode).toBe(201);
});

it('returns a structured validation failure', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/console/properties', headers: { cookie: cookieA }, payload: { name: '' } });
  expect(response.statusCode).toBe(400);
  expect(response.json().message).toContain('숙소 이름');
});

it.each(['holidays', 'exchange-rates', 'operating-areas', 'inbound-demand', 'country-booking-rates', 'market-rates', 'dashboard/SEOUL-JG'])('removes the old %s API', async (path) => {
  expect((await app.inject({ method: 'GET', url: `/api/${path}` })).statusCode).toBe(404);
});

it('removes the collector and never reports successful external OTA synchronization', async () => {
  expect((await app.inject({ method: 'POST', url: '/api/collectors/run' })).statusCode).toBe(404);
  const result = await app.inject({ method: 'POST', url: `/api/console/connections/${connectionA}/sync`, headers: { cookie: cookieA } });
  expect(result.statusCode).toBe(503);
});

it('logs out and invalidates the token on the server, while keeping other users logged in', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: cookieA } });
  expect(response.statusCode).toBe(201);
  expect(response.headers['set-cookie']).toContain('Max-Age=0');
  expect((await app.inject({ method: 'GET', url: '/api/console', headers: { cookie: cookieA } })).statusCode).toBe(401);
  expect((await app.inject({ method: 'GET', url: '/api/console', headers: { cookie: cookieB } })).statusCode).toBe(200);
});

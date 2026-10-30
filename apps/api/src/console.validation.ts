import { BadRequestException } from '@nestjs/common';

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('올바른 요청 본문이 필요합니다.');
  return value as Record<string, unknown>;
}

export function text(value: unknown, label: string, max = 200, optional = false): string {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max) throw new BadRequestException(`${label}: ${max}자 이내로 입력해 주세요.`);
  return value.trim();
}

export function integer(value: unknown, label: string, min = 0, max = 100000000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new BadRequestException(`${label}: ${min}~${max} 사이의 정수를 입력해 주세요.`);
  return value;
}

export function choice<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new BadRequestException(`${label} 값이 올바르지 않습니다.`);
  return value as T;
}

export function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '2100-12-31') throw new BadRequestException('날짜는 2000~2100년의 YYYY-MM-DD 형식으로 입력해 주세요.');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new BadRequestException('존재하지 않는 날짜입니다.');
  return value;
}

export function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new BadRequestException(`${label} 값이 올바르지 않습니다.`);
  return value;
}

/// <reference types="node" />
import type { PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2';
export type { PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2';
export type Callback<T> = (error: Error | null, result?: T) => void;
export interface Database {
  query<T extends RowDataPacket = RowDataPacket>(sql: string, data?: unknown[]): Promise<T[]>;
  query<T extends RowDataPacket = RowDataPacket>(sql: string, callback: Callback<T[]>): void;
  query<T extends RowDataPacket = RowDataPacket>(sql: string, data: unknown[], callback: Callback<T[]>): void;
  querySingle<T extends RowDataPacket = RowDataPacket>(sql: string, data?: unknown[]): Promise<T | null>;
  querySingle<T extends RowDataPacket = RowDataPacket>(sql: string, callback: Callback<T | null>): void;
  querySingle<T extends RowDataPacket = RowDataPacket>(sql: string, data: unknown[], callback: Callback<T | null>): void;
  nonQuery(sql: string, data?: unknown[]): Promise<ResultSetHeader>;
  nonQuery(sql: string, callback: Callback<ResultSetHeader>): void;
  nonQuery(sql: string, data: unknown[], callback: Callback<ResultSetHeader>): void;
  queryMany<T extends RowDataPacket = RowDataPacket>(sql: string, data: unknown[], rowCallback: (row: T) => void | Promise<void>): Promise<void>;
  queryMany<T extends RowDataPacket = RowDataPacket>(sql: string, data: unknown[], rowCallback: (row: T) => void | Promise<void>, endCallback: Callback<void>): void;
  end(): Promise<void>;
  end(callback: Callback<void>): void;
}
export function createDatabase(options?: PoolOptions | string): Database;
export function init(options: PoolOptions): Database;
export function init(user?: string, password?: string, database?: string, host?: string, port?: number): Database;
export const query: Database['query'];
export const querySingle: Database['querySingle'];
export const queryMany: Database['queryMany'];
export const nonQuery: Database['nonQuery'];
export const end: Database['end'];

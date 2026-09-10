# mysql-simple

[![CI](https://github.com/jhurliman/node-mysql-simple/actions/workflows/ci.yml/badge.svg)](https://github.com/jhurliman/node-mysql-simple/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/mysql-simple.svg)](https://www.npmjs.com/package/mysql-simple)

A small interface for **pooled MySQL queries**: fetch rows, fetch one row, execute
a write, or process rows incrementally. `mysql-simple` handles the connection
lifecycle and exposes the same operations through callbacks and Promises.

Version 2 uses [MySQL2](https://sidorares.github.io/node-mysql2/docs) pooling,
supports independent database instances, waits for slow row consumers, and drains
admitted work before shutdown. TypeScript declarations are included. It is a
query helper, not an ORM: you write the SQL and choose your database schema.

## Install

```sh
npm install mysql-simple
```

Requires Node.js 22+ and a reachable MySQL server. CI exercises MySQL 8.4.
TypeScript projects should also install `@types/node` as a development dependency.

## Your first query

Set `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` for your
server, save this as `example.mjs`, and run `node example.mjs`. It needs no tables:

```js
import { createDatabase } from 'mysql-simple';

const db = createDatabase({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 5,
});

try {
  const row = await db.querySingle('SELECT ? AS answer', [42]);
  console.log(row.answer); // 42
} finally {
  await db.end();
}
```

For CommonJS, use `const { createDatabase } = require('mysql-simple')`.
`createDatabase()` accepts MySQL2 pool options or a MySQL connection URI. The
options-object form defaults to at most 50 connections and a 30-second idle
timeout; URI configuration uses the driver's defaults. Connection creation is
lazy, so authentication and connectivity failures arrive with the first query.

## Choose the result shape

These examples use the `db` instance above and an application-defined `users`
table:

```js
const users = await db.query('SELECT id, name FROM users WHERE active = ?', [true]);
const user = await db.querySingle('SELECT id, name FROM users WHERE id = ?', [42]);
const info = await db.nonQuery('UPDATE users SET active = ? WHERE id = ?', [false, 42]);
```

| Method | Promise result | Callback form |
| --- | --- | --- |
| `query(sql, data?)` | Array of rows | `query(sql, data?, callback)` |
| `querySingle(sql, data?)` | First row, or `null` | `querySingle(sql, data?, callback)` |
| `nonQuery(sql, data?)` | Driver result, including `affectedRows` / `insertId` | `nonQuery(sql, data?, callback)` |
| `queryMany(sql, data, onRow)` | Resolves when row processing finishes | `queryMany(sql, data, onRow, onEnd)` |
| `end()` | Resolves when admitted work and pool shutdown finish | `end(callback)` |

Callbacks receive `(error, result)`; completion-only callbacks receive `error`.
Check the error before using a result. With no completion callback, handle the
returned Promise. `querySingle()` is intended for row-returning queries, and
`nonQuery()` for writes.

Pass values separately through `?` placeholders. This wrapper uses MySQL2's
`query()` escaping, not server-side prepared statements. Do not interpolate
untrusted values into SQL. Use MySQL2 directly when you need prepared statements,
transactions tied to a specific connection, or lower-level protocol features.

## Process rows without collecting the whole result

`queryMany()` awaits each row handler before requesting the next row. A slow
async handler applies stream backpressure instead of creating an unbounded list
of pending operations:

```js
const seen = [];
await db.queryMany('SELECT 1 AS id UNION ALL SELECT 2 AS id', [], async row => {
  seen.push(row.id);
});
console.log(seen); // [1, 2]
```

The stream buffers up to its configured high-water mark of 16 row objects,
plus data already buffered by the driver/network. Keep row handlers short enough
for your server's timeouts. An error or rejected row handler finishes the
operation once and discards the interrupted connection, so unread results are
not reused by another query. Other pooled connections remain available.

## Existing callback code

The original module-level interface is retained:

```js
const database = require('mysql-simple');

database.init('username', 'password', 'mydatabase', 'localhost', 3306);
database.querySingle('SELECT ? AS answer', [42], (error, row) => {
  if (error) console.error(error);
  else console.log(row.answer);
  database.end(closeError => { if (closeError) console.error(closeError); });
});
```

`init()` also accepts a pool options object and returns the shared instance.
Calling it again while a pool exists throws; await `end()` before reinitializing.
For multiple databases, prefer separate `createDatabase()` instances.

## Shutdown and errors

Call `end()` after submitting the work you intend to finish. It rejects new
operations, waits for admitted queries and row handlers, and closes the pool
once. Repeated calls share that shutdown. An already-failed query does not stop
shutdown; its error still belongs to that query's callback or Promise.

Do not await `end()` from inside a row handler: shutdown is waiting for that
handler to finish. Queries are not automatically retried; retrying a write after
a connection failure could duplicate a successful server-side operation.

## Upgrading from 1.x

Version 2 replaces `mysql@0.9` and `generic-pool@1` with MySQL2 and requires Node.js
22+. The named callback helpers remain; Promise overloads, independent pools,
row-handler backpressure, and explicit shutdown are new.

Streaming failures now complete once instead of releasing a connection from
both the error and end events. Reinitializing the singleton cannot silently leak
its previous pool. MySQL2 determines value conversion and result metadata, so
check application assumptions about dates, decimals, big integers, and write
results when upgrading. Configure driver options explicitly where those types
matter. See [CHANGELOG.md](CHANGELOG.md).

## Development

```sh
npm ci
npm test
npm run test:types
```

Unit tests cover result shapes, errors, row-handler backpressure, pool ownership,
and shutdown. For the real-server suite, point these **test-only** settings at a
disposable database:

```sh
MYSQL_TEST_PORT=3306 MYSQL_TEST_USER=root MYSQL_TEST_PASSWORD=test-password \
  MYSQL_TEST_DATABASE=mysql_simple_test npm run test:integration
```

The integration suite creates and drops a uniquely named table. GitHub Actions
runs it against a fresh MySQL 8.4 service on Node.js 22, 24, and 26.

## License

[MIT](LICENSE). Original copyright © 2011 Cull TV, Inc.

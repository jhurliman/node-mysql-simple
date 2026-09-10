'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const Database = require('../lib/client');
const api = require('..');

function fixture(rows = [{ id: 1 }, { id: 2 }]) {
  const state = { released: 0, destroyed: 0, ended: 0 };
  const connection = {
    query: () => ({ stream: () => Readable.from(rows) }),
    release: () => { state.released++; },
    destroy: () => { state.destroyed++; },
  };
  const pool = {
    query: (sql, data, callback) => callback(null, rows),
    getConnection: callback => callback(null, connection),
    end: callback => { state.ended++; callback(); },
  };
  return { state, connection, pool, database: new Database(pool) };
}

test('query helpers preserve rows, first-row/null and write metadata', async () => {
  const f = fixture();
  assert.deepEqual(await f.database.query('sql'), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(await f.database.querySingle('sql', []), { id: 1 });
  assert.equal(await fixture([]).database.querySingle('sql'), null);
  const write = { affectedRows: 2, insertId: 3 };
  assert.equal(await fixture(write).database.nonQuery('sql'), write);
});

test('callback overloads deliver values and query failures', async () => {
  const f = fixture();
  await new Promise((resolve, reject) => f.database.query('sql', (error, rows) => {
    if (error) return reject(error);
    assert.equal(rows.length, 2); resolve();
  }));
  const error = Error('SQL failed');
  f.pool.query = (sql, data, callback) => callback(error);
  await assert.rejects(f.database.query('sql'), error);
  await new Promise(resolve => f.database.nonQuery('sql', [], received => { assert.equal(received, error); resolve(); }));
});

test('row callbacks are awaited one at a time and a successful connection is released once', async () => {
  const f = fixture(); let active = 0; const rows = [];
  await f.database.queryMany('sql', [], async row => {
    assert.equal(++active, 1);
    await new Promise(resolve => setImmediate(resolve));
    rows.push(row); active--;
  });
  assert.equal(rows.length, 2);
  assert.equal(f.state.released, 1);
  assert.equal(f.state.destroyed, 0);
});

test('row callback failures discard the unread connection and complete once', async () => {
  const f = fixture(); const error = Error('consumer failed'); let endings = 0;
  await new Promise(resolve => f.database.queryMany('sql', [], () => { throw error; }, received => {
    endings++; assert.equal(received, error); resolve();
  }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(endings, 1);
  assert.equal(f.state.destroyed, 1);
  assert.equal(f.state.released, 0);
});

test('stream and synchronous setup failures destroy connections once', async () => {
  for (const setup of [
    () => { throw Error('setup'); },
    () => ({ stream: () => Readable.from((async function* () { yield { id: 1 }; throw Error('stream'); })()) })
  ]) {
    const f = fixture(); f.connection.query = setup;
    await assert.rejects(f.database.queryMany('sql', [], () => {}));
    assert.equal(f.state.destroyed, 1);
    assert.equal(f.state.released, 0);
  }
});

test('acquisition errors reach the caller without releasing an unowned connection', async () => {
  const f = fixture(); f.pool.getConnection = callback => callback(Error('no connection'));
  await assert.rejects(f.database.queryMany('sql', [], () => {}), /no connection/);
  assert.equal(f.state.destroyed, 0);
  assert.equal(f.state.released, 0);
});

test('end waits for admitted operations, rejects new work and closes only once', async () => {
  const f = fixture(); let finish;
  f.pool.query = (sql, data, callback) => { finish = callback; };
  const query = f.database.query('sql');
  const end = f.database.end();
  await assert.rejects(f.database.query('late'), /closing or closed/);
  assert.equal(f.state.ended, 0);
  finish(null, []);
  await query; await end; await f.database.end();
  assert.equal(f.state.ended, 1);
});

test('shutdown still finishes after an admitted query fails', async () => {
  const f = fixture();
  f.pool.query = () => { throw Error('bad query'); };
  const query = f.database.query('sql');
  const end = f.database.end();
  await assert.rejects(query, /bad query/);
  await end;
  assert.equal(f.state.ended, 1);
});

test('legacy singleton initialization is explicit and cannot silently replace an open pool', async () => {
  assert.throws(() => api.query('sql'), /init/);
  const database = api.init({ host: '127.0.0.1' });
  assert.ok(database);
  assert.throws(() => api.init({}), /already initialized/);
  await api.end();
  api.init('user', 'password', 'database', 'localhost', 3306);
  await api.end();
  await api.end();
});

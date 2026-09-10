'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('..');

if (!process.env.MYSQL_TEST_PORT) throw Error('Set MYSQL_TEST_PORT to a disposable MySQL server port');
const options = {
  host: process.env.MYSQL_TEST_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_TEST_PORT),
  user: process.env.MYSQL_TEST_USER || 'root',
  password: process.env.MYSQL_TEST_PASSWORD || 'test-password',
  database: process.env.MYSQL_TEST_DATABASE || 'mysql_simple_test',
  connectionLimit: 1,
};

test('real MySQL: placeholders, writes, concurrent requests, row failures and shutdown', async () => {
  const db = createDatabase(options);
  const table = `mysql_simple_${process.pid}_${Date.now()}`;
  try {
    await db.nonQuery(`CREATE TABLE ${table} (id INT AUTO_INCREMENT PRIMARY KEY, value VARCHAR(100))`);
    const text = "Unicode 🔑 and quote ' OR 1=1 --";
    const write = await db.nonQuery(`INSERT INTO ${table} (value) VALUES (?)`, [text]);
    assert.equal(write.affectedRows, 1);
    assert.equal(write.insertId, 1);
    assert.equal((await db.querySingle(`SELECT value FROM ${table} WHERE id = ?`, [1])).value, text);
    assert.equal(await db.querySingle(`SELECT * FROM ${table} WHERE id = ?`, [99]), null);
    await assert.rejects(db.query('NOT SQL'));
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => db.querySingle('SELECT ? AS n', [i])));
    assert.deepEqual(results.map(row => row.n), Array.from({ length: 20 }, (_, i) => i));
    await db.nonQuery(`INSERT INTO ${table} (value) VALUES (?), (?)`, ['two', 'three']);
    const rows = [];
    await db.queryMany(`SELECT * FROM ${table} ORDER BY id`, [], async row => {
      await new Promise(resolve => setTimeout(resolve, 5)); rows.push(row.id);
    });
    assert.deepEqual(rows, [1, 2, 3]);
    await assert.rejects(db.queryMany(`SELECT * FROM ${table}`, [], () => { throw Error('stop rows'); }), /stop rows/);
    assert.equal((await db.querySingle('SELECT 1 AS ok')).ok, 1);
    await assert.rejects(db.queryMany('INVALID SQL', [], () => {}));
    assert.equal((await db.querySingle('SELECT 2 AS ok')).ok, 2);
    await db.nonQuery(`DROP TABLE ${table}`);
    const pending = Array.from({ length: 5 }, () => db.querySingle('SELECT SLEEP(0.01) AS slept'));
    const ending = db.end();
    assert.equal((await Promise.all(pending)).length, 5);
    await ending;
    await assert.rejects(db.query('SELECT 1'), /closed/);
  } finally { await db.end(); }
});

'use strict';

function complete(promise, callback) {
  if (callback === undefined) return promise;
  promise.then(value => callback(null, value), error => callback(error));
}

function argumentsFor(data, callback) {
  if (typeof data === 'function') return [[], data];
  if (callback !== undefined && typeof callback !== 'function') throw new TypeError('callback must be a function');
  return [data ?? [], callback];
}

class Database {
  constructor(pool) {
    this.pool = pool;
    this.pending = new Set();
    this.closing = false;
    this.ending = null;
  }

  run(operation) {
    if (this.closing) return Promise.reject(new Error('Database pool is closing or closed'));
    const result = Promise.resolve().then(operation);
    this.pending.add(result);
    result.then(() => this.pending.delete(result), () => this.pending.delete(result));
    return result;
  }

  query(sql, data, callback) {
    [data, callback] = argumentsFor(data, callback);
    return complete(this.run(() => new Promise((resolve, reject) => {
      this.pool.query(sql, data, (error, rows) => error ? reject(error) : resolve(rows));
    })), callback);
  }

  querySingle(sql, data, callback) {
    [data, callback] = argumentsFor(data, callback);
    return complete(this.query(sql, data).then(rows => rows.length ? rows[0] : null), callback);
  }

  nonQuery(sql, data, callback) {
    return this.query(sql, data, callback);
  }

  queryMany(sql, data, rowCallback, endCallback) {
    if (typeof rowCallback !== 'function') throw new TypeError('rowCallback must be a function');
    if (endCallback !== undefined && typeof endCallback !== 'function') throw new TypeError('endCallback must be a function');
    return complete(this.run(async () => {
      const connection = await new Promise((resolve, reject) => {
        this.pool.getConnection((error, connection) => error ? reject(error) : resolve(connection));
      });
      try {
        const stream = connection.query(sql, data ?? []).stream({ highWaterMark: 16 });
        for await (const row of stream) await rowCallback(row);
      } catch (error) {
        // An interrupted result must not return an unread protocol stream to
        // the pool. Drop that connection; the pool can create a replacement.
        connection.destroy();
        throw error;
      }
      connection.release();
    }), endCallback);
  }

  end(callback) {
    if (callback !== undefined && typeof callback !== 'function') throw new TypeError('callback must be a function');
    if (!this.ending) {
      this.closing = true;
      this.ending = Promise.allSettled([...this.pending]).then(() => new Promise((resolve, reject) => {
        this.pool.end(error => error ? reject(error) : resolve());
      }));
    }
    return complete(this.ending, callback);
  }
}

module.exports = Database;

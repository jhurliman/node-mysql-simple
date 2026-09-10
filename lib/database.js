'use strict';
const mysql = require('mysql2');
const Database = require('./client');
let shared = null;

exports.createDatabase = function(options = {}) {
  return new Database(mysql.createPool(typeof options === 'string' ? options : {
    connectionLimit: 50,
    idleTimeout: 30000,
    ...options,
  }));
};

exports.init = function(user, password, database, host, port) {
  if (shared) throw new Error('Database already initialized; await end() before reinitializing');
  shared = exports.createDatabase(typeof user === 'object' && user !== null
    ? user : { user, password, database, host, port });
  return shared;
};

for (const method of ['query', 'querySingle', 'queryMany', 'nonQuery']) {
  exports[method] = function(...args) {
    if (!shared) throw new Error('Call init() first, or use createDatabase()');
    return shared[method](...args);
  };
}

exports.end = function(callback) {
  if (callback !== undefined && typeof callback !== 'function') throw new TypeError('callback must be a function');
  const current = shared;
  const result = current ? current.end().then(() => { if (shared === current) shared = null; }) : Promise.resolve();
  if (!callback) return result;
  result.then(() => callback(null), callback);
};

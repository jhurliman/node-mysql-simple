
var poolModule = require('generic-pool');
var mysqlClient = require('mysql').Client;

var pool = null;

/**
 * Initialize the MySQL connection pool with the given database details.
 */
exports.init = function(dbUser, dbPass, dbDatabase, dbHost, dbPort) {
  pool = poolModule.Pool({
    name : 'mysql',
    create : function(callback) {
      var c = new mysqlClient();
      if (dbUser) c.user = dbUser;
      if (dbPass) c.password = dbPass;
      if (dbDatabase) c.database = dbDatabase;
      if (dbHost) c.host = dbHost;
      if (dbPort) c.port = dbPort;
      
      callback(c);
    },
    destroy : function(client) {
      if (client.connected) {
        try { client.end(); }
        catch (err) { console.error('Failed to close MySQL connection: ' + err); }
      }
    },
    max : 50,
    idleTimeoutMillis : 30000,
    log: false
  });
};

/**
 * Execute a query that is expected to return zero or more rows.
 * @param {string} query SQL query to execute
 * @param {Array.<Object>} data Parameters to substitute into the query
 * @param {function(string, Array.<Object>)} callback Callback to execute when
 *        the query completes
 */
exports.query = function(query, data, callback) {
  _doDatabase(function(err, client) {
    if (err) {
      callback(err, null);
      return;
    }
    client.query(query, data, function(err, results, fields) {
      callback(err, results);
    });
  });
};

/**
 * Execute a query that is expected to return zero or one rows.
 */
exports.querySingle = function(query, data, callback) {
  _doDatabase(function(err, client) {
    if (err) {
      callback(err, null);
      return;
    }
    
    client.query(query, data, function(err, results, fields) {
      if (!err && results && results.length > 0) {
        callback(null, results[0]);
      } else {
        callback(err, null);
      }
    });
  });
};

/**
 * Execute a query that is expected to return many rows, and stream the results
 * back one row at a time.
 */
exports.queryMany = function(query, data, rowCallback, endCallback) {
  _doDatabase(function(err, client) {
    if (err) {
      if (endCallback) endCallback(err);
      return;
    }
    
    client.query(query, data)
      .on('error', function(err) {
        if (endCallback) endCallback(err);
      })
      .on('row', rowCallback)
      .on('end', function() {
        if (endCallback) endCallback(null);
      });
  });
};

/**
 * Execute a query that is not expected to return any rows.
 */
exports.nonQuery = function(query, data, callback) {
  _doDatabase(function(err, client) {
    if (err) {
      if (callback) callback(err, null);
      return ;
    }
    
    client.query(query, data, function(err, info) {
      if (callback) callback(err, info);
    });
  });
};

/**
 * Handles the acquisition of a client from the pool and connecting to the 
 * database. Does not handle releasing the client back to the pool.
 * @param {function(string, Object)} callback
 */
function _doDatabase(callback)
{
  pool.acquire(function(client) {
    if (client.connected) {
      callback(null, client);
    } else {
      client.connect(function(err) {
        callback(err, client);
      });
    }
    pool.release(client);
  });
}

# mysql-simple — retired

**This library is no longer maintained. Use [MySQL2](https://sidorares.github.io/node-mysql2/docs) directly for new projects and migrate existing applications when practical.** This repository is retained as a read-only historical reference; no further releases or fixes are planned.

`mysql-simple` originally wrapped `node-mysql` and `generic-pool` to provide a simpler pooled-query interface. MySQL2 now provides connection pooling, callback and Promise APIs, prepared statements, and TypeScript declarations without this additional wrapper.

## Recommended replacement

Install [mysql2](https://www.npmjs.com/package/mysql2):

```sh
npm install mysql2
```

For example, save this as `query.mjs`, configure `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` in your environment, then run `node query.mjs`:

```js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10,
});

try {
  const [rows] = await pool.execute('SELECT ? AS answer', [42]);
  console.log(rows[0].answer);
} finally {
  await pool.end();
}
```

In a long-running application, reuse the pool and close it during shutdown rather than after each query. See the [MySQL2 quickstart](https://sidorares.github.io/node-mysql2/docs) and [Promise API guide](https://sidorares.github.io/node-mysql2/docs/documentation/promise-wrapper).

## Migrating existing code

MySQL2 is not a drop-in replacement for this wrapper:

| mysql-simple | MySQL2 approach |
| --- | --- |
| `database.init(...)` | Create a pool with explicit connection options. |
| `database.query(sql, params, callback)` | Use the callback pool API, or `const [rows] = await pool.query(sql, params)` with the Promise API. |
| `database.querySingle(...)` | Read `rows[0]` from a query result; it is `undefined` when no row matches. |
| `database.nonQuery(...)` | Use the write result from `query()` or `execute()`, including `insertId` and `affectedRows`. |
| `database.queryMany(...)` | Use MySQL2's streaming query API when you need incremental row processing; check its backpressure and error handling. |

Review result shapes, connection options, transactions, and numeric/date conversion against your application's tests before removing `mysql-simple`. The original source remains available here for migration reference.

## License ##

(The MIT License)

Copyright (c) 2011 Cull TV, Inc. &lt;jhurliman@cull.tv&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

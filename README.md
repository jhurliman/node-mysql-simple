# node-mysql-simple #

Provides connection pooling and a simplified interface on top of node-mysql and 
generic-pool. The goal is to abstract away the details of MySQL connection 
handling and provide single-method interfaces to the database.

## Installation ##

Use NPM to install:

    npm install node-mysql-simple

## Usage ##

    var database = require('mysql-simple');
    // Port number is optional
    database.init('username', 'password', 'mydatabase', 'localhost', 3306);
    
    database.query('SELECT * FROM users WHERE active=? LIMIT 10', [true],
      function(err, results)
    {
      if (err) {
        console.log('error fetching some active users: ' + err);
        return;
      }
      
      for (var i = 0; i < results.length; i++)
        console.log('got active user ' + results[i]);
    });
    
    database.querySingle('SELECT id,name FROM users WHERE id=?', [42],
      function(err, result)
    {
      if (err) {
        console.log('error fetching a single active user: ' + err);
        return;
      }
      
      if (result)
        console.log('user exists!');
      else
        console.log('user does not exist');
    });
    
    database.queryMany('SELECT * FROM users WHERE active=?', [true],
      function(row) // Row callback
    {
      console.log('got active user ' + row);
    },
      function(err) // End callback
    {
      if (err) {
        console.log('error fetching all active users: ' + err);
        return;
      }
    });
    
    database.nonQuery('INSERT INTO users (name, email) VALUES (?, ?)',
      ['newuser', 'newuser@gmail.com'], function(err, info)
    {
      if (err) {
        console.log('error inserting new user: ' + err);
        return;
      }
      
      console.log('inserted new user, id = ' + info.insertId);
    });

## Sponsors ##

* [cull.tv](http://cull.tv/) - New music television

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

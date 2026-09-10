import { createDatabase, type RowDataPacket } from '../index.js';
interface User extends RowDataPacket { id: number; name: string; }
const db = createDatabase({ host: 'localhost', connectionLimit: 5 });
async function check() {
  const users: User[] = await db.query<User>('SELECT id, name FROM users');
  const user: User | null = await db.querySingle<User>('SELECT id, name FROM users WHERE id=?', [1]);
  const write = await db.nonQuery('UPDATE users SET name=? WHERE id=?', ['example', 1]);
  const count: number = write.affectedRows;
  await db.queryMany<User>('SELECT id, name FROM users', [], async row => { const id: number = row.id; });
  db.query<User>('SELECT id, name FROM users', (error, rows) => { const id: number | undefined = rows?.[0]?.id; });
  await db.end();
}

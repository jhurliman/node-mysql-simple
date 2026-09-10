# Changelog

## 2.0.0 — Unreleased

- Require Node.js 22+ and replace mysql 0.9 / generic-pool 1 with MySQL2's built-in pool.
- Preserve query/querySingle/queryMany/nonQuery callback helpers and add Promise overloads.
- Add independent createDatabase() instances and explicit, idempotent shutdown that drains admitted work.
- Prevent silent pool replacement on repeated singleton init().
- Await row handlers with backpressure, finish once on failure, and discard interrupted connections.
- Add TypeScript declarations, a lockfile, package contents, unit and MySQL 8.4 integration tests, and GitHub Actions.
- Rewrite the README around complete examples, result shapes, lifecycle, and driver migration.

MySQL2 controls value conversion and result metadata. Review dates, DECIMAL/BIGINT handling, and write-result assumptions before upgrading an application.

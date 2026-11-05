# Production index release

These files are a controlled production release artifact, not Prisma Migrate
history. The repository has no existing `prisma/migrations` directory, so
running `prisma migrate deploy` would not establish a trustworthy baseline.

## Safe production procedure

1. Take a Neon backup/branch and connect with a production database role that
   can create indexes. Do not use a connection string in shell history or git.
2. Run `20261106_performance_indexes_preflight.sql` against the production
   database. Compare each proposed index by table and columns. If an equivalent
   index already exists under a different name, omit that statement from the
   apply file rather than creating a duplicate.
3. Run only the required statements in
   `20261106_performance_indexes_apply.sql` outside a transaction. `CREATE
   INDEX CONCURRENTLY` allows normal reads and writes while an index is built,
   but it can take longer and requires a direct database client that does not
   automatically wrap the command in a transaction.
4. Re-run the preflight and save its output with the release record.

The SQL is additive and does not alter or delete application data. If a
concurrent index build is cancelled or fails, PostgreSQL can leave an invalid
index behind. Check `pg_index.indisvalid` before retrying and drop only that
known invalid index concurrently.

## Rollback

If an index must be removed, first confirm its exact name and that it is not
being used by another release. Then, outside a transaction:

```sql
DROP INDEX CONCURRENTLY IF EXISTS public."INDEX_NAME";
```

Dropping these performance indexes does not remove rows or schema columns, but
it can return the associated workload to its previous query speed.

## Prisma baseline follow-up

After production is reconciled with the schema, establish a separate reviewed
baseline from the pre-index production schema, mark it as applied with `prisma
migrate resolve --applied <baseline-name>`, then add a migration record for the
already-applied index release with `prisma migrate resolve --applied
<index-release-name>`. Do not run either resolve command until a DBA/release
owner confirms the production schema matches the corresponding migration.

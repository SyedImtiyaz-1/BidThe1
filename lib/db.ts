import { SCHEMA_SQL, SCHEMA_VERSION } from './schema'

export type Row = Record<string, any>

export interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>
}

/**
 * Two drivers, one interface.
 *
 * With DATABASE_URL set we talk to a real Postgres over TCP, which covers Neon,
 * Supabase and anything else. Without it we run Postgres compiled to WASM from
 * a folder on disk, so `pnpm dev` works on a laptop with nothing installed.
 * Both are genuinely Postgres, so window functions, CTEs and `on conflict` all
 * behave the same and there is no dialect to keep in your head.
 */
async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim()

  if (url) {
    const { default: postgres } = await import('postgres')
    const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)
    const sql = postgres(url, {
      max: 4,
      idle_timeout: 20,
      // Supabase's transaction-mode pooler cannot hold prepared statements
      // between queries, and neither can any other pgbouncer-style pooler.
      prepare: false,
      ssl: local ? false : 'require',
    })
    const db: Db = {
      async query<T = Row>(text: string, params: unknown[] = []) {
        return (await sql.unsafe(text, params as never[])) as unknown as T[]
      },
    }
    await bootstrap(db)
    return db
  }

  const { PGlite } = await import('@electric-sql/pglite')
  const pg = new PGlite('./.pgdata')
  await pg.exec(SCHEMA_SQL)
  return {
    async query<T = Row>(text: string, params: unknown[] = []) {
      const res = await pg.query<T>(text, params as never[])
      return res.rows
    },
  }
}

/**
 * Create the schema, but only when there is no schema.
 *
 * This used to run every statement on every cold start, which is ~20 round
 * trips including an `alter table` and a `create unique index`, and against a
 * pooled remote database that is both wasteful and liable to be cancelled
 * mid-flight. One cheap existence check replaces all of it.
 *
 * A pooler in transaction mode also rejects multi-statement strings over the
 * extended query protocol, so when it does run it runs one statement at a time.
 */
async function bootstrap(db: Db) {
  // One cheap read on a cold start. Running the whole script every time cost a
  // statement timeout; never running it again meant a new column could not
  // reach a database that already had the tables. The version decides.
  const [row] = await db
    .query<{ v: number | null }>(`select version as v from schema_meta where id = 1`)
    .catch(() => [undefined])
  if (row?.v != null && Number(row.v) >= SCHEMA_VERSION) return

  for (const stmt of SCHEMA_SQL.split(';')) {
    // Skip chunks that are only a comment, which the split leaves behind.
    const body = stmt.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    if (body.trim()) await db.query(stmt)
  }
  await db.query(
    `insert into schema_meta (id, version) values (1, $1)
       on conflict (id) do update set version = excluded.version`,
    [SCHEMA_VERSION],
  )
}

declare global {
  // eslint-disable-next-line no-var
  var __rungDb: Promise<Db> | undefined
}

/** One connection per process, and one that survives dev-server hot reloads. */
export function db(): Promise<Db> {
  globalThis.__rungDb ??= connect()
  return globalThis.__rungDb
}

export async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await db()).query<T>(text, params)
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params)
  return rows[0] ?? null
}

/** Postgres returns bigint as a string to avoid precision loss. Undo that. */
export function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  return typeof v === 'number' ? v : Number(v)
}

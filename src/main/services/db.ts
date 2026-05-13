// SQLite database service. Single source of truth for tables across all agents.
// Schema mirrors SPEC.md, with two extensions on `holdings` (description, asset_type)
// chosen during Agent 1 build alignment.

import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { PORTFOLIO_SEED } from './portfolio-seed'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'cmchq.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
    seedIfEmpty(db)
  }
  return db
}

function migrate(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY,
      ticker TEXT NOT NULL UNIQUE,
      shares REAL NOT NULL,
      cost_basis REAL NOT NULL,
      description TEXT,
      asset_type TEXT,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_cache (
      ticker TEXT PRIMARY KEY,
      price REAL,
      day_change REAL,
      day_change_pct REAL,
      volume INTEGER,
      previous_close REAL,
      market_state TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_accounts (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      refresh_token_encrypted BLOB,
      last_sync_at TEXT
    );

    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      account_id INTEGER REFERENCES email_accounts(id),
      from_address TEXT,
      from_name TEXT,
      subject TEXT,
      snippet TEXT,
      date TEXT,
      is_unread INTEGER DEFAULT 1,
      is_starred INTEGER DEFAULT 0,
      importance_score REAL,
      importance_reason TEXT,
      thread_id TEXT,
      has_attachment INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_emails_account_unread ON emails(account_id, is_unread);
    CREATE INDEX IF NOT EXISTS idx_emails_importance ON emails(importance_score DESC);

    CREATE TABLE IF NOT EXISTS brain_notes (
      id INTEGER PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      title TEXT,
      content TEXT,
      type TEXT,
      area TEXT,
      links_out TEXT,
      embedding BLOB,
      indexed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_brain_type ON brain_notes(type);

    CREATE TABLE IF NOT EXISTS agent_tasks (
      id INTEGER PRIMARY KEY,
      agent_type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      input TEXT,
      output TEXT,
      model TEXT DEFAULT 'claude-sonnet-4-6',
      tokens_used INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS briefings (
      id INTEGER PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      generated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY,
      ticker TEXT,
      signal_type TEXT,
      summary TEXT,
      details TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Defensive: add new columns to holdings if upgrading from older schema.
  const cols = d.prepare(`PRAGMA table_info(holdings)`).all() as { name: string }[]
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('description')) {
    d.exec(`ALTER TABLE holdings ADD COLUMN description TEXT`)
  }
  if (!names.has('asset_type')) {
    d.exec(`ALTER TABLE holdings ADD COLUMN asset_type TEXT`)
  }
}

function seedIfEmpty(d: Database.Database): void {
  const row = d.prepare(`SELECT COUNT(*) as n FROM holdings`).get() as { n: number }
  if (row.n > 0) return
  const insert = d.prepare(
    `INSERT INTO holdings (ticker, shares, cost_basis, description, asset_type)
     VALUES (@ticker, @shares, @cost_basis, @description, @asset_type)`
  )
  const tx = d.transaction((rows: typeof PORTFOLIO_SEED) => {
    for (const r of rows) {
      insert.run({
        ticker: r.ticker,
        shares: r.quantity,
        cost_basis: r.cost_basis_per_share,
        description: r.description,
        asset_type: r.asset_type
      })
    }
  })
  tx(PORTFOLIO_SEED)
  console.log(`[db] seeded ${PORTFOLIO_SEED.length} holdings`)
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

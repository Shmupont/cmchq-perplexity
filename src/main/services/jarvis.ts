// Jarvis chat history persistence. The live WebSocket connection lives in the
// renderer (browser WS API). This service just persists the conversation.

import { getDb } from './db'
import type { JarvisMessage, JarvisRole } from '../../shared/jarvis-types'

export function listMessages(limit = 200): JarvisMessage[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, role, content, created_at
       FROM jarvis_messages
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit) as JarvisMessage[]
  return rows.reverse()
}

export function appendMessage(role: JarvisRole, content: string): JarvisMessage {
  const db = getDb()
  const info = db
    .prepare(`INSERT INTO jarvis_messages (role, content) VALUES (?, ?)`)
    .run(role, content)
  const id = info.lastInsertRowid as number
  return db
    .prepare(`SELECT id, role, content, created_at FROM jarvis_messages WHERE id = ?`)
    .get(id) as JarvisMessage
}

export function getStatus(): { lastMessage: JarvisMessage | null } {
  const db = getDb()
  const last = db
    .prepare(`SELECT id, role, content, created_at FROM jarvis_messages ORDER BY id DESC LIMIT 1`)
    .get() as JarvisMessage | undefined
  return { lastMessage: last ?? null }
}

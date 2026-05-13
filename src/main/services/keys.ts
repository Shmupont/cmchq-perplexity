// API key store backed by Electron safeStorage.
// Keys are encrypted on disk in userData/keys.enc.json as base64-encoded ciphertext.
// On first launch the file does not exist, so callers must handle missing keys.

import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { KeyName } from '../../shared/agent-types'

export type { KeyName }

const FILENAME = 'keys.enc.json'

function filepath(): string {
  return join(app.getPath('userData'), FILENAME)
}

type EncryptedBlob = Partial<Record<KeyName, string>>

function readBlob(): EncryptedBlob {
  const fp = filepath()
  if (!existsSync(fp)) return {}
  try {
    return JSON.parse(readFileSync(fp, 'utf8')) as EncryptedBlob
  } catch {
    return {}
  }
}

function writeBlob(blob: EncryptedBlob): void {
  writeFileSync(filepath(), JSON.stringify(blob, null, 2), 'utf8')
}

function decrypt(b64: string | undefined): string | null {
  if (!b64) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return null
  }
}

export function getKey(name: KeyName): string | null {
  return decrypt(readBlob()[name])
}

export function setKey(name: KeyName, value: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system')
  }
  const blob = readBlob()
  blob[name] = safeStorage.encryptString(value).toString('base64')
  writeBlob(blob)
}

export function clearKey(name: KeyName): void {
  const blob = readBlob()
  delete blob[name]
  writeBlob(blob)
}

export function getKeyStatus(): Record<KeyName, boolean> {
  const blob = readBlob()
  return {
    anthropic: Boolean(decrypt(blob.anthropic)),
    openai: Boolean(decrypt(blob.openai))
  }
}

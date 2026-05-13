// Jarvis (OpenClaw TUI) shared types.

export type JarvisRole = 'user' | 'jarvis'

export type JarvisMessage = {
  id: number
  role: JarvisRole
  content: string
  created_at: string
}

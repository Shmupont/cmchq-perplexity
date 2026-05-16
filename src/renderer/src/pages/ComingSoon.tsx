import { Cpu } from 'lucide-react'

type Props = {
  name: string
  // icon is preserved for backwards-compat; we don't render text emojis anymore.
  icon?: string
  tagline: string
}

export function ComingSoon({ name, tagline }: Props): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center p-10 page-enter">
      <div className="glass-strong p-10 max-w-md w-full text-center relative overflow-hidden">
        {/* Ambient corner glow */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)'
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 w-48 h-48 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.16), transparent 70%)'
          }}
        />

        <div className="relative">
          <div className="mx-auto mb-5 h-12 w-12 rounded-md border border-border/80 bg-surface/60 flex items-center justify-center text-accent-cyan">
            <Cpu size={22} strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-medium text-text-primary lowercase tracking-tight">
            {name}
          </div>
          <div className="card-eyebrow-accent mt-2 mb-5">coming online</div>
          <div className="divider-soft mb-5" />
          <p className="text-sm text-text-secondary leading-relaxed">{tagline}</p>
        </div>
      </div>
    </div>
  )
}

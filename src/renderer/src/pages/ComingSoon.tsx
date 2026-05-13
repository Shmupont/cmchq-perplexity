type Props = {
  name: string
  icon: string
  tagline: string
}

export function ComingSoon({ name, icon, tagline }: Props): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="card-elevated p-10 max-w-md text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <div className="text-2xl font-semibold mb-2">{name}</div>
        <div className="text-[11px] uppercase tracking-widest text-accent-cyan mb-4">
          Coming soon
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{tagline}</p>
      </div>
    </div>
  )
}

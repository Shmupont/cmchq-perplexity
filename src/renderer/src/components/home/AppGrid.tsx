import { AppTile } from './AppTile'
import { GRID_APPS } from '../../apps/registry'
import { useAppStore } from '@stores/appStore'

export function AppGrid(): React.JSX.Element {
  const openApp = useAppStore((s) => s.openApp)
  const phase = useAppStore((s) => s.phase)

  // Layout: 3-column grid. brain spans 2 cols on row 1, portfolio sits in col 3.
  // The CSS auto-flow places the remaining 1×1 tiles into rows 2 and 3.
  return (
    <div className="page-enter h-full w-full flex items-center justify-center px-10 py-8 overflow-hidden">
      <div
        className="grid w-full max-w-[1180px] gap-5"
        style={{
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridAutoRows: 'minmax(180px, 1fr)',
          height: 'min(78vh, 720px)'
        }}
      >
        {GRID_APPS.map((app, idx) => {
          const isOpening = openApp === app.id
          return (
            <AppTile
              key={app.id}
              app={app}
              state={openApp ? phase : 'idle'}
              isOpening={isOpening}
              index={idx}
            />
          )
        })}
      </div>
    </div>
  )
}

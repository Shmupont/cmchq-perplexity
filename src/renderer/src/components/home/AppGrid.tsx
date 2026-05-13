import { AppTile } from './AppTile'
import { GRID_APPS } from '../../apps/registry'
import { useAppStore } from '@stores/appStore'

export function AppGrid(): React.JSX.Element {
  const openApp = useAppStore((s) => s.openApp)
  const phase = useAppStore((s) => s.phase)

  // Layout: 3-column grid, brain spans 2 cols (col 1-2 of row 1), portfolio in col 3.
  // The CSS auto-flow places remaining 1×1 tiles into rows 2 and 3.
  return (
    <div className="h-full w-full flex items-center justify-center px-10 py-8 overflow-hidden">
      <div
        className="grid w-full max-w-[1180px] gap-4"
        style={{
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gridAutoRows: 'minmax(180px, 1fr)',
          height: 'min(78vh, 720px)'
        }}
      >
        {GRID_APPS.map((app) => {
          const isOpening = openApp === app.id
          return (
            <AppTile
              key={app.id}
              app={app}
              state={openApp ? phase : 'idle'}
              isOpening={isOpening}
            />
          )
        })}
      </div>
    </div>
  )
}

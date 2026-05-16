import { TopBar } from '@components/layout/TopBar'
import { RightDrawer } from '@components/layout/RightDrawer'
import { AppGrid } from '@components/home/AppGrid'
import { MiniAppFrame } from '@components/home/MiniAppFrame'

// Homescreen-first layout: the grid IS the navigation. Mini-apps mount on top
// via MiniAppFrame, animated from the clicked tile's origin rect.
function App(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full bg-bg relative overflow-hidden">
      {/* Ambient HUD atmosphere — never intercepts input */}
      <div className="hud-grid" />
      <div className="hud-overlay" />

      <TopBar />
      <main className="flex-1 min-h-0 relative z-[2]">
        <AppGrid />
        <MiniAppFrame />
      </main>
      <RightDrawer />
    </div>
  )
}

export default App

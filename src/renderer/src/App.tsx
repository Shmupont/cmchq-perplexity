import { TopBar } from '@components/layout/TopBar'
import { RightDrawer } from '@components/layout/RightDrawer'
import { AppGrid } from '@components/home/AppGrid'
import { MiniAppFrame } from '@components/home/MiniAppFrame'

// Homescreen-first layout: the grid IS the navigation. Mini-apps mount on top
// via MiniAppFrame, animated from the clicked tile's origin rect.
function App(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full bg-bg">
      <TopBar />
      <main className="flex-1 min-h-0 relative">
        <AppGrid />
        <MiniAppFrame />
      </main>
      <RightDrawer />
    </div>
  )
}

export default App

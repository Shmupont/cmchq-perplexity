import { TopBar } from '@components/layout/TopBar'
import { RightDrawer } from '@components/layout/RightDrawer'
import { AppGrid } from '@components/home/AppGrid'
import { MiniAppFrame } from '@components/home/MiniAppFrame'

import { Home } from '@pages/Home'
import { Terminal } from '@pages/Terminal'
import { Settings } from '@pages/Settings'
import { Crew } from '@pages/Crew'
import { Briefing } from '@pages/Briefing'
import { ComingSoon } from '@pages/ComingSoon'
import { useAppStore } from '@stores/appStore'

// Homescreen-first layout: the grid IS the navigation. Mini-apps mount on top
// via MiniAppFrame, animated from the clicked tile's origin rect.
function App(): React.JSX.Element {
<<<<<<< HEAD
=======
  const page = useAppStore((s) => s.page)

  let body: React.ReactNode = null
  switch (page) {
    case 'home':
      body = <Home />
      break
    case 'terminal':
      body = <Terminal />
      break
    case 'settings':
      body = <Settings />
      break
    case 'brain':
      body = (
        <ComingSoon
          name="Brain"
          icon="🧠"
          tagline="Obsidian graph + AI second brain — Agent 2 builds this next."
        />
      )
      break
    case 'inbox':
      body = (
        <ComingSoon
          name="Inbox"
          icon="📧"
          tagline="Triaged Gmail across 3 accounts — Agent 2 builds this next."
        />
      )
      break
    case 'crew':
      body = <Crew />
      break
    case 'briefing':
      body = <Briefing />
      break
  }

>>>>>>> intelligence
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

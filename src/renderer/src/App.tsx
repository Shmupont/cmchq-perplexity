import { Sidebar } from '@components/layout/Sidebar'
import { TopBar } from '@components/layout/TopBar'
import { RightDrawer } from '@components/layout/RightDrawer'
import { Terminal } from '@pages/Terminal'
import { Settings } from '@pages/Settings'
import { ComingSoon } from '@pages/ComingSoon'
import { useAppStore } from '@stores/appStore'

function App(): React.JSX.Element {
  const page = useAppStore((s) => s.page)

  let body: React.ReactNode = null
  switch (page) {
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
      body = (
        <ComingSoon
          name="Crew"
          icon="🤖"
          tagline="Five Claude agents on standby — Agent 3 builds this next."
        />
      )
      break
    case 'briefing':
      body = (
        <ComingSoon
          name="Briefing"
          icon="📋"
          tagline="Daily 7am intelligence brief — Agent 3 builds this next."
        />
      )
      break
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main key={page} className="flex-1 min-w-0 overflow-auto page-enter">
          {body}
        </main>
      </div>
      <RightDrawer />
    </div>
  )
}

export default App

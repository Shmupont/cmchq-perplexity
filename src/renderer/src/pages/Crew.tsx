import { useCallback, useEffect, useMemo, useState } from 'react'
import { AgentGrid } from '@components/crew/AgentGrid'
import { TaskRunner } from '@components/crew/TaskRunner'
import { TaskQueue } from '@components/crew/TaskQueue'
import { ResultsFeed } from '@components/crew/ResultsFeed'
import type { AgentSummary, AgentId, Task } from '../../../shared/agent-types'

export function Crew(): React.JSX.Element {
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [selectedId, setSelectedId] = useState<AgentId | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [needsKey, setNeedsKey] = useState(false)

  const refreshTasks = useCallback(async () => {
    const list = await window.api.agents.taskHistory(30)
    setTasks(list)
  }, [])

  useEffect(() => {
    window.api.agents.list().then((list) => {
      setAgents(list)
      if (list.length > 0) setSelectedId(list[0].id)
    })
    window.api.keys.status().then((s) => setNeedsKey(!s.anthropic))
    refreshTasks()
  }, [refreshTasks])

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedId) ?? null,
    [agents, selectedId]
  )

  const agentsById = useMemo(() => {
    const map: Record<string, AgentSummary> = {}
    for (const a of agents) map[a.id] = a
    return map
  }, [agents])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 flex flex-col gap-4 p-4 overflow-hidden">
        <header className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">Crew</h1>
          <span className="text-xs text-text-secondary">
            five Claude agents on standby — pick one and tell it what to do
          </span>
        </header>

        {needsKey && (
          <div className="card border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
            No Anthropic API key set. Go to Settings → API Keys to add one before running agents.
          </div>
        )}

        <AgentGrid
          agents={agents}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setOpenTask(null)
          }}
        />

        <div className="grid grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
          <div className="flex flex-col gap-4 min-h-0">
            {selectedAgent ? (
              <TaskRunner agent={selectedAgent} onTaskComplete={refreshTasks} />
            ) : (
              <div className="card p-6 text-sm text-text-muted">Select an agent above.</div>
            )}
            {openTask && (
              <ResultsFeed
                task={openTask}
                agent={agentsById[openTask.agent_type]}
                onClose={() => setOpenTask(null)}
              />
            )}
          </div>
          <TaskQueue tasks={tasks} agentsById={agentsById} onSelect={setOpenTask} />
        </div>
      </div>
    </div>
  )
}

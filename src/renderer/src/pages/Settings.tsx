import { useCallback, useEffect, useState } from 'react'
import type { Holding } from '../../../shared/types'
import { Num } from '@components/common/Number'

const ASSET_TYPES = ['stock', 'etf', 'bond_etf', 'cash'] as const
type AssetType = (typeof ASSET_TYPES)[number]

type Draft = {
  ticker: string
  shares: string
  cost_basis: string
  description: string
  asset_type: AssetType
}

const EMPTY_DRAFT: Draft = {
  ticker: '',
  shares: '',
  cost_basis: '',
  description: '',
  asset_type: 'stock'
}

export function Settings(): React.JSX.Element {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const list = await window.api.holdings.list()
    setHoldings(list)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const ticker = draft.ticker.trim().toUpperCase()
    const shares = Number(draft.shares)
    const cost_basis = Number(draft.cost_basis)
    if (!ticker || !Number.isFinite(shares) || !Number.isFinite(cost_basis)) {
      setError('Ticker, shares, and cost basis are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const next = await window.api.holdings.upsert({
        ticker,
        shares,
        cost_basis,
        description: draft.description.trim() || null,
        asset_type: draft.asset_type
      })
      setHoldings(next)
      setDraft(EMPTY_DRAFT)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(ticker: string): Promise<void> {
    const next = await window.api.holdings.remove(ticker)
    setHoldings(next)
  }

  function startEdit(h: Holding): void {
    setDraft({
      ticker: h.ticker,
      shares: String(h.shares),
      cost_basis: String(h.cost_basis),
      description: h.description ?? '',
      asset_type: (h.asset_type as AssetType) ?? 'stock'
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Portfolio configuration — holdings power the Terminal dashboard.
        </p>
      </div>

      <section className="card-elevated p-5 mb-6">
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3">
          {holdings.some((h) => h.ticker === draft.ticker.toUpperCase())
            ? 'Update Holding'
            : 'Add Holding'}
        </div>
        <form
          onSubmit={submit}
          className="grid grid-cols-[120px_120px_140px_1fr_140px_auto] gap-3 items-end"
        >
          <Field label="Ticker">
            <input
              value={draft.ticker}
              onChange={(e) => setDraft({ ...draft, ticker: e.target.value })}
              placeholder="AAPL"
              className="input"
              autoCapitalize="characters"
            />
          </Field>
          <Field label="Shares">
            <input
              value={draft.shares}
              onChange={(e) => setDraft({ ...draft, shares: e.target.value })}
              placeholder="100"
              className="input num"
              inputMode="decimal"
            />
          </Field>
          <Field label="Cost Basis $/sh">
            <input
              value={draft.cost_basis}
              onChange={(e) => setDraft({ ...draft, cost_basis: e.target.value })}
              placeholder="175.00"
              className="input num"
              inputMode="decimal"
            />
          </Field>
          <Field label="Description">
            <input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Apple Inc"
              className="input"
            />
          </Field>
          <Field label="Type">
            <select
              value={draft.asset_type}
              onChange={(e) => setDraft({ ...draft, asset_type: e.target.value as AssetType })}
              className="input"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 rounded-md bg-accent-blue/20 border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/30 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
        {error && <div className="text-sm text-negative mt-3">{error}</div>}
      </section>

      <section className="card">
        <div className="px-4 py-3 border-b border-border text-[10px] uppercase tracking-widest text-text-muted">
          Current Holdings · {holdings.length}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-secondary">
              <th className="text-left px-3 py-2">Ticker</th>
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-right px-3 py-2">Shares</th>
              <th className="text-right px-3 py-2">Cost $/sh</th>
              <th className="text-right px-3 py-2">Cost Value</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.id} className="border-b border-border/50 hover:bg-surface-elevated">
                <td className="px-3 py-2.5 font-mono">{h.ticker}</td>
                <td className="px-3 py-2.5 text-text-secondary text-[12px]">
                  {h.description ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-text-muted text-[11px] uppercase">
                  {h.asset_type ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Num value={h.shares} decimals={h.shares % 1 === 0 ? 0 : 4} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Num value={h.cost_basis} prefix="$" decimals={2} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Num value={h.shares * h.cost_basis} prefix="$" decimals={2} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => startEdit(h)}
                    className="text-[11px] text-text-secondary hover:text-accent-cyan mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(h.ticker)}
                    className="text-[11px] text-text-secondary hover:text-negative"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      {children}
    </label>
  )
}

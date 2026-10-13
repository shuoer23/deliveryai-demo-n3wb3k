import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Member, Priority } from '../types'
import type { Filters } from '../filters'
import { Avatar } from './Avatar'

interface FilterBarProps {
  members: Member[]
  value: Filters
  onChange: (next: Filters) => void
  onReset: () => void
}

export function FilterBar({ members, value, onChange, onReset }: FilterBarProps) {
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [prioOpen, setPrioOpen] = useState(false)
  const assigneeRef = useRef<HTMLDivElement>(null)
  const prioRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setAssigneeOpen(false)
      if (prioRef.current && !prioRef.current.contains(e.target as Node)) setPrioOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const toggleAssignee = (id: string) => {
    const next = new Set(value.assignees)
    if (next.has(id)) next.delete(id); else next.add(id)
    onChange({ ...value, assignees: next })
  }
  const togglePrio = (p: Priority) => {
    const next = new Set(value.priorities)
    if (next.has(p)) next.delete(p); else next.add(p)
    onChange({ ...value, priorities: next })
  }

  const hasFilters = value.assignees.size > 0 || value.priorities.size > 0 || value.keyword.length > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div ref={assigneeRef} className="relative">
        <button
          type="button"
          onClick={() => { setAssigneeOpen((v) => !v); setPrioOpen(false) }}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold ring-1 transition',
            value.assignees.size > 0 ? 'bg-chili-50 text-chili-700 ring-chili-500/30' : 'text-charcoal-700 ring-charcoal-900/10 hover:ring-chili-500/30',
          )}
        >
          <span>责任人</span>
          {value.assignees.size > 0 && (
            <span className="inline-flex items-center gap-1">
              {Array.from(value.assignees).slice(0, 5).map((id) => (
                <span key={id} className="-ml-1 first:ml-0">
                  <Avatar
                    member={id === '__none__' ? null : members.find((m) => m.id === id) ?? null}
                    size="xs"
                  />
                </span>
              ))}
              <span className="ml-1 text-xs text-charcoal-500">{value.assignees.size}</span>
            </span>
          )}
        </button>
        {assigneeOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-xl bg-white p-1 shadow-card ring-1 ring-charcoal-900/10">
            <button
              type="button"
              onClick={() => toggleAssignee('__none__')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-rice-100"
            >
              <Avatar member={null} size="xs" />
              <span className="flex-1">未分配</span>
              {value.assignees.has('__none__') && <span className="text-chili-600">✓</span>}
            </button>
            <div className="my-1 h-px bg-charcoal-900/5" />
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAssignee(m.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-rice-100"
              >
                <Avatar member={m} size="xs" />
                <span className="flex-1">{m.name}</span>
                {value.assignees.has(m.id) && <span className="text-chili-600">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={prioRef} className="relative">
        <button
          type="button"
          onClick={() => { setPrioOpen((v) => !v); setAssigneeOpen(false) }}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold ring-1 transition',
            value.priorities.size > 0 ? 'bg-chili-50 text-chili-700 ring-chili-500/30' : 'text-charcoal-700 ring-charcoal-900/10 hover:ring-chili-500/30',
          )}
        >
          优先级
          {value.priorities.size > 0 && <span className="text-xs text-charcoal-500">{Array.from(value.priorities).join(' / ')}</span>}
        </button>
        {prioOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-xl bg-white p-1 shadow-card ring-1 ring-charcoal-900/10">
            {(['P0', 'P1', 'P2'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePrio(p)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-rice-100"
              >
                <span className="flex-1">{p} {p === 'P0' ? '高' : p === 'P1' ? '中' : '低'}</span>
                {value.priorities.has(p) && <span className="text-chili-600">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative min-w-[14rem] flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
        <input
          type="search"
          value={value.keyword}
          onChange={(e) => onChange({ ...value, keyword: e.target.value })}
          placeholder="搜索任务标题或描述"
          data-testid="search-input"
          className="w-full rounded-xl bg-white py-2 pl-9 pr-8 text-sm outline-none ring-1 ring-charcoal-900/10 transition placeholder:text-charcoal-500/60 focus:ring-chili-500/30"
        />
        {value.keyword && (
          <button
            type="button"
            onClick={() => onChange({ ...value, keyword: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-charcoal-500 hover:bg-rice-200"
            aria-label="清空搜索"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={!hasFilters}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition',
          hasFilters ? 'text-chili-600 hover:bg-chili-50' : 'cursor-not-allowed text-charcoal-400',
        )}
      >
        <RotateCcw size={14} />
        重置
      </button>
    </div>
  )
}

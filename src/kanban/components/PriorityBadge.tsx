import { cn } from '@/lib/utils'
import type { Priority } from '../types'

const STYLE: Record<Priority, { cls: string; label: string; dot: string }> = {
  P0: { cls: 'bg-chili-100 text-chili-700 ring-1 ring-chili-500/20', label: 'P0', dot: 'bg-chili-500' },
  P1: { cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-500/30', label: 'P1', dot: 'bg-amber-500' },
  P2: { cls: 'bg-rice-200 text-charcoal-700 ring-1 ring-charcoal-900/10', label: 'P2', dot: 'bg-charcoal-500' },
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const s = STYLE[priority]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold', s.cls, className)}>
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

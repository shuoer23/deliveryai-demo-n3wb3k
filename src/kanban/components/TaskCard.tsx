import { useMemo, useState } from 'react'
import { AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getColor, UNASSIGNED_GRAY } from '../types'
import type { Member, Task } from '../types'
import { dueStatus, formatDue } from '../utils'
import { Avatar } from './Avatar'
import { PriorityBadge } from './PriorityBadge'

interface TaskCardProps {
  task: Task
  member: Member | null
  indexInColumn: number
  columnId: string
  onOpen: (task: Task) => void
  onDelete: (task: Task) => void
  onDragStart: (taskId: string) => void
  onDragEnd: () => void
  isDragging: boolean
  isDropTarget: { columnId: string; index: number } | null
}

export function TaskCard({
  task,
  member,
  onOpen,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
}: TaskCardProps) {
  const [hovered, setHovered] = useState(false)
  const color = member ? getColor(member.color) : null

  const status = useMemo(() => dueStatus(task.dueDate), [task.dueDate])
  const dueText = formatDue(task.dueDate)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/kanban-task', task.id)
        onDragStart(task.id)
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        // 点击删除按钮或其子元素时不打开编辑
        const target = e.target as HTMLElement
        if (target.closest('[data-card-action="delete"]')) return
        onOpen(task)
      }}
      className={cn(
        'group relative flex cursor-grab overflow-hidden rounded-xl bg-white p-3 pl-4 shadow-sm ring-1 ring-charcoal-900/5 transition active:cursor-grabbing',
        'hover:-translate-y-0.5 hover:shadow-card hover:ring-charcoal-900/10',
        isDragging && 'rotate-2 opacity-40',
      )}
      title={task.title}
      data-task-id={task.id}
    >
      {/* 责任人颜色条 */}
      <span
        aria-hidden
        className={cn('absolute bottom-0 left-0 top-0 w-[3px]', color ? color.bar : UNASSIGNED_GRAY.bar)}
      />
      <div className="flex w-full min-w-0 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                  status === 'overdue' && 'bg-chili-50 text-chili-700 ring-1 ring-chili-500/20',
                  status === 'today' && 'bg-amber-100 text-amber-700 ring-1 ring-amber-500/30',
                  status === 'upcoming' && 'text-charcoal-500',
                )}
                title={status === 'overdue' ? '已逾期' : status === 'today' ? '今日到期' : '到期日'}
              >
                {status === 'overdue' && <AlertCircle size={11} className="text-chili-600" />}
                {status === 'overdue' ? '已逾期 ' : ''}
                {dueText}
              </span>
            )}
          </div>
          <button
            type="button"
            data-card-action="delete"
            onClick={() => onDelete(task)}
            aria-label="删除任务"
            className={cn(
              'shrink-0 rounded-md p-1 text-charcoal-500 transition hover:bg-chili-50 hover:text-chili-600',
              hovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 md:opacity-0',
            )}
          >
            <Trash2 size={14} />
          </button>
        </div>

        <h3 className="truncate pr-2 text-sm font-bold leading-snug text-charcoal-900">
          {task.title}
        </h3>

        {task.description.trim() && (
          <p className="truncate pr-2 text-xs leading-relaxed text-charcoal-500">
            {task.description}
          </p>
        )}

        <div className="mt-1 flex items-center gap-1.5">
          <Avatar member={member} size="sm" />
          <span className={cn('text-xs font-medium', member ? 'text-charcoal-700' : 'text-charcoal-500')}>
            {member ? member.name : '未分配'}
          </span>
        </div>
      </div>
    </div>
  )
}

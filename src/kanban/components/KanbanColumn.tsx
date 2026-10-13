import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Column, Member, Task } from '../types'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  column: Column
  tasks: Task[]
  membersById: Map<string, Member>
  totalColumns: number
  canDeleteColumn: boolean
  onAddTask: (columnId: string) => void
  onOpenTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onRenameColumn: (id: string, title: string) => void
  onDeleteColumn: (id: string) => void
  onDragStartTask: (taskId: string) => void
  onDragEndTask: () => void
  draggingTaskId: string | null
  onDropTaskAt: (targetColumnId: string, targetIndex: number) => void
  onColumnHeaderDragStart: (columnId: string) => void
  onColumnHeaderDrop: (targetColumnId: string) => void
  draggingColumnId: string | null
}

interface DropTarget { index: number }

export function KanbanColumn(props: KanbanColumnProps) {
  const {
    column, tasks, membersById, totalColumns, canDeleteColumn,
    onAddTask, onOpenTask, onDeleteTask, onRenameColumn, onDeleteColumn,
    onDragStartTask, onDragEndTask, draggingTaskId, onDropTaskAt,
    onColumnHeaderDragStart, onColumnHeaderDrop, draggingColumnId,
  } = props

  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(column.title)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setTitleDraft(column.title), [column.title])
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const commitRename = () => {
    const v = titleDraft.trim()
    if (v && v !== column.title) onRenameColumn(column.id, v)
    else setTitleDraft(column.title)
    setEditing(false)
  }

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    if (!draggingTaskId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const above = e.clientY < rect.top + rect.height / 2
    setDropTarget({ index: above ? index : index + 1 })
  }

  const handleColumnDragOver = (e: React.DragEvent) => {
    if (!draggingTaskId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (tasks.length === 0) setDropTarget({ index: 0 })
  }

  const clearDrop = () => setDropTarget(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggingTaskId && dropTarget) {
      onDropTaskAt(column.id, dropTarget.index)
    }
    if (draggingColumnId) {
      onColumnHeaderDrop(column.id)
    }
    setDropTarget(null)
  }

  return (
    <section
      data-testid={`kanban-column-${column.id}`}
      className={cn(
        'flex h-full w-72 shrink-0 flex-col rounded-2xl bg-rice-50/80 ring-1 ring-charcoal-900/5',
        draggingColumnId === column.id && 'opacity-50 ring-2 ring-chili-500/40',
      )}
      onDragOver={handleColumnDragOver}
      onDragLeave={(e) => {
        // 离开列容器时清空落点，避免误判
        if (!e.currentTarget.contains(e.relatedTarget as Node)) clearDrop()
      }}
      onDrop={handleDrop}
    >
      <header
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-3',
          'cursor-grab active:cursor-grabbing',
        )}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/kanban-column', column.id)
          onColumnHeaderDragStart(column.id)
        }}
        onDragEnd={() => onColumnHeaderDrop('')}
        onDragOver={(e) => {
          if (!draggingColumnId) return
          e.preventDefault()
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {editing ? (
            <input
              autoFocus
              value={titleDraft}
              maxLength={20}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') { setTitleDraft(column.title); setEditing(false) }
              }}
              className="w-full rounded-md bg-white px-2 py-1 text-sm font-bold text-charcoal-900 outline-none ring-1 ring-chili-500/40"
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => setEditing(true)}
              onClick={() => setEditing(true)}
              className="truncate text-left text-sm font-bold text-charcoal-900 hover:text-chili-600"
              title="双击重命名"
            >
              {column.title}
            </button>
          )}
          <span className="shrink-0 rounded-full bg-rice-200 px-2 py-0.5 text-[11px] font-semibold text-charcoal-500">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5" ref={menuRef}>
          <button
            type="button"
            onClick={() => onAddTask(column.id)}
            aria-label="在该列新建任务"
            className="rounded-lg p-1.5 text-charcoal-500 transition hover:bg-rice-200 hover:text-chili-600"
          >
            <Plus size={16} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="列操作"
              className="rounded-lg p-1.5 text-charcoal-500 transition hover:bg-rice-200 hover:text-charcoal-900"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl bg-white p-1 text-sm shadow-card ring-1 ring-charcoal-900/10">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setEditing(true) }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-charcoal-700 hover:bg-rice-100"
                >
                  重命名
                </button>
                <button
                  type="button"
                  disabled={!canDeleteColumn}
                  onClick={() => {
                    setMenuOpen(false)
                    if (canDeleteColumn) onDeleteColumn(column.id)
                  }}
                  title={totalColumns <= 1 ? '至少保留一列' : canDeleteColumn ? '删除空列' : '该列下仍有任务，无法删除'}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left',
                    canDeleteColumn ? 'text-chili-600 hover:bg-chili-50' : 'cursor-not-allowed text-charcoal-400',
                  )}
                >
                  <Trash2 size={14} />
                  {totalColumns <= 1 ? '至少保留一列' : canDeleteColumn ? '删除列' : '列内有任务'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 卡片列表 + 放置区 */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 scrollbar-none">
        {tasks.length === 0 && !draggingTaskId && dropTarget?.index !== 0 && (
          <button
            type="button"
            onClick={() => onAddTask(column.id)}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-charcoal-900/15 bg-transparent px-3 py-6 text-xs text-charcoal-500 transition hover:border-chili-500/40 hover:bg-chili-50/40 hover:text-chili-600"
          >
            <Plus size={18} />
            <span>该筛选条件下暂无任务</span>
          </button>
        )}

        {tasks.length === 0 && draggingTaskId && (
          <div className="flex min-h-[80px] items-center justify-center rounded-xl border border-dashed border-chili-500/40 bg-chili-50/40 text-xs font-semibold text-chili-600">
            放置到该列
          </div>
        )}

        {/* 顶部插入位 */}
        {tasks.length > 0 && dropTarget?.index === 0 && <DropIndicator />}
        {tasks.map((t, idx) => {
          const member = t.assigneeId ? membersById.get(t.assigneeId) ?? null : null
          return (
            <div key={t.id}>
              <div
                onDragOver={(e) => handleCardDragOver(e, idx)}
                onDragLeave={() => { /* dropTarget 在 onDragOver 时实时更新，离开子区域不强行清除 */ }}
                onDrop={(e) => {
                  e.stopPropagation()
                  if (draggingTaskId && dropTarget) {
                    // 如果落点在当前卡片下半部则插在下一个位置
                    onDropTaskAt(column.id, dropTarget.index)
                  }
                  setDropTarget(null)
                }}
              >
                <TaskCard
                  task={t}
                  member={member}
                  indexInColumn={idx}
                  columnId={column.id}
                  onOpen={onOpenTask}
                  onDelete={onDeleteTask}
                  onDragStart={onDragStartTask}
                  onDragEnd={onDragEndTask}
                  isDragging={draggingTaskId === t.id}
                  isDropTarget={null}
                />
              </div>
              {dropTarget?.index === idx + 1 && <DropIndicator />}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DropIndicator() {
  return <div className="mx-1 my-1 h-1 rounded-full bg-chili-500/60 shadow-[0_0_0_3px_rgba(225,59,43,0.12)]" />
}

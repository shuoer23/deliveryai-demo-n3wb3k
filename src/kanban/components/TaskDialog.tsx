import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Column, Member, Priority, Task } from '../types'
import { Avatar } from './Avatar'

interface TaskDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Task | null
  defaultColumnId: string
  columns: Column[]
  members: Member[]
  onClose: () => void
  onSave: (data: {
    id?: string
    title: string
    description: string
    columnId: string
    assigneeId: string | null
    priority: Priority
    dueDate: string | null
  }) => void
  onDelete?: (id: string) => void
}

export function TaskDialog({
  open, mode, initial, defaultColumnId, columns, members, onClose, onSave, onDelete,
}: TaskDialogProps) {
  const firstColumnId = columns[0]?.id ?? defaultColumnId
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [columnId, setColumnId] = useState(firstColumnId)
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [priority, setPriority] = useState<Priority>('P1')
  const [dueDate, setDueDate] = useState<string>('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initial) {
      setTitle(initial.title)
      setDescription(initial.description)
      setColumnId(initial.columnId)
      setAssigneeId(initial.assigneeId)
      setPriority(initial.priority)
      setDueDate(initial.dueDate ?? '')
    } else {
      setTitle('')
      setDescription('')
      setColumnId(defaultColumnId || firstColumnId)
      setAssigneeId(null)
      setPriority('P1')
      setDueDate('')
    }
    setTouched(false)
  }, [open, mode, initial, defaultColumnId, firstColumnId])

  const titleError = useMemo(() => {
    if (!title.trim()) return '请输入任务标题'
    if (title.trim().length > 80) return '标题不超过 80 个字符'
    return ''
  }, [title])
  const descError = description.length > 500 ? '描述不超过 500 个字符' : ''
  const canSave = !titleError && !descError && !!columnId

  const handleSave = () => {
    setTouched(true)
    if (!canSave) return
    onSave({
      id: initial?.id,
      title: title.trim(),
      description: description.trim(),
      columnId,
      assigneeId,
      priority,
      dueDate: dueDate || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent title={mode === 'create' ? '新建任务' : '编辑任务'} className="max-w-xl">
        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal-500">标题 <span className="text-chili-500">*</span></label>
            <input
              autoFocus
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入任务标题"
              data-testid="task-title-input"
              className={cn(
                'w-full rounded-xl bg-white px-3 py-2.5 text-sm outline-none ring-1 transition',
                titleError && touched ? 'ring-chili-500' : 'ring-charcoal-900/10 focus:ring-chili-500/50',
              )}
            />
            {touched && titleError && <p className="mt-1 text-xs text-chili-600">{titleError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal-500">描述</label>
            <textarea
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="补充任务描述（可选）"
              rows={3}
              className={cn(
                'w-full resize-none rounded-xl bg-white px-3 py-2.5 text-sm outline-none ring-1 transition',
                descError ? 'ring-chili-500' : 'ring-charcoal-900/10 focus:ring-chili-500/50',
              )}
            />
            {descError && <p className="mt-1 text-xs text-chili-600">{descError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal-500">所属列</label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-charcoal-900/10 focus:ring-chili-500/50"
              >
                {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal-500">责任人</label>
              <div className="relative">
                <select
                  value={assigneeId ?? '__none__'}
                  onChange={(e) => setAssigneeId(e.target.value === '__none__' ? null : e.target.value)}
                  className="w-full appearance-none rounded-xl bg-white px-3 py-2.5 pl-9 text-sm outline-none ring-1 ring-charcoal-900/10 focus:ring-chili-500/50"
                >
                  <option value="__none__">未分配</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                  <Avatar
                    member={assigneeId ? members.find((m) => m.id === assigneeId) ?? null : null}
                    size="xs"
                  />
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal-500">优先级</label>
              <div className="flex gap-1.5">
                {(['P0', 'P1', 'P2'] as Priority[]).map((p) => {
                  const active = priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ring-1',
                        active && p === 'P0' && 'bg-chili-500 text-white ring-chili-500',
                        active && p === 'P1' && 'bg-amber-500 text-white ring-amber-500',
                        active && p === 'P2' && 'bg-charcoal-700 text-white ring-charcoal-700',
                        !active && 'bg-white text-charcoal-500 ring-charcoal-900/10 hover:bg-rice-100',
                      )}
                    >
                      {p} {p === 'P0' ? '高' : p === 'P1' ? '中' : '低'}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal-500">截止日期</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-charcoal-900/10 focus:ring-chili-500/50"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <div>
            {mode === 'edit' && onDelete && initial && (
              <Button type="button" variant="ghost" className="text-chili-600 hover:bg-chili-50 hover:text-chili-700" onClick={() => onDelete(initial.id)}>
                删除任务
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Button type="button" disabled={!canSave} onClick={handleSave}data-testid="task-save-btn">保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

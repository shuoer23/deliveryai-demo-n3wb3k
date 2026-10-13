import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ASSIGNEE_COLORS, getColor } from '../types'
import type { AssigneeColorKey, Member } from '../types'
import { Avatar } from './Avatar'
import { initialsOf } from '../utils'

interface MembersDialogProps {
  open: boolean
  members: Member[]
  taskCountByMember: Map<string, number>
  onClose: () => void
  onAdd: (name: string, color: AssigneeColorKey) => void
  onRename: (id: string, name: string) => void
  onColor: (id: string, color: AssigneeColorKey) => void
  onDelete: (id: string) => void
}

export function MembersDialog({
  open, members, taskCountByMember, onClose, onAdd, onRename, onColor, onDelete,
}: MembersDialogProps) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<AssigneeColorKey>(ASSIGNEE_COLORS[0].key)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<AssigneeColorKey>(ASSIGNEE_COLORS[0].key)

  useEffect(() => {
    if (!open) {
      setNewName('')
      setEditingId(null)
    }
    // 新成员默认颜色取第一个未使用的
    const used = new Set(members.map((m) => m.color))
    const free = ASSIGNEE_COLORS.find((c) => !used.has(c.key))
    setNewColor(free?.key ?? ASSIGNEE_COLORS[0].key)
  }, [open, members])

  const startEdit = (m: Member) => {
    setEditingId(m.id)
    setEditName(m.name)
    setEditColor(m.color)
  }
  const commitEdit = (id: string) => {
    const v = editName.trim()
    if (v && v.length <= 20) {
      if (v !== members.find((m) => m.id === id)?.name) onRename(id, v)
      if (editColor !== members.find((m) => m.id === id)?.color) onColor(id, editColor)
    }
    setEditingId(null)
  }

  const handleAdd = () => {
    const v = newName.trim()
    if (!v || v.length > 20) return
    onAdd(v, newColor)
    setNewName('')
    const used = new Set([...members.map((m) => m.color), newColor])
    const free = ASSIGNEE_COLORS.find((c) => !used.has(c.key))
    setNewColor(free?.key ?? ASSIGNEE_COLORS[0].key)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent title="成员管理" className="max-w-lg">
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex max-h-[48vh] flex-col gap-2 overflow-y-auto pr-1">
            {members.map((m) => {
              const count = taskCountByMember.get(m.id) ?? 0
              const isEditing = editingId === m.id
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-charcoal-900/5">
                  {isEditing ? (
                    <span
                      className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white', getColor(editColor).bg)}
                    >{initialsOf(editName || m.name)}</span>
                  ) : (
                    <Avatar member={m} size="md" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editName}
                        maxLength={20}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-md bg-rice-50 px-2 py-1 text-sm font-semibold outline-none ring-1 ring-chili-500/40"
                      />
                    ) : (
                      <>
                        <span className="truncate text-sm font-semibold text-charcoal-900">{m.name}</span>
                        <span className="text-xs text-charcoal-500">{count} 个任务</span>
                      </>
                    )}
                    {isEditing && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ASSIGNEE_COLORS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setEditColor(c.key)}
                            aria-label={`选择颜色 ${c.key}`}
                            className={cn(
                              'h-5 w-5 rounded-full ring-2 ring-offset-1 transition',
                              c.bg,
                              editColor === c.key ? 'ring-charcoal-900' : 'ring-transparent hover:ring-charcoal-900/30',
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => commitEdit(m.id)}
                          className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                          aria-label="保存"
                        ><Check size={16} /></button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg p-2 text-charcoal-500 hover:bg-rice-200"
                          aria-label="取消"
                        ><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="rounded-lg p-2 text-charcoal-500 hover:bg-rice-200"
                          aria-label="编辑成员"
                        ><Pencil size={16} /></button>
                        <button
                          type="button"
                          onClick={() => onDelete(m.id)}
                          className="rounded-lg p-2 text-chili-600 hover:bg-chili-50"
                          aria-label="删除成员"
                          title={count > 0 ? `该成员当前有 ${count} 个任务，删除后将变为「未分配」` : '删除成员'}
                        ><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl bg-rice-100/70 p-3 ring-1 ring-charcoal-900/5">
            <div className="flex items-center gap-2">
              <span
                className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white', getColor(newColor).bg)}
              >{initialsOf(newName || '新成员')}</span>
              <input
                value={newName}
                maxLength={20}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                placeholder="输入成员姓名，1–20 字"
                className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 ring-charcoal-900/10 focus:ring-chili-500/40"
              />
              <Button type="button" size="sm" onClick={handleAdd} disabled={!newName.trim()}>
                <Plus size={14} />添加
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
              {ASSIGNEE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setNewColor(c.key)}
                  aria-label={`选择颜色 ${c.key}`}
                  className={cn(
                    'h-5 w-5 rounded-full ring-2 ring-offset-1 transition',
                    c.bg,
                    newColor === c.key ? 'ring-charcoal-900' : 'ring-transparent hover:ring-charcoal-900/30',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

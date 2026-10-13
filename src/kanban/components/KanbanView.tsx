import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGrid, Plus, Settings2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useElderlyMode } from '@/hooks/useElderlyMode'
import type { Column, Member, Task } from '../types'
import type { Priority } from '../types'
import { useKanbanStore } from '../store'
import { debounce } from '../utils'
import { ConfirmDialog } from './ConfirmDialog'
import { FilterBar } from './FilterBar'
import type { Filters } from '../filters'
import { EMPTY_FILTERS } from '../filters'
import { KanbanColumn } from './KanbanColumn'
import { MembersDialog } from './MembersDialog'
import { TaskDialog } from './TaskDialog'

type DialogState =
  | { kind: 'none' }
  | { kind: 'task-create'; columnId: string }
  | { kind: 'task-edit'; task: Task }
  | { kind: 'column-delete'; column: Column }
  | { kind: 'task-delete'; task: Task }
  | { kind: 'member-delete'; member: Member }
  | { kind: 'reset' }

export function KanbanView() {
  const { state, actions, storageAvailable, taskCountByColumn, taskCountByMember } = useKanbanStore()
  const { enabled: elderly, toggle: toggleElderly } = useElderlyMode()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })
  const [membersOpen, setMembersOpen] = useState(false)
  const [storageBanner, setStorageBanner] = useState(!storageAvailable)

  useEffect(() => { setStorageBanner(!storageAvailable) }, [storageAvailable])

  // Filters（内存态，不持久化）
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [keywordDraft, setKeywordDraft] = useState('')
  useEffect(() => {
    // 关键词 debounce 200ms
    const apply = debounce((kw: string) => {
      setFilters((f) => ({ ...f, keyword: kw }))
    }, 200)
    apply(keywordDraft)
    return () => { /* no cleanup needed for debounced timers */ }
  }, [keywordDraft])

  const membersById = useMemo(() => {
    const m = new Map<string, Member>()
    for (const mem of state.members) m.set(mem.id, mem)
    return m
  }, [state.members])

  const columnsSorted = useMemo(
    () => [...state.columns].sort((a, b) => a.order - b.order),
    [state.columns],
  )

  // 应用筛选后的任务映射 columnId -> tasks（保持原 order）
  const filteredTasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>()
    const keyword = filters.keyword.trim().toLowerCase()
    for (const t of state.tasks) {
      if (filters.assignees.size > 0) {
        const key = t.assigneeId ?? '__none__'
        if (!filters.assignees.has(key)) continue
      }
      if (filters.priorities.size > 0 && !filters.priorities.has(t.priority)) continue
      if (keyword) {
        const hay = (t.title + ' ' + t.description).toLowerCase()
        if (!hay.includes(keyword)) continue
      }
      if (!map.has(t.columnId)) map.set(t.columnId, [])
      map.get(t.columnId)!.push(t)
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order)
    return map
  }, [state.tasks, filters])

  // 拖拽状态
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null)

  const onDropTaskAt = useCallback(
    (targetColumnId: string, targetIndex: number) => {
      if (!draggingTaskId) return
      actions.moveTask(draggingTaskId, targetColumnId, targetIndex)
      setDraggingTaskId(null)
    },
    [draggingTaskId, actions],
  )

  // 列拖拽：拖拽结束时交换顺序（采用"拖到某列即放在其前面"的简单模型，列头在 onDrop 里处理）
  const pendingColumnDrag = useRef<{ src: string | null }>({ src: null })
  const onColumnHeaderDragStart = (columnId: string) => {
    setDraggingTaskId(null)
    setDraggingColumnId(columnId)
    pendingColumnDrag.current.src = columnId
  }
  const onColumnHeaderDrop = (targetColumnId: string) => {
    const src = pendingColumnDrag.current.src
    if (src && targetColumnId && src !== targetColumnId) {
      const ids = columnsSorted.map((c) => c.id)
      const srcIdx = ids.indexOf(src)
      const tgtIdx = ids.indexOf(targetColumnId)
      if (srcIdx >= 0 && tgtIdx >= 0) {
        ids.splice(srcIdx, 1)
        ids.splice(tgtIdx, 0, src)
        actions.reorderColumns(ids)
      }
    }
    pendingColumnDrag.current.src = null
    setDraggingColumnId(null)
  }

  // 全局 dragend 兜底：拖到看板外松手回弹
  useEffect(() => {
    const onDragEnd = () => {
      setDraggingTaskId(null)
      setDraggingColumnId(null)
      pendingColumnDrag.current.src = null
    }
    window.addEventListener('dragend', onDragEnd)
    return () => window.removeEventListener('dragend', onDragEnd)
  }, [])

  const openAddColumn = () => {
    const title = window.prompt('输入新列名称', '新列')
    if (!title) return
    const trimmed = title.trim()
    if (!trimmed || trimmed.length > 20) return
    actions.addColumn(trimmed)
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setKeywordDraft('')
  }

  const handleSaveTask = (data: {
    id?: string
    title: string
    description: string
    columnId: string
    assigneeId: string | null
    priority: Priority
    dueDate: string | null
  }) => {
    if (data.id) {
      // 编辑：如果 columnId 改变，则移动到目标列末尾（由 updateTask+reorder 处理；直接 updateTask patch columnId 会让 normalize 将其追加到末尾吗？
      // 在 reducer 的 normalize 中，悬挂任务不会发生，但当 columnId 改变时原 order 可能冲突；为保证"编辑修改所属列 → 到目标列末尾"，
      // 这里先 update 再移动到目标列长度 - 1 的位置。
      const targetColTasks = state.tasks.filter((t) => t.columnId === data.columnId && t.id !== data.id)
      actions.updateTask(data.id, {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        priority: data.priority,
        dueDate: data.dueDate,
        columnId: data.columnId,
      })
      // 如果所属列变了，显式放到末尾
      const original = state.tasks.find((t) => t.id === data.id)
      if (original && original.columnId !== data.columnId) {
        // 新列长度（包含刚插入的任务）
        setTimeout(() => actions.moveTask(data.id!, data.columnId, targetColTasks.length), 0)
      }
    } else {
      actions.addTask({
        title: data.title,
        description: data.description,
        columnId: data.columnId,
        assigneeId: data.assigneeId,
        priority: data.priority,
        dueDate: data.dueDate,
      })
    }
    setDialog({ kind: 'none' })
  }

  const defaultColumnId = columnsSorted[0]?.id ?? ''

  // 弹窗状态渲染所需的数据
  const editingTask = dialog.kind === 'task-edit' ? dialog.task : null
  const createDefaultCol = dialog.kind === 'task-create' ? dialog.columnId : defaultColumnId

  return (
    <div className="flex min-h-screen flex-col bg-rice-100 paper-noise">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-20 border-b border-charcoal-900/5 bg-rice-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-chili-500 text-white shadow-sm">
                <LayoutGrid size={18} />
              </span>
              <div>
                <h1 className="text-lg font-extrabold leading-tight text-charcoal-900">项目看板</h1>
                <p className="text-xs text-charcoal-500">可视化任务与团队协作</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1 rounded-full bg-rice-200 px-3 py-1 text-xs font-semibold text-charcoal-700 sm:inline-flex">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                示例数据
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMembersOpen(true)}
                className="hidden sm:inline-flex"
              >
                <Users size={14} />
                成员（{state.members.length}）
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleElderly}
                title={elderly ? '切换为常规模式' : '切换为老人模式'}
              >
                <Settings2 size={14} />
                {elderly ? '常规' : '大字'}
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setDialog({ kind: 'task-create', columnId: defaultColumnId })}
              >
                <Plus size={14} />
                新任务
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setMembersOpen(true)}
                className="sm:hidden"
                aria-label="成员"
              >
                <Users size={14} />
              </Button>
            </div>
          </div>

          {storageBanner && (
            <div className="rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-500/30">
              本地存储不可用，本次修改在刷新后会丢失。
            </div>
          )}

          <FilterBar
            members={state.members}
            value={{ ...filters, keyword: keywordDraft }}
            onChange={(f) => { setKeywordDraft(f.keyword); setFilters((prev) => ({ ...prev, assignees: f.assignees, priorities: f.priorities })) }}
            onReset={resetFilters}
          />
        </div>
      </header>

      {/* 看板主体 */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 lg:px-6">
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-none">
          {columnsSorted.map((col) => {
            const tasks = filteredTasksByColumn.get(col.id) ?? []
            const totalInCol = taskCountByColumn.get(col.id) ?? 0
            return (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasks}
                membersById={membersById}
                totalColumns={columnsSorted.length}
                canDeleteColumn={totalInCol === 0 && columnsSorted.length > 1}
                onAddTask={(columnId) => setDialog({ kind: 'task-create', columnId })}
                onOpenTask={(task) => setDialog({ kind: 'task-edit', task })}
                onDeleteTask={(task) => setDialog({ kind: 'task-delete', task })}
                onRenameColumn={actions.renameColumn}
                onDeleteColumn={(id) => {
                  const col2 = state.columns.find((c) => c.id === id)
                  if (col2) setDialog({ kind: 'column-delete', column: col2 })
                }}
                onDragStartTask={setDraggingTaskId}
                onDragEndTask={() => setDraggingTaskId(null)}
                draggingTaskId={draggingTaskId}
                onDropTaskAt={onDropTaskAt}
                onColumnHeaderDragStart={onColumnHeaderDragStart}
                onColumnHeaderDrop={onColumnHeaderDrop}
                draggingColumnId={draggingColumnId}
              />
            )
          })}

          {/* 新增列按钮 */}
          <button
            type="button"
            onClick={openAddColumn}
            className="flex h-[88px] w-72 shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed border-charcoal-900/15 bg-rice-50/60 text-sm font-semibold text-charcoal-500 transition hover:border-chili-500/40 hover:bg-chili-50/40 hover:text-chili-600"
          >
            <Plus size={16} />
            新增列
          </button>
        </div>

        <div className="mt-4 flex justify-center pb-4">
          <button
            type="button"
            onClick={() => setDialog({ kind: 'reset' })}
            className="text-xs text-charcoal-500 underline-offset-2 hover:text-chili-600 hover:underline"
          >
            重置为初始示例
          </button>
        </div>
      </main>

      {/* 弹窗 */}
      <TaskDialog
        open={dialog.kind === 'task-create' || dialog.kind === 'task-edit'}
        mode={editingTask ? 'edit' : 'create'}
        initial={editingTask}
        defaultColumnId={createDefaultCol}
        columns={columnsSorted}
        members={state.members}
        onClose={() => setDialog({ kind: 'none' })}
        onSave={handleSaveTask}
        onDelete={(id) => {
          const t = state.tasks.find((x) => x.id === id)
          if (t) {
            // 先关闭编辑弹窗，弹出确认删除
            setDialog({ kind: 'task-delete', task: t })
          }
        }}
      />

      <MembersDialog
        open={membersOpen}
        members={state.members}
        taskCountByMember={taskCountByMember}
        onClose={() => setMembersOpen(false)}
        onAdd={actions.addMember}
        onRename={(id, name) => actions.updateMember(id, { name })}
        onColor={(id, color) => actions.updateMember(id, { color })}
        onDelete={(id) => {
          const m = state.members.find((x) => x.id === id)
          if (m) setDialog({ kind: 'member-delete', member: m })
        }}
      />

      <ConfirmDialog
        open={dialog.kind === 'column-delete'}
        title={dialog.kind === 'column-delete' ? `确定删除列「${dialog.column.title}」吗？` : ''}
        description="删除后该列消失，且无法恢复。"
        confirmText="删除"
        danger
        onCancel={() => setDialog({ kind: 'none' })}
        onConfirm={() => {
          if (dialog.kind === 'column-delete') actions.deleteColumn(dialog.column.id)
          setDialog({ kind: 'none' })
        }}
      />

      <ConfirmDialog
        open={dialog.kind === 'task-delete'}
        title={dialog.kind === 'task-delete' ? `删除任务「${dialog.task.title}」？` : ''}
        description="删除后任务从看板移除，且无法恢复。"
        confirmText="删除"
        danger
        onCancel={() => setDialog({ kind: 'none' })}
        onConfirm={() => {
          if (dialog.kind === 'task-delete') actions.deleteTask(dialog.task.id)
          setDialog({ kind: 'none' })
        }}
      />

      <ConfirmDialog
        open={dialog.kind === 'member-delete'}
        title={dialog.kind === 'member-delete' ? `删除成员「${dialog.member.name}」？` : ''}
        description={
          dialog.kind === 'member-delete'
            ? (taskCountByMember.get(dialog.member.id) ?? 0) > 0
              ? `该成员当前有 ${taskCountByMember.get(dialog.member.id)} 个任务，删除后这些任务将变为「未分配」，是否继续？`
              : '删除后该成员从看板移除，且无法恢复。'
            : ''
        }
        confirmText="删除"
        danger
        onCancel={() => setDialog({ kind: 'none' })}
        onConfirm={() => {
          if (dialog.kind === 'member-delete') actions.deleteMember(dialog.member.id)
          setDialog({ kind: 'none' })
        }}
      />

      <ConfirmDialog
        open={dialog.kind === 'reset'}
        title="重置为初始示例？"
        description="将清空所有列、任务和成员，恢复到预置示例数据，操作不可撤销。"
        confirmText="重置"
        danger
        onCancel={() => setDialog({ kind: 'none' })}
        onConfirm={() => { actions.resetToSeed(); setDialog({ kind: 'none' }); resetFilters() }}
      />
    </div>
  )
}

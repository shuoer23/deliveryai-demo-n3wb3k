import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { uid } from '@/lib/utils'
import type {
  AssigneeColorKey,
  Column,
  KanbanState,
  Member,
  Priority,
  Task,
} from './types'
import { ASSIGNEE_COLORS, STORAGE_KEY } from './types'
import { buildSeedState } from './seed'

type Action =
  | { type: 'HYDRATE'; state: KanbanState }
  | { type: 'RESET_TO_SEED' }
  | { type: 'ADD_COLUMN'; title: string; afterId?: string }
  | { type: 'RENAME_COLUMN'; id: string; title: string }
  | { type: 'DELETE_COLUMN'; id: string }
  | { type: 'REORDER_COLUMNS'; orderedIds: string[] }
  | { type: 'ADD_TASK'; task: Omit<Task, 'id' | 'order' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_TASK'; id: string; patch: Partial<Omit<Task, 'id' | 'createdAt'>> }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'MOVE_TASK'; taskId: string; targetColumnId: string; targetIndex: number }
  | { type: 'ADD_MEMBER'; name: string; color: AssigneeColorKey }
  | { type: 'UPDATE_MEMBER'; id: string; patch: Partial<Omit<Member, 'id'>> }
  | { type: 'DELETE_MEMBER'; id: string }

function now() {
  return new Date().toISOString()
}

function normalize(state: KanbanState): KanbanState {
  const sortedCols = [...state.columns].sort((a, b) => a.order - b.order).map((c, i) => ({ ...c, order: i }))
  const tasks = [...state.tasks]
  // 按列重写 order
  const colIds = new Set(sortedCols.map((c) => c.id))
  // 移除悬挂任务（columnId 不存在），迁移到第一列
  const fallbackCol = sortedCols[0]?.id
  const byCol = new Map<string, Task[]>()
  for (const t of tasks) {
    const cid = colIds.has(t.columnId) ? t.columnId : fallbackCol
    if (!cid) continue
    if (!byCol.has(cid)) byCol.set(cid, [])
    byCol.get(cid)!.push({ ...t, columnId: cid })
  }
  const normalizedTasks: Task[] = []
  for (const c of sortedCols) {
    const list = (byCol.get(c.id) ?? []).sort((a, b) => a.order - b.order)
    list.forEach((t, i) => normalizedTasks.push({ ...t, order: i }))
    byCol.delete(c.id)
  }
  return { ...state, columns: sortedCols, tasks: normalizedTasks }
}

function pickAutoColor(members: Member[]): AssigneeColorKey {
  const used = new Set(members.map((m) => m.color))
  const free = ASSIGNEE_COLORS.find((c) => !used.has(c.key))
  return (free?.key ?? ASSIGNEE_COLORS[0].key)
}

function reducer(state: KanbanState, action: Action): KanbanState {
  switch (action.type) {
    case 'HYDRATE':
      return normalize(action.state)
    case 'RESET_TO_SEED':
      return normalize(buildSeedState())
    case 'ADD_COLUMN': {
      const maxOrder = state.columns.reduce((m, c) => Math.max(m, c.order), -1)
      const newCol: Column = { id: uid(), title: action.title.trim(), order: maxOrder + 1 }
      const cols = [...state.columns, newCol]
      // afterId 支持插入到指定列之后（目前简单追加到末尾）
      return normalize({ ...state, columns: cols })
    }
    case 'RENAME_COLUMN':
      return normalize({
        ...state,
        columns: state.columns.map((c) => (c.id === action.id ? { ...c, title: action.title.trim() } : c)),
      })
    case 'DELETE_COLUMN': {
      const target = state.columns.find((c) => c.id === action.id)
      if (!target) return state
      const remaining = state.columns.filter((c) => c.id !== action.id)
      const orphanCount = state.tasks.filter((t) => t.columnId === action.id).length
      if (orphanCount > 0) return state // 删除前由 UI 做校验拦截
      if (remaining.length < 1) return state
      return normalize({ ...state, columns: remaining })
    }
    case 'REORDER_COLUMNS': {
      const orderedIds = action.orderedIds.filter((id) => state.columns.some((c) => c.id === id))
      const cols = orderedIds.map((id, i) => ({ ...state.columns.find((c) => c.id === id)!, order: i }))
      // 若存在遗漏（理论上不会），补到末尾
      for (const c of state.columns) {
        if (!orderedIds.includes(c.id)) cols.push({ ...c, order: cols.length })
      }
      return normalize({ ...state, columns: cols })
    }
    case 'ADD_TASK': {
      const colTasks = state.tasks.filter((t) => t.columnId === action.task.columnId)
      const newTask: Task = {
        ...action.task,
        id: uid(),
        order: colTasks.length,
        createdAt: now(),
        updatedAt: now(),
      }
      return normalize({ ...state, tasks: [...state.tasks, newTask] })
    }
    case 'UPDATE_TASK': {
      return normalize({
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, ...action.patch, id: t.id, createdAt: t.createdAt, updatedAt: now() } : t,
        ),
      })
    }
    case 'DELETE_TASK':
      return normalize({ ...state, tasks: state.tasks.filter((t) => t.id !== action.id) })
    case 'MOVE_TASK': {
      const { taskId, targetColumnId, targetIndex } = action
      const moving = state.tasks.find((t) => t.id === taskId)
      if (!moving) return state
      // 从原列移除，插入到目标列指定位置；同列时先移除后插入
      const others = state.tasks.filter((t) => t.id !== taskId)
      const sameCol = moving.columnId === targetColumnId
      const targetList = others
        .filter((t) => t.columnId === targetColumnId)
        .sort((a, b) => a.order - b.order)
      const insertAt = Math.max(0, Math.min(targetIndex, targetList.length))
      const placed: Task = { ...moving, columnId: targetColumnId, order: insertAt }
      // 重新拼接所有任务：其他列 + 目标列插入后
      const rebuilt: Task[] = []
      for (const c of state.columns) {
        if (c.id === targetColumnId) {
          const list = [...targetList]
          list.splice(insertAt, 0, placed)
          list.forEach((t, i) => rebuilt.push({ ...t, order: i }))
        } else {
          const list = others
            .filter((t) => t.columnId === c.id)
            .sort((a, b) => a.order - b.order)
          list.forEach((t, i) => rebuilt.push({ ...t, order: i }))
        }
      }
      // 同列拖拽时 updatedAt 更新
      return normalize({ ...state, tasks: rebuilt.map((t) => (t.id === taskId && sameCol ? { ...t, updatedAt: now() } : t)) })
    }
    case 'ADD_MEMBER': {
      const member: Member = { id: uid(), name: action.name.trim(), color: action.color }
      return normalize({ ...state, members: [...state.members, member] })
    }
    case 'UPDATE_MEMBER':
      return normalize({
        ...state,
        members: state.members.map((m) => (m.id === action.id ? { ...m, ...action.patch, id: m.id } : m)),
      })
    case 'DELETE_MEMBER': {
      const target = state.members.find((m) => m.id === action.id)
      if (!target) return state
      return normalize({
        ...state,
        members: state.members.filter((m) => m.id !== action.id),
        tasks: state.tasks.map((t) => (t.assigneeId === action.id ? { ...t, assigneeId: null } : t)),
      })
    }
    default:
      return state
  }
}

function safeParse(raw: string | null): KanbanState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1) return null
    if (!Array.isArray(parsed.columns) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.members)) return null
    return parsed as KanbanState
  } catch {
    return null
  }
}

export function useKanbanStore() {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = safeParse(raw)
      if (parsed) return normalize(parsed)
    } catch {
      // ignore
    }
    return normalize(buildSeedState())
  })

  const storageAvailableRef = useRef(true)
  // 检查 localStorage 可用性
  useEffect(() => {
    try {
      const k = '__kanban_probe__'
      localStorage.setItem(k, '1')
      localStorage.removeItem(k)
      storageAvailableRef.current = true
    } catch {
      storageAvailableRef.current = false
    }
  }, [])

  // 持久化
  useEffect(() => {
    if (!storageAvailableRef.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      storageAvailableRef.current = false
    }
  }, [state])

  const actions = useMemo(
    () => ({
      resetToSeed: () => dispatch({ type: 'RESET_TO_SEED' }),
      addColumn: (title: string) => dispatch({ type: 'ADD_COLUMN', title }),
      renameColumn: (id: string, title: string) => dispatch({ type: 'RENAME_COLUMN', id, title }),
      deleteColumn: (id: string) => dispatch({ type: 'DELETE_COLUMN', id }),
      reorderColumns: (orderedIds: string[]) => dispatch({ type: 'REORDER_COLUMNS', orderedIds }),
      addTask: (task: Omit<Task, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => dispatch({ type: 'ADD_TASK', task }),
      updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => dispatch({ type: 'UPDATE_TASK', id, patch }),
      deleteTask: (id: string) => dispatch({ type: 'DELETE_TASK', id }),
      moveTask: (taskId: string, targetColumnId: string, targetIndex: number) =>
        dispatch({ type: 'MOVE_TASK', taskId, targetColumnId, targetIndex }),
      addMember: (name: string, color?: AssigneeColorKey) =>
        dispatch({ type: 'ADD_MEMBER', name, color: color ?? pickAutoColor(state.members) }),
      updateMember: (id: string, patch: Partial<Omit<Member, 'id'>>) => dispatch({ type: 'UPDATE_MEMBER', id, patch }),
      deleteMember: (id: string) => dispatch({ type: 'DELETE_MEMBER', id }),
    }),
    [state.members],
  )

  const storageAvailable = storageAvailableRef.current

  // 便捷：列下任务数（用于删除列校验）
  const taskCountByColumn = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of state.tasks) map.set(t.columnId, (map.get(t.columnId) ?? 0) + 1)
    return map
  }, [state.tasks])

  const taskCountByMember = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of state.tasks) {
      if (t.assigneeId) map.set(t.assigneeId, (map.get(t.assigneeId) ?? 0) + 1)
    }
    return map
  }, [state.tasks])

  const getTasksInColumn = useCallback(
    (columnId: string) => state.tasks.filter((t) => t.columnId === columnId).sort((a, b) => a.order - b.order),
    [state.tasks],
  )

  return { state, actions, storageAvailable, taskCountByColumn, taskCountByMember, getTasksInColumn }
}

export type { Priority }

export type Priority = 'P0' | 'P1' | 'P2'

export interface Member {
  id: string
  name: string
  color: AssigneeColorKey
}

export interface Column {
  id: string
  title: string
  order: number
}

export interface Task {
  id: string
  columnId: string
  order: number
  title: string
  description: string
  assigneeId: string | null
  priority: Priority
  dueDate: string | null // YYYY-MM-DD
  createdAt: string
  updatedAt: string
}

export interface KanbanState {
  columns: Column[]
  tasks: Task[]
  members: Member[]
  version: 1
}

export const STORAGE_KEY = 'kanban:v1' as const

// 预设色板：沿用仓库主色 + 5 个安全辅色，白字对比度均 ≥ 4.5:1
export const ASSIGNEE_COLORS = [
  { key: 'chili', bg: 'bg-chili-500', ring: 'ring-chili-500/30', hex: '#e13b2b', text: 'text-white', bar: 'bg-chili-500' },
  { key: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500/30', hex: '#e69b18', text: 'text-white', bar: 'bg-amber-500' },
  { key: 'charcoal', bg: 'bg-charcoal-700', ring: 'ring-charcoal-700/30', hex: '#34312d', text: 'text-white', bar: 'bg-charcoal-700' },
  { key: 'blue', bg: 'bg-blue-600', ring: 'ring-blue-600/30', hex: '#2563eb', text: 'text-white', bar: 'bg-blue-600' },
  { key: 'green', bg: 'bg-emerald-600', ring: 'ring-emerald-600/30', hex: '#059669', text: 'text-white', bar: 'bg-emerald-600' },
  { key: 'purple', bg: 'bg-violet-600', ring: 'ring-violet-600/30', hex: '#7c3aed', text: 'text-white', bar: 'bg-violet-600' },
  { key: 'pink', bg: 'bg-rose-500', ring: 'ring-rose-500/30', hex: '#f43f5e', text: 'text-white', bar: 'bg-rose-500' },
  { key: 'cyan', bg: 'bg-cyan-600', ring: 'ring-cyan-600/30', hex: '#0891b2', text: 'text-white', bar: 'bg-cyan-600' },
] as const

export type AssigneeColorKey = (typeof ASSIGNEE_COLORS)[number]['key']

export const UNASSIGNED_GRAY = { bg: 'bg-charcoal-500/50', hex: '#a8a29e', bar: 'bg-stone-400', text: 'text-white' } as const

export function getColor(key: AssigneeColorKey) {
  return ASSIGNEE_COLORS.find((c) => c.key === key) ?? ASSIGNEE_COLORS[0]
}

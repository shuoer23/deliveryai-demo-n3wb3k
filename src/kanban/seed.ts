import { uid } from '@/lib/utils'
import type { AssigneeColorKey, KanbanState } from './types'

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function pickUnused(used: Set<AssigneeColorKey>, palette: AssigneeColorKey[]): AssigneeColorKey {
  const free = palette.find((c) => !used.has(c))
  if (free) return free
  return palette[used.size % palette.length]
}

export function buildSeedState(): KanbanState {
  const now = new Date().toISOString()
  const palette: AssigneeColorKey[] = ['chili', 'amber', 'charcoal', 'blue', 'green', 'purple', 'pink', 'cyan']
  const used = new Set<AssigneeColorKey>()

  const memberSeeds = [
    { name: '张小明', color: 'chili' as AssigneeColorKey },
    { name: '李华', color: 'blue' as AssigneeColorKey },
    { name: '王小雨', color: 'purple' as AssigneeColorKey },
    { name: 'Chen', color: 'green' as AssigneeColorKey },
    { name: '赵云', color: 'amber' as AssigneeColorKey },
  ]
  const members = memberSeeds.map((m) => {
    const color = m.color ?? pickUnused(used, palette)
    used.add(color)
    return { id: uid(), name: m.name, color }
  })

  const columns = [
    { id: uid(), title: '待办', order: 0 },
    { id: uid(), title: '进行中', order: 1 },
    { id: uid(), title: '已完成', order: 2 },
  ]

  const [colTodo, colDoing, colDone] = columns

  const tasks = [
    {
      title: '梳理项目看板需求',
      description: '对齐列结构、任务字段与责任人强调等关键交互',
      assignee: members[0], priority: 'P0' as const, due: daysFromNow(-2), column: colDone, order: 0,
    },
    {
      title: '实现拖拽排序列与卡片',
      description: '支持列内排序和跨列移动，落点指示清晰',
      assignee: members[1], priority: 'P0' as const, due: daysFromNow(0), column: colDoing, order: 0,
    },
    {
      title: '成员管理弹窗',
      description: '新增/重命名/删除成员，删除有任务成员时批量置为未分配',
      assignee: members[2], priority: 'P1' as const, due: daysFromNow(2), column: colDoing, order: 1,
    },
    {
      title: '筛选与搜索工具条',
      description: '责任人/优先级多选 + 关键字模糊匹配，支持一键重置',
      assignee: members[3], priority: 'P1' as const, due: daysFromNow(5), column: colTodo, order: 0,
    },
    {
      title: '本地存储持久化',
      description: '所有写操作写入 localStorage，不可用时降级为内存态并提示',
      assignee: members[4], priority: 'P2' as const, due: null, column: colTodo, order: 1,
    },
    {
      title: '补充 E2E 主流程用例',
      description: '新建任务 → 分配责任人 → 拖拽 → 筛选验证',
      assignee: null, priority: 'P1' as const, due: daysFromNow(7), column: colTodo, order: 2,
    },
    {
      title: '设计评审走查',
      description: '完成视觉走查，调整色板和间距',
      assignee: members[0], priority: 'P2' as const, due: daysFromNow(-5), column: colDone, order: 1,
    },
  ].map((t) => ({
    id: uid(),
    columnId: t.column.id,
    order: t.order,
    title: t.title,
    description: t.description,
    assigneeId: t.assignee ? t.assignee.id : null,
    priority: t.priority,
    dueDate: t.due,
    createdAt: now,
    updatedAt: now,
  }))

  return { columns, tasks, members, version: 1 }
}

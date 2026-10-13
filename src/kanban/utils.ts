export function initialsOf(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  // 含中文 → 取最后两个字符；两个字正好取两字，单字取单字
  if (/[\u3400-\u9FFF]/.test(trimmed)) {
    const chars = Array.from(trimmed.replace(/\s+/g, ''))
    if (chars.length === 1) return chars[0]
    return chars.slice(-2).join('')
  }
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    const s = parts[0]
    return s.slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export type DueStatus = 'overdue' | 'today' | 'upcoming' | 'none'

export function dueStatus(due: string | null): DueStatus {
  if (!due) return 'none'
  const today = todayStr()
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return 'upcoming'
}

export function formatDue(due: string | null): string {
  if (!due) return ''
  const d = new Date(due + 'T00:00:00')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = d.getFullYear()
  if (y === new Date().getFullYear()) return `${m}-${day}`
  return `${y}-${m}-${day}`
}

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, ms: number): (...args: Args) => void {
  let t: ReturnType<typeof setTimeout> | null = null
  return (...args: Args) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

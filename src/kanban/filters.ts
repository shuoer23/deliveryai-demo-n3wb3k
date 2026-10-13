import type { Priority } from './types'

export interface Filters {
  assignees: Set<string> // memberId or '__none__'
  priorities: Set<Priority>
  keyword: string
}

export const EMPTY_FILTERS: Filters = { assignees: new Set(), priorities: new Set(), keyword: '' }

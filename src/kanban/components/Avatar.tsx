import { cn } from '@/lib/utils'
import { getColor, UNASSIGNED_GRAY } from '../types'
import type { Member } from '../types'
import { initialsOf } from '../utils'

interface AvatarProps {
  member: Member | null
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

export function Avatar({ member, size = 'sm', className }: AvatarProps) {
  const dim = size === 'xs' ? 'h-5 w-5 text-[10px]' : size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-8 w-8 text-sm'
  if (!member) {
    return (
      <span
        className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', dim, UNASSIGNED_GRAY.bg, className)}
        aria-label="未分配"
      >
        <span className="opacity-80">?</span>
      </span>
    )
  }
  const color = getColor(member.color)
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', dim, color.bg, color.text, className)}
      aria-label={member.name}
      title={member.name}
    >
      {initialsOf(member.name)}
    </span>
  )
}

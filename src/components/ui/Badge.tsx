import type { ReactNode } from 'react'

type Color = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'slate' | 'orange' | 'teal'

interface Props {
  children: ReactNode
  color?: Color
}

const colors: Record<Color, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  slate: 'bg-slate-100 text-slate-600',
  orange: 'bg-orange-100 text-orange-700',
  teal: 'bg-teal-100 text-teal-700',
}

export function Badge({ children, color = 'slate' }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

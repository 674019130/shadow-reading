'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Headphones,
  Library,
  BarChart3,
  Home,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: '首页', icon: Home },
  { href: '/materials', label: '材料库', icon: Library },
  { href: '/progress', label: '进度', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const isPractice = pathname.startsWith('/practice')

  if (isPractice) return null

  return (
    <aside className="w-14 md:w-52 shrink-0 bg-bg-inset flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-3.5 md:px-4">
        <Headphones size={18} className="text-accent shrink-0" strokeWidth={1.5} />
        <span className="hidden md:block text-[13px] font-medium text-text-primary tracking-[-0.01em]">
          Shadow Reading
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[13px] transition-colors
                ${isActive
                  ? 'text-text-primary bg-bg-card'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-card/50'
                }
              `}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="hidden md:block">{label}</span>
              {isActive && (
                <span className="hidden md:block ml-auto w-1 h-1 rounded-full bg-accent" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4">
        <p className="hidden md:block text-[11px] text-text-muted/60 leading-relaxed">
          每天 15 分钟
        </p>
      </div>
    </aside>
  )
}

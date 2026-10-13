import { useEffect } from 'react'
import i18next from 'i18next'
import { KanbanView } from '@/kanban/components/KanbanView'

export default function App() {
  useEffect(() => {
    document.documentElement.lang = 'zh-CN'
    document.title = '项目看板 · 团队协作'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', '项目管理看板：可视化任务进度、团队协作与责任人分配')
    try {
      localStorage.setItem('i18nextLng', 'zh')
    } catch {
      // 忽略：localStorage 不可用不阻塞
    }
    // 强制使用中文，保持 i18n 基础设施但看板默认中文
    if (i18next.language !== 'zh') i18next.changeLanguage('zh').catch(() => {})
  }, [])

  return <KanbanView />
}

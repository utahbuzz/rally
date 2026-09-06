import { useEffect, useState } from 'react'

/**
 * True on phones and tablets, where the playbook and inspector cannot sit
 * beside the field and become drawers instead.
 */
export const COMPACT_QUERY = '(max-width: 1024px)'

export function useCompact(): boolean {
  const [compact, setCompact] = useState(() => {
    try {
      return window.matchMedia(COMPACT_QUERY).matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    let mq: MediaQueryList
    try {
      mq = window.matchMedia(COMPACT_QUERY)
    } catch {
      return
    }
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches)
    setCompact(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return compact
}

import { useCallback, useState } from 'react'

export interface PopoverHost {
  openId: string | null
  toggle: (id: string) => void
  close: () => void
}

// Shared open/closed state for a small group of sibling popovers (e.g. one player panel's color
// picker and the shared controls' dropdowns) so opening one closes any other already open in the
// same group. Give each player's panel its own instance so opening a popover in one player's panel
// never affects another player's — that independence is what lets two people edit their own setup
// at once on a split screen.
export function usePopoverHost(): PopoverHost {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }, [])

  const close = useCallback(() => setOpenId(null), [])

  return { openId, toggle, close }
}

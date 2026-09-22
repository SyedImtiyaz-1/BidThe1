'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { DISPLAY_CURRENCIES } from '@/lib/config'

export default function CurrencySelect({ value }: { value: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <select
      className="cur-select num"
      value={value}
      disabled={pending}
      aria-label="Display currency"
      onChange={(e) => {
        document.cookie = `cur=${e.target.value};path=/;max-age=31536000;samesite=lax`
        start(() => router.refresh())
      }}
    >
      {DISPLAY_CURRENCIES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  )
}

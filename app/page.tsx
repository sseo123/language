'use client'

import { Desktop } from '@/components/desktop/desktop'
import { Onboarding } from '@/components/onboarding'
import { StoreProvider, useStore } from '@/lib/store'

function Root() {
  const { onboarded } = useStore()
  return onboarded ? <Desktop /> : <Onboarding />
}

export default function Page() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  )
}

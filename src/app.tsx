import { AppWindow } from '@/components/app/app-window'
import { Onboarding } from '@/components/onboarding'
import { StoreProvider, useStore } from '@/lib/store'

function Root() {
  const { hydrated, onboarded } = useStore()
  if (!hydrated) return null
  return onboarded ? <AppWindow /> : <Onboarding />
}

export function App() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  )
}

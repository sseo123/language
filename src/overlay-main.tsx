import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from '@/lib/store'
import { api } from '@/lib/tauri'
import { CaptureSession } from './overlay/capture-session'
import './styles.css'

/** A crashed overlay would leave an invisible window over the whole screen; hide it instead. */
class OverlayBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Capture overlay crashed', error)
    void api.endCapture()
    setTimeout(() => this.setState({ failed: false }), 0)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverlayBoundary>
      <StoreProvider>
        <CaptureSession />
      </StoreProvider>
    </OverlayBoundary>
  </StrictMode>,
)

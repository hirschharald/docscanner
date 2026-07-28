import React, { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const PwaInstallBanner = React.memo(() => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  if (!visible) return null

  return (
    <div className="pwa-install-banner alert alert-primary d-flex align-items-center gap-3 shadow-lg">
      <span className="fs-4">📲</span>
      <div className="flex-grow-1">
        <strong>App installieren</strong>
        <div className="small">DocScanner als App auf deinem Gerät speichern</div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleInstall}>Installieren</button>
      <button className="btn-close" onClick={() => setVisible(false)} aria-label="Schließen" />
    </div>
  )
})

PwaInstallBanner.displayName = 'PwaInstallBanner'

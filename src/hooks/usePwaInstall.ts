import { useEffect, useState } from 'react'
import { detectPlatform, isStandaloneDisplay, type InstallPlatform } from '../lib/pwa'

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandaloneDisplay())
  const [updateReady, setUpdateReady] = useState(false)
  const platform: InstallPlatform = detectPlatform()

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstalled(true)
      setPromptEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let active = true
    void navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting && active) setUpdateReady(true)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true)
          }
        })
      })
    })
    return () => {
      active = false
    }
  }, [])

  async function install() {
    if (!promptEvent) return false
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    setPromptEvent(null)
    return choice.outcome === 'accepted'
  }

  async function applyUpdate() {
    const registration = await navigator.serviceWorker.getRegistration()
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }

  return { promptEvent, installed, updateReady, platform, install, applyUpdate }
}

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  getVersion: () => ipcRenderer.invoke('get-version'),

  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', { title, body })
  },

  closeOverlay: () => {
    ipcRenderer.send('close-overlay')
  },

  onToggleCommandPalette: (callback: () => void) => {
    ipcRenderer.on('toggle-command-palette', callback)
    return () => {
      ipcRenderer.removeListener('toggle-command-palette', callback)
    }
  },
})

declare global {
  interface Window {
    electron: {
      getVersion: () => Promise<string>
      showNotification: (title: string, body: string) => void
      closeOverlay: () => void
      onToggleCommandPalette: (callback: () => void) => () => void
    }
  }
}

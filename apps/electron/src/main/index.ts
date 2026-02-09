import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let tray: Tray | null = null

const WEB_URL = process.env.NEXFLOW_WEB_URL || 'http://localhost:3000'

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'NexFlow Enterprise',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow.loadURL(`${WEB_URL}/dashboard`)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Hide instead of close on macOS
  if (process.platform === 'darwin') {
    mainWindow.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault()
        mainWindow?.hide()
      }
    })
  }
}

function createOverlayWindow(): void {
  overlayWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  overlayWindow.loadURL(`${WEB_URL}/overlay`)

  overlayWindow.on('blur', () => {
    overlayWindow?.hide()
  })
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../resources/icon.png')
  tray = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open NexFlow',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createMainWindow()
        }
      },
    },
    {
      label: 'Quick Command (⌘K)',
      click: () => showOverlay(),
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow?.loadURL(`${WEB_URL}/dashboard`)
        mainWindow?.show()
      },
    },
    {
      label: 'Bottlenecks',
      click: () => {
        mainWindow?.loadURL(`${WEB_URL}/dashboard?card=bottlenecks`)
        mainWindow?.show()
      },
    },
    {
      label: 'Tasks',
      click: () => {
        mainWindow?.loadURL(`${WEB_URL}/dashboard?card=tasks`)
        mainWindow?.show()
      },
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => autoUpdater.checkForUpdatesAndNotify(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('NexFlow Enterprise')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      createMainWindow()
    }
  })
}

function showOverlay(): void {
  if (overlayWindow) {
    // Center on screen
    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    overlayWindow.setPosition(
      Math.floor((width - 600) / 2),
      Math.floor((height - 400) / 3)
    )
    overlayWindow.show()
    overlayWindow.focus()
  }
}

function registerGlobalShortcuts(): void {
  // Cmd+K for quick command overlay
  globalShortcut.register('CommandOrControl+K', () => {
    if (mainWindow?.isFocused()) {
      // Let the web app handle it
      mainWindow.webContents.send('toggle-command-palette')
    } else {
      showOverlay()
    }
  })
}

function setupAutoUpdater(): void {
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', () => {
    new Notification({
      title: 'Update Available',
      body: 'A new version of NexFlow is available. It will be downloaded in the background.',
    }).show()
  })

  autoUpdater.on('update-downloaded', () => {
    new Notification({
      title: 'Update Ready',
      body: 'Update downloaded. It will be installed on restart.',
    }).show()
  })
}

// IPC handlers
ipcMain.handle('get-version', () => app.getVersion())

ipcMain.on('show-notification', (_event, { title, body }) => {
  new Notification({ title, body }).show()
})

ipcMain.on('close-overlay', () => {
  overlayWindow?.hide()
})

// App lifecycle
app.whenReady().then(() => {
  createMainWindow()
  createOverlayWindow()
  createTray()
  registerGlobalShortcuts()
  setupAutoUpdater()

  app.on('activate', () => {
    if (mainWindow === null) {
      createMainWindow()
    } else {
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// Extend app interface for isQuitting flag
declare module 'electron' {
  interface App {
    isQuitting?: boolean
  }
}

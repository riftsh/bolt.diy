import { app, BrowserWindow, Menu, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isMac = process.platform === 'darwin'
let mainWindow = null

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
      mainWindow.focus()
    } else {
      createWindow()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    buildAppMenu()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      } else if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        if (!mainWindow.isVisible()) {
          mainWindow.show()
        }
        mainWindow.focus()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (!isMac) {
      app.quit()
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, './build/index.html')}`
  mainWindow.loadURL(startUrl)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (process.env.DEBUG_ELECTRON) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

function buildAppMenu() {
  const template = []

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'Preferences', accelerator: 'Cmd+,', click: () => sendToRenderer('menu:open-settings') },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }

  template.push({
    label: 'File',
    submenu: [
      {
        label: 'New Chat',
        accelerator: 'CmdOrCtrl+N',
        click: () => sendToRenderer('menu:new-chat'),
      },
      {
        label: 'Open Chat\u2026',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendToRenderer('menu:open-chat'),
      },
      { type: 'separator' },
      {
        label: 'Export Chat\u2026',
        accelerator: 'CmdOrCtrl+E',
        click: () => sendToRenderer('menu:export-chat'),
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  })

  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteAndMatchStyle' },
      { role: 'delete' },
      { role: 'selectAll' },
      { type: 'separator' },
      {
        label: 'Find',
        accelerator: 'CmdOrCtrl+F',
        click: () => sendToRenderer('menu:find'),
      },
    ],
  })

  template.push({
    label: 'View',
    submenu: [
      {
        label: 'Toggle Sidebar',
        accelerator: 'CmdOrCtrl+B',
        click: () => sendToRenderer('menu:toggle-sidebar'),
      },
      {
        label: 'Toggle Workbench',
        accelerator: 'CmdOrCtrl+Shift+B',
        click: () => sendToRenderer('menu:toggle-workbench'),
      },
      {
        label: 'Toggle Terminal',
        accelerator: 'CmdOrCtrl+`',
        click: () => sendToRenderer('menu:toggle-terminal'),
      },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forceReload' },
      {
        label: 'Toggle Developer Tools',
        accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
        click: () => mainWindow && mainWindow.webContents.toggleDevTools(),
      },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  })

  template.push({
    label: 'Window',
    submenu: isMac
      ? [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' },
        ]
      : [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
  })

  template.push({
    role: 'help',
    submenu: [
      {
        label: 'Wisp Documentation',
        click: () => shell.openExternal('https://github.com/wisp/wisp#readme'),
      },
      {
        label: 'Project Repository',
        click: () => shell.openExternal('https://github.com/wisp/wisp'),
      },
      {
        label: 'Report an Issue',
        click: () => shell.openExternal('https://github.com/wisp/wisp/issues/new'),
      },
      { type: 'separator' },
      {
        label: 'View License',
        click: () => sendToRenderer('menu:show-license'),
      },
    ],
  })

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

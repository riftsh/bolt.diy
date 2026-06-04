import { app, contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    nodeVersion: process.versions.node,
    isPackaged: app.isPackaged,
    subscribe: (channel, handler) => {
        const allowedPrefix = 'menu:'

        if (typeof channel !== 'string' || !channel.startsWith(allowedPrefix)) {
            return () => {}
        }

        const listener = (_event, ...args) => {
            try {
                handler(...args)
            } catch (error) {
                console.error(`[electron] handler for ${channel} threw:`, error)
            }
        }

        ipcRenderer.on(channel, listener)

        return () => {
            ipcRenderer.removeListener(channel, listener)
        }
    },
})

import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    nodeVersion: process.versions.node,
})

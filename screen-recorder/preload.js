const { contextBridge, ipcRenderer } = require('electron');

// 安全地向渲染进程暴露有限的 API
contextBridge.exposeInMainWorld('api', {
  // ===== 截屏 =====
  takeScreenshot: (mode, rect) =>
    ipcRenderer.invoke('screenshot:capture', { mode, rect }),

  // ===== 区域选择 =====
  startRegionSelect: () =>
    ipcRenderer.invoke('region:start'),

  // ===== 文件管理 =====
  getFiles: (filter) =>
    ipcRenderer.invoke('files:getAll', filter),

  deleteFile: (id) =>
    ipcRenderer.invoke('files:delete', id),

  renameFile: (id, newName) =>
    ipcRenderer.invoke('files:rename', { id, newName }),

  togglePin: (id) =>
    ipcRenderer.invoke('files:togglePin', id),

  openFile: (id) =>
    ipcRenderer.invoke('files:openFile', id),

  exportSubtitle: (id, format) =>
    ipcRenderer.invoke('dialog:exportSubtitle', { id, format }),

  // ===== 音频设备 =====
  getAudioDevices: () =>
    ipcRenderer.invoke('audio:getDevices'),

  // ===== 录制 =====
  startRecording: (params) =>
    ipcRenderer.invoke('recording:start', params),

  stopRecording: () =>
    ipcRenderer.invoke('recording:stop'),

  // ===== 字幕 (阶段 8) =====
  generateSubtitle: (videoId) =>
    ipcRenderer.invoke('subtitle:generate', videoId),

  onSubtitleProgress: (callback) => {
    ipcRenderer.on('subtitle:progress', (_event, data) => callback(data));
  },

  removeSubtitleListener: () => {
    ipcRenderer.removeAllListeners('subtitle:progress');
  }
});

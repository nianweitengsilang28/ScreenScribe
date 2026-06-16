const { app, BrowserWindow, ipcMain, screen, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 功能模块
const screenshot = require('./src/screenshot');
const recorder = require('./src/recorder');
const audioDevices = require('./src/audio-devices');
const store = require('./src/store');

let mainWindow = null;
let regionWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 550,
    title: '🎀 截屏识字幕',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#fef3ea'
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// ===== 区域选择窗口 =====

function createRegionSelector() {
  return new Promise((resolve) => {
    const displays = screen.getAllDisplays();
    // 计算所有显示器的总边界
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    displays.forEach(d => {
      const { x, y, width, height } = d.bounds;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + width > maxX) maxX = x + width;
      if (y + height > maxY) maxY = y + height;
    });

    regionWindow = new BrowserWindow({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // 允许 region-selector.html 使用 nodeIntegration（需要 ipcRenderer）
    // 重新创建但允许 nodeIntegration
    regionWindow.close();
    regionWindow = new BrowserWindow({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    regionWindow.loadFile(path.join(__dirname, 'src', 'region-selector.html'));
    regionWindow.setAlwaysOnTop(true, 'screen-saver');

    // 区域选择完成
    const onSelected = (_event, rect) => {
      cleanup();
      resolve({ success: true, rect });
    };

    // 用户取消
    const onCancelled = () => {
      cleanup();
      resolve({ success: false, canceled: true });
    };

    const cleanup = () => {
      ipcMain.removeListener('region:selected', onSelected);
      ipcMain.removeListener('region:cancelled', onCancelled);
      if (regionWindow && !regionWindow.isDestroyed()) {
        regionWindow.close();
        regionWindow = null;
      }
    };

    ipcMain.once('region:selected', onSelected);
    ipcMain.once('region:cancelled', onCancelled);

    regionWindow.on('closed', () => {
      cleanup();
    });
  });
}

// ===== IPC Handlers =====

function setupIPC() {
  // ---- 区域选择 ----
  ipcMain.handle('region:start', async () => {
    // 隐藏主窗口避免被截到
    if (mainWindow) mainWindow.hide();
    // 等一小段时间让窗口完全隐藏
    await new Promise(r => setTimeout(r, 200));

    const result = await createRegionSelector();

    // 恢复主窗口
    if (mainWindow) mainWindow.show();

    return result;
  });

  // ---- 截屏 ----
  ipcMain.handle('screenshot:capture', async (_event, { mode, rect }) => {
    try {
      let result;
      if (mode === 'fullscreen') {
        // 截屏前隐藏主窗口
        if (mainWindow) mainWindow.hide();
        await new Promise(r => setTimeout(r, 200));

        result = await screenshot.captureFullscreen();

        if (mainWindow) mainWindow.show();
      } else if (mode === 'region' && rect) {
        // 区域截屏（窗口已在区域选择时隐藏）
        result = await screenshot.captureRegion(rect);
      } else {
        throw new Error('无效的截屏模式');
      }

      // 存入元数据
      const record = store.addFile({
        id: 'img-' + Date.now(),
        type: 'screenshot',
        fileName: result.fileName,
        filePath: result.filePath,
        duration: null,
        createdAt: result.createdAt,
        isPinned: false,
        hasSubtitle: false,
        srtPath: null
      });

      return { success: true, file: record };
    } catch (err) {
      console.error('截屏失败:', err);
      if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
      return { success: false, error: err.message };
    }
  });

  // ---- 文件管理 ----
  ipcMain.handle('files:getAll', (_event, filter) => {
    return store.getFiles(filter || 'all');
  });

  ipcMain.handle('files:delete', async (_event, id) => {
    const files = store.getFiles();
    const file = files.find(f => f.id === id);
    if (!file) return { success: false, error: '文件不存在' };

    try {
      if (fs.existsSync(file.filePath)) fs.unlinkSync(file.filePath);
      if (file.srtPath && fs.existsSync(file.srtPath)) fs.unlinkSync(file.srtPath);
    } catch (err) {
      console.error('删除物理文件失败:', err);
    }

    store.removeFile(id);
    return { success: true };
  });

  ipcMain.handle('files:rename', (_event, { id, newName }) => {
    const files = store.getFiles();
    const file = files.find(f => f.id === id);
    if (!file) return { success: false, error: '文件不存在' };

    try {
      const dir = path.dirname(file.filePath);
      const ext = path.extname(file.filePath);
      const newPath = path.join(dir, newName);
      if (file.filePath !== newPath && fs.existsSync(file.filePath)) {
        fs.renameSync(file.filePath, newPath);
        file.filePath = newPath;
      }
    } catch (err) {
      return { success: false, error: err.message };
    }

    const updated = store.updateFile(id, { fileName: newName, filePath: file.filePath });
    return { success: true, file: updated };
  });

  ipcMain.handle('files:togglePin', (_event, id) => {
    const file = store.togglePin(id);
    return { success: true, file };
  });

  ipcMain.handle('files:openFile', async (_event, id) => {
    const files = store.getFiles();
    const file = files.find(f => f.id === id);
    if (!file || !fs.existsSync(file.filePath)) {
      return { success: false, error: '文件不存在' };
    }
    shell.openPath(file.filePath);
    return { success: true };
  });

  ipcMain.handle('dialog:exportSrt', async (_event, id) => {
    const files = store.getFiles();
    const file = files.find(f => f.id === id);
    if (!file || !file.srtPath) {
      return { success: false, error: '字幕文件不存在' };
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出字幕',
      defaultPath: file.fileName.replace(path.extname(file.fileName), '.srt'),
      filters: [{ name: '字幕文件', extensions: ['srt'] }]
    });

    if (!result.canceled && result.filePath) {
      fs.copyFileSync(file.srtPath, result.filePath);
      return { success: true, exportPath: result.filePath };
    }
    return { success: false, canceled: true };
  });

  // ---- 音频设备 ----
  ipcMain.handle('audio:getDevices', async () => {
    try {
      const devices = await audioDevices.detectAudioDevices();
      return {
        success: true,
        microphones: devices.microphones,
        loopbacks: devices.loopbacks,
        defaultMic: audioDevices.getDefaultMicrophone(devices),
        defaultSystem: audioDevices.getDefaultLoopback(devices)
      };
    } catch (err) {
      return { success: false, error: err.message, microphones: [], loopbacks: [] };
    }
  });

  // ---- 录制 ----
  ipcMain.handle('recording:start', async (_event, params) => {
    try {
      if (mainWindow) mainWindow.hide();
      await new Promise(r => setTimeout(r, 300));

      const result = recorder.startRecording(params);

      if (mainWindow) mainWindow.show();

      return { success: true, filePath: result.filePath, fileName: result.fileName };
    } catch (err) {
      console.error('开始录制失败:', err);
      if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('recording:stop', async () => {
    try {
      const result = await recorder.stopRecording();

      const record = store.addFile({
        id: 'vid-' + Date.now(),
        type: 'video',
        fileName: result.fileName,
        filePath: result.filePath,
        duration: result.duration,
        createdAt: new Date().toISOString(),
        isPinned: false,
        hasSubtitle: false,
        srtPath: null
      });

      return { success: true, file: record };
    } catch (err) {
      console.error('停止录制失败:', err);
      return { success: false, error: err.message };
    }
  });

  // ---- 语音识别 ----
  // 阶段 8 实现
}

// ===== 应用生命周期 =====

app.whenReady().then(() => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

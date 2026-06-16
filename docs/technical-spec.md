# 技术规范文档 — 截屏识字幕

## 技术栈

| 层 | 选型 | 版本 | 用途 |
|---|---|---|---|
| 桌面框架 | Electron | v31.x | 窗口管理、系统集成 |
| 前端 | HTML + CSS + Vanilla JS | — | 渲染进程 UI |
| 进程通信 | contextBridge + ipcRenderer/ipcMain | — | 安全 IPC |
| 录屏/截屏引擎 | FFmpeg | 6.x+ | 屏幕采集、音频采集、图像编码 |
| 语音识别 | whisper.cpp | latest | 离线语音转文字 |
| 打包工具 | electron-builder | 24.x+ | Windows 安装包构建 |
| 包管理 | npm | — | 依赖管理 |

## 架构概览

```
┌──────────────────────────────────────────────┐
│                 渲染进程 (renderer)             │
│  src/index.html | src/styles.css              │
│  src/renderer.js                              │
│  ┌────────────────────────────────────────┐   │
│  │  window.api (contextBridge 暴露的 API)   │   │
│  │  - takeScreenshot(mode, rect?)          │   │
│  │  - startRecording(mode, rect?, audio?)  │   │
│  │  - stopRecording()                      │   │
│  │  - generateSubtitle(videoId)            │   │
│  │  - exportSubtitle(videoId)              │   │
│  │  - getFiles(filter?)                    │   │
│  │  - deleteFile(id)                       │   │
│  │  - renameFile(id, newName)              │   │
│  │  - togglePin(id)                        │   │
│  │  - onRecordingTimer(callback)           │   │
│  │  - onSubtitleProgress(callback)         │   │
│  └────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────┘
                       │ IPC (preload.js)
┌──────────────────────▼───────────────────────┐
│                 主进程 (main)                  │
│  main.js                                     │
│  ┌────────────────────────────────────────┐   │
│  │  src/recorder.js    FFmpeg 录屏封装     │   │
│  │  src/screenshot.js  FFmpeg 截屏封装     │   │
│  │  src/whisper.js     whisper.cpp 封装    │   │
│  │  src/store.js       本地 JSON 数据存储   │   │
│  └────────────────────────────────────────┘   │
│  child_process.spawn:                         │
│  ┌──────────┐  ┌──────────────┐              │
│  │ ffmpeg   │  │ whisper.cpp  │              │
│  │ .exe     │  │ .exe         │              │
│  └──────────┘  └──────────────┘              │
└──────────────────────────────────────────────┘
```

## 数据流

### 截屏流程
```
renderer.js                main.js              screenshot.js
    │                          │                      │
    │─ window.api.takeScreenshot(mode, rect?) ─→      │
    │                          │── capture(params) ──→│
    │                          │                      │── spawn ffmpeg
    │                          │                      │   gdigrab → PNG
    │                          │←─ {filePath} ────────│
    │                          │── store.add() ──→ store.js
    │←─ {success, file} ───────│
    │                          │
    │── refresh list
```

### 录屏流程
```
renderer.js                main.js              recorder.js
    │                          │                      │
    │─ window.api.startRecord(params) ─→              │
    │                          │── start(params) ────→│
    │                          │                      │── spawn ffmpeg (persistent)
    │                          │←─ {processId} ───────│
    │←─ {success, pid} ────────│
    │                          │     ↓ 录制中...
    │─ window.api.stopRecord() ─→                     │
    │                          │── stop() ───────────→│
    │                          │                      │── kill ffmpeg
    │                          │←─ {filePath} ────────│
    │                          │── store.add() ──→ store.js
    │←─ {success, file} ───────│
```

### 语音识别流程
```
renderer.js                main.js              whisper.js
    │                          │                      │
    │─ window.api.generateSubtitle(videoId) ─→        │
    │                          │── generate(path) ───→│
    │                          │                      │── ffmpeg: 提取音频 WAV
    │                          │                      │── whisper: WAV → TXT
    │                          │    progress callback  │──→ 进度回调
    │    ←─ progress event ────│←─────────────────────│
    │                          │                      │── 解析 → SRT
    │                          │←─ {srtPath} ─────────│
    │                          │── store.update() ─→ store.js
    │←─ {success, srtPath} ────│
```

## 模块接口

### recorder.js
```js
class Recorder {
  start({ x, y, width, height, enableSystemAudio, enableMic })
  // 返回: { processId: number }
  
  stop()
  // 返回: { filePath: string, duration: number }
  
  isRecording(): boolean
  getElapsedTime(): number
}
```

### screenshot.js
```js
class Screenshot {
  capture({ x, y, width, height })
  // fullscreen: 不传参数
  // region: 传入坐标
  // 返回: { filePath: string }
}
```

### whisper.js
```js
class Whisper {
  async generateSubtitle(videoPath, onProgress)
  // onProgress: (percent: number, stage: string) => void
  // 返回: { srtPath: string, text: string }
  
  getModelStatus()
  // 返回: { downloaded: boolean, path: string }
}
```

### store.js
```js
class Store {
  // 文件记录格式
  // { id, type, fileName, filePath, duration, createdAt, isPinned, hasSubtitle, srtPath }
  
  getAll(filter?: 'all'|'video'|'screenshot'): FileRecord[]
  add(record): void
  update(id, partial): void
  delete(id): void
  togglePin(id): void
}
```

## FFmpeg 命令参考

### 全屏截图
```bash
ffmpeg -f gdigrab -framerate 1 -i desktop -vframes 1 output.png
```

### 区域截图
```bash
ffmpeg -f gdigrab -framerate 1 \
  -offset_x {x} -offset_y {y} -video_size {w}x{h} \
  -i desktop -vframes 1 output.png
```

### 全屏录制（仅视频）
```bash
ffmpeg -f gdigrab -framerate 30 -video_size {w}x{h} \
  -offset_x {x} -offset_y {y} -i desktop \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p output.mp4
```

### 录制 + 系统音频 + 麦克风
```bash
ffmpeg -f gdigrab -framerate 30 -video_size {w}x{h} -i desktop \
  -f dshow -i audio="{systemAudioDevice}" \
  -f dshow -i audio="{micDevice}" \
  -filter_complex amix=inputs=2:duration=first \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p output.mp4
```

### 提取音频
```bash
ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav
```

## Whisper 命令参考
```bash
whisper.exe -m models/ggml-small.bin -f audio.wav -osrt -of output
# 生成 output.srt
```

## 文件存储

### 用户文件目录
```
%USERPROFILE%\Videos\ScreenRecorder\     → 视频文件
%USERPROFILE%\Pictures\ScreenRecorder\   → 截图文件
%APPDATA%\screen-recorder\               → 元数据 + 字幕
  ├── files.json                          → 文件元数据
  └── subtitles\                          → 字幕文件
```

### files.json 结构
```json
{
  "files": [
    {
      "id": "uuid-v4",
      "type": "video",
      "fileName": "录制_2026-06-15_14-30-00.mp4",
      "filePath": "C:\\Users\\...\\Videos\\ScreenRecorder\\录制_2026-06-15_14-30-00.mp4",
      "duration": 125.5,
      "createdAt": "2026-06-15T14:30:00.000Z",
      "isPinned": false,
      "hasSubtitle": false,
      "srtPath": null
    }
  ]
}
```

## 安全策略

- 渲染进程无法直接访问 Node.js API（contextIsolation: true）
- 所有系统操作通过 preload.js 暴露的有限 API 进行
- FFmpeg 和 whisper 进程在独立的子进程中运行
- 用户文件仅写入指定的用户目录
- CSP（Content Security Policy）限制外部资源加载

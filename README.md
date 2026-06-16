# 🎀 截屏识字幕 (ScreenScribe)

<div align="center">

**可爱又好用的 Windows 录屏小助手 ✨**

[![Electron](https://img.shields.io/badge/Electron-31.7.7-9feaf9?logo=electron)](https://electronjs.org)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-8.1.1-green?logo=ffmpeg)](https://ffmpeg.org)
[![whisper](https://img.shields.io/badge/whisper.cpp-1.8.6-orange)](https://github.com/ggml-org/whisper.cpp)
[![License](https://img.shields.io/badge/license-ISC-blue)](LICENSE)

</div>

---

## 📸 功能一览

| 功能 | 说明 |
|------|------|
| 📸 **截屏** | 全屏 / 区域框选，FFmpeg gdigrab 秒级截图，保存为 PNG |
| 🔴 **录屏** | 全屏 / 区域录制，H.264 30fps MP4，支持纯视频 / 带音频 |
| 🎤 **麦克风** | 独立开关，dshow 采集，可选任意麦克风设备 |
| 🔊 **系统声音** | 独立开关，立体声混音环回，录制电脑播放的声音 |
| 💬 **语音识别** | whisper.cpp 离线引擎，无需联网，中文识别 |
| 📄 **字幕导出** | SRT + TXT 双格式，播放器可加载，也可纯文本阅读 |
| 📌 **文件管理** | 置顶、重命名、删除、类型筛选、双击系统播放器打开 |
| 🎨 **可爱 UI** | 粉色奶油配色，圆角阴影，呼吸灯动画，emoji 图标 |

## 🖥️ 界面

```
┌──────────────────────────────────┐
│  🎀 截屏识字幕                    │
├──────────────────────────────────┤
│  🎤 麦克风 [switch]  🔊 系统 [switch] │
│  ○ 全屏    ○ 区域框选              │
│  ┌───────────┐ ┌───────────┐       │
│  │ 🔴 录屏   │ │ 📸 截屏   │       │
│  └───────────┘ └───────────┘       │
├──────────────────────────────────┤
│  [ 全部 | 📹视频 | 🖼️截图 ]        │
│  📌 🎬 会议记录...     ⋮          │
│     🖼️ 截图...        ⋮          │
└──────────────────────────────────┘
```

## 🚀 安装

### 方式一：安装包（推荐）

下载 `截屏识字幕 Setup 1.0.0.exe`，双击安装即可。

### 方式二：开发模式

```bash
# 1. 克隆项目
git clone https://github.com/nianweitengsilang28/ScreenScribe.git
cd ScreenScribe/screen-recorder

# 2. 安装依赖（需要 Node.js 18+）
npm install

# 3. 准备外部工具
# 将以下文件放入 bin/ 目录：
#   - ffmpeg.exe  (https://www.gyan.dev/ffmpeg/builds/)
#   - whisper-cli.exe + whisper.dll + ggml*.dll
#     (https://github.com/ggml-org/whisper.cpp/releases)
# 将语音模型放入 models/ 目录：
#   - ggml-small.bin (https://huggingface.co/ggerganov/whisper.cpp)

# 4. 启动
npm start
# 或双击 start.bat
```

## 🛠️ 技术栈

| 层 | 技术 | 用途 |
|---|---|---|
| 桌面框架 | Electron v31 | 窗口管理、系统集成 |
| 录制引擎 | FFmpeg gdigrab + dshow | 屏幕采集、音频采集 |
| 语音识别 | whisper.cpp + ggml-small | 离线中文语音转文字 |
| 打包分发 | electron-builder + NSIS | Windows 安装包 |

## 📁 项目结构

```
ScreenScribe/
├── CLAUDE.md                    # AI 开发指引
├── README.md                    # 本文档
├── docs/                        # 设计文档
│   ├── requirements.md          # 产品需求
│   ├── technical-spec.md        # 技术规范
│   ├── design-spec.md           # UI 设计规范
│   ├── execution-plan.md        # 执行计划
│   └── project-structure.md     # 项目结构
├── dev-log/                     # 开发日志
└── screen-recorder/             # 代码
    ├── main.js                  # Electron 主进程
    ├── preload.js               # IPC 桥接
    ├── src/
    │   ├── index.html           # 主界面
    │   ├── styles.css           # 样式
    │   ├── renderer.js          # 前端逻辑
    │   ├── screenshot.js        # 截屏模块
    │   ├── recorder.js          # 录屏模块
    │   ├── audio-devices.js     # 音频检测
    │   ├── whisper.js           # 语音识别
    │   └── store.js             # 数据存储
    ├── bin/                     # 外部工具 (不纳入版本管理)
    │   ├── ffmpeg.exe
    │   └── whisper-cli.exe + DLLs
    └── models/                  # AI 模型 (不纳入版本管理)
        └── ggml-small.bin
```

## 🎨 配色

| 色值 | 名称 | 用途 |
|------|------|------|
| `#fef3ea` | 奶油白 | 背景 |
| `#cc7d7d` | 豆沙红 | 主按钮 |
| `#f5b4ae` | 浅粉 | 悬浮 |
| `#19645c` | 深绿 | 文字 |
| `#84cccc` | 青蓝 | 进度条 |
| `#c4e4dd` | 浅绿 | 卡片 |
| `#d8eef1` | 淡蓝 | 高亮 |

## ⚙️ 系统要求

- Windows 10 / 11 (64-bit)
- 4GB+ RAM
- 1.5GB 磁盘空间（含语音模型）
- 立体声混音需在 Windows 声音设置中手动启用（用于录系统声音）

## 📝 License

ISC

---

<div align="center">
Made with 💖 and Claude
</div>

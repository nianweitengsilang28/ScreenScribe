# 项目目录结构说明 — 截屏识字幕

## 完整目录树

```
截屏识字幕/                          # 项目根目录
├── CLAUDE.md                        # AI 开发助手指引（总入口）
│
├── docs/                            # 📚 项目文档（规范先行）
│   ├── requirements.md              #   产品需求文档
│   ├── technical-spec.md            #   技术规范文档
│   ├── design-spec.md               #   UI 设计规范文档
│   ├── execution-plan.md            #   分阶段执行计划
│   └── project-structure.md         #   本文档 — 目录结构说明
│
├── dev-log/                         # 📝 开发日志
│   └── YYYY-MM-DD.md                #   每日开发日志（以日期命名）
│
└── screen-recorder/                 # 💻 代码项目（Electron 应用）
    ├── package.json                 #   npm 项目配置
    ├── package-lock.json            #   依赖锁定文件
    ├── electron-builder.yml         #   打包配置
    ├── main.js                      #   Electron 主进程入口
    ├── preload.js                   #   安全 IPC 桥接
    │
    ├── src/                         #   源码目录
    │   ├── index.html               #     主界面 HTML
    │   ├── styles.css               #     全局样式（可爱风）
    │   ├── renderer.js              #     前端交互逻辑
    │   ├── region-selector.html     #     区域选择遮罩页面
    │   ├── recorder.js              #     FFmpeg 录屏模块
    │   ├── screenshot.js            #     FFmpeg 截屏模块
    │   ├── whisper.js               #     whisper.cpp 语音识别模块
    │   └── store.js                 #     本地 JSON 数据存储模块
    │
    ├── assets/                      #   静态资源
    │   ├── icons/                   #     应用图标（.ico, .png）
    │   │   └── icon.png             #       主图标 (256x256)
    │   └── fonts/                   #     可爱字体文件
    │       └── ...
    │
    ├── bin/                         #   运行时二进制（运行时依赖）
    │   ├── ffmpeg.exe               #     FFmpeg 可执行文件
    │   └── whisper.exe              #     whisper.cpp 可执行文件
    │
    └── models/                      #   AI 模型文件
        └── ggml-small.bin           #     whisper 中文语音模型
```

## 关键文件职责

### 根目录

| 文件 | 职责 |
|------|------|
| `CLAUDE.md` | AI 助手工作指引，包含文档索引、开发规则、当前状态 |

### docs/ — 项目规范文档

| 文件 | 职责 | 读者 |
|------|------|------|
| `requirements.md` | 功能需求清单、优先级、用户流程 | 所有人 |
| `technical-spec.md` | 技术栈、架构、模块接口、数据流 | 开发者 |
| `design-spec.md` | 配色、排版、圆角、阴影、动画、组件样式 | 前端开发 |
| `execution-plan.md` | 分阶段详细步骤、验收标准、依赖关系 | 开发者 |
| `project-structure.md` | 本文档，解释每个文件/目录的用途 | 开发者 |

### dev-log/ — 开发日志

- 每天开发结束时自动更新
- 记录：完成事项、待办事项、发现的问题、备注
- 文件名格式：`YYYY-MM-DD.md`

### screen-recorder/ — 代码项目

#### 核心进程文件

| 文件 | 职责 |
|------|------|
| `main.js` | Electron 主进程：创建窗口、管理子进程、注册 IPC handler、文件系统操作 |
| `preload.js` | 安全桥接层：通过 contextBridge 暴露有限的 API 给渲染进程 |

#### 渲染进程（前端 UI）

| 文件 | 职责 |
|------|------|
| `index.html` | 主界面 DOM 结构 |
| `styles.css` | 所有视觉样式（配色、布局、动画）|
| `renderer.js` | 前端逻辑：事件绑定、API 调用、DOM 更新 |
| `region-selector.html` | 区域选择的透明遮罩窗口（独立 BrowserWindow）|

#### 功能模块

| 文件 | 职责 |
|------|------|
| `recorder.js` | 封装 FFmpeg 录屏命令，管理录制进程生命周期 |
| `screenshot.js` | 封装 FFmpeg 截屏命令，单帧截图 |
| `whisper.js` | 封装 whisper.cpp，音频提取 → 语音识别 → SRT 生成 |
| `store.js` | 文件元数据读写（JSON 文件），增删改查接口 |

#### 资源目录

| 目录 | 内容 |
|------|------|
| `assets/icons/` | 应用图标，需准备 .ico 和 .png 格式 |
| `assets/fonts/` | 自定义可爱字体（.ttf/.otf），通过 CSS @font-face 引入 |
| `bin/` | FFmpeg 和 whisper 的可执行文件，electron-builder 打包时作为 extraResources |
| `models/` | whisper 语音模型，`ggml-small.bin` 约 500MB |

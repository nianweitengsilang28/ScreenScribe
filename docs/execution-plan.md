# 分阶段执行计划 — 截屏识字幕

> 原则：小步快跑，每阶段独立可验证，通过验收才进入下一阶段。

---

## 🔰 阶段 0：项目初始化 + 文档体系搭建

**预计**：1 次会话

| 步骤 | 内容 | 产出物 |
|------|------|--------|
| 0.1 | 创建项目目录结构 | 空文件夹体系 |
| 0.2 | 编写 `docs/requirements.md` | 产品需求文档 |
| 0.3 | 编写 `docs/technical-spec.md` | 技术规范文档 |
| 0.4 | 编写 `docs/design-spec.md` | UI 设计规范文档 |
| 0.5 | 编写 `docs/execution-plan.md` | 本文档 |
| 0.6 | 编写 `docs/project-structure.md` | 项目结构说明 |
| 0.7 | 编写 `CLAUDE.md` | AI 助手指引 |
| 0.8 | 创建 `dev-log/` 和首日日志 | 开发日志模板 |

**验收标准**：
- [ ] 所有 docs/*.md 文件存在且内容完整
- [ ] CLAUDE.md 中路径索引指向正确
- [ ] dev-log/ 文件夹存在，含当日日志

---

## 🔰 阶段 1：Electron 最小可运行骨架

**预计**：1 次会话
**依赖**：阶段 0

| 步骤 | 内容 | 关键文件 |
|------|------|----------|
| 1.1 | `npm init` 初始化项目 | `package.json` |
| 1.2 | 安装 Electron | `node_modules/` |
| 1.3 | 编写最小 `main.js` | `main.js` |
| 1.4 | 编写最小 `preload.js` | `preload.js` |
| 1.5 | 编写 Hello World `index.html` | `src/index.html` |
| 1.6 | 配置 `npm start` 脚本 | `package.json` |

**验收标准**：
- [ ] `npm start` 弹出 Electron 窗口
- [ ] 窗口显示 "🎀 截屏识字幕" 文字
- [ ] 窗口尺寸 900x650

---

## 🔰 阶段 2：可爱风 UI 静态页面

**预计**：1-2 次会话
**依赖**：阶段 1

| 步骤 | 内容 | 关键文件 |
|------|------|----------|
| 2.1 | 编写完整 `styles.css`（CSS 变量、所有组件样式）| `src/styles.css` |
| 2.2 | 搭建主界面布局 HTML 结构 | `src/index.html` |
| 2.3 | 音源开关 UI（两个 toggle，纯样式）| `src/index.html` + `styles.css` |
| 2.4 | 模式切换 radio（全屏/区域）| 同上 |
| 2.5 | 录屏 + 截屏双按钮 | 同上 |
| 2.6 | 筛选标签（全部/视频/截图）| 同上 |
| 2.7 | 视频/截图列表卡片（静态假数据 3-5 条）| 同上 |
| 2.8 | 右键菜单 UI（自定义弹出，纯样式）| 同上 |
| 2.9 | 下载并引入可爱字体 | `assets/fonts/` |
| 2.10 | 编写 `renderer.js` 基础交互（标签切换、菜单开关、toggle 效果）| `src/renderer.js` |

**验收标准**：
- [ ] 界面视觉符合 design-spec.md 规范
- [ ] 所有配色正确使用 CSS 变量
- [ ] 按钮有 hover/active 动画
- [ ] 筛选标签可切换
- [ ] Toggle 开关可切换
- [ ] 右键菜单可弹出/关闭
- [ ] 按钮点击暂无实际功能但视觉反馈正确

---

## 🔰 阶段 3：截屏功能

**预计**：1 次会话
**依赖**：阶段 2

| 步骤 | 内容 | 关键文件 |
|------|------|----------|
| 3.1 | 下载 FFmpeg Windows 版，放入 `bin/` | `bin/ffmpeg.exe` |
| 3.2 | 编写 `screenshot.js` 模块 | `src/screenshot.js` |
| 3.3 | main.js 注册截屏 IPC handler | `main.js` |
| 3.4 | preload.js 暴露 `takeScreenshot` API | `preload.js` |
| 3.5 | store.js 基础实现（add + getAll）| `src/store.js` |
| 3.6 | renderer.js 绑定截屏按钮事件 | `src/renderer.js` |
| 3.7 | 全屏截图 → 保存到 Pictures 目录 | — |
| 3.8 | 截图成功 → 刷新列表 | — |

**验收标准**：
- [ ] 点击"截屏"按钮 → 全屏截图保存为 PNG
- [ ] 截图出现在列表中（🎬 图标）
- [ ] 截图文件在 `Pictures\ScreenRecorder\` 目录下
- [ ] 连续截屏多条均正常

---

## 🔰 阶段 4：区域选择功能

**预计**：1 次会话
**依赖**：阶段 3

| 步骤 | 内容 | 关键文件 |
|------|------|----------|
| 4.1 | 创建区域选择遮罩窗口（独立 BrowserWindow，全屏透明）| `main.js` |
| 4.2 | 实现鼠标拖拽框选交互 | `src/region-selector.html` + JS |
| 4.3 | 框选结果回传主进程（坐标）| IPC |
| 4.4 | 截屏支持区域模式（传入坐标参数）| `src/screenshot.js` |
| 4.5 | 模式切换联动（全屏 ↔ 区域）| `src/renderer.js` |

**验收标准**：
- [ ] 选择"区域框选" → 点截屏 → 弹出遮罩
- [ ] 拖拽框选 → 只截取选中区域
- [ ] 选择"全屏" → 点截屏 → 截取整个屏幕
- [ ] 模式切换正常工作

---

## 🔰 阶段 5：录屏功能

**预计**：1-2 次会话
**依赖**：阶段 4

| 步骤 | 内容 | 关键文件 |
|------|------|----------|
| 5.1 | 编写 `recorder.js` 模块 | `src/recorder.js` |
| 5.2 | main.js 注册录屏 start/stop IPC handler | `main.js` |
| 5.3 | preload.js 暴露录制 API | `preload.js` |
| 5.4 | 录制按钮绑定（全屏模式）| `src/renderer.js` |
| 5.5 | 录制状态 UI：呼吸灯动画 + 计时器 | `src/styles.css` + `renderer.js` |
| 5.6 | 停止录制 → 保存视频 | `src/recorder.js` |
| 5.7 | 区域模式录屏 | 复用阶段 4 的遮罩 |
| 5.8 | 异常处理（FFmpeg 报错友好提示）| `main.js` |

**验收标准**：
- [ ] 全屏录屏 → 开始 → 计时器走 → 呼吸灯亮 → 停止 → 视频保存
- [ ] 区域录屏 → 框选 → 录制 → 视频只含选中区域
- [ ] 视频出现在列表，可双击用系统播放器打开
- [ ] FFmpeg 不存在时给出明确提示

---

## 🔰 阶段 6：音频源控制

**预计**：1 次会话
**依赖**：阶段 5

| 步骤 | 内容 | 关键文件 |
|------|------|----------|
| 6.1 | 检测 Windows 音频设备列表 | `src/recorder.js` |
| 6.2 | 系统音频采集（WASAPI loopback）| `src/recorder.js` |
| 6.3 | 麦克风音频采集 | `src/recorder.js` |
| 6.4 | 音源 toggle 联动录制参数 | `src/renderer.js` + IPC |
| 6.5 | 纯视频录制（两路音频全关）| `src/recorder.js` |

**验收标准**：
- [x] 打开系统音频 → 录制 → 视频有电脑声音（立体声混音 ✅）
- [x] 打开麦克风 → 录制 → 视频有麦克风声音 ✅
- [x] 两个都开 → 录制 → 两路声音混合 ✅
- [x] 两个都关 → 录制 → 视频无声音 ✅
- [x] FFmpeg dshow 设备检测 + 自动分类 ✅

---

## 🔰 阶段 7：文件管理功能

**预计**：1 次会话
**依赖**：阶段 5（不需要阶段 6）

| 步骤 | 内容 | 关键文件 |
|------|------|----------|
| 7.1 | store.js 完善（update, delete, togglePin）| `src/store.js` |
| 7.2 | 列表用真实数据渲染 | `src/renderer.js` |
| 7.3 | 置顶/取消置顶 | IPC + UI |
| 7.4 | 重命名（内联编辑弹窗）| IPC + UI |
| 7.5 | 删除（二次确认弹窗）| IPC + UI |
| 7.6 | 类型筛选（全部/视频/截图）| 前端过滤 |
| 7.7 | 双击文件用系统默认程序打开 | IPC `shell.openPath()` |
| 7.8 | 右键菜单功能接入 | `src/renderer.js` |

**验收标准**：
- [ ] 所有文件操作（置顶/重命名/删除）正常工作
- [ ] 删除时有确认弹窗
- [ ] 筛选切换正确过滤列表
- [ ] 重启软件后数据不丢失
- [ ] 置顶文件排在列表最前面

---

## 🔰 阶段 8：语音识别 + 字幕

**预计**：1-2 次会话
**依赖**：阶段 7

| 步骤 | 内容 | 关键文件 |
|------|------|----------|
| 8.1 | ~~下载 whisper.cpp Windows 版~~ ✅ | `bin/whisper-cli.exe` + DLLs |
| 8.2 | ~~编写 `whisper.js` 模块~~ ✅ | `src/whisper.js` |
| 8.3 | ~~main.js 注册识别 + 导出 IPC handler~~ ✅ | `main.js` |
| 8.4 | ~~前端字幕生成按钮 + 进度条~~ ✅ | `src/index.html` + `renderer.js` |
| 8.5 | ~~音频提取 → whisper → SRT 生成~~ ✅ | `src/whisper.js` |
| 8.6 | ~~字幕导出按钮（另存为对话框）~~ ✅ | IPC `dialog.showSaveDialog()` |
| 8.7 | ~~进度回调~~ ✅ | `subtitle:progress` IPC 事件 |
| 8.8 | ⏳ 下载语音模型 | `models/ggml-small.bin` (~460MB) |

**验收标准**：
- [ ] 选中有声音的视频 → 生成字幕 → 进度条显示 → 完成
- [ ] 生成的字幕文件为 .srt 格式
- [ ] 可以导出字幕到指定位置
- [ ] 用播放器加载字幕 → 文字与语音基本同步
- [ ] 模型未下载时给出指引

---

## 🔰 阶段 9：打包 + 最终测试

**预计**：1 次会话
**依赖**：阶段 8

| 步骤 | 内容 | 关键文件 |
|------|------|----------|
| 9.1 | 配置 electron-builder | `electron-builder.yml` |
| 9.2 | 配置 extraResources（FFmpeg, whisper, 模型）| `electron-builder.yml` |
| 9.3 | 制作应用图标（可爱风）| `assets/icons/` |
| 9.4 | 打包 Windows NSIS 安装包 | `npm run build` |
| 9.5 | 测试安装包（全新环境）| — |
| 9.6 | 修复打包相关问题 | — |

**验收标准**：
- [ ] `npm run build` 成功生成 .exe 安装包
- [ ] 安装包可在 Windows 10/11 安装运行
- [ ] 安装后所有功能正常
- [ ] FFmpeg 和 whisper 随包正确分发

---

## 阶段依赖关系图

```
阶段 0 (文档)
  └→ 阶段 1 (Electron 骨架)
       └→ 阶段 2 (UI)
            ├→ 阶段 3 (截屏)
            │    └→ 阶段 4 (区域选择)
            │         └→ 阶段 5 (录屏)
            │              ├→ 阶段 6 (音频)  ← 可与 7 并行
            │              └→ 阶段 7 (文件管理)
            │                   └→ 阶段 8 (字幕)
            │                        └→ 阶段 9 (打包)
            └→ (阶段 2 UI 完成 → 后续所有阶段共享 UI 基础)
```

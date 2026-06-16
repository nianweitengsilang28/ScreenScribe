# 截屏识字幕 — AI 开发指引

## 项目简介

一款运行在 Windows 上的可爱风录屏/截屏软件，支持系统声音+麦克风录制、离线语音识别生成字幕。用户是不懂代码的小白，目标是交付一个可安装使用的 Windows 桌面应用。

## 文档索引

> AI 开发前必须先阅读相关标准文档。

| 文档 | 路径 | 何时阅读 |
|------|------|----------|
| 📋 产品需求 | [docs/requirements.md](docs/requirements.md) | 不确定功能细节时 |
| 🔧 技术规范 | [docs/technical-spec.md](docs/technical-spec.md) | 涉及架构、模块接口、数据流时 |
| 🎨 设计规范 | [docs/design-spec.md](docs/design-spec.md) | 涉及 UI、样式、配色、动画时 |
| 📐 执行计划 | [docs/execution-plan.md](docs/execution-plan.md) | 每个阶段开始前必读 |
| 📁 项目结构 | [docs/project-structure.md](docs/project-structure.md) | 不确定文件放哪里时 |

## 每日开发日志

- 日志目录：[dev-log/](dev-log/)
- 每次开发会话结束时，自动更新当日日志
- 日志包含：完成事项、待办事项、发现的问题、下次建议

## 开发规则

### 铁律
1. **严格按 [execution-plan.md](docs/execution-plan.md) 的阶段顺序开发**，不跳步、不抢跑
2. **每完成一个步骤立即验证**，通过验收标准才进入下一步
3. **每阶段完成后更新 [execution-plan.md](docs/execution-plan.md)**，勾选已完成步骤
4. **遇到阻塞问题记录到 dev-log 并告知用户**

### 编码规范
5. 代码修改前必须先 `Read` 文件确认当前状态
6. 所有样式必须使用 [design-spec.md](docs/design-spec.md) 中定义的 CSS 变量
7. 所有文件操作使用绝对路径
8. 主进程和渲染进程严格分离，IPC 通信仅通过 preload.js

### 质量要求
9. 功能代码必须有基本的错误处理
10. FFmpeg/whisper 进程异常时给出友好中文提示，不闪退
11. 每次会话结束时更新 dev-log

## 当前开发状态

| 项目 | 状态 |
|------|------|
| 当前阶段 | 🔰 阶段 6 — 音频源控制 ✅ 已完成 |
| 上次完成 | 2026-06-15：麦克风录制 + 系统音频检测 + 音源独立开关 + 双音源混音支持 |
| 下次任务 | 阶段 8：语音识别 + 字幕 |

## 快速启动

```bash
# 进入代码目录
cd screen-recorder

# 安装依赖（阶段 1 开始后）
npm install

# 启动开发模式
npm start

# 打包（阶段 9）
npm run build
```

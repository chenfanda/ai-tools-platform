# AI工具平台

一个基于React的AI工具集成平台，提供语音合成（TTS）、视频生成、语音识别（ASR）等功能。

## 功能特性

- 🎙️ **语音合成** - 基于Spark TTS的高质量语音合成，支持预设角色和自定义声音克隆
- 🎬 **视频生成** - 智能合成图片、音频和字幕为高质量视频
- 📝 **语音识别** - 基于Whisper的精准语音转文字服务
- ⚙️ **灵活配置** - 支持自定义API端点和参数设置
- 📱 **响应式设计** - 适配桌面和移动设备

## 技术栈

- **前端框架**: React 18 + Vite
- **路由管理**: React Router DOM
- **样式方案**: Tailwind CSS
- **图标库**: Lucide React
- **图表库**: Recharts
- **状态管理**: React Hooks + Context

## 项目结构

```
src/
├── components/          # 组件
│   ├── layout/         # 布局组件
│   ├── shared/         # 共享组件
│   └── pages/          # 页面专用组件
├── pages/              # 页面组件
├── hooks/              # 自定义Hook
├── services/           # API服务
├── config/             # 配置文件
├── utils/              # 工具函数
├── assets/             # 静态资源
└── styles/             # 样式文件
```

## 快速开始

1. 安装依赖
```bash
npm install
```

2. 启动开发服务器
```bash
npm run dev
```

3. 构建生产版本
```bash
npm run build
```

## API服务配置

确保以下服务正在运行：

- TTS服务: http://localhost:8000
- 视频服务: http://localhost:8001  
- ASR服务: http://localhost:8002

## 开发指南

- 组件开发遵循单一职责原则
- 使用TypeScript增强类型安全
- 遵循React Hooks最佳实践
- 保持代码模块化和可复用性

## 许可证

MIT License

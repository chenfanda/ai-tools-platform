# AI创作平台技术文档

## 📋 项目概述

### 项目基本信息
- **项目名称**: AI创作平台 (AI Creative Platform)
- **技术栈**: React 18 + Vite + Tailwind CSS
- **架构模式**: 模块化组件架构 + 左侧边栏导航
- **部署方式**: 前端单页应用 + 多服务后端API
- **开发状态**: 核心功能完成，支持模块化扩展

### 核心功能
1. **语音模块 (Voice Module)** - 包含语音合成(TTS)和语音识别(ASR)
   - **语音合成**: 角色配音、自定义声音克隆
   - **语音识别**: 音频转文字、多语言支持
2. **视频生成 (Video)** - 图片音频合成、模板视频
3. **图像处理 (Image)** - 背景移除、人脸增强、超分辨率等
4. **AI创作工作流 (Workflow)** - 模块编排器，支持可视化工作流设计

## 🏗️ 架构设计

### 整体架构
```
┌─────────────────────────────────────────────────┐
│                   Header                        │
├─────────────┬───────────────────────────────────┤
│             │                                   │
│  PageSidebar│           MainContent             │
│             │                                   │
│ • 功能列表   │  ┌─────────────────────────────┐   │
│ • 状态切换   │  │        Page Component       │   │
│             │  │   (Voice/Video/Image/       │   │
│             │  │        Workflow)            │   │
│             │  └─────────────────────────────┘   │
└─────────────┴───────────────────────────────────┘
```

### 目录结构
```
ai-tools-platform/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/              # 布局组件
│   │   │   ├── Header.jsx       # 顶部导航
│   │   │   ├── MainContent.jsx  # 主内容容器
│   │   │   ├── PageSidebar.jsx  # 页面侧边栏
│   │   │   ├── ConfigPanel.jsx  # 配置面板
│   │   │   └── NotificationSystem.jsx # 通知系统
│   │   ├── shared/              # 共享组件
│   │   │   ├── FileUpload.jsx   # 文件上传
│   │   │   ├── ProgressBar.jsx  # 进度条
│   │   │   ├── ResultPanel.jsx  # 结果展示
│   │   │   └── Button.jsx       # 按钮组件
│   │   ├── workflow/            # 工作流组件
│   │   │   ├── WorkflowEditor.jsx   # 工作流编辑器
│   │   │   ├── NodePanel.jsx       # 节点面板
│   │   │   └── nodes/              # 节点组件
│   │   │       ├── TextInputNode.jsx  # 文本输入节点
│   │   │       ├── TTSNode.jsx        # TTS节点
│   │   │       └── OutputNode.jsx     # 输出节点
│   │   └── pages/               # 页面专用组件
│   ├── pages/                   # 页面组件
│   │   ├── home/
│   │   │   └── index.jsx        # 首页
│   │   ├── tts/
│   │   │   └── index.jsx        # 语音模块页面(集成TTS+ASR)
│   │   ├── video/
│   │   │   └── index.jsx        # 视频生成页面
│   │   ├── image/
│   │   │   └── index.jsx        # 图像处理页面
│   │   └── workflow/
│   │       └── index.jsx        # 工作流页面
│   ├── services/                # API服务层
│   │   ├── api/
│   │   │   ├── imageAPI.js      # 图像处理API封装
│   │   │   └── apiService.js    # 通用API服务
│   │   └── workflow/            # 工作流服务
│   │       └── ModuleAdapter.js # 模块适配器
│   ├── styles/                  # 样式文件
│   ├── utils/                   # 工具函数
│   ├── config/                  # 配置文件
│   ├── App.jsx                  # 主应用组件
│   └── main.jsx                 # 应用入口
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🔧 核心组件详解

### 1. 主应用组件 (App.jsx)

**职责**: 全局状态管理、事件处理、组件协调

**关键状态**:
```javascript
const [currentPage, setCurrentPage] = useState('home')      // 当前页面
const [configPanelOpen, setConfigPanelOpen] = useState(false) // 配置面板状态
const [config, setConfig] = useState({                      // API配置
  ttsApiUrl: 'http://localhost:8000',
  videoApiUrl: 'http://localhost:8001', 
  asrApiUrl: 'http://localhost:8002',
  imageApiUrl: 'http://localhost:8003'
})
const [notifications, setNotifications] = useState([])      // 通知列表
```

**关键功能**:
- 配置持久化 (localStorage)
- 页面导航事件处理
- 键盘快捷键 (Ctrl+1-5 切换页面, ESC关闭面板)
- 通知管理 (3秒自动消失)

### 2. 主内容容器 (MainContent.jsx)

**职责**: 页面路由管理、侧边栏集成、状态保持

**关键特性**:
```javascript
// 子页面状态管理
const [subPages, setSubPages] = useState({
  tts: 'voice-synthesis',     // TTS默认子功能：语音合成
  video: 'standard-video',    // Video默认子功能
  image: 'remove-bg'          // Image默认子功能
})

// 侧边栏支持配置
const pagesWithSidebar = ['tts', 'video', 'image']
```

**页面路由**:
- **首页**: 项目介绍和功能概览
- **语音模块**: 集成TTS和ASR功能
- **视频生成**: 视频创作和编辑
- **图像处理**: 图像编辑和处理
- **AI创作工作流**: 可视化流程设计器

### 3. 页面侧边栏 (PageSidebar.jsx)

**职责**: 功能导航、子页面切换

**语音模块配置**:
```javascript
const sidebarConfig = {
  tts: {
    title: '语音模块',
    items: [
      { 
        id: 'voice-synthesis', 
        label: '语音合成', 
        icon: '🎤', 
        description: '文字转语音，支持角色配音和自定义声音' 
      },
      { 
        id: 'speech-recognition', 
        label: '语音识别', 
        icon: '📝', 
        description: '音频转文字，支持多种语言识别' 
      }
    ]
  }
}
```

### 4. 顶部导航 (Header.jsx)

**导航配置**:
```javascript
const navTabs = [
  { id: 'home', label: '首页' },
  { id: 'tts', label: '语音模块' },
  { id: 'video', label: '视频生成' },
  { id: 'image', label: '图像处理' },
  { id: 'workflow', label: 'AI创作工作流' }  // 新增工作流页面
]
```

## 🔄 AI创作工作流系统

### 系统架构

AI创作工作流系统基于**适配器模式**设计，实现现有功能模块的编排和复用：

```
┌─────────────────────────────────────┐
│        工作流编辑器层                 │
│  (可视化节点编排，流程执行)            │
├─────────────────────────────────────┤
│          适配器层                   │
│  (数据格式转换，功能封装)              │
├─────────────────────────────────────┤
│        现有功能模块层                │
│  (语音模块、视频生成、图像处理)        │
└─────────────────────────────────────┘
```

### 核心组件

#### 1. WorkflowEditor.jsx - 工作流编辑器
**职责**: 可视化节点编排、流程执行、状态管理

**主要功能**:
- 基于 ReactFlow 的可视化编辑器
- 支持节点拖拽、连接、删除
- 工作流执行引擎
- 实时执行日志
- 自动布局和连接

**技术特性**:
```javascript
// 核心状态
const [nodes, setNodes, onNodesChange] = useNodesState([])
const [edges, setEdges, onEdgesChange] = useEdgesState([])
const [workflowExecutor] = useState(() => new WorkflowExecutor(config))

// 节点类型定义
const nodeTypes = {
  'text-input': TextInputNode,
  'tts': TTSNode,
  'output': OutputNode
}
```

#### 2. ModuleAdapter.js - 模块适配器系统
**职责**: 现有功能模块的统一封装和数据格式转换

**核心类结构**:
```javascript
// 统一数据格式
class WorkflowData {
  constructor(type, content, metadata = {})
  static createText(text, metadata = {})
  static createAudio(audioInfo, metadata = {})
}

// 适配器基类
class ModuleAdapter {
  async preprocessInput(workflowData)
  async execute(input)
  async postprocessOutput(moduleResult)
  async process(workflowData)
}

// TTS模块适配器
class TTSAdapter extends ModuleAdapter {
  // 完全复用现有TTS API
  // 支持角色模式和自定义声音模式
}
```

#### 3. 节点组件系统

**TextInputNode.jsx** - 文本输入节点
- 支持长文本输入
- 实时文本验证
- 连接状态指示

**TTSNode.jsx** - 语音合成节点  
- **完全复用语音模块功能**
- 支持预设角色模式
- 支持自定义声音模式（用户录音库）
- 自动加载用户语音列表
- 语音参数调节（性别、音调、语速）
- 实时状态反馈

**OutputNode.jsx** - 输出节点
- 智能结果展示
- 支持多种数据类型
- 文件下载功能

### 适配器设计原则

#### 1. 完全复用现有API
```javascript
// TTS适配器直接调用现有API
const response = await fetch(`${this.apiUrl}/tts_with_character`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestData)
})
```

#### 2. 数据格式统一转换
```javascript
// 工作流数据 → TTS API格式
async preprocessInput(workflowData) {
  return {
    text: workflowData.content.text,
    character_id: this.config.selectedCharacter,
    gender: this.config.gender,
    pitch: this.config.pitch,
    speed: this.config.speed
  }
}

// TTS结果 → 工作流数据格式
async postprocessOutput(ttsResult) {
  return WorkflowData.createAudio({
    id: ttsResult.audio_id,
    url: ttsResult.audio_url,
    duration: ttsResult.duration
  })
}
```

#### 3. 错误处理和日志
```javascript
async process(workflowData) {
  try {
    const moduleInput = await this.preprocessInput(workflowData)
    const moduleResult = await this.execute(moduleInput)
    const workflowOutput = await this.postprocessOutput(moduleResult)
    
    return { success: true, data: workflowOutput }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### 工作流执行流程

1. **节点排序**: 按Y坐标排序，从上到下执行
2. **数据传递**: 上游节点结果作为下游节点输入
3. **适配器调用**: 每个节点通过对应适配器执行
4. **结果收集**: 收集所有节点执行结果
5. **状态更新**: 实时更新UI和日志

```javascript
// 执行流程示例
const executeWorkflow = async () => {
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y)
  const results = new Map()
  
  for (const node of sortedNodes) {
    const inputEdge = edges.find(edge => edge.target === node.id)
    const inputData = inputEdge ? results.get(inputEdge.source) : null
    
    const executionResult = await workflowExecutor.executeNode(node, inputData)
    results.set(node.id, executionResult.data)
  }
}
```

## 🌐 API服务集成

### API配置管理
```javascript
const config = {
  ttsApiUrl: 'http://localhost:8000',      // TTS服务地址
  videoApiUrl: 'http://localhost:8001',    // Video服务地址
  asrApiUrl: 'http://localhost:8002',      // ASR服务地址
  imageApiUrl: 'http://localhost:8003'     // Image服务地址
}
```

### 语音模块API调用

#### 语音合成API
```javascript
// 角色模式
await fetch(config.ttsApiUrl + '/tts_with_character', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, character_id, gender, pitch, speed })
})

// 自定义录音模式  
const formData = new FormData()
formData.append('text', text)
formData.append('username', username)
formData.append('voice_id', voice_id)

await fetch(config.ttsApiUrl + '/tts_with_custom_voice', {
  method: 'POST',
  body: formData
})
```

#### 语音识别API
```javascript
await fetch(config.asrApiUrl + '/transcribe', {
  method: 'POST',
  body: formData  // 包含file, language, format
})
```

#### 用户自定义语音管理
```javascript
// 获取用户录音库
await fetch(`${config.ttsApiUrl}/user_custom_voices/${username}`, {
  method: 'GET',
  headers: { 'Accept': 'application/json' }
})
```

## 🔄 功能扩展指南

### 1. 添加新的工作流节点

**步骤1: 创建节点组件**
```bash
touch src/components/workflow/nodes/NewNode.jsx
```

**步骤2: 实现节点适配器**
```javascript
class NewNodeAdapter extends ModuleAdapter {
  async preprocessInput(workflowData) { /* 转换输入数据 */ }
  async execute(input) { /* 调用对应API */ }
  async postprocessOutput(result) { /* 转换输出数据 */ }
}
```

**步骤3: 注册到系统**
```javascript
// 在 WorkflowEditor.jsx 中注册
const nodeTypes = {
  'text-input': TextInputNode,
  'tts': TTSNode,
  'new-node': NewNode,  // 新增
  'output': OutputNode
}

// 在 AdapterFactory 中注册
static createAdapter(nodeType, config) {
  switch (nodeType) {
    case 'tts': return new TTSAdapter(config)
    case 'new-node': return new NewNodeAdapter(config)  // 新增
  }
}
```

**步骤4: 添加到节点面板**
```javascript
// 在 NodePanel.jsx 中添加
const nodeCategories = {
  processing: [
    { type: 'tts', label: '语音合成', icon: '🎤' },
    { type: 'new-node', label: '新功能', icon: '🆕' }  // 新增
  ]
}
```

### 2. 集成新的功能模块

**原则**: 最大化复用现有代码，最小化修改

**步骤**:
1. 分析现有模块的API接口
2. 创建对应的适配器类
3. 实现数据格式转换逻辑
4. 创建节点UI组件
5. 集成到工作流系统

### 3. 工作流功能增强

**已实现功能**:
- ✅ 可视化节点编辑
- ✅ 自动连接和布局
- ✅ 实时执行引擎
- ✅ 详细执行日志
- ✅ 错误处理和状态管理

**扩展方向**:
- 工作流模板保存/加载
- 并行执行支持
- 条件分支节点
- 循环执行节点
- 工作流分享和导入导出

## 🐛 调试与维护

### 常见问题排查

**1. 工作流执行失败**
- 检查API服务是否正常运行
- 查看浏览器控制台的详细错误日志
- 验证节点配置参数是否正确

**2. 适配器调用错误**
- 确认 `ModuleAdapter.js` 导入路径正确
- 检查适配器是否正确注册到工厂类
- 验证数据格式转换逻辑

**3. 节点连接问题**
- 检查节点数据传递逻辑
- 确认 edges 和 nodes 状态更新
- 验证 Handle 组件配置

### 开发调试技巧

**1. 启用详细日志**
```javascript
console.log('[适配器] 处理数据:', workflowData)
console.log('[TTS节点] API调用结果:', result)
```

**2. 使用React开发工具**
- 安装React DevTools浏览器扩展
- 检查组件状态和props传递
- 分析组件渲染性能

**3. 网络请求调试**
- 使用浏览器Network面板监控API调用
- 检查请求参数和响应数据
- 验证CORS配置

## 📊 项目统计

### 代码规模
- **总组件数**: 18个
- **页面组件**: 5个 (home, tts, video, image, workflow)
- **工作流组件**: 7个 (编辑器 + 节点)
- **共享组件**: 6个
- **代码行数**: ~4200行

### 功能完成度
- ✅ **基础架构**: 100%
- ✅ **页面导航**: 100%
- ✅ **状态管理**: 100%
- ✅ **语音模块**: 100% (TTS + ASR完整功能)
- ✅ **工作流系统**: 90% (核心功能完成，扩展功能开发中)
- ✅ **API集成**: 85%
- ✅ **响应式设计**: 100%

### 工作流系统功能覆盖
- ✅ **TTS节点**: 100% (完全复用语音模块功能)
- 🔄 **ASR节点**: 待开发 (第二阶段)
- 🔄 **视频生成节点**: 待开发 (第三阶段)  
- 🔄 **图像处理节点**: 待开发 (第四阶段)

## 🚀 快速开始

### 本地开发
```bash
cd ai-tools-platform
npm install
npm run dev
```

### 后端服务
```bash
# TTS服务 (支持语音合成和自定义录音)
python tts_fastapi_server.py  # http://localhost:8000

# ASR服务 (支持语音识别)
python asr_service.py  # http://localhost:8002

# Video服务  
python video_service.py  # http://localhost:8001

# Image服务
python image_processor_fastapi.py  # http://localhost:8003
```

### 构建部署
```bash
npm run build
npm run preview
```

### 工作流系统验证清单

**基础功能测试**:
- [ ] 添加文本输入节点
- [ ] 添加TTS节点并配置
- [ ] 连接节点形成工作流
- [ ] 执行工作流验证结果
- [ ] 查看执行日志

**TTS节点功能测试**:
- [ ] 预设角色模式正常工作
- [ ] 自定义声音模式加载用户录音库
- [ ] 语音参数调节生效
- [ ] 错误处理和状态提示正确

**系统集成测试**:
- [ ] API配置和连接正常
- [ ] 适配器调用成功
- [ ] 数据格式转换正确
- [ ] 执行引擎稳定运行

## 📝 开发规范

### 组件命名规范
- 页面组件: `HomePage`, `TTSPage` (大驼峰)
- 工作流组件: `WorkflowEditor`, `TTSNode`
- 适配器类: `TTSAdapter`, `ModuleAdapter`
- 共享组件: `FileUpload`, `ProgressBar`

### 工作流开发规范
- 适配器类必须继承 `ModuleAdapter`
- 节点组件必须实现 `handleProcess` 方法
- 数据传递使用 `WorkflowData` 格式
- API调用复用现有接口，避免重复开发

### API调用规范
- 统一使用config中的API地址
- 错误处理要提供用户友好的信息
- 支持取消长时间运行的请求
- 通过onNotification提供操作反馈

## 🎯 发展路线图

### 第一阶段 ✅ (已完成)
- **TTS工作流节点**: 完全复用语音模块功能
- **适配器框架**: 模块化扩展架构
- **可视化编辑器**: 基础节点编排功能

### 第二阶段 🔄 (开发中)
- **ASR工作流节点**: 语音识别功能集成
- **文件管理系统**: 统一文件存储和管理
- **批量操作支持**: 提升工作效率

### 第三阶段 📋 (规划中)
- **视频生成节点**: 视频创作工作流
- **图像处理节点**: 图像编辑工作流
- **高级流程控制**: 条件分支、循环执行

### 第四阶段 🚀 (未来展望)
- **工作流模板市场**: 模板分享和复用
- **协作功能**: 多人协作编辑
- **性能优化**: 大规模工作流支持

---

*本文档更新时间: 2025年6月*  
*版本: v3.0 - AI创作工作流系统版本*

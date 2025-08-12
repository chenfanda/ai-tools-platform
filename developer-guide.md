# AI创作平台技术文档 v4.0

## 📋 项目概述

### 项目基本信息
- **项目名称**: AI创作平台 (AI Creative Platform)
- **技术栈**: React 18 + Vite + Tailwind CSS
- **架构模式**: 模块化组件架构 + 左侧边栏导航
- **部署方式**: 前端单页应用 + 多服务后端API
- **开发状态**: 核心功能完成，支持模块化扩展，新增多媒体处理能力

### 核心功能模块
1. **语音模块 (Voice Module)** - 全方位语音处理解决方案
   - **语音合成 (TTS)**: 角色配音、自定义声音克隆
   - **语音识别 (ASR)**: 音频转文字、多语言支持
   - **多角色配音**: 时间轴多角色对话配音，支持角色库和自定义录音 ✨

2. **视频生成 (Video)** - 综合视频创作工具
   - 图片音频合成、模板视频、AI视频生成

3. **图像处理 (Image)** - 专业图像编辑套件
   - **基础图像工具**: 背景移除、人脸增强、超分辨率等
   - **轻美颜**: 7种人脸精细调整，自然美化效果 ✨
   - **人脸风格化**: 人脸风格转换 ✨

4. **多媒体处理 (Media)** - 音视频全流程处理平台 🆕
   - **音频处理**: 音频提取、分离、剪辑、合并
   - **视频处理**: 视频配音、剪辑、合并、字幕处理
   - **高级功能**: 去除字幕、音频字幕对齐

5. **AI创作工作流 (Workflow)** - 模块编排器，支持可视化工作流设计

## 🏗️ 架构设计

### 整体架构
```
┌─────────────────────────────────────────────────┐
│                   Header                        │
├─────────────┬───────────────────────────────────┤
│             │                                   │
│  PageSidebar│           MainContent             │
│             │                                   │
│ • 语音模块   │  ┌─────────────────────────────┐   │
│ • 视频生成   │  │        Page Component       │   │
│ • 图像处理   │  │   (Voice/Video/Image/       │   │
│ • 多媒体处理 │  │      Media/Workflow)        │   │
│ • 工作流     │  └─────────────────────────────┘   │
└─────────────┴───────────────────────────────────┘
```

### 目录结构
```
ai-tools-platform/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/              # 布局组件
│   │   │   ├── Header.jsx       # 顶部导航 (5个主要模块)
│   │   │   ├── MainContent.jsx  # 主内容容器
│   │   │   ├── PageSidebar.jsx  # 页面侧边栏 (支持子功能切换)
│   │   │   ├── ConfigPanel.jsx  # 配置面板
│   │   │   └── NotificationSystem.jsx # 通知系统
│   │   ├── shared/              # 共享组件
│   │   │   ├── FileUpload.jsx   # 文件上传
│   │   │   ├── ProgressBar.jsx  # 进度条
│   │   │   ├── ResultPanel.jsx  # 结果展示
│   │   │   └── Button.jsx       # 按钮组件
│   │   ├── voice/               # 语音模块组件
│   │   │   ├── VoiceSynthesisPanel.jsx         # 语音合成
│   │   │   ├── SpeechRecognitionPanel.jsx      # 语音识别
│   │   │   └── MultiCharacterDubbingPanel.jsx  # 多角色配音 ✨
│   │   ├── image/               # 图像处理组件
│   │   │   ├── BasicImageTools.jsx    # 基础图像工具
│   │   │   ├── FaceBeauty.jsx        # 轻美颜 ✨
│   │   │   └── FaceStylization.jsx   # 人脸风格化 ✨
│   │   ├── media/               # 多媒体处理组件 🆕
│   │   │   ├── AudioExtractor.jsx    # 音频提取
│   │   │   ├── AudioSeparator.jsx    # 音频分离
│   │   │   ├── VideoDubber.jsx       # 视频配音
│   │   │   ├── SubtitleAdder.jsx     # 添加字幕
│   │   │   ├── VideoTrimmer.jsx      # 视频剪辑
│   │   │   ├── AudioTrimmer.jsx      # 音频剪辑
│   │   │   ├── VideoMerger.jsx       # 视频合并
│   │   │   ├── AudioMerger.jsx       # 音频合并
│   │   │   ├── SubtitleRemover.jsx   # 去除字幕
│   │   │   └── AudioTextAligner.jsx  # 音频字幕对齐
│   │   └── workflow/            # 工作流组件
│   │       ├── WorkflowEditor.jsx   # 工作流编辑器
│   │       ├── NodePanel.jsx       # 节点面板
│   │       └── nodes/              # 节点组件
│   │           ├── TextInputNode.jsx  # 文本输入节点
│   │           ├── TTSNode.jsx        # TTS节点
│   │           └── OutputNode.jsx     # 输出节点
│   ├── pages/                   # 页面组件
│   │   ├── home/
│   │   │   └── index.jsx        # 首页
│   │   ├── tts/
│   │   │   └── index.jsx        # 语音模块页面 (3个子功能)
│   │   ├── video/
│   │   │   └── index.jsx        # 视频生成页面
│   │   ├── image/
│   │   │   └── index.jsx        # 图像处理页面 (3个子功能)
│   │   ├── media/               # 多媒体处理页面 🆕
│   │   │   └── index.jsx        # (10个子功能)
│   │   └── workflow/
│   │       └── index.jsx        # 工作流页面
│   ├── services/                # API服务层
│   │   ├── api/
│   │   │   ├── imageAPI.js      # 图像处理API封装
│   │   │   ├── mediaAPI.js      # 多媒体处理API封装 🆕
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

### 1. 主应用组件 (App.jsx) 🔄

**新增功能**:
- **智能环境检测**: 自动区分生产环境和开发环境
- **扩展API服务配置**: 支持7个后端服务
- **增强键盘快捷键**: 支持Ctrl+1-5快速切换页面

**关键配置**:
```javascript
const [config, setConfig] = useState({
  ttsApiUrl: isProduction ? 'https://tts-api.181901.xyz' : 'http://localhost:8000',
  videoApiUrl: isProduction ? 'https://videos-api.181901.xyz' : 'http://localhost:8001',
  asrApiUrl: isProduction ? 'https://asr-api.181901.xyz' : 'http://localhost:8002',
  imageApiUrl: isProduction ? 'https://images-api.181901.xyz' : 'http://localhost:8003',
  facialApiUrl: isProduction ? 'https://facial-api.181901.xyz' : 'http://localhost:8004',    // 新增
  styleganApiUrl: isProduction ? 'https://stylegan-api.181901.xyz' : 'http://localhost:8005', // 新增
  mediaApiUrl: isProduction ? 'https://media-api.181901.xyz' : 'http://localhost:8006'        // 新增
})
```

### 2. 顶部导航 (Header.jsx) 🔄

**新增导航标签**:
```javascript
const navTabs = [
  { id: 'home', label: '首页' },
  { id: 'tts', label: '语音模块' },
  { id: 'video', label: '视频生成' },
  { id: 'image', label: '图像处理' },
  { id: 'media', label: '多媒体处理' }  // 🆕 新增多媒体处理
]
```

### 3. 主内容容器 (MainContent.jsx) 🔄

**扩展子页面管理**:
```javascript
const [subPages, setSubPages] = useState({
  tts: 'voice-synthesis',      // 语音合成、语音识别、多角色配音
  video: 'standard-video',     // 视频生成功能
  image: 'basic-tools',        // 基础工具、轻美颜、人脸风格化
  media: 'extract-audio'       // 🆕 10种多媒体处理功能
})
```

**新增页面支持**:
- 多媒体处理页面完整集成
- 侧边栏支持扩展到4个主要功能模块

### 4. 页面侧边栏 (PageSidebar.jsx) 🔄

#### 语音模块配置 (扩展)
```javascript
tts: {
  title: '语音模块',
  items: [
    { id: 'voice-synthesis', label: '语音合成', icon: '🎤' },
    { id: 'speech-recognition', label: '语音识别', icon: '📝' },
    { id: 'multi-character-dubbing', label: '多角色配音', icon: '🎭' }  // ✨ 新增
  ]
}
```

#### 图像处理配置 (扩展)
```javascript
image: {
  title: '图像处理',
  items: [
    { id: 'basic-tools', label: '基础图像工具', icon: '🔧' },
    { id: 'face-beauty', label: '轻美颜', icon: '✨' },          // ✨ 新增
    { id: 'face-stylization', label: '人脸风格化', icon: '🎨' }  // ✨ 新增
  ]
}
```

#### 多媒体处理配置 (全新)
```javascript
media: {
  title: '多媒体处理',
  items: [
    { id: 'extract-audio', label: '音频提取', icon: '🎵' },
    { id: 'audio-separate', label: '音频分离', icon: '🎼' },
    { id: 'video-dubbing', label: '视频配音', icon: '🎤' },
    { id: 'add-subtitles', label: '添加字幕', icon: '📝' },
    { id: 'video-trim', label: '视频剪辑', icon: '✂️' },
    { id: 'audio-trim', label: '音频剪辑', icon: '🎯' },
    { id: 'video-merge', label: '视频合并', icon: '🔗' },
    { id: 'audio-merge', label: '音频合并', icon: '🎵' },
    { id: 'remove-subtitles', label: '去除字幕', icon: '🚫' },
    { id: 'audio-text-align', label: '音频字幕对齐', icon: '⏱️' }
  ]
}
```

## 🆕 多媒体处理系统

### 系统架构
多媒体处理系统是平台的重要扩展，提供完整的音视频处理解决方案：

```
┌─────────────────────────────────────┐
│        多媒体处理前端界面             │
├─────────────────────────────────────┤
│          功能模块分类               │
│  ┌─────────────┬─────────────────┐  │
│  │  音频处理   │    视频处理     │  │
│  │  • 提取     │    • 配音       │  │
│  │  • 分离     │    • 剪辑       │  │
│  │  • 剪辑     │    • 合并       │  │
│  │  • 合并     │    • 字幕处理   │  │
│  └─────────────┴─────────────────┘  │
├─────────────────────────────────────┤
│         统一API服务层               │
│    (mediaApiUrl: port 8006)         │
└─────────────────────────────────────┘
```

### 核心功能组件

#### 音频处理功能
1. **AudioExtractor** - 音频提取
   - 从视频中提取纯音频文件
   - 支持多种音频格式输出

2. **AudioSeparator** - 音频分离  
   - 人声和背景音乐分离
   - AI驱动的音频源分离技术

3. **AudioTrimmer** - 音频剪辑
   - 精确时间点裁剪
   - 支持多段音频处理

4. **AudioMerger** - 音频合并
   - 多个音频文件合并
   - 音量平衡和淡入淡出

5. **AudioTextAligner** - 音频字幕对齐
   - 生成精确时间戳字幕
   - 语音识别与文本同步

#### 视频处理功能
1. **VideoDubber** - 视频配音
   - 为视频添加音频轨道
   - 音频视频同步处理

2. **VideoTrimmer** - 视频剪辑
   - 视频片段裁剪
   - 支持精确帧级编辑

3. **VideoMerger** - 视频合并
   - 多个视频文件拼接
   - 转场效果和格式统一

4. **SubtitleAdder** - 添加字幕
   - SRT/VTT字幕文件导入
   - 字幕样式和位置调整

5. **SubtitleRemover** - 去除字幕
   - 移除嵌入式硬字幕
   - AI图像修复技术

## ✨ 图像处理系统增强

### 新增美颜功能
**FaceBeauty组件** - 轻美颜系统
- **7种精细调整功能**:
  - 磨皮美白
  - 瘦脸塑形
  - 大眼亮眼
  - 鼻梁调整
  - 嘴型优化
  - 肤色调节
  - 整体美化

**技术特点**:
- 基于人脸关键点检测
- 自然美化算法，避免过度处理
- 实时预览和参数调节

### 新增风格化功能  
**FaceStylization组件** - 基于StyleGAN2的人脸风格化
- **生成器模型**: 6种专业模型(官方FFHQ、婴儿风格、模特风格、明星风格、网红风格、亚洲人脸)
- **属性编辑**: 20+种人脸属性精确调节(年龄、性别、颜值、情绪、脸型等)
- **编码器配置**: 迭代次数、细化步数、LPIPS损失、人脸对齐等高级参数
- **实时预览**: 原图与风格化结果对比显示

**核心技术特性**:
```javascript
// StyleGAN2参数结构
const styleganParams = {
  selectedGenerator: '官方FFHQ模型',  // 生成器选择
  encoderConfig: {
    n_iters: 5,                      // 迭代次数(1-20)
    refinement_steps: 200,           // 细化步数(50-1000)
    use_lpips: true,                 // LPIPS损失函数
    use_face_align: true             // 人脸对齐
  },
  editAttributes: {                  // 属性编辑(-5.0到+5.0)
    'age': 1.5,                     // 年龄调节
    'beauty': 2.0,                  // 颜值增强
    'smile': 1.2                    // 微笑程度
  }
}

// API服务架构
styleganApiUrl: 'http://localhost:8005'  // 专用StyleGAN2服务
```

## 🎭 语音模块增强

### 多角色配音系统
**MultiCharacterDubbingPanel组件** - 时间轴多角色配音

**核心功能**:
- **时间轴编辑器**: 可视化时间轴管理
- **角色管理**: 支持多个角色同时配音
- **台词分配**: 基于时间戳的台词分配
- **声音库集成**: 
  - 预设角色库
  - 用户自定义录音库
- **实时预览**: 多角色音频混合预览

**技术特性**:
```javascript
// 时间轴数据结构示例
const timelineData = [
  {
    id: 1,
    character: "角色A",
    text: "对话内容",
    startTime: 0.0,
    endTime: 3.5,
    voiceId: "character_001"
  },
  {
    id: 2, 
    character: "角色B",
    text: "回应内容",
    startTime: 4.0,
    endTime: 7.2,
    voiceId: "custom_voice_user123"
  }
]
```

## 🌐 API服务集成 (扩展版)

### 完整API配置架构
```javascript
const apiServices = {
  // 核心语音服务
  ttsApiUrl: 'http://localhost:8000',      // 语音合成 + 自定义录音
  asrApiUrl: 'http://localhost:8002',      // 语音识别
  
  // 视频服务
  videoApiUrl: 'http://localhost:8001',    // 视频生成和处理
  
  // 图像处理服务集群
  imageApiUrl: 'http://localhost:8003',    // 基础图像处理
  facialApiUrl: 'http://localhost:8004',   // 轻美颜服务 ✨
  styleganApiUrl: 'http://localhost:8005', // 人脸风格化服务 ✨
  
  // 多媒体处理服务
  mediaApiUrl: 'http://localhost:8006'     // 音视频处理服务 🆕
}
```

### 多媒体处理API示例
```javascript
// 音频提取API
POST /api/extract-audio
{
  "video_file": "video.mp4",
  "output_format": "mp3",
  "quality": "high"
}

// 音频分离API  
POST /api/separate-audio
{
  "audio_file": "mixed.wav",
  "separation_type": "vocals_instruments"
}

// 视频配音API
POST /api/video-dubbing
{
  "video_file": "video.mp4",
  "audio_file": "narration.mp3",
  "sync_mode": "auto"
}

// StyleGAN2风格化API
POST /api/stylegan2-edit
{
  "image_file": "face.jpg",
  "generator": "官方FFHQ模型",
  "encoder_config": {
    "n_iters": 5,
    "refinement_steps": 200,
    "use_lpips": true,
    "use_face_align": true
  },
  "edit_attributes": {
    "age": 1.5,
    "beauty": 2.0,
    "smile": 1.2
  }
}
```

## 🚀 工作流系统增强计划

### 新增工作流节点规划

#### 多媒体处理节点
- **AudioExtractorNode**: 音频提取节点
- **AudioSeparatorNode**: 音频分离节点  
- **VideoTrimmerNode**: 视频剪辑节点
- **SubtitleAddNode**: 字幕添加节点

#### 图像处理节点
- **FaceBeautyNode**: 轻美颜处理节点(7种精细调整)
- **StyleGAN2Node**: 人脸风格化节点(20+属性编辑，6种生成器模型)

#### 语音处理节点  
- **MultiCharacterTTSNode**: 多角色配音节点
- **VoiceCloneNode**: 声音克隆节点

### 工作流数据格式扩展
```javascript
// 支持更多数据类型
class WorkflowData {
  static createVideo(videoInfo, metadata = {})    // 视频数据
  static createSubtitle(subtitleInfo, metadata = {}) // 字幕数据
  static createTimeline(timelineData, metadata = {}) // 时间轴数据
}
```

## 📊 项目统计 (v4.0)

### 代码规模
- **总组件数**: 35+ 个 (↑94% 增长)
- **页面组件**: 5个 (home, tts, video, image, media)
- **功能子模块**: 16个 (语音3个 + 视频4个 + 图像3个 + 多媒体10个)
- **工作流组件**: 7个 (编辑器 + 节点)
- **共享组件**: 6个
- **代码行数**: ~8000行 (↑90% 增长)

### 功能完成度
- ✅ **基础架构**: 100%
- ✅ **页面导航**: 100%  
- ✅ **状态管理**: 100%
- ✅ **语音模块**: 100% (新增多角色配音)
- ✅ **图像处理**: 100% (新增轻美颜和风格化)
- ✅ **多媒体处理**: 90% (10个核心功能) 🆕
- ✅ **API集成**: 95% (7个服务)
- ✅ **响应式设计**: 100%
- 🔄 **工作流系统**: 85% (核心功能完成，新节点开发中)

### API服务覆盖
- ✅ **TTS服务**: 语音合成 + 自定义录音 + 多角色配音
- ✅ **ASR服务**: 语音识别 + 多语言支持
- ✅ **Video服务**: 视频生成 + 模板处理
- ✅ **Image服务**: 基础图像处理
- ✅ **Facial服务**: 轻美颜处理 ✨
- ✅ **StyleGAN服务**: 人脸风格化 ✨
- ✅ **Media服务**: 音视频全流程处理 🆕

## 🔄 功能扩展指南 (v4.0)

### 1. 添加新的多媒体处理功能

**步骤1: 创建功能组件**
```bash
touch src/components/media/NewMediaTool.jsx
```

**步骤2: 在MediaPage中注册**
```javascript
// src/pages/media/index.jsx
{activeSubPage === 'new-media-tool' && (
  <NewMediaTool config={config} onNotification={onNotification} />
)}
```

**步骤3: 更新侧边栏配置**
```javascript
// src/components/layout/PageSidebar.jsx
media: {
  items: [
    // 现有功能...
    { 
      id: 'new-media-tool', 
      label: '新功能', 
      icon: '🆕', 
      description: '新的多媒体处理功能' 
    }
  ]
}
```

### 2. 扩展图像处理功能

**新增美颜算法**:
- 在 `FaceBeauty.jsx` 组件中添加新的调整项
- 更新 `facialApiUrl` 服务的API接口
- 增加参数控制和实时预览

**新增风格化模型**:
- 在 `FaceStylization.jsx` 中添加新的风格选项
- 扩展 `styleganApiUrl` 服务的模型库
- 支持自定义风格训练

### 3. 多角色配音功能增强

**时间轴编辑器优化**:
- 增加拖拽调整功能
- 支持角色间对话重叠
- 添加音效和背景音乐轨道

**角色管理增强**:
- 角色声音预设库扩展
- 用户自定义角色创建
- 批量角色导入导出

## 🎯 发展路线图 (v4.0)

### 第一阶段 ✅ (已完成)
- **基础架构**: 5页面导航 + 侧边栏子功能
- **语音模块**: 语音合成 + 识别 + 多角色配音
- **图像处理**: 基础工具 + 轻美颜 + 人脸风格化
- **多媒体处理**: 10种音视频处理功能

### 第二阶段 🔄 (开发中)
- **工作流节点扩展**: 多媒体和图像处理节点
- **API性能优化**: 大文件处理和并行计算
- **用户体验增强**: 批量处理和模板系统

### 第三阶段 📋 (规划中)
- **AI能力增强**: 更先进的音视频AI算法
- **协作功能**: 多用户协作和项目管理
- **云端服务**: 资源共享和在线渲染

### 第四阶段 🚀 (未来展望)
- **插件系统**: 第三方功能集成
- **移动端支持**: 跨平台应用开发
- **商业化功能**: 付费服务和API市场

## 🔧 开发与部署

### 本地开发环境
```bash
cd ai-tools-platform
npm install
npm run dev  # 前端启动在 http://localhost:5173
```

### 后端服务集群
```bash
# 核心语音服务
python tts_fastapi_server.py      # http://localhost:8000
python asr_service.py             # http://localhost:8002

# 视频服务
python video_service.py           # http://localhost:8001

# 图像处理服务集群
python image_processor_fastapi.py # http://localhost:8003
python facial_beauty_service.py   # http://localhost:8004  ✨
python stylegan_service.py        # http://localhost:8005  ✨

# 多媒体处理服务
python media_processor_service.py # http://localhost:8006  🆕
```

### 生产环境部署
- **前端**: 静态文件部署到CDN
- **后端**: 7个独立服务的容器化部署
- **负载均衡**: 按功能模块分流
- **自动扩缩**: 基于请求量的动态扩展

## 🐛 调试与维护

### 新增功能调试要点

**多媒体处理调试**:
- 检查大文件上传和处理超时
- 验证音视频编解码格式支持
- 监控服务器资源使用情况

**图像美颜调试**:
- 人脸检测准确性验证
- 美颜参数范围和效果测试
- 不同分辨率图片兼容性

**多角色配音调试**:
- 时间轴数据同步验证
- 角色声音库加载状态
- 音频混合输出质量

### 性能监控指标
- **API响应时间**: 各服务平均响应延迟
- **文件处理速度**: MB/s 处理速率
- **错误率统计**: 各功能模块成功率
- **资源使用率**: CPU/内存/存储消耗

---

*本文档更新时间: 2025年8月*  
*版本: v4.0 - 多媒体处理与图像增强版本*  
*新增功能: 多媒体处理模块 + 轻美颜 + 人脸风格化 + 多角色配音*

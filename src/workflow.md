# AI创作平台工作流模块 README

## 📋 模块概述

工作流模块是一个基于**统一接口架构**的可视化节点编排系统，支持传统节点与动态JSON配置节点的混合管理。采用适配器模式实现现有功能模块的复用和扩展。

### 核心特性
- **双重节点系统**：传统硬编码节点 + 动态JSON配置节点并存
- **统一管理接口**：所有节点类型使用相同的创建、验证、执行接口
- **配置驱动开发**：通过JSON文件快速创建新节点，无需编写代码
- **数据标准化**：统一的数据模型确保节点间数据传递的兼容性
- **智能路由**：自动选择最适合的管理器处理不同类型节点

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                   WorkflowEditor.jsx                    │
│                  (可视化工作流编辑器)                      │
├─────────────────────────────────────────────────────────┤
│               UnifiedNodeManager.js                     │
│              (统一节点管理接口层)                          │
├──────────────────────┬──────────────────────────────────┤
│   LegacyNodeManager  │       DynamicNodeRegistry       │
│     (传统节点)        │         (动态节点)                │
├──────────────────────┼──────────────────────────────────┤
│               ExecutionManager.js                       │
│                (统一执行调度)                             │
├──────────────────────┼──────────────────────────────────┤
│   LegacyExecutor     │       DynamicExecutor           │
│     (传统执行器)      │        (动态执行器)               │
└──────────────────────┴──────────────────────────────────┘
```

## 📁 目录结构说明

```
src/
├── components/workflow/           # UI组件层
│   ├── WorkflowEditor.jsx        # 主编辑器界面
│   ├── WorkflowExecutor.jsx      # UI工作流执行器
│   ├── WorkflowLogPanel.jsx      # 执行日志面板
│   ├── NodePanel.jsx             # 节点工具箱面板
│   ├── UnifiedConfigPanel.jsx    # 统一配置面板
│   ├── UnifiedNodeRenderer.jsx   # 统一节点渲染器
│   ├── WorkflowConfigPanel.jsx   # 工作流配置面板
│   └── nodes/                    # 节点组件
│       ├── BaseWorkflowNode.jsx  # 节点基类
│       ├── dynamic/              # 动态节点组件
│       │   ├── DynamicNode.jsx   # 通用动态节点组件
│       │   └── DynamicConfigPanel.jsx # 动态配置面板
│       └── legacy/               # 传统节点组件
│           ├── TextInputNode.jsx # 文本输入节点
│           ├── TTSNode.jsx       # 语音合成节点
│           ├── OutputNode.jsx    # 输出节点
│           └── DownloadNode.jsx  # 下载节点
├── services/workflow/             # 业务逻辑层
│   ├── UnifiedNodeManager.js     # 统一管理接口层
│   ├── ExecutionManager.js       # 执行调度中心
│   ├── StandardDataModel.js      # 数据标准化模型
│   ├── ConfigurationResolver.js  # 配置解析器
│   ├── NodeStatusCalculator.js   # 节点状态计算器
│   ├── WorkflowValidator.js      # 工作流验证器
│   ├── ModuleAdapter.js          # 模块适配器基类
│   ├── DynamicAdapter.js         # 动态节点适配器
│   ├── LegacyExecutor.js         # 传统节点执行器
│   ├── DynamicExecutor.js        # 动态节点执行器
│   ├── legacy/                   # 传统节点系统
│   │   ├── LegacyNodeManager.js  # 传统节点管理器
│   │   └── LegacyNodesConfig.js  # 传统节点配置
│   ├── dynamic/                  # 动态节点系统  
│   │   ├── DynamicNodeRegistry.js # 动态节点注册表
│   │   ├── ConfigLoader.js       # JSON配置加载器
│   │   └── DynamicNodeInitializer.js # 动态节点初始化器
│   ├── types/                    # 数据类型系统
│   │   ├── DataTypes.js          # 数据类型定义
│   │   └── DataValidator.js      # 数据验证器
│   └── handlers/                 # 业务处理器
│       ├── asr_transcribe_handler.js # ASR语音识别处理器
│       ├── media_input_handler.js    # 媒体输入处理器
│       └── text_process_handler.js   # 文本处理器
└── extensions/workflow/           # 扩展配置层
    ├── configs/                   # 配置文件目录
    │   ├── dynamic/              # JSON节点配置
    │   │   ├── asr-node.json     # ASR语音识别节点
    │   │   ├── media-input.json  # 媒体输入节点
    │   │   └── simple-test.json  # 测试节点
    │   ├── legacy/               # 传统节点配置
    │   │   └── legacy-nodes.json # 传统节点定义
    │   └── index.js              # 配置入口
    ├── schemas/                  # 配置Schema
    │   └── node-config.schema.json # 节点配置JSON Schema
    ├── utils/                    # 配置工具
    │   └── ConfigConverter.js    # 配置转换器
    └── node-components/          # 预留节点组件目录
```

## 🔄 核心数据流程

### 1. 节点创建流程
```
WorkflowEditor → UnifiedNodeManager.createNode() → 路由判断(legacy/dynamic) 
    → Legacy/DynamicNodeRegistry → 组件创建 → StandardDataModel标准化 → 返回统一节点
```

### 2. 节点执行流程  
```
WorkflowEditor.executeWorkflow() → WorkflowExecutor.executeStackedWorkflow() 
    → UnifiedNodeManager.executeNode() → ExecutionManager.execute() 
    → 路由分发 → Legacy/DynamicExecutor → ModuleAdapter/DynamicAdapter → API调用 
    → StandardDataModel.normalizeNodeOutput() → 返回WorkflowData
```

### 3. 数据传递流程
```
节点输出 → StandardDataModel.normalizeNodeOutput() → WorkflowData格式 
    → StandardDataModel.prepareNodeInput() → 下游节点输入适配 → 执行器处理
```

### 4. 配置解析流程
```
节点数据 → ConfigurationResolver.resolveConfiguration() → 配置验证与合并 
    → NodeStatusCalculator.calculateNodeStatus() → 执行状态判断
```

## 🧩 核心模块功能

### WorkflowEditor.jsx
**可视化工作流编辑器**
- **节点管理**：基于ReactFlow的可视化节点编排，支持拖拽和选择
- **堆叠式布局**：自动垂直排列节点，无需手动连线
- **统一接口集成**：通过UnifiedNodeManager创建和管理所有类型节点
- **实时执行**：工作流数据校准、状态验证、串行执行

### UnifiedNodeManager.js
**统一节点管理接口层**
- **路由功能**：根据节点类型自动选择Legacy或Dynamic管理器
- **统一接口**：`createNode()`, `validateNode()`, `executeNode()`, `getNodeStatus()`
- **智能降级**：管理器不可用时自动回退到兼容模式
- **接口适配**：为Legacy和Dynamic系统提供标准化的管理接口

### ExecutionManager.js  
**执行调度中心**
- **执行分发**：根据路由信息委托给LegacyExecutor或DynamicExecutor
- **工作流执行**：`executeWorkflow()` - 串行执行多个节点，数据依次传递
- **批量执行**：`executeBatch()` - 支持并行和串行批量节点执行
- **性能统计**：执行时间、成功率、错误率等指标收集

### StandardDataModel.js
**数据标准化模型**  
- **格式检测**：`detectDataFormat()` - 自动识别Legacy、Dynamic、Standard三种数据格式
- **格式转换**：`fromLegacyNode()`, `fromDynamicNode()` - 在不同格式间进行无损转换
- **输出标准化**：`normalizeNodeOutput()` - 将节点输出转换为统一的WorkflowData格式
- **输入准备**：`prepareNodeInput()` - 为目标节点准备合适格式的输入数据

### DynamicNodeRegistry.js
**动态节点注册表**
- **JSON配置加载**：通过ConfigLoader从`configs/dynamic/`目录加载节点配置
- **自动组件分配**：为JSON节点自动分配DynamicNode组件
- **统一接口适配**：实现与传统节点相同的管理接口(createNodeStandard等)
- **配置验证**：确保JSON配置的完整性和正确性

### ConfigLoader.js
**JSON配置加载器**
- **配置发现**：基于`knownConfigFiles`数组扫描配置文件
- **完整加载**：返回包含所有Schema字段的完整配置对象
- **配置验证**：基于JSON Schema进行配置文件验证
- **缓存机制**：配置文件缓存提高加载性能

### DataValidator.js
**数据验证器**
- **类型验证**：基于DataTypes进行严格的数据类型检查
- **规则验证**：长度、范围、格式等验证规则
- **UI类型映射**：将UI控件类型(select、checkbox等)映射到数据类型
- **批量验证**：`validateFields()` - 同时验证多个字段的数据一致性

### LegacyExecutor.js
**传统节点执行器**
- **专门处理**：专门处理tts、download、text-input、output四种传统节点
- **配置解析**：使用ConfigurationResolver解析用户配置
- **状态验证**：使用NodeStatusCalculator验证执行状态
- **适配器创建**：创建TTSAdapter、DownloadAdapter等具体适配器

### DynamicExecutor.js
**动态节点执行器**
- **动态配置**：获取JSON配置文件中的执行配置
- **适配器创建**：创建DynamicAdapter实例处理节点执行
- **执行配置提取**：从JSON配置中提取handler、endpoint等执行参数
- **降级处理**：配置缺失时提供默认执行配置

### DynamicAdapter.js
**动态节点适配器**
- **Handler加载**：动态加载和缓存处理器函数
- **输入标准化**：根据inputSchema转换输入数据格式
- **输出标准化**：根据outputSchema转换输出数据格式
- **File对象处理**：正确识别和传递File对象，避免强制转换

### Business Handlers
**业务处理器**
- **asr_transcribe_handler.js**：ASR语音识别API对接，支持多语言和格式
- **media_input_handler.js**：多媒体文件输入处理，支持文件上传和URL下载
- **text_process_handler.js**：文本处理逻辑

## 🔧 节点类型管理

### 传统节点 (Legacy)
- **硬编码组件**：TextInputNode.jsx, TTSNode.jsx, OutputNode.jsx, DownloadNode.jsx
- **管理器**：LegacyNodeManager - 预定义节点类型和配置
- **执行器**：LegacyExecutor - 专门处理传统节点执行
- **适配器**：TTSAdapter, DownloadAdapter等具体业务适配器
- **配置存储**：数据直接存储在node.data根级别

### 动态节点 (Dynamic)  
- **JSON驱动**：通过JSON配置文件定义节点结构和行为
- **自动组件**：统一使用DynamicNode.jsx组件渲染
- **管理器**：DynamicNodeRegistry - 动态加载和注册JSON配置
- **执行器**：DynamicExecutor - 处理动态节点执行逻辑
- **适配器**：DynamicAdapter - 通用动态节点适配器
- **字段定义**：通过fields数组定义UI控件和验证规则
- **处理器系统**：通过handlers目录的处理器函数执行具体业务逻辑

### 节点路由规则
```javascript
// 传统节点类型 - 硬编码判断
const legacyTypes = ['text-input', 'tts', 'output', 'download']

// 动态节点类型 - 配置文件驱动
const dynamicTypes = ['asr-node', 'media-input', 'simple-test']

// 路由逻辑：
// 1. 优先检查传统节点类型
// 2. 检查动态注册表中的配置
// 3. 降级：包含连字符的视为动态节点
```

### 配置Schema系统
- **JSON Schema**：`node-config.schema.json` - 定义动态节点配置文件规范
- **数据Schema**：`inputSchema`和`outputSchema` - 定义节点输入输出数据结构
- **UI Schema**：`fields`数组 - 定义配置面板的表单控件
- **执行Schema**：`execution`对象 - 定义节点执行方式和参数

## 📝 添加新节点

### 方式1：JSON配置节点（推荐）
1. 在`configs/dynamic/`创建JSON配置文件
2. 在`ConfigLoader.js`的`knownConfigFiles`数组中添加文件名
3. 系统自动加载和注册，无需编写代码

```json
{
  "meta": {
    "configVersion": "1.0",
    "nodeId": "new-node",
    "displayName": "新功能节点"
  },
  "node": {
    "type": "new-node", 
    "label": "新功能节点",
    "icon": "🆕",
    "category": "general"
  },
  "fields": [
    {
      "name": "text",
      "type": "text", 
      "label": "输入文本",
      "required": true
    }
  ],
  "execution": {
    "type": "api",
    "endpoint": "http://localhost:8000/new-api"
  }
}
```

### 方式2：传统节点
1. 创建React组件（如NewNode.jsx）
2. 在LegacyNodeManager中注册
3. 实现组件逻辑和API调用

## 🚀 执行引擎

### 堆叠式工作流执行
```javascript
// WorkflowEditor中的执行流程
const executeWorkflow = async () => {
  // 1. 数据校准：同步节点配置到多个位置
  const calibratedNodes = nodes.map(node => {
    // 提取直接配置字段到node.data.config
    // 同步到nodeConfig.defaultData（动态节点兼容）
  })
  
  // 2. 状态缓存清理：强制重新计算状态
  nodeStatusCalculator.clearCache()
  
  // 3. 执行前验证：检查工作流完整性
  const validation = validateCurrentWorkflow()
  
  // 4. 串行执行：通过WorkflowExecutor逐个处理节点
  await workflowExecutor.executeStackedWorkflow(calibratedNodes, addLog, setNodes)
}
```

### 单节点执行
```javascript
// 通过UnifiedNodeManager统一接口执行
const result = await unifiedNodeManager.executeNode(nodeData, inputData, {
  systemConfig: { apiUrl: 'http://localhost:8000' },
  userConfig: extractedConfig
})

// 内部路由到具体执行器
ExecutionManager.execute(nodeData, inputData, routing, options)
  → LegacyExecutor.execute() 或 DynamicExecutor.execute()
```

### 执行器适配原理
- **LegacyExecutor**：
  - 使用ConfigurationResolver解析配置
  - 调用NodeStatusCalculator验证状态
  - 创建具体适配器(TTSAdapter, DownloadAdapter)
  - 直接调用适配器的process方法
  
- **DynamicExecutor**：
  - 获取JSON配置中的execution配置
  - 创建DynamicAdapter实例
  - DynamicAdapter动态加载对应的handler函数
  - Handler函数执行具体业务逻辑

### Handler处理器系统
```javascript
// 动态加载处理器
const handler = await import(`./handlers/${handlerName}.js`)

// 标准handler接口
export default async function handlerName(input) {
  const { data, workflowData, userConfig, nodeConfig } = input
  
  // 执行具体业务逻辑
  const result = await processBusinessLogic(data, userConfig)
  
  // 返回处理结果（File对象、WorkflowData或原始数据）
  return result
}
```

## 📊 数据标准化

### WorkflowData统一格式
```javascript
{
  type: 'text' | 'audio' | 'image' | 'data' | 'error',
  content: { /* 类型特定的内容 */ },
  metadata: {
    nodeId: 'source-node-id',
    timestamp: 1234567890,
    source: 'node-type',
    originalFormat: 'string' | 'file' | 'object'
  },
  getPreview: function() { /* 预览信息 */ }
}
```

### 节点数据标准化流程
```javascript
// 1. 输出标准化（执行完成后）
StandardDataModel.normalizeNodeOutput(nodeType, rawOutput, nodeId, nodeConfig)
  → 检测数据类型 → 创建WorkflowData → 添加元数据

// 2. 输入准备（传递给下游节点前）
StandardDataModel.prepareNodeInput(sourceData, targetNodeType)
  → 格式适配 → 兼容性转换 → 返回目标格式

// 3. 格式检测
StandardDataModel.detectDataFormat(nodeData)
  → 'legacy' | 'dynamic' | 'standard' | 'unknown'
```

### 数据类型转换规则
- **文本节点输出**：`string` → `WorkflowData(text, {text: value})`
- **TTS节点输出**：`audio对象` → `WorkflowData(audio, {audio: audioInfo})`
- **动态节点输出**：`File对象` → 直接传递或根据outputSchema转换
- **错误情况**：`Error` → `WorkflowData(error, {error: message})`

### 跨节点兼容性处理
- **Legacy → Dynamic**：通过StandardDataModel转换格式
- **Dynamic → Legacy**：File对象直接传递，其他转换为兼容格式
- **错误降级**：转换失败时保持原格式，记录警告日志

## 🔍 调试和监控

### 统计信息
```javascript
// 执行统计
ExecutionManager.getExecutionStats()
// 路由统计  
unifiedNodeManager.getStats()
// 注册表状态
dynamicNodeRegistry.getRegistryStatus()
```

### 开发调试
```javascript
// 浏览器控制台访问
window.__unifiedNodeManager
window.__executionManager  
window.__dynamicNodeRegistry
```

### 健康检查
```javascript
// 系统自检
unifiedNodeManager.selfCheck()
ExecutionManager.getHealthStatus()
```

## ⚠️ 重要约定

1. **数据格式兼容性**：所有节点输出必须经过StandardDataModel标准化
2. **路由优先级**：legacy > dynamic > custom
3. **错误降级**：管理器不可用时自动回退，确保系统稳定性
4. **配置缓存**：JSON配置和路由信息会被缓存以提高性能
5. **调试模式**：开发环境下启用详细日志，生产环境自动关闭

## 📈 扩展方向

- **并行执行**：支持节点并行处理提升性能
- **条件分支**：根据条件选择不同执行路径
- **循环控制**：重复执行特定节点序列  
- **模板系统**：工作流模板的保存和复用
- **可视化监控**：实时监控节点执行状态

---

*版本: v1.0 | 更新时间: 2025年1月*

// ===== src/services/workflow/LegacyNodesConfig.js - 现有节点的完整配置映射 (修复导入版) =====

// 导入现有的节点组件
import TextInputNode from '@/components/workflow/nodes/legacy/TextInputNode'
import TTSNode from '@/components/workflow/nodes/legacy/TTSNode'
import DownloadNode from '@/components/workflow/nodes/legacy/DownloadNode'
import OutputNode from '@/components/workflow/nodes/legacy/OutputNode'

// ===== 暂时移除配置组件导入 =====
// 配置组件目前还在 WorkflowConfigPanel.jsx 中，暂时不导入
// 让 NodeRegistry 使用降级机制，通过原有的 if-else 路由
// 
// 未来可以单独提取配置组件：
// import { 
//   TextInputConfig, 
//   TTSConfigEnhanced, 
//   DownloadConfig, 
//   OutputConfig 
// } from '@/components/workflow/WorkflowConfigPanel'

/**
 * 现有节点的完整配置映射
 * 
 * 这个文件的作用：
 * 1. 将现有的硬编码节点配置化
 * 2. 为 NodeRegistry 提供完整的节点定义
 * 3. 保持100%向后兼容
 * 4. 作为新节点配置的模板参考
 * 
 * 使用方式：
 * nodeRegistry.registerLegacyNodes(LEGACY_NODES_CONFIG)
 */

/**
 * 现有4个节点的完整配置
 * 每个配置包含：React组件、配置组件、元数据、验证规则等
 */
export const LEGACY_NODES_CONFIG = {
  
  // ===== 文本输入节点 =====
  'text-input': {
    // React 组件
    component: TextInputNode,
    
    // 配置面板组件 - 暂时移除，让系统使用原有路由
    // configComponent: TextInputConfig,
    
    // 基础信息
    label: '文本输入',
    icon: '📝',
    description: '输入要处理的文本内容',
    
    // 主题和分类
    theme: 'purple',
    category: 'input',
    
    // 默认数据
    defaultData: {
      text: '',
      placeholder: '请输入文本内容...'
    },
    
    // 验证规则
    validation: {
      required: ['text'],
      textMinLength: 1,
      customValidator: (data) => {
        if (!data.text || data.text.trim().length === 0) {
          return { valid: false, errors: ['文本内容不能为空'] }
        }
        return { valid: true, errors: [] }
      }
    },
    
    // 节点配置
    nodeConfig: {
      canDelete: true,
      canMove: true,
      canCopy: true,
      maxInstances: null, // 无限制
      requiredPosition: null, // 可放置在任意位置
      outputType: 'text'
    }
  },

  // ===== TTS 语音合成节点 =====
  'tts': {
    // React 组件
    component: TTSNode,
    
    // 配置面板组件 - 暂时移除，让系统使用原有路由
    // configComponent: TTSConfigEnhanced,
    
    // 基础信息
    label: '语音合成',
    icon: '🎤',
    description: '将文本转换为语音',
    
    // 主题和分类
    theme: 'purple',
    category: 'processor',
    
    // 默认数据
    defaultData: {
      mode: 'character',
      character: '',
      selectedCharacter: '',
      gender: '',
      pitch: '',
      speed: '',
      username: 'workflow_user',
      voice_id: '',
      result: null
    },
    
    // 验证规则
    validation: {
      required: ['mode'],
      conditionalRequired: {
        character: ['selectedCharacter'],
        custom: ['username', 'voice_id']
      },
      customValidator: (data) => {
        const errors = []
        
        if (data.mode === 'character' && !data.selectedCharacter) {
          errors.push('角色模式下必须选择语音角色')
        }
        
        if (data.mode === 'custom') {
          if (!data.username || !data.username.trim()) {
            errors.push('自定义模式下必须输入用户名')
          }
          if (!data.voice_id) {
            errors.push('自定义模式下必须选择语音ID')
          }
        }
        
        if (!data.config?.ttsApiUrl) {
          errors.push('TTS API地址未配置')
        }
        
        return { valid: errors.length === 0, errors }
      }
    },
    
    // 节点配置
    nodeConfig: {
      canDelete: true,
      canMove: true,
      canCopy: true,
      maxInstances: null,
      requiredPosition: null,
      inputType: 'text',
      outputType: 'audio',
      requiresApi: true,
      apiEndpoint: 'ttsApiUrl'
    }
  },

  // ===== 输出预览节点 =====
  'output': {
    // React 组件
    component: OutputNode,
    
    // 配置面板组件 - 暂时移除，让系统使用原有路由
    // configComponent: OutputConfig,
    
    // 基础信息
    label: '结果输出',
    icon: '👁️',
    description: '预览和输出工作流结果',
    
    // 主题和分类
    theme: 'orange',
    category: 'output',
    
    // 默认数据
    defaultData: {
      displayMode: 'auto',
      autoExpand: false,
      showValidation: true,
      downloadEnabled: true,
      maxPreviewSize: 1000,
      preferredPanel: 'main',
      result: null,
      timestamp: null
    },
    
    // 验证规则
    validation: {
      required: [],
      customValidator: (data) => {
        // 输出节点通常不需要严格验证，它主要用于显示
        return { valid: true, errors: [] }
      }
    },
    
    // 节点配置
    nodeConfig: {
      canDelete: true,
      canMove: true,
      canCopy: true,
      maxInstances: null,
      requiredPosition: null,
      inputType: 'any',
      outputType: 'display',
      isTerminal: false // 可以继续连接其他节点
    }
  },

  // ===== 文件下载节点 =====
  'download': {
    // React 组件
    component: DownloadNode,
    
    // 配置面板组件 - 暂时移除，让系统使用原有路由
    // configComponent: DownloadConfig,
    
    // 基础信息
    label: '文件下载',
    icon: '📥',
    description: '下载文件到本地设备',
    
    // 主题和分类
    theme: 'green',
    category: 'output',
    
    // 默认数据
    defaultData: {
      autoDownload: false,
      customFileName: '',
      customPath: '',
      downloadFormat: 'auto',
      showProgress: true,
      allowRetry: true,
      result: null
    },
    
    // 验证规则
    validation: {
      required: [],
      customValidator: (data) => {
        const errors = []
        
        // 检查自定义文件名格式
        if (data.customFileName && data.customFileName.trim()) {
          const invalidChars = /[<>:"/\\|?*]/
          if (invalidChars.test(data.customFileName)) {
            errors.push('文件名包含非法字符')
          }
        }
        
        // 检查下载格式
        const validFormats = ['auto', 'wav', 'mp3', 'txt', 'json', 'png', 'jpg']
        if (data.downloadFormat && !validFormats.includes(data.downloadFormat)) {
          errors.push('无效的下载格式')
        }
        
        return { valid: errors.length === 0, errors }
      }
    },
    
    // 节点配置
    nodeConfig: {
      canDelete: true,
      canMove: true,
      canCopy: true,
      maxInstances: null,
      requiredPosition: null,
      inputType: 'any',
      outputType: 'file',
      isTerminal: true, // 通常是工作流的终点
      supportedInputTypes: ['audio', 'text', 'image', 'video', 'data']
    }
  }

}

/**
 * 配置组件映射
 * 
 * 注意：配置组件目前在 WorkflowConfigPanel.jsx 中
 * NodeRegistryInitializer 会自动处理这种情况，
 * 暂时移除 configComponent，让系统使用原有的路由逻辑
 */
export const CONFIG_COMPONENTS = {
  'text-input': 'TextInputConfig',
  'tts': 'TTSConfigEnhanced', 
  'output': 'OutputConfig',
  'download': 'DownloadConfig'
}

/**
 * 节点类型常量
 * 提供类型安全和自动完成支持
 */
export const NODE_TYPES = {
  TEXT_INPUT: 'text-input',
  TTS: 'tts',
  OUTPUT: 'output',
  DOWNLOAD: 'download'
}

/**
 * 节点分类常量
 */
export const NODE_CATEGORIES = {
  INPUT: 'input',
  PROCESSOR: 'processor', 
  OUTPUT: 'output',
  GENERAL: 'general'
}

/**
 * 支持的主题常量
 */
export const NODE_THEMES = {
  BLUE: 'blue',
  PURPLE: 'purple',
  ORANGE: 'orange',
  GREEN: 'green',
  RED: 'red'
}

/**
 * 工具函数：验证节点配置的完整性
 */
export const validateNodeConfig = (nodeType, config) => {
  const required = ['component', 'label', 'icon', 'description', 'theme', 'category']
  const missing = required.filter(key => !config[key])
  
  if (missing.length > 0) {
    console.warn(`[LegacyNodesConfig] 节点 ${nodeType} 缺少必需配置:`, missing)
    return false
  }
  
  return true
}

/**
 * 工具函数：获取节点配置概览
 */
export const getNodeConfigSummary = () => {
  const summary = {
    totalNodes: Object.keys(LEGACY_NODES_CONFIG).length,
    categories: {},
    themes: {},
    hasConfigComponents: 0
  }
  
  Object.entries(LEGACY_NODES_CONFIG).forEach(([type, config]) => {
    // 统计分类
    const category = config.category || 'general'
    summary.categories[category] = (summary.categories[category] || 0) + 1
    
    // 统计主题
    const theme = config.theme || 'blue'
    summary.themes[theme] = (summary.themes[theme] || 0) + 1
    
    // 统计配置组件
    if (config.configComponent) {
      summary.hasConfigComponents++
    }
  })
  
  return summary
}

/**
 * 导出默认配置和工具函数
 */
export default {
  LEGACY_NODES_CONFIG,
  CONFIG_COMPONENTS,
  NODE_TYPES,
  NODE_CATEGORIES,
  NODE_THEMES,
  validateNodeConfig,
  getNodeConfigSummary
}

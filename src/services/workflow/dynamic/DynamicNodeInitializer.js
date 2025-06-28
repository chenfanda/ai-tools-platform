// ===== src/services/workflow/dynamic/DynamicNodeInitializer.js - 动态节点初始化器 =====

// 导入动态节点注册表
import dynamicNodeRegistry from './DynamicNodeRegistry'

// 导入传统节点配置
import { LEGACY_NODES_CONFIG } from '../legacy/LegacyNodesConfig'

import ConfigLoader from './ConfigLoader' 

/**
 * 动态节点初始化器 - 重命名自 NodeRegistryInitializer
 * 
 * 核心职责：
 * 1. 初始化动态节点注册表
 * 2. 加载JSON配置文件中的节点
 * 3. 注册传统节点到动态注册表
 * 4. 提供安全的初始化机制
 * 
 * 改造说明：
 * - 从 NodeRegistryInitializer.js 重命名而来
 * - 移动到 dynamic 目录下
 * - 保持原有功能完全不变
 */
class DynamicNodeInitializer {
  constructor() {
    this.registry = dynamicNodeRegistry
    this.initialized = false
    this.initializationAttempts = 0
    this.maxRetries = 3
    
    this.debugMode = process.env.NODE_ENV === 'development'

    this.configLoader = new ConfigLoader()  // 🔧 添加 ConfigLoader 实例
    
    this.log('[DynamicNodeInitializer] 动态节点初始化器已创建')
  }

  /**
   * 调试日志输出
   */
  log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[DynamicInit ${timestamp}]`
    
    switch (type) {
      case 'error':
        console.error(`${prefix} ❌`, message)
        break
      case 'warn':
        console.warn(`${prefix} ⚠️`, message)
        break
      case 'success':
        console.log(`${prefix} ✅`, message)
        break
      default:
        console.log(`${prefix} ℹ️`, message)
    }
  }

  /**
   * 安全的自动初始化
   * 
   * 这是主要的入口方法，被 WorkflowEditor 调用
   */
  async safeAutoInitialize() {
    try {
      this.initializationAttempts++
      this.log(`开始第 ${this.initializationAttempts} 次初始化尝试`)

      if (this.initialized) {
        this.log('动态节点注册表已初始化，跳过重复初始化')
        return { success: true, cached: true }
      }

      // 初始化结果
      const result = {
        success: false,
        legacy: { success: 0, failed: 0 },
        json: { success: 0, failed: 0 },
        error: null
      }

      // 1. 注册传统节点
      try {
        const legacyResult = await this.registerLegacyNodes()
        result.legacy = legacyResult
        this.log(`传统节点注册完成: ${legacyResult.success} 成功, ${legacyResult.failed} 失败`)
      } catch (error) {
        this.log(`传统节点注册失败: ${error.message}`, 'error')
        result.legacy = { success: 0, failed: Object.keys(LEGACY_NODES_CONFIG).length }
      }

      // 2. 加载JSON配置节点
      try {
        const jsonResult = await this.loadJsonConfigs()
        result.json = jsonResult
        this.log(`JSON配置节点加载完成: ${jsonResult.success} 成功, ${jsonResult.failed} 失败`)
      } catch (error) {
        this.log(`JSON配置节点加载失败: ${error.message}`, 'error')
        result.json = { success: 0, failed: 1 }
      }

      // 3. 检查初始化结果
      const totalSuccess = result.legacy.success + result.json.success
      if (totalSuccess > 0) {
        result.success = true
        this.initialized = true
        this.log(`动态节点初始化成功，共注册 ${totalSuccess} 个节点`, 'success')
      } else {
        result.success = false
        result.error = '没有成功注册任何节点'
        this.log('动态节点初始化失败，没有注册任何节点', 'error')
      }

      return result

    } catch (error) {
      this.log(`动态节点初始化异常: ${error.message}`, 'error')
      
      // 如果还有重试机会
      if (this.initializationAttempts < this.maxRetries) {
        this.log(`将在 1 秒后进行第 ${this.initializationAttempts + 1} 次重试`, 'warn')
        await new Promise(resolve => setTimeout(resolve, 1000))
        return await this.safeAutoInitialize()
      }

      return {
        success: false,
        legacy: { success: 0, failed: 0 },
        json: { success: 0, failed: 0 },
        error: error.message,
        attempts: this.initializationAttempts
      }
    }
  }

  /**
   * 注册传统节点到动态注册表
   */
  async registerLegacyNodes() {
    try {
      this.log('开始注册传统节点到动态注册表')

      const result = { success: 0, failed: 0, errors: [] }

      // 遍历传统节点配置
      for (const [nodeType, config] of Object.entries(LEGACY_NODES_CONFIG)) {
        try {
          // 转换传统配置为动态注册表格式
          const dynamicConfig = this.convertLegacyToDynamicConfig(config, nodeType)
          
          // 注册到动态注册表
          const registered = this.registry.registerFullNodeConfig(nodeType, dynamicConfig)
          
          if (registered !== false) {
            result.success++
            this.log(`传统节点注册成功: ${nodeType}`)
          } else {
            result.failed++
            result.errors.push(`节点 ${nodeType} 注册失败`)
          }
          
        } catch (error) {
          result.failed++
          result.errors.push(`节点 ${nodeType} 注册异常: ${error.message}`)
          this.log(`传统节点注册失败 ${nodeType}: ${error.message}`, 'error')
        }
      }

      this.log(`传统节点注册完成: ${result.success}/${Object.keys(LEGACY_NODES_CONFIG).length}`)
      return result

    } catch (error) {
      this.log(`传统节点注册过程失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 转换传统配置为动态注册表格式
   */
  convertLegacyToDynamicConfig(legacyConfig, nodeType) {
    try {
      // 基础配置转换
      const dynamicConfig = {
        // 保留原有组件（如果有）
        component: legacyConfig.component || null,
        configComponent: legacyConfig.configComponent || null,
        
        // 基础元数据
        label: legacyConfig.label,
        icon: legacyConfig.icon,
        description: legacyConfig.description,
        theme: legacyConfig.theme,
        category: legacyConfig.category,
        
        // 数据配置
        defaultData: legacyConfig.defaultData || {},
        validation: legacyConfig.validation || {},
        
        // 标记为传统节点
        sourceType: 'legacy',
        _source: 'legacy',
        _converted: true,
        _originalConfig: legacyConfig,
        
        // 其他配置
        ...legacyConfig
      }

      // 移除不需要的字段
      delete dynamicConfig.type
      delete dynamicConfig.registeredAt

      return dynamicConfig

    } catch (error) {
      this.log(`传统配置转换失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 加载JSON配置文件中的节点
   */
  async loadJsonConfigs() {
    try {
      this.log('开始使用 ConfigLoader 加载JSON配置节点')

      // 🔧 使用 ConfigLoader 自动发现和加载所有配置
      const loadResult = await this.configLoader.loadAllConfigs()
      
      this.log(`ConfigLoader 发现 ${loadResult.summary.total} 个配置文件，成功加载 ${loadResult.summary.success} 个`)

      const result = { success: 0, failed: 0, errors: [] }

      // 注册所有成功加载的配置
      for (const configItem of loadResult.configs) {
        try {
          const { config } = configItem
          
          if (!config.node || !config.node.type) {
            throw new Error('配置格式无效：缺少 node.type')
          }
          
          // 转换配置格式并注册到 DynamicNodeRegistry
          const registered = this.registry.registerFullNodeConfig(config.node.type, {
            ...config.node,
            fields: config.fields || [],
            sourceType: 'json',
            _source: 'dynamic',
            _configFile: configItem.source.fileName,
            defaultData: config.data?.defaultData || {},
            validation: config.data?.validation || {},
            meta: config.meta,
            // 🔧 重要：确保使用动态组件
            component: null,  // 让系统自动分配 DynamicNode
            configComponent: 'DynamicConfigPanel'
          })

          if (registered !== false) {
            result.success++
            this.log(`JSON配置节点注册成功: ${config.node.type} (${config.node.label})`, 'success')
          } else {
            result.failed++
            result.errors.push(`JSON配置 ${config.node.type} 注册失败`)
          }
          
        } catch (error) {
          result.failed++
          result.errors.push(`配置注册失败: ${error.message}`)
          this.log(`配置注册失败: ${error.message}`, 'error')
        }
      }

      // 记录加载失败的配置
      for (const errorItem of loadResult.errors) {
        result.failed++
        result.errors.push(errorItem.error)
        this.log(`配置文件加载失败: ${errorItem.error}`, 'warn')
      }

      this.log(`JSON配置节点处理完成: ${result.success} 成功注册, ${result.failed} 失败`)
      return result

    } catch (error) {
      this.log(`JSON配置加载过程失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 加载单个JSON配置文件
   */
  async loadJsonConfig(configName) {
    try {
      // 这里需要根据实际的文件结构调整路径
      // 暂时返回一个基础配置，避免加载失败
      
      if (configName === 'simple-test') {
        return {
          node: {
            type: 'simple-test',
            label: '简单测试',
            icon: '🧪',
            description: '简单的测试节点',
            category: 'test',
            theme: 'blue'
          },
          fields: [
            {
              name: 'testText',
              type: 'text',
              label: '测试文本',
              defaultValue: '',
              required: true,
              placeholder: '请输入测试文本...'
            }
          ],
          data: {
            defaultData: { testText: '' },
            validation: { required: ['testText'] }
          }
        }
      }

      // 其他配置暂时跳过，避免加载失败
      return null

    } catch (error) {
      this.log(`JSON配置文件加载失败 ${configName}: ${error.message}`, 'warn')
      return null
    }
  }

  /**
   * 重新初始化（开发环境用）
   */
  async reinitialize() {
    try {
      this.log('开始重新初始化动态节点注册表')
      
      // 重置状态
      this.initialized = false
      this.initializationAttempts = 0
      
      // 清理注册表
      this.registry.reset()
      
      // 重新初始化
      const result = await this.safeAutoInitialize()
      
      this.log('动态节点注册表重新初始化完成')
      return result

    } catch (error) {
      this.log(`重新初始化失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 获取初始化状态
   */
  getInitializationStatus() {
    return {
      initialized: this.initialized,
      attempts: this.initializationAttempts,
      maxRetries: this.maxRetries,
      registryStatus: this.registry.getRegistryStatus()
    }
  }

  /**
   * 检查可用性
   */
  checkAvailability() {
    try {
      return {
        available: true,
        registry: Boolean(this.registry),
        legacyConfig: Boolean(LEGACY_NODES_CONFIG),
        nodeCount: Object.keys(LEGACY_NODES_CONFIG).length
      }
    } catch (error) {
      return {
        available: false,
        error: error.message
      }
    }
  }
}

// 创建单例实例
const dynamicNodeInitializer = new DynamicNodeInitializer()

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__dynamicNodeInitializer = dynamicNodeInitializer
}

export default dynamicNodeInitializer

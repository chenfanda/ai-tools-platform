// ===== src/services/workflow/DynamicExecutor.js - 简化版本 =====

/**
 * 动态节点执行器 - 简化版本
 * 
 * 🔧 简化原则：
 * 1. 移除冗余的配置解析和状态验证（执行器已经确定了节点类型）
 * 2. 保持核心执行功能不变
 * 3. 移除过度设计的健康检查和统计功能
 * 4. 专注于：获取配置 → 创建适配器 → 执行
 */
class DynamicExecutor {
  
  /**
   * 调试模式
   */
  static debugMode = process.env.NODE_ENV === 'development'

  /**
   * 调试日志输出
   */
  static log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[DynamicExec ${timestamp}]`
    
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
   * 执行动态节点 - 简化版主入口
   */
  static async execute(node, inputData, routing, options = {}) {
    try {
      if (!node || !node.type) {
        throw new Error('节点数据不完整')
      }

      this.log(`开始执行动态节点: ${node.type}`)

      // 1. 获取完整动态节点配置
      const fullConfig = await this.getDynamicNodeConfig(node.type)
      
      // 2. 🔧 简化：直接创建适配器并执行（移除中间验证环节）
      const adapter = await this.createDynamicAdapter(node, fullConfig, options)
      const result = await adapter.process(inputData)
      
      this.log(`动态节点执行成功: ${node.type}`, 'success')
      return result
      
    } catch (error) {
      this.log(`动态节点执行失败 ${node.type}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 获取动态节点完整配置 - 保持不变
   */
  static async getDynamicNodeConfig(nodeType) {
    try {
      // 动态导入 DynamicNodeRegistry
      const { default: dynamicNodeRegistry } = await import('./dynamic/DynamicNodeRegistry')
      
      // 获取完整节点配置
      const fullConfig = dynamicNodeRegistry.getFullNodeConfig(nodeType)
      
      if (!fullConfig) {
        throw new Error(`动态节点配置不存在: ${nodeType}`)
      }
      
      this.log(`获取动态节点配置: ${nodeType}`, 'success')
      
      return fullConfig
      
    } catch (error) {
      this.log(`获取动态节点配置失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 🔧 简化：创建动态适配器 - 去掉中间环节
   */
  static async createDynamicAdapter(node, fullConfig, options) {
    try {
      this.log(`创建动态适配器: ${node.type}`)
      
      // 导入现有的 DynamicAdapter
      const { DynamicAdapter } = await import('./DynamicAdapter')
      
      // 🔧 简化：准备适配器配置，让 DynamicAdapter 自己处理配置解析和状态验证
      const adapterConfig = this.prepareDynamicAdapterConfig(node, fullConfig, options)
      
      // 创建动态适配器实例
      const adapter = new DynamicAdapter(adapterConfig)
      
      this.log(`动态适配器创建成功: ${node.type}`, 'success')
      
      return adapter
      
    } catch (error) {
      this.log(`动态适配器创建失败 ${node.type}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 🔧 简化：准备动态适配器配置 - 传递原始数据让适配器处理
   */
  static prepareDynamicAdapterConfig(node, fullConfig, options) {
    try {
      // 🔧 简化：构建基础的适配器配置，让 DynamicAdapter 自己处理复杂逻辑
      const adapterConfig = {
        // 🔑 关键：传递完整的原始配置
        nodeConfig: fullConfig,
        
        // 节点数据
        nodeData: node,
        
        // 系统配置
        systemConfig: options.systemConfig || options.config,
        
        // 用户配置覆盖
        userConfig: options.userConfig || {},
        
        // 🔧 关键：提取执行配置，但让 DynamicAdapter 处理具体逻辑
        executorConfig: this.extractExecutorConfig(fullConfig),
        
        // 标识信息
        _source: 'dynamic_executor',
        _nodeType: node.type
      }
      
      this.log(`动态适配器配置准备完成: ${node.type}`)
      
      return adapterConfig
      
    } catch (error) {
      this.log(`动态适配器配置准备失败 ${node.type}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 提取执行配置 - 保持核心功能
   */
  static extractExecutorConfig(fullConfig) {
    try {
      // 检查 execution 配置
      let executionConfig = fullConfig.execution
      
      // 如果没有 execution 配置，提供默认配置
      if (!executionConfig) {
        this.log(`缺少 execution 配置，使用默认配置`, 'warn')
        executionConfig = {
          type: 'local',
          handler: 'executeGenericProcessor',
          timeout: 30
        }
      }
      
      // 构建 executorConfig
      const executorConfig = {
        // 执行类型和处理器
        type: executionConfig.type || 'local',
        handler: executionConfig.handler,
        
        // 执行参数
        timeout: executionConfig.timeout || 30,
        retry: executionConfig.retry || 0,
        
        // API相关配置（如果有）
        endpoint: executionConfig.endpoint,
        method: executionConfig.method,
        headers: executionConfig.headers,
        
        // 请求和响应映射（如果有）
        requestMapping: executionConfig.requestMapping,
        responseMapping: executionConfig.responseMapping
      }
      
      return executorConfig
      
    } catch (error) {
      this.log(`提取执行配置失败: ${error.message}`, 'error')
      // 返回默认配置
      return {
        type: 'local',
        handler: 'executeGenericProcessor',
        timeout: 30
      }
    }
  }

  // ===== 保留的必要工具方法 =====

  /**
   * 验证处理器类型 - 基础验证
   */
  static isValidHandler(handler) {
    return typeof handler === 'string' && 
           handler.length > 0 && 
           handler.trim().length > 0
  }

  /**
   * 获取支持的节点类型 - 保持功能
   */
  static async getSupportedNodeTypes() {
    try {
      const { default: dynamicNodeRegistry } = await import('./dynamic/DynamicNodeRegistry')
      const registeredTypes = dynamicNodeRegistry.getAllRegisteredTypes()
      
      this.log(`获取支持的动态节点类型: ${registeredTypes.length} 个`)
      return registeredTypes
      
    } catch (error) {
      this.log(`获取支持的节点类型失败: ${error.message}`, 'error')
      return []
    }
  }

  /**
   * 验证动态节点类型 - 保持功能
   */
  static async isDynamicNodeType(nodeType) {
    try {
      const supportedTypes = await this.getSupportedNodeTypes()
      return supportedTypes.includes(nodeType)
    } catch (error) {
      this.log(`检查节点类型失败 ${nodeType}: ${error.message}`, 'warn')
      
      // 降级判断：检查是否有连字符
      return nodeType.includes('-')
    }
  }

  /**
   * 获取处理器信息 - 保持功能
   */
  static getHandlerInfo(handler) {
    const handlerType = this.inferHandlerType(handler)
    
    return {
      description: `${handler} 处理器`,
      category: handlerType,
      supportedTypes: ['any'],
      isGeneric: true
    }
  }

  /**
   * 推断处理器类型 - 保持功能
   */
  static inferHandlerType(handler) {
    if (handler.includes('api') || handler.includes('request')) {
      return 'api'
    } else if (handler.includes('input') || handler.includes('media')) {
      return 'input'
    } else if (handler.includes('transform') || handler.includes('process')) {
      return 'processor'
    } else if (handler.includes('file')) {
      return 'utility'
    } else {
      return 'general'
    }
  }

  /**
   * 🔧 简化：基础健康检查（移除复杂的依赖检查）
   */
  static async checkHealth() {
    const health = {
      status: 'healthy',
      issues: [],
      capabilities: {}
    }

    try {
      // 只检查核心依赖
      const coreDependencies = [
        { name: 'DynamicNodeRegistry', path: './dynamic/DynamicNodeRegistry' },
        { name: 'DynamicAdapter', path: './DynamicAdapter' }
      ]

      for (const dep of coreDependencies) {
        try {
          await import(dep.path)
          health.capabilities[dep.name] = true
        } catch (error) {
          health.capabilities[dep.name] = false
          health.issues.push(`${dep.name} 不可用`)
          health.status = 'degraded'
        }
      }

      // 检查支持的类型
      const supportedTypes = await this.getSupportedNodeTypes()
      health.supportedNodeTypes = supportedTypes
      
    } catch (error) {
      health.status = 'error'
      health.issues.push(`健康检查失败: ${error.message}`)
    }

    return health
  }
}

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__dynamicExecutor = DynamicExecutor
}

export default DynamicExecutor
// ===== src/services/workflow/DynamicExecutor.js - 动态节点执行器 =====

/**
 * 动态节点执行器 - 专门处理动态节点执行
 * 
 * 核心职责：
 * 1. 专门处理动态节点（asr-node、media-input、simple-test等）的执行
 * 2. 使用 DynamicNodeRegistry 获取完整节点配置（包含execution配置）
 * 3. 使用 ConfigurationResolver 解析用户配置
 * 4. 确保 executorConfig 正确传递给 DynamicAdapter
 * 5. 支持多种通用 handler（media_input_processor、asr_transcribe_handler等）
 * 
 * 设计原则：
 * - 专一职责：只处理动态节点
 * - Handler驱动：基于JSON配置中的execution.handler执行
 * - 配置完整：确保executorConfig包含handler等关键信息
 * - 适配器复用：使用现有DynamicAdapter实现
 */
class DynamicExecutor {
  
  /**
   * 调试模式
   */
  static debugMode = process.env.NODE_ENV === 'development'

  /**
   * 支持的通用处理方法
   * DynamicAdapter 中实现的通用处理逻辑
   */
  static genericProcessorMethods = [
    'executeGenericProcessor',  // 通用数据处理
    'executeApiRequest'         // 通用API调用
    // 后续扩展更多通用方法
  ]

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
   * 执行动态节点 - 主入口
   * 
   * @param {object} node - 节点数据
   * @param {*} inputData - 输入数据
   * @param {object} routing - 路由信息
   * @param {object} options - 执行选项
   * @returns {object} 执行结果
   */
  static async execute(node, inputData, routing, options = {}) {
    try {
      if (!node || !node.type) {
        throw new Error('节点数据不完整')
      }

      this.log(`开始执行动态节点: ${node.type}`)

      // 1. 获取完整动态节点配置（包含execution配置）
      const fullConfig = await this.getDynamicNodeConfig(node.type)
      
      // 2. 验证执行配置
      const executionConfig = this.validateExecutionConfig(fullConfig, node.type)
      
      // 3. 解析用户配置
      const configResult = await this.resolveNodeConfiguration(node, fullConfig, options)
      
      // 4. 验证节点执行状态
      await this.validateNodeStatus(node, configResult)
      
      // 5. 创建并使用动态适配器执行
      const adapter = await this.createDynamicAdapter(node.type, executionConfig, configResult, options)
      const result = await adapter.process(inputData)
      
      this.log(`动态节点执行成功: ${node.type} (handler: ${executionConfig.handler})`, 'success')
      return result
      
    } catch (error) {
      this.log(`动态节点执行失败 ${node.type}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 获取动态节点完整配置
   * 从 DynamicNodeRegistry 获取包含 execution 的完整配置
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
      this.log(`配置信息:`, {
        hasExecution: Boolean(fullConfig.execution),
        hasFields: Boolean(fullConfig.fields?.length),
        configType: fullConfig.meta?.configVersion || 'unknown'
      })
      
      return fullConfig
      
    } catch (error) {
      this.log(`获取动态节点配置失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 验证执行配置
   * 确保 execution.handler 等关键信息存在
   */
  static validateExecutionConfig(fullConfig, nodeType) {
    try {
      // 检查 execution 配置
      const executionConfig = fullConfig.execution
      
      if (!executionConfig) {
        throw new Error(`动态节点缺少执行配置: ${nodeType}`)
      }
      
      if (!executionConfig.handler) {
        throw new Error(`动态节点缺少处理器配置: ${nodeType}`)
      }
      
      // 验证处理器类型
      const handler = executionConfig.handler
      if (!this.isValidHandler(handler)) {
        this.log(`未知的处理器类型: ${handler}，将尝试执行`, 'warn')
      }
      
      this.log(`执行配置验证通过: ${nodeType} -> ${handler}`, 'success')
      
      return executionConfig
      
    } catch (error) {
      this.log(`执行配置验证失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 解析节点配置
   * 使用 ConfigurationResolver 进行配置解析和验证
   */
  static async resolveNodeConfiguration(node, fullConfig, options) {
    try {
      // 动态导入 ConfigurationResolver
      const { default: configurationResolver } = await import('./ConfigurationResolver')
      
      // 准备配置解析选项
      const resolveOptions = {
        validate: true,
        userConfig: options.userConfig || {},
        nodeConfig: fullConfig,
        strictValidation: false // 动态节点使用宽松验证
      }
      
      // 执行配置解析
      const configResult = configurationResolver.resolveConfiguration(node, resolveOptions)
      
      this.log(`配置解析完成: ${node.type}`, 'success')
      this.log(`解析后配置:`, {
        configKeys: Object.keys(configResult.config),
        hasValidation: Boolean(configResult.validation),
        sourceType: configResult.metadata?.sourceType
      })
      
      return configResult
      
    } catch (error) {
      this.log(`配置解析失败 ${node.type}: ${error.message}`, 'error')
      throw new Error(`配置解析失败: ${error.message}`)
    }
  }

  /**
   * 验证节点执行状态
   */
  static async validateNodeStatus(node, configResult) {
    try {
      // 动态导入 NodeStatusCalculator
      const { default: nodeStatusCalculator } = await import('./NodeStatusCalculator')
      
      // 计算节点状态
      const statusResult = nodeStatusCalculator.calculateNodeStatus(node, {
        configResult: configResult
      })
      
      // 检查是否可执行
      if (!statusResult.canExecute) {
        throw new Error(`节点状态不允许执行: ${statusResult.status} - ${statusResult.details.reason}`)
      }
      
      this.log(`节点状态验证通过: ${node.type} -> ${statusResult.status}`)
      return statusResult
      
    } catch (error) {
      this.log(`节点状态验证失败 ${node.type}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 创建动态适配器
   * 确保 executorConfig 正确传递给 DynamicAdapter
   */
  static async createDynamicAdapter(nodeType, executionConfig, configResult, options) {
    try {
      this.log(`创建动态适配器: ${nodeType} (handler: ${executionConfig.handler})`)
      
      // 导入现有的 DynamicAdapter
      const { DynamicAdapter } = await import('./DynamicAdapter')
      
      // 准备动态适配器配置
      const adapterConfig = this.prepareDynamicAdapterConfig(
        nodeType, 
        executionConfig, 
        configResult, 
        options
      )
      
      // 创建动态适配器实例
      const adapter = new DynamicAdapter(adapterConfig)
      
      this.log(`动态适配器创建成功: ${nodeType}`, 'success')
      this.log(`适配器配置检查:`, {
        handler: adapterConfig.executorConfig?.handler,
        hasUserConfig: Boolean(adapterConfig.userConfig),
        hasNodeConfig: Boolean(adapterConfig.nodeConfig),
        userConfigKeys: adapterConfig.userConfig ? Object.keys(adapterConfig.userConfig) : []
      })
      
      return adapter
      
    } catch (error) {
      this.log(`动态适配器创建失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 准备动态适配器配置
   * 🔑 关键方法：确保 executorConfig 正确传递
   */
  static prepareDynamicAdapterConfig(nodeType, executionConfig, configResult, options) {
    try {
      // 🔑 关键：构建 executorConfig，这是 DynamicAdapter 需要的核心配置
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
      
      // 提取用户配置（排除系统字段）
      const userConfig = this.extractUserConfig(configResult.config)
      
      // 构建完整的适配器配置
      const adapterConfig = {
        // 🔑 关键：executorConfig 包含 handler 等执行信息
        executorConfig: executorConfig,
        
        // 节点配置引用
        nodeConfig: configResult.nodeConfig,
        
        // 用户配置的字段值
        userConfig: userConfig,
        
        // 配置解析结果
        configResult: configResult,
        
        // 系统配置
        systemConfig: options.systemConfig || options.config,
        
        // 新架构标识
        _source: 'dynamic_executor',
        _nodeType: nodeType,
        _handler: executorConfig.handler
      }
      
      this.log(`动态适配器配置准备完成:`, {
        handler: executorConfig.handler,
        type: executorConfig.type,
        hasUserConfig: Boolean(userConfig),
        userConfigKeys: Object.keys(userConfig),
        hasNodeConfig: Boolean(configResult.nodeConfig)
      })
      
      return adapterConfig
      
    } catch (error) {
      this.log(`动态适配器配置准备失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 提取用户配置
   * 从解析后的配置中提取用户设置的字段值
   */
  static extractUserConfig(resolvedConfig) {
    try {
      // 排除系统字段，提取用户配置
      const systemFields = new Set([
        'config', '_metadata', '_status', '_resolvedConfig'
      ])
      
      const userConfig = {}
      
      Object.keys(resolvedConfig).forEach(key => {
        if (!systemFields.has(key) && !key.startsWith('_')) {
          userConfig[key] = resolvedConfig[key]
        }
      })
      
      this.log(`用户配置提取完成:`, {
        totalFields: Object.keys(resolvedConfig).length,
        userFields: Object.keys(userConfig).length,
        userFieldNames: Object.keys(userConfig)
      })
      
      return userConfig
      
    } catch (error) {
      this.log(`用户配置提取失败: ${error.message}`, 'warn')
      return {}
    }
  }

  /**
   * 验证处理器类型 - 通用验证
   * 不限制具体的handler名称，支持任意配置驱动的handler
   */
  static isValidHandler(handler) {
    // 通用验证：只要是非空字符串即可
    return typeof handler === 'string' && 
           handler.length > 0 && 
           handler.trim().length > 0
  }

  /**
   * 验证节点类型 - 动态获取
   * 从 DynamicNodeRegistry 动态获取支持的节点类型
   */
  static async isDynamicNodeType(nodeType) {
    try {
      const supportedTypes = await this.getSupportedNodeTypes()
      return supportedTypes.includes(nodeType)
    } catch (error) {
      this.log(`检查节点类型失败 ${nodeType}: ${error.message}`, 'warn')
      
      // 降级判断：包含连字符的通常是动态节点
      return nodeType.includes('-')
    }
  }

  /**
   * 动态获取支持的节点类型
   * 从 DynamicNodeRegistry 获取所有已注册的节点类型
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
   * 获取处理器信息 - 基于配置的通用信息
   * 不再硬编码特定handler的信息，改为通用描述
   */
  static getHandlerInfo(handler) {
    // 基于handler名称推断类型和描述
    const handlerType = this.inferHandlerType(handler)
    
    return {
      description: `${handler} 处理器`,
      category: handlerType,
      supportedTypes: ['any'], // 通用支持
      isGeneric: true
    }
  }

  /**
   * 推断处理器类型
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
   * 验证动态节点配置 - 通用验证
   * 不依赖硬编码的节点类型，基于配置结构验证
   */
  static validateDynamicConfig(nodeType, fullConfig) {
    const errors = []
    const warnings = []
    
    // 检查基础配置结构
    if (!fullConfig.execution) {
      errors.push('缺少执行配置 (execution)')
    } else {
      if (!fullConfig.execution.handler) {
        errors.push('缺少处理器配置 (execution.handler)')
      } else if (!this.isValidHandler(fullConfig.execution.handler)) {
        errors.push('处理器配置格式无效')
      }
      
      if (!fullConfig.execution.type) {
        warnings.push('缺少执行类型，将使用默认值 (local)')
      }
    }
    
    // 检查节点基础信息
    if (!fullConfig.node || !fullConfig.node.type) {
      errors.push('缺少节点基础配置 (node.type)')
    }
    
    // 检查字段定义（动态节点的核心特征）
    if (!fullConfig.fields || !Array.isArray(fullConfig.fields)) {
      warnings.push('缺少字段定义或字段定义格式错误')
    } else if (fullConfig.fields.length === 0) {
      warnings.push('字段定义为空，节点可能无法正常配置')
    }
    
    // 检查输入输出Schema（如果定义了）
    if (fullConfig.inputSchema && typeof fullConfig.inputSchema !== 'object') {
      warnings.push('inputSchema 格式错误')
    }
    
    if (fullConfig.outputSchema && typeof fullConfig.outputSchema !== 'object') {
      warnings.push('outputSchema 格式错误')
    }
    
    // 检查节点元数据
    if (!fullConfig.meta || !fullConfig.meta.nodeId) {
      warnings.push('缺少节点元数据 (meta.nodeId)')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 获取支持的节点类型和处理器 - 动态获取
   */
  static async getSupportedTypes() {
    try {
      const nodeTypes = await this.getSupportedNodeTypes()
      
      // 从已注册的节点中提取handler类型
      const handlers = await this.getRegisteredHandlers()
      
      return {
        nodeTypes: nodeTypes,
        handlers: handlers,
        totalNodeTypes: nodeTypes.length,
        totalHandlers: handlers.length,
        isConfigDriven: true
      }
      
    } catch (error) {
      this.log(`获取支持类型失败: ${error.message}`, 'error')
      return {
        nodeTypes: [],
        handlers: [],
        totalNodeTypes: 0,
        totalHandlers: 0,
        isConfigDriven: true
      }
    }
  }

  /**
   * 获取已注册的处理器类型
   */
  static async getRegisteredHandlers() {
    try {
      const { default: dynamicNodeRegistry } = await import('./dynamic/DynamicNodeRegistry')
      const nodeTypes = dynamicNodeRegistry.getAllRegisteredTypes()
      
      const handlers = []
      
      for (const nodeType of nodeTypes) {
        const fullConfig = dynamicNodeRegistry.getFullNodeConfig(nodeType)
        if (fullConfig && fullConfig.execution && fullConfig.execution.handler) {
          const handler = fullConfig.execution.handler
          if (!handlers.includes(handler)) {
            handlers.push(handler)
          }
        }
      }
      
      this.log(`发现已注册的处理器: ${handlers.length} 个`)
      return handlers
      
    } catch (error) {
      this.log(`获取已注册处理器失败: ${error.message}`, 'warn')
      return []
    }
  }

  /**
   * 检查动态执行器健康状态
   */
  static async checkHealth() {
    const health = {
      status: 'healthy',
      issues: [],
      capabilities: {}
    }

    try {
      // 检查依赖组件
      const dependencies = [
        { name: 'DynamicNodeRegistry', path: './dynamic/DynamicNodeRegistry' },
        { name: 'ConfigurationResolver', path: './ConfigurationResolver' },
        { name: 'NodeStatusCalculator', path: './NodeStatusCalculator' },
        { name: 'DynamicAdapter', path: './DynamicAdapter' }
      ]

      for (const dep of dependencies) {
        try {
          await import(dep.path)
          health.capabilities[dep.name] = true
        } catch (error) {
          health.capabilities[dep.name] = false
          health.issues.push(`${dep.name} 不可用: ${error.message}`)
          health.status = 'degraded'
        }
      }

      // 检查支持的类型 - 动态获取
      const supportedTypes = await this.getSupportedTypes()
      health.supportedNodeTypes = supportedTypes.nodeTypes
      health.supportedHandlers = supportedTypes.handlers
      health.configDriven = supportedTypes.isConfigDriven
      
    } catch (error) {
      health.status = 'error'
      health.issues.push(`健康检查失败: ${error.message}`)
    }

    return health
  }

  /**
   * 获取动态节点执行统计 - 基于实际注册情况
   */
  static async getExecutionStatistics() {
    try {
      const supportedTypes = await this.getSupportedTypes()
      
      return {
        supportedNodeTypes: supportedTypes.totalNodeTypes,
        supportedHandlers: supportedTypes.totalHandlers,
        nodeTypesList: supportedTypes.nodeTypes,
        handlersList: supportedTypes.handlers,
        capabilities: {
          configDriven: true,
          genericProcessing: true,
          apiRequests: true,
          dynamicRegistration: true,
          extensible: true
        },
        genericMethods: this.genericProcessorMethods
      }
      
    } catch (error) {
      this.log(`获取执行统计失败: ${error.message}`, 'warn')
      return {
        supportedNodeTypes: 0,
        supportedHandlers: 0,
        capabilities: {
          configDriven: true,
          genericProcessing: true,
          apiRequests: true
        },
        genericMethods: this.genericProcessorMethods
      }
    }
  }
}

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__dynamicExecutor = DynamicExecutor
}

export default DynamicExecutor

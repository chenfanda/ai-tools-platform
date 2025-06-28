// ===== src/services/workflow/LegacyExecutor.js - 传统节点执行器 =====

/**
 * 传统节点执行器 - 专门处理传统节点执行
 * 
 * 核心职责：
 * 1. 专门处理传统节点（tts、download、text-input、output）的执行
 * 2. 使用 LegacyNodeManager 获取节点配置定义
 * 3. 使用 ConfigurationResolver 解析用户配置
 * 4. 使用 NodeStatusCalculator 验证执行状态
 * 5. 调用现有的 TTSAdapter、DownloadAdapter 等适配器
 * 
 * 设计原则：
 * - 专一职责：只处理传统节点
 * - 新架构集成：充分利用ConfigurationResolver等新组件
 * - 适配器复用：使用现有ModuleAdapter中的适配器实现
 * - 配置完整：确保selectedCharacter等关键配置正确传递
 */
class LegacyExecutor {
  
  /**
   * 调试模式
   */
  static debugMode = process.env.NODE_ENV === 'development'

  /**
   * 支持的传统节点类型
   */
  static supportedNodeTypes = ['tts', 'download', 'text-input', 'output']

  /**
   * 调试日志输出
   */
  static log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[LegacyExec ${timestamp}]`
    
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
   * 执行传统节点 - 主入口
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

      // 验证是否为支持的传统节点类型
      if (!this.supportedNodeTypes.includes(node.type)) {
        throw new Error(`不支持的传统节点类型: ${node.type}`)
      }

      this.log(`开始执行传统节点: ${node.type}`)

      // 1. 获取传统节点配置定义
      const legacyConfig = await this.getLegacyNodeConfig(node.type)
      
      // 2. 解析用户配置
      const configResult = await this.resolveNodeConfiguration(node, legacyConfig, options)
      
      // 3. 验证节点执行状态
      await this.validateNodeStatus(node, configResult)
      
      // 4. 处理特殊节点类型（文本输入、输出节点）
      if (this.isSimpleNode(node.type)) {
        return this.executeSimpleNode(node, inputData, configResult)
      }
      
      // 5. 创建并使用适配器执行复杂节点
      const adapter = await this.createLegacyAdapter(node.type, configResult, options)
      const result = await adapter.process(inputData)
      
      this.log(`传统节点执行成功: ${node.type}`, 'success')
      return result
      
    } catch (error) {
      this.log(`传统节点执行失败 ${node.type}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 获取传统节点配置定义
   */
  static async getLegacyNodeConfig(nodeType) {
    try {
      // 动态导入 LegacyNodeManager
      const { default: legacyNodeManager } = await import('./legacy/LegacyNodeManager')
      
      // 使用统一接口获取节点配置
      const legacyConfig = legacyNodeManager.getNodeTypeConfigStandard(nodeType)
      
      if (!legacyConfig) {
        throw new Error(`传统节点配置不存在: ${nodeType}`)
      }
      
      this.log(`获取传统节点配置: ${nodeType}`, 'success')
      return legacyConfig
      
    } catch (error) {
      this.log(`获取传统节点配置失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 解析节点配置
   * 使用 ConfigurationResolver 进行配置解析和验证
   */
  static async resolveNodeConfiguration(node, legacyConfig, options) {
    try {
      // 动态导入 ConfigurationResolver
      const { default: configurationResolver } = await import('./ConfigurationResolver')
      
      // 准备配置解析选项
      const resolveOptions = {
        validate: true,
        userConfig: options.userConfig || {},
        nodeConfig: legacyConfig,
        strictValidation: false // 传统节点使用宽松验证
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
   * 判断是否为简单节点（不需要适配器的节点）
   */
  static isSimpleNode(nodeType) {
    const simpleNodeTypes = ['text-input', 'output']
    return simpleNodeTypes.includes(nodeType)
  }

  /**
   * 执行简单节点（文本输入、输出节点）
   */
  static executeSimpleNode(node, inputData, configResult) {
    try {
      this.log(`执行简单节点: ${node.type}`)
      
      if (node.type === 'text-input') {
        return this.executeTextInputNode(node, configResult)
      } else if (node.type === 'output') {
        return this.executeOutputNode(node, inputData, configResult)
      }
      
      throw new Error(`未知的简单节点类型: ${node.type}`)
      
    } catch (error) {
      this.log(`简单节点执行失败 ${node.type}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 执行文本输入节点
   */
  static executeTextInputNode(node, configResult) {
    try {
      const text = configResult.config.text || node.data.text || ''
      
      if (!text.trim()) {
        throw new Error('文本输入节点缺少文本内容')
      }
      
      this.log(`文本输入节点执行: ${text.length} 字符`)
      
      // 使用 StandardDataModel 创建标准化结果
      const workflowData = this.createWorkflowData('text', { text }, {
        nodeId: node.id,
        source: 'text-input',
        length: text.length
      })
      
      return {
        success: true,
        data: workflowData,
        execution_time: 10 // 文本处理很快
      }
      
    } catch (error) {
      this.log(`文本输入节点失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 执行输出节点
   */
  static executeOutputNode(node, inputData, configResult) {
    try {
      this.log(`输出节点执行: 接收数据`)
      
      // 输出节点主要是接收和显示数据
      const outputData = inputData || this.createWorkflowData('text', { text: '无输入数据' })
      
      return {
        success: true,
        data: outputData,
        execution_time: 5 // 输出处理很快
      }
      
    } catch (error) {
      this.log(`输出节点失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 创建传统节点适配器
   */
  static async createLegacyAdapter(nodeType, configResult, options) {
    try {
      this.log(`创建传统节点适配器: ${nodeType}`)
      
      // 导入现有的适配器
      const { TTSAdapter, DownloadAdapter } = await import('./ModuleAdapter')
      
      // 准备适配器配置
      const adapterConfig = this.prepareLegacyAdapterConfig(nodeType, configResult, options)
      
      // 根据节点类型创建对应适配器
      let adapter
      
      switch (nodeType) {
        case 'tts':
          adapter = new TTSAdapter(adapterConfig)
          this.log(`TTS适配器创建成功`, 'success')
          this.log(`TTS配置检查:`, {
            mode: adapterConfig.mode,
            selectedCharacter: adapterConfig.selectedCharacter,
            hasApiUrl: Boolean(adapterConfig.ttsApiUrl)
          })
          break
          
        case 'download':
          adapter = new DownloadAdapter(adapterConfig)
          this.log(`下载适配器创建成功`, 'success')
          break
          
        default:
          throw new Error(`不支持的适配器节点类型: ${nodeType}`)
      }
      
      return adapter
      
    } catch (error) {
      this.log(`适配器创建失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 准备传统节点适配器配置
   * 确保关键配置字段正确传递
   */
  static prepareLegacyAdapterConfig(nodeType, configResult, options) {
    try {
      // 基础配置合并
      const baseConfig = {
        ...configResult.config,
        // 系统配置
        config: options.systemConfig || options.config,
        // 新架构标识
        _source: 'legacy_executor',
        _configResult: configResult
      }
      
      // 节点类型特定配置
      if (nodeType === 'tts') {
        return this.prepareTTSAdapterConfig(baseConfig, configResult)
      } else if (nodeType === 'download') {
        return this.prepareDownloadAdapterConfig(baseConfig, configResult)
      }
      
      return baseConfig
      
    } catch (error) {
      this.log(`适配器配置准备失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 准备 TTS 适配器配置
   * 确保 selectedCharacter 等关键配置正确传递
   */
  static prepareTTSAdapterConfig(baseConfig, configResult) {
    const ttsConfig = {
      ...baseConfig,
      
      // 🔑 关键：确保 TTS 配置字段完整
      ttsApiUrl: baseConfig.ttsApiUrl || baseConfig.config?.ttsApiUrl,
      mode: baseConfig.mode || 'character',
      selectedCharacter: baseConfig.selectedCharacter || baseConfig.character,
      gender: baseConfig.gender,
      pitch: baseConfig.pitch,
      speed: baseConfig.speed,
      username: baseConfig.username,
      voice_id: baseConfig.voice_id
    }
    
    // 验证关键配置
    if (!ttsConfig.ttsApiUrl) {
      this.log('TTS API地址缺失，可能影响执行', 'warn')
    }
    
    if (ttsConfig.mode === 'character' && !ttsConfig.selectedCharacter) {
      this.log('TTS角色模式下缺少选中的角色', 'warn')
    }
    
    this.log(`TTS配置准备完成:`, {
      mode: ttsConfig.mode,
      selectedCharacter: ttsConfig.selectedCharacter,
      hasApiUrl: Boolean(ttsConfig.ttsApiUrl)
    })
    
    return ttsConfig
  }

  /**
   * 准备下载适配器配置
   */
  static prepareDownloadAdapterConfig(baseConfig, configResult) {
    const downloadConfig = {
      ...baseConfig,
      
      // 下载配置字段
      autoDownload: baseConfig.autoDownload || false,
      customFileName: baseConfig.customFileName || '',
      downloadFormat: baseConfig.downloadFormat || 'auto',
      showProgress: baseConfig.showProgress !== false,
      allowRetry: baseConfig.allowRetry !== false
    }
    
    this.log(`下载配置准备完成:`, {
      autoDownload: downloadConfig.autoDownload,
      format: downloadConfig.downloadFormat
    })
    
    return downloadConfig
  }

  /**
   * 创建标准化的 WorkflowData
   */
  static createWorkflowData(type, content, metadata = {}) {
    try {
      // 简化的 WorkflowData 创建（避免循环导入）
      return {
        type: type,
        content: content,
        metadata: {
          timestamp: Date.now(),
          source: 'legacy-executor',
          ...metadata
        }
      }
    } catch (error) {
      this.log(`创建WorkflowData失败: ${error.message}`, 'warn')
      return {
        type: type,
        content: content,
        metadata: metadata
      }
    }
  }

  /**
   * 验证传统节点配置
   */
  static validateLegacyConfig(nodeType, config) {
    const errors = []
    
    switch (nodeType) {
      case 'text-input':
        if (!config.text || !config.text.trim()) {
          errors.push('文本输入节点缺少文本内容')
        }
        break
        
      case 'tts':
        if (!config.mode) {
          errors.push('TTS节点缺少模式配置')
        }
        if (config.mode === 'character' && !config.selectedCharacter) {
          errors.push('角色模式下必须选择语音角色')
        }
        if (!config.ttsApiUrl && !config.config?.ttsApiUrl) {
          errors.push('TTS节点缺少API地址配置')
        }
        break
        
      case 'download':
        if (config.customFileName && /[<>:"/\\|?*]/.test(config.customFileName)) {
          errors.push('自定义文件名包含非法字符')
        }
        break
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取支持的节点类型
   */
  static getSupportedNodeTypes() {
    return [...this.supportedNodeTypes]
  }

  /**
   * 检查传统执行器健康状态
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
        { name: 'LegacyNodeManager', path: './legacy/LegacyNodeManager' },
        { name: 'ConfigurationResolver', path: './ConfigurationResolver' },
        { name: 'NodeStatusCalculator', path: './NodeStatusCalculator' },
        { name: 'ModuleAdapter', path: './ModuleAdapter' }
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

      // 检查支持的节点类型
      health.supportedNodeTypes = this.supportedNodeTypes
      
    } catch (error) {
      health.status = 'error'
      health.issues.push(`健康检查失败: ${error.message}`)
    }

    return health
  }
}

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__legacyExecutor = LegacyExecutor
}

export default LegacyExecutor

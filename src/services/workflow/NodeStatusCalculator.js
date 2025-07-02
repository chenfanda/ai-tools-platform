// ===== src/services/workflow/NodeStatusCalculator.js - 简化版本 =====

import configurationResolver from './ConfigurationResolver'

/**
 * 节点状态计算器 - 简化版本
 * 
 * 🔧 简化原则：
 * 1. 移除冗余的格式检测逻辑 
 * 2. 执行器直接指定状态计算方式（forceType）
 * 3. 保持核心状态计算功能不变
 * 4. 移除过度设计的功能
 */
class NodeStatusCalculator {
  
  constructor() {
    // 状态计算缓存
    this.statusCache = new Map()
    
    // 状态变化监听器
    this.statusListeners = new Map()
    
    // 状态计算统计
    this.stats = {
      calculationCount: 0,
      cacheHits: 0,
      statusChanges: 0,
      errorCount: 0
    }
    
    // 调试模式
    this.debugMode = process.env.NODE_ENV === 'development'
    
    this.log('[NodeStatusCalculator] 状态计算器已初始化')
  }

  /**
   * 调试日志输出
   */
  log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[StatusCalc ${timestamp}]`
    
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
   * 统一状态枚举 - 保持不变
   */
  static get NODE_STATUS() {
    return {
      // 基础状态
      WAITING: 'waiting',           // 等待配置或输入
      CONFIGURED: 'configured',     // 已配置完成，可以执行
      PROCESSING: 'processing',     // 正在处理中
      SUCCESS: 'success',          // 执行成功
      ERROR: 'error',              // 执行错误
      
      // 扩展状态
      DISABLED: 'disabled',        // 节点被禁用
      SKIPPED: 'skipped',          // 节点被跳过
      PENDING: 'pending',          // 等待前置节点完成
      CANCELLED: 'cancelled',      // 执行被取消
      
      // 特殊状态
      UNKNOWN: 'unknown',          // 状态未知
      INVALID: 'invalid'           // 配置无效
    }
  }

  /**
   * 状态优先级定义 - 保持不变
   */
  static get STATUS_PRIORITY() {
    return {
      [this.NODE_STATUS.ERROR]: 10,
      [this.NODE_STATUS.INVALID]: 9,
      [this.NODE_STATUS.PROCESSING]: 8,
      [this.NODE_STATUS.CANCELLED]: 7,
      [this.NODE_STATUS.DISABLED]: 6,
      [this.NODE_STATUS.SUCCESS]: 5,
      [this.NODE_STATUS.CONFIGURED]: 4,
      [this.NODE_STATUS.PENDING]: 3,
      [this.NODE_STATUS.SKIPPED]: 2,
      [this.NODE_STATUS.WAITING]: 1,
      [this.NODE_STATUS.UNKNOWN]: 0
    }
  }

  /**
   * 主要状态计算入口 - 简化版本
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 计算选项
   * @param {string} options.forceType - 强制指定计算类型：'legacy' | 'dynamic'
   * @returns {object} 状态计算结果
   */
  calculateNodeStatus(nodeData, options = {}) {
    try {
      this.stats.calculationCount++
      
      if (!nodeData) {
        throw new Error('节点数据不能为空')
      }

      // 生成缓存键
      const cacheKey = this.generateStatusCacheKey(nodeData, options)
      
      // 检查缓存
      if (!options.forceRecalculate && this.statusCache.has(cacheKey)) {
        this.stats.cacheHits++
        const cachedResult = this.statusCache.get(cacheKey)
        this.log(`使用缓存状态: ${nodeData.type} -> ${cachedResult.status}`)
        return cachedResult
      }

      // 执行状态计算
      const statusResult = this.performStatusCalculation(nodeData, options)
      
      // 缓存结果
      this.statusCache.set(cacheKey, statusResult)
      
      // 检查状态变化并通知
      this.checkAndNotifyStatusChange(nodeData.id, statusResult.status)
      
      this.log(`状态计算完成: ${nodeData.type} -> ${statusResult.status}`, 'success')
      return statusResult

    } catch (error) {
      this.stats.errorCount++
      this.log(`状态计算失败 ${nodeData?.type}: ${error.message}`, 'error')
      
      // 返回错误状态
      return this.createErrorStatus(nodeData, error)
    }
  }

  /**
   * 执行状态计算的核心逻辑 - 简化版本
   */
  performStatusCalculation(nodeData, options = {}) {
    try {
      // 🔧 简化：优先使用强制指定的类型（执行器指定）
      let calculationType
      if (options.forceType) {
        calculationType = options.forceType
        this.log(`使用强制指定类型: ${nodeData.type} -> ${calculationType}`)
      } else {
        // 降级：简单检测（保持向后兼容）
        calculationType = this.simpleTypeDetection(nodeData)
        this.log(`自动检测类型: ${nodeData.type} -> ${calculationType}`)
      }

      // 🔧 简化：如果已经有配置解析结果，直接使用
      let configResult = options.configResult
      if (!configResult) {
        // 没有配置结果时，获取配置
        configResult = configurationResolver.resolveConfiguration(nodeData, {
          forceFormat: calculationType,
          validate: true,
          strictValidation: false
        })
      }

      // 根据计算类型选择策略
      let statusResult
      switch (calculationType) {
        case 'legacy':
          statusResult = this.calculateLegacyNodeStatus(nodeData, configResult, options)
          break
          
        case 'dynamic':
          statusResult = this.calculateDynamicNodeStatus(nodeData, configResult, options)
          break
          
        default:
          statusResult = this.calculateFallbackStatus(nodeData, configResult, options)
      }

      // 状态后处理和验证
      return this.postProcessStatus(statusResult, nodeData, configResult)

    } catch (error) {
      this.log(`状态计算执行失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 🔧 简化：简单类型检测（仅作为降级）
   */
  simpleTypeDetection(nodeData) {
    if (!nodeData || !nodeData.data) {
      return 'unknown'
    }

    // 检查是否有 nodeConfig（动态节点的核心特征）
    if (nodeData.data.nodeConfig || nodeData.nodeConfig) {
      return 'dynamic'
    }

    // 其他情况默认为传统节点
    return 'legacy'
  }

  /**
   * 计算传统节点状态 - 保持核心逻辑
   */
  calculateLegacyNodeStatus(nodeData, configResult, options = {}) {
    try {
      const { data } = nodeData
      const { config, validation } = configResult
      
      // 1. 检查执行状态（最高优先级）
      if (data.isProcessing) {
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.PROCESSING, {
          reason: 'Node is currently processing',
          progress: data.progress || null
        })
      }

      // 2. 检查执行结果
      if (data.result) {
        if (data.result.error) {
          return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.ERROR, {
            reason: 'Execution failed',
            error: data.result.error,
            details: data.result.details
          })
        } else if (data.result.success || data.result.data) {
          return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.SUCCESS, {
            reason: 'Execution completed successfully',
            result: data.result
          })
        }
      }

      // 3. 检查配置完整性
      const configStatus = this.validateLegacyConfiguration(nodeData.type, config, validation)
      if (configStatus.status !== NodeStatusCalculator.NODE_STATUS.CONFIGURED) {
        return configStatus
      }

      // 4. 默认为已配置状态
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
        reason: 'Node is properly configured and ready for execution'
      })

    } catch (error) {
      this.log(`传统节点状态计算失败: ${error.message}`, 'error')
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.ERROR, {
        reason: 'Status calculation failed',
        error: error.message
      })
    }
  }

  /**
   * 计算动态节点状态 - 保持核心逻辑
   */
  calculateDynamicNodeStatus(nodeData, configResult, options = {}) {
    try {
      const { data } = nodeData
      const { config, validation, nodeConfig } = configResult
      
      // 1. 检查执行状态
      if (data.isProcessing) {
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.PROCESSING, {
          reason: 'Dynamic node is processing',
          nodeType: nodeConfig?.type || nodeData.type
        })
      }

      // 2. 检查执行结果
      if (data.result) {
        if (data.result.error) {
          return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.ERROR, {
            reason: 'Dynamic node execution failed',
            error: data.result.error
          })
        } else if (data.result.success) {
          return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.SUCCESS, {
            reason: 'Dynamic node executed successfully',
            result: data.result
          })
        }
      }

      // 3. 验证动态节点配置
      const configStatus = this.validateDynamicConfiguration(nodeConfig, config, validation)
      if (configStatus.status !== NodeStatusCalculator.NODE_STATUS.CONFIGURED) {
        return configStatus
      }

      // 4. 检查API依赖
      if (nodeConfig?.api?.endpoint && !this.validateApiConfiguration(nodeConfig.api)) {
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.WAITING, {
          reason: 'API configuration incomplete',
          missingFields: ['endpoint']
        })
      }

      // 5. 默认为已配置状态
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
        reason: 'Dynamic node is properly configured',
        fieldsCount: nodeConfig?.fields?.length || 0
      })

    } catch (error) {
      this.log(`动态节点状态计算失败: ${error.message}`, 'error')
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.ERROR, {
        reason: 'Dynamic node status calculation failed',
        error: error.message
      })
    }
  }

  /**
   * 降级状态计算 - 保持不变
   */
  calculateFallbackStatus(nodeData, configResult, options = {}) {
    this.log(`使用降级状态计算: ${nodeData?.type}`, 'warn')
    
    try {
      const { data } = nodeData
      
      // 基础状态检查
      if (data?.isProcessing) {
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.PROCESSING, {
          reason: 'Fallback: Node appears to be processing'
        })
      }
      
      if (data?.result?.error) {
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.ERROR, {
          reason: 'Fallback: Execution error detected',
          error: data.result.error
        })
      }
      
      if (data?.result?.success || data?.result) {
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.SUCCESS, {
          reason: 'Fallback: Execution result detected'
        })
      }

      // 简单配置检查
      const hasBasicConfig = data && (data.text || data.mode || Object.keys(data).length > 3)
      
      return hasBasicConfig
        ? this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
            reason: 'Fallback: Basic configuration detected'
          })
        : this.createStatusResult(NodeStatusCalculator.NODE_STATUS.WAITING, {
            reason: 'Fallback: Insufficient configuration'
          })

    } catch (error) {
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.UNKNOWN, {
        reason: 'Fallback status calculation failed',
        error: error.message
      })
    }
  }

  // ===== 配置验证方法 - 保持不变 =====

  /**
   * 验证传统节点配置
   */
  validateLegacyConfiguration(nodeType, config, validation) {
    try {
      // 节点类型特定的验证逻辑
      switch (nodeType) {
        case 'text-input':
          return this.validateTextInputConfig(config)
          
        case 'tts':
          return this.validateTTSConfig(config)
          
        case 'output':
          return this.validateOutputConfig(config)
          
        case 'download':
          return this.validateDownloadConfig(config)
          
        default:
          return this.validateGenericConfig(config, validation)
      }
    } catch (error) {
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.ERROR, {
        reason: 'Configuration validation failed',
        error: error.message
      })
    }
  }

  /**
   * 验证文本输入节点配置
   */
  validateTextInputConfig(config) {
    if (!config.text || (typeof config.text === 'string' && config.text.trim().length === 0)) {
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.WAITING, {
        reason: 'Text content is required',
        missingFields: ['text']
      })
    }
    
    return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
      reason: 'Text input properly configured',
      textLength: config.text.length
    })
  }

  /**
   * 验证TTS节点配置
   */
  validateTTSConfig(config) {
    if (!config.mode) {
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.WAITING, {
        reason: 'TTS mode is required',
        missingFields: ['mode']
      })
    }

    const missingFields = []
    
    if (config.mode === 'character' && !config.selectedCharacter) {
      missingFields.push('selectedCharacter')
    }
    
    if (config.mode === 'custom') {
      if (!config.username || !config.username.trim()) {
        missingFields.push('username')
      }
      if (!config.voice_id) {
        missingFields.push('voice_id')
      }
    }

    if (missingFields.length > 0) {
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.WAITING, {
        reason: `TTS configuration incomplete for ${config.mode} mode`,
        missingFields
      })
    }

    return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
      reason: 'TTS properly configured',
      mode: config.mode
    })
  }

  /**
   * 验证输出节点配置
   */
  validateOutputConfig(config) {
    return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
      reason: 'Output node ready',
      displayMode: config.displayMode || 'auto'
    })
  }

  /**
   * 验证下载节点配置
   */
  validateDownloadConfig(config) {
    if (config.customFileName && /[<>:"/\\|?*]/.test(config.customFileName)) {
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.INVALID, {
        reason: 'Invalid filename characters',
        invalidField: 'customFileName'
      })
    }

    return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
      reason: 'Download node properly configured',
      format: config.downloadFormat || 'auto'
    })
  }

  /**
   * 验证动态节点配置
   */
  validateDynamicConfiguration(nodeConfig, config, validation) {
    try {
      if (!nodeConfig || !nodeConfig.fields) {
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.INVALID, {
          reason: 'Missing node configuration or fields definition'
        })
      }

      // 检查是否有可配置字段
      const hasFields = nodeConfig.fields && nodeConfig.fields.length > 0
      
      if (!hasFields) {
        // 无参数节点 → 已配置
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
          reason: 'No parameters required'
        })
      }

      // 有参数节点：检查是否已保存
      const hasSavedConfig = config._userSaved === true || config._configSaved === true
      
      if (!hasSavedConfig) {
        // 有参数但未保存 → 等待
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.WAITING, {
          reason: 'Parameters require user save action'
        })
      }

      // 已保存：验证必需字段
      const missingRequired = []
      
      if (validation.required) {
        validation.required.forEach(fieldName => {
          const value = config[fieldName]
          if (!value && value !== 0 && value !== false) {
            missingRequired.push(fieldName)
          }
        })
      }

      if (missingRequired.length > 0) {
        return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.WAITING, {
          reason: 'Required fields missing',
          missingFields: missingRequired
        })
      }

      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
        reason: 'Dynamic node properly configured'
      })

    } catch (error) {
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.ERROR, {
        reason: 'Dynamic configuration validation failed',
        error: error.message
      })
    }
  }

  /**
   * 通用配置验证
   */
  validateGenericConfig(config, validation) {
    if (!validation) {
      return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
        reason: 'No validation rules defined'
      })
    }

    const configValidation = this.validateConfiguration(config, validation)
    
    return configValidation.valid
      ? this.createStatusResult(NodeStatusCalculator.NODE_STATUS.CONFIGURED, {
          reason: 'Generic configuration valid'
        })
      : this.createStatusResult(NodeStatusCalculator.NODE_STATUS.WAITING, {
          reason: 'Configuration validation failed',
          errors: configValidation.errors
        })
  }

  /**
   * 基础配置验证
   */
  validateConfiguration(config, validation) {
    const errors = []

    if (validation.required) {
      validation.required.forEach(field => {
        if (!config[field] || (typeof config[field] === 'string' && !config[field].trim())) {
          errors.push(`Required field "${field}" is missing`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证API配置
   */
  validateApiConfiguration(apiConfig) {
    return apiConfig && apiConfig.endpoint && apiConfig.endpoint.trim().length > 0
  }

  // ===== 工具方法 - 保持不变 =====

  /**
   * 创建状态结果对象
   */
  createStatusResult(status, details = {}) {
    return {
      status,
      details: {
        ...details,
        calculatedAt: new Date().toISOString(),
        calculator: 'NodeStatusCalculator'
      },
      priority: NodeStatusCalculator.STATUS_PRIORITY[status] || 0,
      isTerminal: this.isTerminalStatus(status),
      canExecute: this.canExecuteWithStatus(status)
    }
  }

  /**
   * 创建错误状态
   */
  createErrorStatus(nodeData, error) {
    return this.createStatusResult(NodeStatusCalculator.NODE_STATUS.ERROR, {
      reason: 'Status calculation error',
      error: error.message,
      nodeType: nodeData?.type || 'unknown',
      nodeId: nodeData?.id || 'unknown'
    })
  }

  /**
   * 状态后处理
   */
  postProcessStatus(statusResult, nodeData, configResult) {
    // 添加节点特定信息
    statusResult.details.nodeType = nodeData.type
    statusResult.details.nodeId = nodeData.id
    
    // 添加配置信息摘要
    if (configResult) {
      statusResult.details.configSummary = {
        hasConfig: Boolean(configResult.config),
        configKeys: Object.keys(configResult.config || {}).length,
        hasValidation: Boolean(configResult.validation),
        sourceType: configResult.metadata?.sourceType
      }
    }

    return statusResult
  }

  /**
   * 检查是否为终端状态
   */
  isTerminalStatus(status) {
    const terminalStatuses = [
      NodeStatusCalculator.NODE_STATUS.SUCCESS,
      NodeStatusCalculator.NODE_STATUS.ERROR,
      NodeStatusCalculator.NODE_STATUS.CANCELLED,
      NodeStatusCalculator.NODE_STATUS.INVALID
    ]
    return terminalStatuses.includes(status)
  }

  /**
   * 检查状态是否可执行
   */
  canExecuteWithStatus(status) {
    const executableStatuses = [
      NodeStatusCalculator.NODE_STATUS.WAITING,
      NodeStatusCalculator.NODE_STATUS.CONFIGURED,
      NodeStatusCalculator.NODE_STATUS.SUCCESS 
    ]
    return executableStatuses.includes(status)
  }

  /**
   * 生成状态缓存键
   */
  generateStatusCacheKey(nodeData, options) {
    const keyParts = [
      nodeData.id || 'unknown',
      nodeData.type || 'unknown',
      JSON.stringify(nodeData.data?.config || {}),
      nodeData.data?.result ? 'has-result' : 'no-result',
      nodeData.data?.isProcessing ? 'processing' : 'idle',
      options.forceType || 'auto'
    ]
    
    return keyParts.join('|')
  }

  /**
   * 检查并通知状态变化
   */
  checkAndNotifyStatusChange(nodeId, newStatus) {
    const listeners = this.statusListeners.get(nodeId)
    if (listeners && listeners.length > 0) {
      this.stats.statusChanges++
      listeners.forEach(listener => {
        try {
          listener(newStatus, nodeId)
        } catch (error) {
          this.log(`状态变化通知失败: ${error.message}`, 'error')
        }
      })
    }
  }

  // ===== 公共接口方法 - 保持不变 =====

  /**
   * 监听节点状态变化
   */
  addStatusListener(nodeId, listener) {
    if (!this.statusListeners.has(nodeId)) {
      this.statusListeners.set(nodeId, [])
    }
    this.statusListeners.get(nodeId).push(listener)
  }

  /**
   * 移除状态监听器
   */
  removeStatusListener(nodeId, listener) {
    const listeners = this.statusListeners.get(nodeId)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
        if (listeners.length === 0) {
          this.statusListeners.delete(nodeId)
        }
      }
    }
  }

  /**
   * 批量计算多个节点状态
   */
  calculateBatchStatus(nodeDataList, options = {}) {
    const results = []
    
    nodeDataList.forEach(nodeData => {
      try {
        const statusResult = this.calculateNodeStatus(nodeData, options)
        results.push({
          nodeId: nodeData.id,
          success: true,
          status: statusResult
        })
      } catch (error) {
        results.push({
          nodeId: nodeData.id,
          success: false,
          error: error.message
        })
      }
    })

    return results
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.statusCache.clear()
    this.log('状态缓存已清理')
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.statusCache.size,
      listenersCount: this.statusListeners.size,
      cacheHitRate: this.stats.calculationCount > 0 
        ? (this.stats.cacheHits / this.stats.calculationCount * 100).toFixed(2) + '%' 
        : '0%'
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      calculationCount: 0,
      cacheHits: 0,
      statusChanges: 0,
      errorCount: 0
    }
    this.log('统计信息已重置')
  }

  /**
   * 获取状态描述信息
   */
  getStatusDescription(status) {
    const descriptions = {
      [NodeStatusCalculator.NODE_STATUS.WAITING]: '等待配置或输入',
      [NodeStatusCalculator.NODE_STATUS.CONFIGURED]: '已配置完成，可以执行',
      [NodeStatusCalculator.NODE_STATUS.PROCESSING]: '正在处理中',
      [NodeStatusCalculator.NODE_STATUS.SUCCESS]: '执行成功',
      [NodeStatusCalculator.NODE_STATUS.ERROR]: '执行错误',
      [NodeStatusCalculator.NODE_STATUS.DISABLED]: '节点被禁用',
      [NodeStatusCalculator.NODE_STATUS.SKIPPED]: '节点被跳过',
      [NodeStatusCalculator.NODE_STATUS.PENDING]: '等待前置节点完成',
      [NodeStatusCalculator.NODE_STATUS.CANCELLED]: '执行被取消',
      [NodeStatusCalculator.NODE_STATUS.UNKNOWN]: '状态未知',
      [NodeStatusCalculator.NODE_STATUS.INVALID]: '配置无效'
    }
    
    return descriptions[status] || '未知状态'
  }

  /**
   * 获取状态样式类
   */
  getStatusStyle(status) {
    const styles = {
      [NodeStatusCalculator.NODE_STATUS.WAITING]: 'warning',
      [NodeStatusCalculator.NODE_STATUS.CONFIGURED]: 'success',
      [NodeStatusCalculator.NODE_STATUS.PROCESSING]: 'info',
      [NodeStatusCalculator.NODE_STATUS.SUCCESS]: 'success',
      [NodeStatusCalculator.NODE_STATUS.ERROR]: 'error',
      [NodeStatusCalculator.NODE_STATUS.DISABLED]: 'disabled',
      [NodeStatusCalculator.NODE_STATUS.SKIPPED]: 'secondary',
      [NodeStatusCalculator.NODE_STATUS.PENDING]: 'info',
      [NodeStatusCalculator.NODE_STATUS.CANCELLED]: 'warning',
      [NodeStatusCalculator.NODE_STATUS.UNKNOWN]: 'secondary',
      [NodeStatusCalculator.NODE_STATUS.INVALID]: 'error'
    }
    
    return styles[status] || 'default'
  }
}

// 创建单例实例
const nodeStatusCalculator = new NodeStatusCalculator()

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__nodeStatusCalculator = nodeStatusCalculator
}

export default nodeStatusCalculator
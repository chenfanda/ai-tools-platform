// ===== src/services/workflow/ConfigurationResolver.js - 简化版本 =====

/**
 * 配置解析器 - 简化版本
 * 
 * 🔧 简化原则：
 * 1. 移除冗余的格式检测逻辑
 * 2. 执行器直接指定解析方式（forceFormat）
 * 3. 保持核心配置解析功能不变
 * 4. 移除过度设计的功能
 */
class ConfigurationResolver {
  
  constructor() {
    // 配置缓存，避免重复解析
    this.configCache = new Map()
    
    // 调试模式
    this.debugMode = process.env.NODE_ENV === 'development'
    
    // 配置解析统计
    this.stats = {
      parseCount: 0,
      cacheHits: 0,
      validationErrors: 0,
      resolverErrors: 0
    }
    
    this.log('[ConfigurationResolver] 配置解析器已初始化')
  }

  /**
   * 调试日志输出
   */
  log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[ConfigResolver ${timestamp}]`
    
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
   * 统一配置解析主入口 - 简化版本
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 解析选项
   * @param {string} options.forceFormat - 强制指定解析格式：'legacy' | 'dynamic'
   * @returns {object} 解析后的配置对象
   */
  resolveConfiguration(nodeData, options = {}) {
    try {
      this.stats.parseCount++
      
      if (!nodeData) {
        throw new Error('节点数据不能为空')
      }

      // 🔧 简化：优先使用强制指定的格式（执行器指定）
      let dataFormat
      if (options.forceFormat) {
        dataFormat = options.forceFormat
        this.log(`使用强制指定格式: ${nodeData.type} -> ${dataFormat}`)
      } else {
        // 降级：简单检测（保持向后兼容）
        dataFormat = this.simpleFormatDetection(nodeData)
        this.log(`自动检测格式: ${nodeData.type} -> ${dataFormat}`)
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(nodeData, options)
      
      // 检查缓存
      if (this.configCache.has(cacheKey)) {
        this.stats.cacheHits++
        this.log(`使用缓存配置: ${nodeData.type}`)
        return this.configCache.get(cacheKey)
      }

      let resolvedConfig

      // 根据格式选择解析策略
      switch (dataFormat) {
        case 'legacy':
          resolvedConfig = this.resolveLegacyConfiguration(nodeData, options)
          break
          
        case 'dynamic':
          resolvedConfig = this.resolveDynamicConfiguration(nodeData, options)
          break
          
        default:
          this.log(`未知数据格式: ${dataFormat}，使用降级解析`, 'warn')
          resolvedConfig = this.createFallbackConfiguration(nodeData, new Error(`未知格式: ${dataFormat}`))
      }

      // 后处理和验证
      resolvedConfig = this.postProcessConfiguration(resolvedConfig, nodeData, options)

      // 缓存结果
      this.configCache.set(cacheKey, resolvedConfig)
      
      this.log(`配置解析完成: ${nodeData.type}`, 'success')
      return resolvedConfig

    } catch (error) {
      this.stats.resolverErrors++
      this.log(`配置解析失败 ${nodeData?.type}: ${error.message}`, 'error')
      
      // 返回安全的降级配置
      return this.createFallbackConfiguration(nodeData, error)
    }
  }

  /**
   * 🔧 简化：简单格式检测（仅作为降级）
   */
  simpleFormatDetection(nodeData) {
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
   * 解析传统节点配置 - 保持不变
   */
  resolveLegacyConfiguration(nodeData, options = {}) {
    try {
      const { data } = nodeData
      const nodeType = nodeData.type

      // 获取节点类型的默认配置
      const defaultConfig = this.getLegacyDefaultConfig(nodeType)
      
      // 提取当前节点的配置字段
      const currentConfig = this.extractLegacyConfigFields(data)
      
      // 提取外部配置
      const externalConfig = data.config || {}

      // 配置优先级合并：用户配置 > 当前配置 > 默认配置 > 外部配置
      const resolvedConfig = {
        ...externalConfig,
        ...defaultConfig,
        ...currentConfig,
        ...(options.userConfig || {})
      }

      // 配置元数据
      const configMetadata = {
        sourceType: 'legacy',
        nodeType: nodeType,
        hasDefaults: Object.keys(defaultConfig).length > 0,
        hasUserOverrides: Boolean(options.userConfig),
        configFieldsCount: Object.keys(currentConfig).length,
        externalConfigCount: Object.keys(externalConfig).length,
        resolvedAt: new Date().toISOString()
      }

      return {
        config: resolvedConfig,
        metadata: configMetadata,
        validation: this.getLegacyValidationRules(nodeType),
        schema: this.getLegacyConfigSchema(nodeType)
      }

    } catch (error) {
      this.log(`传统节点配置解析失败: ${error.message}`, 'error')
      throw new Error(`传统节点配置解析失败: ${error.message}`)
    }
  }

  /**
   * 解析动态节点配置 - 保持不变
   */
  resolveDynamicConfiguration(nodeData, options = {}) {
    try {
      const { data } = nodeData
      const nodeConfig = data.nodeConfig || options.nodeConfig

      if (!nodeConfig) {
        throw new Error('动态节点缺少 nodeConfig 定义')
      }

      // 获取字段定义
      const fields = nodeConfig.fields || []
      
      // 构建默认配置
      const defaultConfig = this.buildDynamicDefaultConfig(fields, nodeConfig.defaultData)
      
      // 提取当前配置值
      const currentConfig = this.extractDynamicConfigValues(data, fields)
      
      // 外部配置
      const externalConfig = data.config || {}

      // 配置优先级合并
      const resolvedConfig = {
        ...externalConfig,
        ...defaultConfig,
        ...currentConfig,
        ...(options.userConfig || {})
      }

      // 应用字段级别的处理规则
      const processedConfig = this.processDynamicFieldValues(resolvedConfig, fields)

      // 配置元数据
      const configMetadata = {
        sourceType: 'dynamic',
        nodeType: nodeConfig.type || nodeData.type,
        fieldsCount: fields.length,
        hasValidation: Boolean(nodeConfig.validation),
        hasApi: Boolean(nodeConfig.api),
        configVersion: nodeConfig.meta?.configVersion || '1.0',
        resolvedAt: new Date().toISOString()
      }

      return {
        config: processedConfig,
        metadata: configMetadata,
        validation: this.getDynamicValidationRules(nodeConfig),
        schema: this.getDynamicConfigSchema(fields),
        nodeConfig: nodeConfig
      }

    } catch (error) {
      this.log(`动态节点配置解析失败: ${error.message}`, 'error')
      throw new Error(`动态节点配置解析失败: ${error.message}`)
    }
  }

  /**
   * 配置后处理 - 简化版本
   */
  postProcessConfiguration(resolvedConfig, nodeData, options = {}) {
    try {
      let processedConfig = { ...resolvedConfig }

      // 配置验证（可选）
      if (options.validate !== false) {
        const validation = this.validateConfiguration(processedConfig, nodeData)
        if (!validation.valid) {
          this.stats.validationErrors++
          this.log(`配置验证失败: ${validation.errors.join('; ')}`, 'warn')
          
          if (options.strictValidation) {
            throw new Error(`配置验证失败: ${validation.errors[0]}`)
          }
          
          processedConfig.metadata = {
            ...processedConfig.metadata,
            validationWarnings: validation.errors
          }
        }
      }

      // 数据类型转换
      processedConfig.config = this.normalizeConfigTypes(processedConfig.config, processedConfig.schema)

      // 添加解析统计
      processedConfig.metadata = {
        ...processedConfig.metadata,
        parseStats: {
          parseTime: Date.now(),
          cacheUsed: false,
          validationPassed: !processedConfig.metadata.validationWarnings
        }
      }

      return processedConfig

    } catch (error) {
      this.log(`配置后处理失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 创建降级配置 - 保持不变
   */
  createFallbackConfiguration(nodeData, originalError) {
    this.log(`创建降级配置: ${nodeData?.type}`, 'warn')
    
    const fallbackConfig = {
      config: {
        _fallback: true,
        _originalError: originalError.message,
        _nodeType: nodeData?.type || 'unknown'
      },
      metadata: {
        sourceType: 'fallback',
        nodeType: nodeData?.type || 'unknown',
        fallbackReason: originalError.message,
        createdAt: new Date().toISOString(),
        isSafe: true
      },
      validation: {
        required: [],
        rules: {},
        valid: true
      },
      schema: {
        fields: [],
        type: 'fallback'
      }
    }

    // 尝试从节点数据中提取一些基础信息
    if (nodeData?.data) {
      try {
        const safeFields = ['label', 'nodeType', 'text', 'mode']
        safeFields.forEach(field => {
          if (nodeData.data[field] !== undefined) {
            fallbackConfig.config[field] = nodeData.data[field]
          }
        })
      } catch (error) {
        this.log(`降级配置提取失败: ${error.message}`, 'warn')
      }
    }

    return fallbackConfig
  }

  // ===== 工具方法 - 保持不变 =====

  /**
   * 提取传统节点的配置字段
   */
  extractLegacyConfigFields(data) {
    const excludeFields = new Set([
      'label', 'nodeType', 'nodeIndex', 'totalNodes', 'config',
      'result', 'isProcessing', 'showAddButton', 'hideTestButton',
      'onDataChange', 'onAddNode', 'onSetProcessor', '_metadata'
    ])

    const configFields = {}
    
    Object.keys(data).forEach(key => {
      if (!excludeFields.has(key) && !key.startsWith('_') && typeof data[key] !== 'function') {
        configFields[key] = data[key]
      }
    })

    return configFields
  }

  /**
   * 构建动态节点的默认配置
   */
  buildDynamicDefaultConfig(fields, defaultData = {}) {
    const defaultConfig = { ...defaultData }
    
    fields.forEach(field => {
      if (field.defaultValue !== undefined && defaultConfig[field.name] === undefined) {
        defaultConfig[field.name] = field.defaultValue
      }
    })

    return defaultConfig
  }

  /**
   * 提取动态节点的配置值
   */
  extractDynamicConfigValues(data, fields) {
    const configValues = {}
    
    // 从字段定义中提取值
    fields.forEach(field => {
      if (data[field.name] !== undefined) {
        configValues[field.name] = data[field.name]
      }
    })

    // 保留系统标记
    if (data._userSaved !== undefined) {
      configValues._userSaved = data._userSaved
    }else if (data.config?._userSaved !== undefined) {
      configValues._userSaved = data.config._userSaved  // 🔧 新增这行
    }
        if (data._configSaved !== undefined) {
          configValues._configSaved = data._configSaved
        } else if (data.config?._configSaved !== undefined) {
      configValues._configSaved = data.config._configSaved  // 🔧 新增这行
    }
        if (data._savedAt !== undefined) {
          configValues._savedAt = data._savedAt
        }else if (data.config?._savedAt !== undefined) {
      configValues._savedAt = data.config._savedAt  // 🔧 新增这行
    }

    return configValues
  }

  /**
   * 处理动态字段值
   */
  processDynamicFieldValues(config, fields) {
    const processedConfig = { ...config }
    
    fields.forEach(field => {
      const value = config[field.name]
      
      if (value !== undefined) {
        switch (field.type) {
          case 'number':
            if (typeof value === 'string' && !isNaN(value)) {
              processedConfig[field.name] = Number(value)
            }
            break
            
          case 'boolean':
            if (typeof value === 'string') {
              processedConfig[field.name] = value === 'true' || value === '1'
            }
            break
            
          case 'array':
            if (typeof value === 'string') {
              try {
                processedConfig[field.name] = JSON.parse(value)
              } catch (error) {
                this.log(`数组字段解析失败 ${field.name}: ${error.message}`, 'warn')
              }
            }
            break
            
          case 'json':
          case 'object':
            if (typeof value === 'string') {
              try {
                processedConfig[field.name] = JSON.parse(value)
              } catch (error) {
                this.log(`JSON字段解析失败 ${field.name}: ${error.message}`, 'warn')
              }
            }
            break
        }
      }
    })

    return processedConfig
  }

  // ===== 验证规则获取方法 - 保持不变 =====

  getLegacyValidationRules(nodeType) {
    const legacyValidationRules = {
      'text-input': {
        required: ['text'],
        rules: {
          text: { type: 'string', minLength: 1 }
        }
      },
      'tts': {
        required: ['mode'],
        conditionalRequired: {
          character: ['selectedCharacter'],
          custom: ['username', 'voice_id']
        },
        rules: {
          mode: { type: 'string', enum: ['character', 'custom'] },
          selectedCharacter: { type: 'string' },
          username: { type: 'string', minLength: 1 },
          voice_id: { type: 'string' }
        }
      },
      'output': {
        required: [],
        rules: {
          displayMode: { type: 'string', enum: ['auto', 'compact', 'full'] },
          maxPreviewSize: { type: 'number', min: 100, max: 10000 }
        }
      },
      'download': {
        required: [],
        rules: {
          downloadFormat: { type: 'string', enum: ['auto', 'wav', 'mp3', 'txt', 'json'] },
          customFileName: { type: 'string', pattern: '^[^<>:"/\\|?*]*$' }
        }
      }
    }

    return legacyValidationRules[nodeType] || { required: [], rules: {} }
  }

  getDynamicValidationRules(nodeConfig) {
    const validation = nodeConfig.validation || {}
    
    const fieldRules = {}
    if (nodeConfig.fields) {
      nodeConfig.fields.forEach(field => {
        if (field.validation) {
          fieldRules[field.name] = field.validation
        }
        
        if (field.required) {
          validation.required = validation.required || []
          if (!validation.required.includes(field.name)) {
            validation.required.push(field.name)
          }
        }
      })
    }

    return {
      ...validation,
      rules: {
        ...validation.rules,
        ...fieldRules
      }
    }
  }

  // ===== 配置模式获取方法 - 保持不变 =====

  getLegacyConfigSchema(nodeType) {
    const legacySchemas = {
      'text-input': {
        type: 'object',
        fields: [
          { name: 'text', type: 'text', label: '文本内容', required: true },
          { name: 'placeholder', type: 'text', label: '占位符' }
        ]
      },
      'tts': {
        type: 'object',
        fields: [
          { name: 'mode', type: 'select', label: '语音模式', required: true, options: ['character', 'custom'] },
          { name: 'selectedCharacter', type: 'select', label: '选择角色' },
          { name: 'username', type: 'text', label: '用户名' },
          { name: 'voice_id', type: 'select', label: '语音ID' }
        ]
      },
      'output': {
        type: 'object',
        fields: [
          { name: 'displayMode', type: 'select', label: '显示模式', options: ['auto', 'compact', 'full'] },
          { name: 'autoExpand', type: 'checkbox', label: '自动展开' }
        ]
      },
      'download': {
        type: 'object',
        fields: [
          { name: 'autoDownload', type: 'checkbox', label: '自动下载' },
          { name: 'customFileName', type: 'text', label: '自定义文件名' },
          { name: 'downloadFormat', type: 'select', label: '下载格式', options: ['auto', 'wav', 'mp3', 'txt', 'json'] }
        ]
      }
    }

    return legacySchemas[nodeType] || { type: 'object', fields: [] }
  }

  getDynamicConfigSchema(fields) {
    return {
      type: 'object',
      fields: fields || []
    }
  }

  getLegacyDefaultConfig(nodeType) {
    const legacyDefaults = {
      'text-input': { text: '', placeholder: '请输入文本内容...' },
      'tts': { mode: 'character', character: '', selectedCharacter: '', gender: '', pitch: '', speed: '' },
      'output': { displayMode: 'auto', autoExpand: false, showValidation: true },
      'download': { autoDownload: false, customFileName: '', downloadFormat: 'auto' }
    }

    return legacyDefaults[nodeType] || {}
  }

  // ===== 验证方法 - 简化版本 =====

  validateConfiguration(resolvedConfig, nodeData) {
    try {
      const { config, validation, metadata } = resolvedConfig
      const errors = []

      // 检查必需字段
      if (validation.required) {
        validation.required.forEach(field => {
          const value = config[field]
          
          const isEmpty = value === undefined || 
                         value === null || 
                         (typeof value === 'string' && value.trim() === '')
          
          const hasDefault = this.checkHasDefaultValue(field, metadata, resolvedConfig)
          
          if (isEmpty && !hasDefault) {
            errors.push(`必需字段 "${field}" 不能为空`)
          }
        })
      }

      // 检查字段规则
      if (validation.rules) {
        Object.entries(validation.rules).forEach(([field, rule]) => {
          const value = config[field]
          
          if (value && typeof value === 'string' && value.trim().length > 0) {
            if (rule.type === 'string' && typeof value !== 'string') {
              errors.push(`字段 "${field}" 必须是字符串类型`)
            } else if (rule.type === 'number' && typeof value !== 'number') {
              errors.push(`字段 "${field}" 必须是数字类型`)
            } else if (rule.enum && !rule.enum.includes(value)) {
              errors.push(`字段 "${field}" 的值必须是: ${rule.enum.join(', ')} 中的一个`)
            } else if (rule.minLength && value.length < rule.minLength) {
              errors.push(`字段 "${field}" 长度不能少于 ${rule.minLength} 个字符`)
            } else if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
              errors.push(`字段 "${field}" 格式不正确`)
            }
          }
        })
      }

      return {
        valid: errors.length === 0,
        errors
      }

    } catch (error) {
      return {
        valid: false,
        errors: [`验证过程失败: ${error.message}`]
      }
    }
  }

  checkHasDefaultValue(field, metadata, resolvedConfig) {
    try {
      if (metadata.sourceType === 'dynamic' && resolvedConfig.nodeConfig?.fields) {
        const fieldDef = resolvedConfig.nodeConfig.fields.find(f => f.name === field)
        if (fieldDef && fieldDef.hasOwnProperty('defaultValue')) {
          return true
        }
      }
      
      if (resolvedConfig.nodeConfig?.defaultData && 
          resolvedConfig.nodeConfig.defaultData.hasOwnProperty(field)) {
        return true
      }
      
      if (metadata.sourceType === 'legacy') {
        const legacyDefaults = this.getLegacyDefaultConfig(metadata.nodeType)
        if (legacyDefaults && legacyDefaults.hasOwnProperty(field)) {
          return true
        }
      }
      
      return false
      
    } catch (error) {
      this.log(`检查默认值失败 ${field}: ${error.message}`, 'warn')
      return false
    }
  }

  normalizeConfigTypes(config, schema) {
    if (!schema || !schema.fields) {
      return config
    }

    const normalizedConfig = { ...config }
    
    schema.fields.forEach(field => {
      const value = config[field.name]
      
      if (value !== undefined) {
        switch (field.type) {
          case 'number':
            if (typeof value === 'string' && !isNaN(value)) {
              normalizedConfig[field.name] = Number(value)
            }
            break
          case 'boolean':
          case 'checkbox':
            normalizedConfig[field.name] = Boolean(value)
            break
        }
      }
    })

    return normalizedConfig
  }

  // ===== 工具方法 =====

  generateCacheKey(nodeData, options) {
    const keyParts = [
      nodeData.id || 'unknown',
      nodeData.type || 'unknown',
      JSON.stringify(options.userConfig || {}),
      options.forceFormat || 'auto'
    ]
    
    return keyParts.join('|')
  }

  clearCache() {
    this.configCache.clear()
    this.log('配置缓存已清理')
  }

  getStats() {
    return {
      ...this.stats,
      cacheSize: this.configCache.size,
      cacheHitRate: this.stats.parseCount > 0 ? (this.stats.cacheHits / this.stats.parseCount * 100).toFixed(2) + '%' : '0%'
    }
  }

  resetStats() {
    this.stats = {
      parseCount: 0,
      cacheHits: 0,
      validationErrors: 0,
      resolverErrors: 0
    }
    this.log('统计信息已重置')
  }
}

// 创建单例实例
const configurationResolver = new ConfigurationResolver()

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__configurationResolver = configurationResolver
}

export default configurationResolver
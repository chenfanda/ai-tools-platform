// ===== src/services/workflow/ConfigurationResolver.js - 统一配置解析器 =====

import StandardDataModel from './StandardDataModel'

/**
 * 配置解析器 - 统一的配置解析和验证中心
 * 
 * 核心职责：
 * 1. 解析传统节点和动态节点配置
 * 2. 提供统一的配置访问接口
 * 3. 配置完整性检查和验证
 * 4. 配置数据的智能合并和优先级处理
 * 
 * 设计原则：
 * - 智能解析：自动识别配置来源和格式
 * - 优先级管理：用户配置 > 默认配置 > 系统配置
 * - 验证保护：确保配置数据的完整性和有效性
 * - 降级兼容：配置解析失败时提供安全降级
 */
class ConfigurationResolver {
  
  constructor() {
    // 配置缓存，避免重复解析
    this.configCache = new Map()
    
    // 验证规则缓存
    this.validationCache = new Map()
    
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
   * 统一配置解析主入口
   * 
   * 智能识别节点类型并选择相应的解析策略
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 解析选项
   * @returns {object} 解析后的配置对象
   */
  resolveConfiguration(nodeData, options = {}) {
    try {
      this.stats.parseCount++
      
      if (!nodeData) {
        throw new Error('节点数据不能为空')
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(nodeData, options)
      
      // 检查缓存
      if (this.configCache.has(cacheKey)) {
        this.stats.cacheHits++
        this.log(`使用缓存配置: ${nodeData.type}`)
        return this.configCache.get(cacheKey)
      }

      // 检测数据格式
      const dataFormat = StandardDataModel.detectDataFormat(nodeData)
      this.log(`解析节点配置: ${nodeData.type} (格式: ${dataFormat})`)

      let resolvedConfig

      // 根据格式选择解析策略
      switch (dataFormat) {
        case 'legacy':
          resolvedConfig = this.resolveLegacyConfiguration(nodeData, options)
          break
          
        case 'dynamic':
          resolvedConfig = this.resolveDynamicConfiguration(nodeData, options)
          break
          
        case 'standard':
          resolvedConfig = this.resolveStandardConfiguration(nodeData, options)
          break
          
        default:
          this.log(`未知数据格式: ${dataFormat}，尝试自动解析`, 'warn')
          resolvedConfig = this.resolveUnknownConfiguration(nodeData, options)
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
   * 解析传统节点配置
   * 
   * 传统节点特征：
   * - 配置字段直接存储在 data 根级别
   * - 外部配置存储在 data.config 中
   * - 通过 NodeManager 获取默认配置
   */
  resolveLegacyConfiguration(nodeData, options = {}) {
    try {
      const { data } = nodeData
      const nodeType = nodeData.type

      // 获取节点类型的默认配置（从 NodeManager）
      const defaultConfig = this.getLegacyDefaultConfig(nodeType)
      
      // 提取当前节点的配置字段
      const currentConfig = this.extractLegacyConfigFields(data)
      
      // 提取外部配置
      const externalConfig = data.config || {}

      // 配置优先级合并：用户配置 > 当前配置 > 默认配置 > 外部配置
      const resolvedConfig = {
        // 第一层：外部配置（最低优先级）
        ...externalConfig,
        
        // 第二层：默认配置
        ...defaultConfig,
        
        // 第三层：当前节点配置
        ...currentConfig,
        
        // 第四层：用户覆盖配置（最高优先级）
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
   * 解析动态节点配置
   * 
   * 动态节点特征：
   * - 通过 nodeConfig 定义字段结构
   * - 配置值可能分散在多个位置
   * - 支持复杂的字段类型和验证规则
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
      
      // 构建默认配置（从字段定义和 nodeConfig.defaultData）
      const defaultConfig = this.buildDynamicDefaultConfig(fields, nodeConfig.defaultData)
      
      // 提取当前配置值
      const currentConfig = this.extractDynamicConfigValues(data, fields)
      
      // 外部配置
      const externalConfig = data.config || {}

      // 配置优先级合并
      const resolvedConfig = {
        // 第一层：外部配置
        ...externalConfig,
        
        // 第二层：默认配置
        ...defaultConfig,
        
        // 第三层：当前配置值
        ...currentConfig,
        
        // 第四层：用户覆盖配置
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
        nodeConfig: nodeConfig // 保留原始节点配置引用
      }

    } catch (error) {
      this.log(`动态节点配置解析失败: ${error.message}`, 'error')
      throw new Error(`动态节点配置解析失败: ${error.message}`)
    }
  }

  /**
   * 解析标准格式配置
   * 
   * 标准格式已经是统一结构，主要进行验证和增强
   */
  resolveStandardConfiguration(nodeData, options = {}) {
    try {
      const { data } = nodeData
      
      if (!data._metadata) {
        throw new Error('标准格式节点缺少元数据')
      }

      // 直接使用标准格式的配置
      const baseConfig = data.config || {}
      
      // 应用用户覆盖
      const resolvedConfig = {
        ...baseConfig,
        ...(options.userConfig || {})
      }

      // 增强元数据
      const configMetadata = {
        ...data._metadata,
        lastResolved: new Date().toISOString(),
        hasUserOverrides: Boolean(options.userConfig)
      }

      return {
        config: resolvedConfig,
        metadata: configMetadata,
        validation: this.getStandardValidationRules(nodeData),
        schema: this.getStandardConfigSchema(nodeData)
      }

    } catch (error) {
      this.log(`标准格式配置解析失败: ${error.message}`, 'error')
      throw new Error(`标准格式配置解析失败: ${error.message}`)
    }
  }

  /**
   * 解析未知格式配置（降级处理）
   */
  resolveUnknownConfiguration(nodeData, options = {}) {
    this.log(`尝试解析未知格式节点: ${nodeData?.type}`, 'warn')
    
    try {
      // 尝试按传统格式解析
      if (nodeData.data && nodeData.type) {
        return this.resolveLegacyConfiguration(nodeData, options)
      }
      
      throw new Error('无法识别的节点数据格式')
      
    } catch (error) {
      this.log(`未知格式解析失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 配置后处理
   * 
   * 对解析后的配置进行验证、清理和增强
   */
  postProcessConfiguration(resolvedConfig, nodeData, options = {}) {
    try {
      let processedConfig = { ...resolvedConfig }

      // 1. 配置验证
      if (options.validate !== false) {
        const validation = this.validateConfiguration(processedConfig, nodeData)
        if (!validation.valid) {
          this.stats.validationErrors++
          this.log(`配置验证失败: ${validation.errors.join('; ')}`, 'warn')
          
          // 如果严格模式，抛出错误
          if (options.strictValidation) {
            throw new Error(`配置验证失败: ${validation.errors[0]}`)
          }
          
          // 否则记录警告并继续
          processedConfig.metadata = {
            ...processedConfig.metadata,
            validationWarnings: validation.errors
          }
        }
      }

      // 2. 数据类型转换
      processedConfig.config = this.normalizeConfigTypes(processedConfig.config, processedConfig.schema)

      // 3. 配置完整性检查
      processedConfig.config = this.ensureConfigCompleteness(processedConfig.config, processedConfig.metadata)

      // 4. 添加解析统计
      processedConfig.metadata = {
        ...processedConfig.metadata,
        parseStats: {
          parseTime: Date.now(),
          cacheUsed: false, // 在这里总是 false，因为是新解析的
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
   * 创建降级配置
   * 
   * 当配置解析失败时提供安全的默认配置
   */
  createFallbackConfiguration(nodeData, originalError) {
    this.log(`创建降级配置: ${nodeData?.type}`, 'warn')
    
    const fallbackConfig = {
      config: {
        // 基础降级配置
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
        valid: true // 降级配置默认有效
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

  // ===== 配置提取和构建方法 =====

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

    return configValues
  }

  /**
   * 处理动态字段值（类型转换、验证等）
   */
  processDynamicFieldValues(config, fields) {
    const processedConfig = { ...config }
    
    fields.forEach(field => {
      const value = config[field.name]
      
      if (value !== undefined) {
        // 根据字段类型进行处理
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

  // ===== 验证规则获取方法 =====

  /**
   * 获取传统节点的验证规则
   */
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

  /**
   * 获取动态节点的验证规则
   */
  getDynamicValidationRules(nodeConfig) {
    const validation = nodeConfig.validation || {}
    
    // 从字段定义中构建验证规则
    const fieldRules = {}
    if (nodeConfig.fields) {
      nodeConfig.fields.forEach(field => {
        if (field.validation) {
          fieldRules[field.name] = field.validation
        }
        
        // 基于字段类型添加默认验证
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

  /**
   * 获取标准格式的验证规则
   */
  getStandardValidationRules(nodeData) {
    // 标准格式从元数据中获取验证规则
    if (nodeData.data._metadata.sourceType === 'legacy') {
      return this.getLegacyValidationRules(nodeData.type)
    } else if (nodeData.data._metadata.sourceType === 'dynamic' && nodeData.data.nodeConfig) {
      return this.getDynamicValidationRules(nodeData.data.nodeConfig)
    }
    
    return { required: [], rules: {} }
  }

  // ===== 配置模式获取方法 =====

  /**
   * 获取传统节点的配置模式
   */
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

  /**
   * 获取动态节点的配置模式
   */
  getDynamicConfigSchema(fields) {
    return {
      type: 'object',
      fields: fields || []
    }
  }

  /**
   * 获取标准格式的配置模式
   */
  getStandardConfigSchema(nodeData) {
    if (nodeData.data.nodeConfig && nodeData.data.nodeConfig.fields) {
      return this.getDynamicConfigSchema(nodeData.data.nodeConfig.fields)
    }
    
    return this.getLegacyConfigSchema(nodeData.type)
  }

  // ===== 工具方法 =====

  /**
   * 获取传统节点的默认配置
   */
  getLegacyDefaultConfig(nodeType) {
    // 这里可以集成 NodeManager 的默认配置
    const legacyDefaults = {
      'text-input': { text: '', placeholder: '请输入文本内容...' },
      'tts': { mode: 'character', character: '', selectedCharacter: '', gender: '', pitch: '', speed: '' },
      'output': { displayMode: 'auto', autoExpand: false, showValidation: true },
      'download': { autoDownload: false, customFileName: '', downloadFormat: 'auto' }
    }

    return legacyDefaults[nodeType] || {}
  }

/**
 * 配置验证
 */
validateConfiguration(resolvedConfig, nodeData) {
  try {
    const { config, validation, metadata } = resolvedConfig
    const errors = []

    // 检查必需字段
    if (validation.required) {
      validation.required.forEach(field => {
        const value = config[field]
        
        // 🔧 修复：改进必需字段验证逻辑
        // 如果字段有值（即使是空字符串但不是 null/undefined），且：
        // 1. 不是纯空白字符串，或者
        // 2. 是数字0、布尔false等有效值
        // 则认为字段已填写
        
        const isEmpty = value === undefined || 
                       value === null || 
                       (typeof value === 'string' && value.trim() === '')
        
        // 检查是否有默认值（从元数据或配置中获取）
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
        
        if (value !== undefined && value !== null) {
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

/**
 * 检查字段是否有默认值
 * 
 * @param {string} field - 字段名
 * @param {object} metadata - 配置元数据
 * @param {object} resolvedConfig - 解析后的配置
 * @returns {boolean} 是否有默认值
 */
checkHasDefaultValue(field, metadata, resolvedConfig) {
  try {
    // 1. 检查动态节点的字段定义中是否有默认值
    if (metadata.sourceType === 'dynamic' && resolvedConfig.nodeConfig?.fields) {
      const fieldDef = resolvedConfig.nodeConfig.fields.find(f => f.name === field)
      if (fieldDef && fieldDef.hasOwnProperty('defaultValue')) {
        return true
      }
    }
    
    // 2. 检查 defaultData 中是否定义了该字段
    if (resolvedConfig.nodeConfig?.defaultData && 
        resolvedConfig.nodeConfig.defaultData.hasOwnProperty(field)) {
      return true
    }
    
    // 3. 检查传统节点的默认配置
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

  /**
   * 配置类型标准化
   */
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

  /**
   * 确保配置完整性
   */
  ensureConfigCompleteness(config, metadata) {
    const completeConfig = { ...config }
    
    // 根据源类型添加必要的默认值
    if (metadata.sourceType === 'legacy') {
      // 传统节点的完整性检查
      if (!completeConfig.hasOwnProperty('hideTestButton')) {
        completeConfig.hideTestButton = true
      }
    } else if (metadata.sourceType === 'dynamic') {
      // 动态节点的完整性检查
      if (!completeConfig.hasOwnProperty('_isDynamic')) {
        completeConfig._isDynamic = true
      }
    }

    return completeConfig
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(nodeData, options) {
    const keyParts = [
      nodeData.id || 'unknown',
      nodeData.type || 'unknown',
      JSON.stringify(options.userConfig || {}),
      Date.now().toString().slice(-6) // 简单的时间戳，避免过度缓存
    ]
    
    return keyParts.join('|')
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.configCache.clear()
    this.validationCache.clear()
    this.log('配置缓存已清理')
  }

  /**
   * 获取解析统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.configCache.size,
      validationCacheSize: this.validationCache.size,
      cacheHitRate: this.stats.parseCount > 0 ? (this.stats.cacheHits / this.stats.parseCount * 100).toFixed(2) + '%' : '0%'
    }
  }

  /**
   * 重置统计信息
   */
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

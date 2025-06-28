// ===== src/extensions/workflow/utils/ConfigConverter.js - 配置格式转换器 =====


import dataValidator from '../../../services/workflow/types/DataValidator'
import { DATA_TYPES, inferDataType, getDataTypeMetadata } from '../../../services/workflow/types/DataTypes' 
/**
 * 配置格式转换器
 * 
 * 职责：
 * 1. 将JSON配置转换为DynamicConfigPanel需要的fields格式
 * 2. 智能推断字段类型和验证规则
 * 3. 保持向下兼容，支持多种配置来源
 * 4. 提供统一的配置标准化接口
 */

class ConfigConverter {
  constructor() {
    this.debugMode = process.env.NODE_ENV === 'development'
    // 引用数据验证器
    this.dataValidator = dataValidator
  }

  /**
   * 调试日志
   */
  log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[ConfigConverter ${timestamp}]`
    
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
   * 将JSON配置转换为DynamicConfigPanel格式
   * 
   * @param {object} jsonConfig - JSON配置对象
   * @returns {object} DynamicConfigPanel兼容的配置
   */
  convertJsonConfigToFields(jsonConfig) {
    try {
      this.log('开始转换JSON配置到fields格式')
      
      if (!jsonConfig || !jsonConfig.data || !jsonConfig.data.defaultData) {
        throw new Error('无效的JSON配置格式')
      }

      const { defaultData, validation = {} } = jsonConfig.data
      const { node } = jsonConfig

      // 从defaultData生成fields数组
      const fields = this._generateFieldsFromDefaultData(defaultData, validation)
      
      // 构建统一配置格式
      const unifiedConfig = {
        // 基础节点信息
        type: node.type,
        label: node.label,
        icon: node.icon,
        description: node.description,
        theme: node.theme,
        category: node.category,
        
        // 字段配置 (DynamicConfigPanel格式)
        fields: fields,
        
        // 验证规则 (保持兼容)
        validation: validation,
        
        // 默认数据 (保留原始)
        defaultData: defaultData,
        
        // 元数据标记
        meta: {
          ...jsonConfig.meta,
          sourceType: 'json',
          convertedAt: new Date().toISOString()
        }
      }

      this.log(`JSON配置转换成功，生成${fields.length}个字段`, 'success')

      // 验证生成的字段配置
      for (const field of fields) {
        const fieldValidation = dataValidator.validateFieldConfig(field)
        if (!fieldValidation.isValid) {
          this.log(`字段配置验证失败 ${field.name}: ${fieldValidation.errors.join(', ')}`, 'warn')
        }
        if (fieldValidation.warnings.length > 0) {
          this.log(`字段配置警告 ${field.name}: ${fieldValidation.warnings.join(', ')}`, 'warn')
        }
      }
      
      // 验证默认数据与字段配置的一致性
      const dataValidation = dataValidator.validateFields(defaultData, fields)
      if (!dataValidation.isValid) {
        this.log(`默认数据验证失败: ${dataValidation.errors.join('; ')}`, 'warn')
      }
      return unifiedConfig

    } catch (error) {
      this.log(`JSON配置转换失败: ${error.message}`, 'error')
      throw new Error(`配置转换失败: ${error.message}`)
    }
  }

  /**
   * 从defaultData自动生成fields数组
   * 
   * @param {object} defaultData - 默认数据对象
   * @param {object} validation - 验证规则
   * @returns {array} fields数组
   */
  _generateFieldsFromDefaultData(defaultData, validation = {}) {
    const fields = []
    const requiredFields = validation.required || []
    const fieldRules = validation.rules || {}

    for (const [key, defaultValue] of Object.entries(defaultData)) {
      try {
        const field = this._createFieldFromValue(key, defaultValue, {
          required: requiredFields.includes(key),
          validation: fieldRules[key] || {},
          rules: validation.rules || {}
        })
        
        fields.push(field)
        this.log(`生成字段: ${key} (${field.type})`)
        
      } catch (error) {
        this.log(`字段生成失败 ${key}: ${error.message}`, 'warn')
        // 继续处理其他字段，不中断整个转换过程
      }
    }

    return fields
  }

  /**
   * 根据键名和默认值创建字段配置
   * 
   * @param {string} key - 字段名
   * @param {any} defaultValue - 默认值
   * @param {object} options - 额外选项
   * @returns {object} 字段配置对象
   */
  _createFieldFromValue(key, defaultValue, options = {}) {
    const { required = false, validation = {}, rules = {} } = options
    
    // 智能推断字段类型
    const fieldType = this._inferFieldType(key, defaultValue, validation)
    
    // 生成用户友好的标签
    const label = this._generateFieldLabel(key)
    
    // 构建字段配置
    const field = {
      name: key,
      type: fieldType,
      dataType: inferredType,    // 原始数据类型  ← 新增这行
      label: label,
      defaultValue: defaultValue,
      required: required
    }

    // 添加占位符
    if (fieldType === 'text' || fieldType === 'textarea') {
      field.placeholder = `请输入${label}...`
    } else if (fieldType === 'select') {
      field.placeholder = `请选择${label}`
    }

    // 处理选项类型字段
    if (fieldType === 'select' || fieldType === 'radio') {
      field.options = this._generateFieldOptions(key, defaultValue)
    }

    // 处理验证规则
    if (Object.keys(validation).length > 0) {
      field.validation = this._convertValidationRules(validation, fieldType)
    }

    // 添加描述信息
    field.description = this._generateFieldDescription(key, fieldType, defaultValue)


    // 使用数据验证器验证字段配置
    try {
      const fieldValidation = dataValidator.validateFieldConfig(field)
      if (!fieldValidation.isValid) {
        this.log(`字段配置验证失败 ${key}: ${fieldValidation.errors.join(', ')}`, 'warn')
      }
      
      // 验证默认值与字段类型的匹配性
      if (field.defaultValue !== undefined) {
        const valueValidation = dataValidator.validateValue(field.defaultValue, fieldType, { required: field.required })
        if (!valueValidation.isValid) {
          this.log(`默认值验证失败 ${key}: ${valueValidation.errors.join(', ')}`, 'warn')
          // 使用规范化的值
          field.defaultValue = valueValidation.normalizedValue
        }
      }
    } catch (error) {
      this.log(`字段验证过程出错 ${key}: ${error.message}`, 'warn')
    }

    return field
  }

  
  /**
   * 智能推断字段类型 - 增强版，使用标准数据类型系统
   * 
   * @param {string} key - 字段名  
   * @param {any} defaultValue - 默认值
   * @param {object} validation - 验证规则
   * @returns {string} 字段类型
   */
  _inferFieldType(key, defaultValue, validation = {}) {
    try {
      // 1. 优先检查验证规则中的显式类型声明
      if (validation.fieldType && Object.values(DATA_TYPES).includes(validation.fieldType)) {
        this.log(`使用显式类型声明: ${validation.fieldType}`)
        return validation.fieldType
      }

      // 2. 使用标准数据类型推断
      const inferredType = inferDataType(defaultValue)
      this.log(`推断数据类型: ${inferredType} (基于值: ${defaultValue})`)
      
      // 3. 根据字段名进行类型细化（基于标准数据类型）
      const keyLower = key.toLowerCase()
      
      // 媒体类型检查
      if (keyLower.includes('image') || keyLower.includes('picture') || keyLower.includes('photo')) {
        return DATA_TYPES.IMAGE
      }
      if (keyLower.includes('audio') || keyLower.includes('sound') || keyLower.includes('voice')) {
        return DATA_TYPES.AUDIO
      }
      if (keyLower.includes('video') || keyLower.includes('movie')) {
        return DATA_TYPES.VIDEO
      }
      if (keyLower.includes('file') || keyLower.includes('attachment') || keyLower.includes('document')) {
        return DATA_TYPES.FILE
      }
      
      // 特殊字段类型检查
      if (keyLower.includes('password') || keyLower.includes('secret')) {
        return 'password' // UI字段类型
      }
      if (keyLower.includes('email') || keyLower.includes('mail')) {
        return DATA_TYPES.EMAIL
      }
      if (keyLower.includes('url') || keyLower.includes('link')) {
        return DATA_TYPES.URL
      }
      if (keyLower.includes('color') || keyLower.includes('colour')) {
        return 'color' // UI字段类型
      }
      if (keyLower.includes('date') && !keyLower.includes('time')) {
        return DATA_TYPES.DATE
      }
      if (keyLower.includes('time') && !keyLower.includes('date')) {
        return DATA_TYPES.TIME
      }
      if (keyLower.includes('datetime') || (keyLower.includes('date') && keyLower.includes('time'))) {
        return DATA_TYPES.DATETIME
      }

      // 4. 基于验证规则细化类型
      if (inferredType === DATA_TYPES.NUMBER || inferredType === DATA_TYPES.INTEGER) {
        // 检查是否适合滑块控件
        if (validation.min !== undefined && validation.max !== undefined) {
          const range = validation.max - validation.min
          if (range <= 100 && range > 2) {
            return 'range' // UI字段类型
          }
        }
      }

      // 5. 基于默认值进一步细化
      if (inferredType === DATA_TYPES.TEXT) {
        if (typeof defaultValue === 'string' && defaultValue.length > 50) {
          return 'textarea' // UI字段类型
        }
        
        // 检查是否是预定义选项
        if (this._looksLikeOption(defaultValue)) {
          return 'select' // UI字段类型
        }
      }

      // 6. 布尔值转换为复选框
      if (inferredType === DATA_TYPES.BOOLEAN) {
        return 'checkbox' // UI字段类型
      }

      // 7. 数组处理
      if (inferredType === DATA_TYPES.ARRAY) {
        return Array.isArray(defaultValue) && defaultValue.length <= 5 ? 'radio' : 'select'
      }

     // 8. 映射数据类型到UI字段类型
      const dataTypeToUIType = {
        [DATA_TYPES.BOOLEAN]: 'checkbox',
        [DATA_TYPES.NUMBER]: 'number',
        [DATA_TYPES.INTEGER]: 'number', 
        [DATA_TYPES.FLOAT]: 'number',
        [DATA_TYPES.TEXT]: 'text',
        [DATA_TYPES.EMAIL]: 'email',
        [DATA_TYPES.URL]: 'url',
        [DATA_TYPES.DATE]: 'date',
        [DATA_TYPES.TIME]: 'time',
        [DATA_TYPES.DATETIME]: 'datetime-local',
        [DATA_TYPES.IMAGE]: 'image',
        [DATA_TYPES.AUDIO]: 'audio',
        [DATA_TYPES.VIDEO]: 'video',
        [DATA_TYPES.FILE]: 'file',
        [DATA_TYPES.ARRAY]: 'select',
        [DATA_TYPES.JSON]: 'textarea'
      }

      // 9. 特殊UI类型处理（基于验证规则和上下文）
      if (inferredType === DATA_TYPES.NUMBER || inferredType === DATA_TYPES.INTEGER) {
        // 检查是否适合滑块控件
        if (validation.min !== undefined && validation.max !== undefined) {
          const range = validation.max - validation.min
          if (range <= 100 && range > 2) {
            return 'range' // 返回UI类型，但在字段配置中记录原始数据类型
          }
        }
      }

      // 10. 返回映射后的UI类型，如果没有映射则使用原类型或默认text
      return dataTypeToUIType[inferredType] || 
             (Object.values(DATA_TYPES).includes(inferredType) ? inferredType : 'text')

    } catch (error) {
      this.log(`类型推断失败: ${error.message}`, 'error')
      return 'text' // 安全降级
    }
  }

  /**
   * 检查字符串是否像是预定义选项
   */
  _looksLikeOption(value) {
    const optionPatterns = [
      /^option\d+$/i,  // option1, option2
      /^choice[a-z]$/i, // choicea, choiceb  
      /^type[a-z]+$/i,  // typeA, typeB
      /^mode\d+$/i     // mode1, mode2
    ]
    
    return optionPatterns.some(pattern => pattern.test(value))
  }

  /**
   * 生成字段选项
   */
  _generateFieldOptions(key, defaultValue) {
    if (Array.isArray(defaultValue)) {
      return defaultValue.map(item => 
        typeof item === 'string' ? { value: item, label: item } : item
      )
    }

    // 为看起来像选项的字段生成默认选项
    if (typeof defaultValue === 'string' && this._looksLikeOption(defaultValue)) {
      return [
        { value: 'option1', label: '选项1' },
        { value: 'option2', label: '选项2' },
        { value: 'option3', label: '选项3' }
      ]
    }

    return []
  }

  /**
   * 生成用户友好的字段标签
   */
  _generateFieldLabel(key) {
    // 处理常见的驼峰命名和下划线命名
    return key
      .replace(/([A-Z])/g, ' $1') // 驼峰转空格
      .replace(/_/g, ' ') // 下划线转空格
      .replace(/^./, str => str.toUpperCase()) // 首字母大写
      .replace(/\b\w/g, str => str.toUpperCase()) // 每个单词首字母大写
  }

  /**
   * 转换验证规则格式
   */
  _convertValidationRules(validation, fieldType) {
    const convertedRules = {}

    // 基础规则转换
    if (validation.type === 'string') {
      if (validation.minLength) convertedRules.minLength = validation.minLength
      if (validation.maxLength) convertedRules.maxLength = validation.maxLength
      if (validation.pattern) convertedRules.pattern = validation.pattern
    }

    if (validation.type === 'number') {
      if (validation.min !== undefined) convertedRules.min = validation.min
      if (validation.max !== undefined) convertedRules.max = validation.max
    }

    // 保留其他原始验证规则
    Object.keys(validation).forEach(key => {
      if (!['type', 'minLength', 'maxLength', 'min', 'max', 'pattern'].includes(key)) {
        convertedRules[key] = validation[key]
      }
    })

    return convertedRules
  }

  /**
   * 生成字段描述
   */
  _generateFieldDescription(key, fieldType, defaultValue) {
    const descriptions = {
      text: '请输入文本内容',
      textarea: '请输入多行文本内容', 
      number: '请输入数字',
      checkbox: '勾选以启用此选项',
      select: '从下拉列表中选择一项',
      radio: '选择其中一个选项',
      image: '上传图片文件',
      audio: '上传音频文件',
      video: '上传视频文件',
      file: '上传文件',
      range: '拖动滑块调整数值'
    }

    return descriptions[fieldType] || '请设置此字段的值'
  }

  /**
   * 标准化现有节点配置
   * 用于将Legacy节点配置转换为统一格式
   * 
   * @param {object} legacyConfig - 现有节点配置
   * @returns {object} 标准化配置
   */
  standardizeLegacyConfig(legacyConfig) {
    try {
      this.log('标准化Legacy配置')

      const standardConfig = {
        // 保持原有基础信息
        type: legacyConfig.type,
        label: legacyConfig.label,
        icon: legacyConfig.icon,
        description: legacyConfig.description,
        theme: legacyConfig.theme || 'blue',
        category: legacyConfig.category || 'general',
        
        // 如果已有fields，直接使用
        fields: legacyConfig.fields || [],
        
        // 保持原有验证和默认数据
        validation: legacyConfig.validation || {},
        defaultData: legacyConfig.defaultData || {},
        
        // 保持组件引用
        component: legacyConfig.component,
        configComponent: legacyConfig.configComponent,
        
        // 标记来源
        meta: {
          sourceType: 'legacy',
          convertedAt: new Date().toISOString()
        }
      }

      this.log('Legacy配置标准化完成', 'success')
      return standardConfig

    } catch (error) {
      this.log(`Legacy配置标准化失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 检查配置是否需要转换
   * 
   * @param {object} config - 待检查的配置
   * @returns {boolean} 是否需要转换
   */
  needsConversion(config) {
    // 如果已经有fields数组，说明已经是标准格式
    if (config.fields && Array.isArray(config.fields)) {
      return false
    }

    // 如果有JSON配置特征，需要转换
    if (config.data && config.data.defaultData) {
      return true
    }

    // 如果有defaultData但没有fields，可能需要转换
    if (config.defaultData && !config.fields) {
      return true
    }

    return false
  }

  /**
   * 获取转换器状态信息
   */
  getConverterInfo() {
    return {
      supportedFieldTypes: [
        'text', 'textarea', 'number', 'checkbox', 'select', 'radio',
        'image', 'audio', 'video', 'file', 'password', 'email', 'url',
        'color', 'date', 'time', 'range'
      ],
      supportedValidationRules: [
        'required', 'minLength', 'maxLength', 'min', 'max', 'pattern',
        'customValidator'
      ],
      debugMode: this.debugMode
    }
  }
}

// 创建单例实例
const configConverter = new ConfigConverter()

// 开发环境调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__configConverter = configConverter
}

export default configConverter

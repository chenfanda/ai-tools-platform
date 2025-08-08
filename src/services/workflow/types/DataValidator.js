/**
 * 数据验证器 - 基于 DataTypes.js 的统一验证系统
 * 
 * 职责：
 * 1. 基于数据类型定义进行数据验证
 * 2. 提供统一的验证规则和错误信息
 * 3. 支持自定义验证函数
 * 4. 集成到 ConfigConverter 和 NodeRegistry
 */

import { 
  DATA_TYPES, 
  DATA_TYPE_METADATA, 
  getDataTypeMetadata, 
  isValidDataType,
  inferDataType
} from './DataTypes.js'

class DataValidator {
  constructor() {
    this.debugMode = false
    // this.debugMode = process.env.NODE_ENV === 'development'
    this.customValidators = new Map()
  }

  /**
   * 调试日志
   */
  log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[DataValidator ${timestamp}]`
    
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
 * 验证单个字段值
 * 
 * @param {*} value - 待验证的值
 * @param {string} dataType - 数据类型（可能是UI类型）
 * @param {object} rules - 验证规则
 * @returns {object} 验证结果 { isValid, errors, warnings }
 */
validateValue(value, dataType, rules = {}) {
  try {
    this.log(`验证值: ${value} (类型: ${dataType})`)
    
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      normalizedValue: value
    }

    // 🔧 新增：UI类型到数据类型的映射
    const uiTypeToDataType = {
      'text': DATA_TYPES.TEXT,
      'textarea': DATA_TYPES.TEXT,
      'number': DATA_TYPES.NUMBER,
      'select': DATA_TYPES.TEXT,
      'checkbox': DATA_TYPES.BOOLEAN,
      'radio': DATA_TYPES.TEXT,
      'range': DATA_TYPES.NUMBER,
      'image': DATA_TYPES.IMAGE,
      'audio': DATA_TYPES.AUDIO,
      'video': DATA_TYPES.VIDEO,
      'file': DATA_TYPES.FILE,
      'date': DATA_TYPES.DATE,
      'time': DATA_TYPES.TIME,
      'datetime': DATA_TYPES.DATETIME,
      'datetime-local': DATA_TYPES.DATETIME,
      'color': DATA_TYPES.TEXT,
      'url': DATA_TYPES.URL,
      'email': DATA_TYPES.EMAIL
    }

    // 🔧 新增：映射UI类型到数据类型
    const actualDataType = uiTypeToDataType[dataType] || dataType

    // 1. 检查数据类型是否有效（使用映射后的类型）
    if (!isValidDataType(actualDataType)) {
      // 🔧 修复：如果是UI类型但映射成功，则认为有效
      if (uiTypeToDataType[dataType]) {
        this.log(`UI类型 ${dataType} 映射为数据类型 ${actualDataType}`)
      } else {
        result.errors.push(`无效的数据类型: ${dataType}`)
        result.isValid = false
        return result
      }
    }

    // 2. 处理必需字段验证
    if (rules.required && this._isEmpty(value)) {
      result.errors.push('此字段为必填项')
      result.isValid = false
      return result
    }

    // 3. 如果值为空且非必需，跳过后续验证
    if (this._isEmpty(value) && !rules.required) {
      return result
    }

    // 4. 基础类型验证（使用映射后的数据类型）
    const typeValidation = this._validateByType(value, actualDataType)
    if (!typeValidation.isValid) {
      result.errors.push(...typeValidation.errors)
      result.isValid = false
    } else {
      result.normalizedValue = typeValidation.normalizedValue
    }

    // 5. 规则验证（使用映射后的数据类型）
    const rulesValidation = this._validateByRules(result.normalizedValue, actualDataType, rules)
    if (!rulesValidation.isValid) {
      result.errors.push(...rulesValidation.errors)
      result.isValid = false
    }
    result.warnings.push(...rulesValidation.warnings)

    // 6. 自定义验证器
    if (rules.customValidator) {
      const customValidation = this._runCustomValidator(result.normalizedValue, rules.customValidator, actualDataType)
      if (!customValidation.isValid) {
        result.errors.push(...customValidation.errors)
        result.isValid = false
      }
      result.warnings.push(...customValidation.warnings)
    }

    this.log(`验证结果: ${result.isValid ? '通过' : '失败'}`, result.isValid ? 'success' : 'error')
    return result

  } catch (error) {
    this.log(`验证过程出错: ${error.message}`, 'error')
    return {
      isValid: false,
      errors: [`验证过程出错: ${error.message}`],
      warnings: [],
      normalizedValue: value
    }
  }
}
 /**
   * 验证字段配置对象
   * 
   * @param {object} fieldConfig - 字段配置
   * @returns {object} 验证结果
   */
  validateFieldConfig(fieldConfig) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // UI字段类型到数据类型的映射
    const uiTypeToDataType = {
      'checkbox': DATA_TYPES.BOOLEAN,
      'range': DATA_TYPES.NUMBER,
      'select': DATA_TYPES.TEXT,
      'radio': DATA_TYPES.TEXT,
      'textarea': DATA_TYPES.TEXT,
      'email': DATA_TYPES.EMAIL,
      'url': DATA_TYPES.URL,
      'date': DATA_TYPES.DATE,
      'time': DATA_TYPES.TIME,
      'datetime-local': DATA_TYPES.DATETIME,
      'image': DATA_TYPES.IMAGE,
      'audio': DATA_TYPES.AUDIO,
      'video': DATA_TYPES.VIDEO,
      'file': DATA_TYPES.FILE,
      'number': DATA_TYPES.NUMBER,
      'text': DATA_TYPES.TEXT
    }

    // 检查必需属性
    const requiredProps = ['name', 'type']
    for (const prop of requiredProps) {
      if (!fieldConfig[prop]) {
        result.errors.push(`字段配置缺少必需属性: ${prop}`)
        result.isValid = false
      }
    }

    // 检查数据类型 - 支持UI类型和数据类型
    if (fieldConfig.type) {
      const isDataTypeValid = Object.values(DATA_TYPES).includes(fieldConfig.type)
      const isUITypeValid = uiTypeToDataType.hasOwnProperty(fieldConfig.type)
      
      if (!isDataTypeValid && !isUITypeValid) {
        result.errors.push(`无效的字段类型: ${fieldConfig.type}`)
        result.isValid = false
      }
    }

    // 检查默认值与类型的一致性
    if (fieldConfig.defaultValue !== undefined && fieldConfig.type) {
      // 使用dataType优先，如果没有则映射UI类型
      const actualDataType = fieldConfig.dataType || uiTypeToDataType[fieldConfig.type] || fieldConfig.type
      const inferredType = inferDataType(fieldConfig.defaultValue)
      
      if (inferredType !== actualDataType && inferredType !== DATA_TYPES.UNKNOWN) {
        result.warnings.push(`默认值类型(${inferredType})与声明类型(${actualDataType})不一致`)
      }
    }

    return result
  }

  /**
   * 批量验证多个字段
   * 
   * @param {object} data - 数据对象
   * @param {array} fieldConfigs - 字段配置数组
   * @returns {object} 验证结果
   */
  validateFields(data, fieldConfigs) {
    const result = {
      isValid: true,
      fieldResults: {},
      errors: [],
      warnings: []
    }

    for (const fieldConfig of fieldConfigs) {
      const { name, type, validation = {}, required = false } = fieldConfig
      const value = data[name]
      
      const fieldResult = this.validateValue(value, type, {
        ...validation,
        required
      })
      
      result.fieldResults[name] = fieldResult
      
      if (!fieldResult.isValid) {
        result.isValid = false
        result.errors.push(`字段 ${name}: ${fieldResult.errors.join(', ')}`)
      }
      
      if (fieldResult.warnings.length > 0) {
        result.warnings.push(`字段 ${name}: ${fieldResult.warnings.join(', ')}`)
      }
    }

    return result
  }

  /**
   * 检查值是否为空
   */
  _isEmpty(value) {
    return value === null || 
           value === undefined || 
           value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0)
  }

  /**
   * 按数据类型进行基础验证
   */
  _validateByType(value, dataType) {
    const result = {
      isValid: true,
      errors: [],
      normalizedValue: value
    }

    switch (dataType) {
      case DATA_TYPES.TEXT:
      case DATA_TYPES.MARKDOWN:
      case DATA_TYPES.HTML:
      case DATA_TYPES.XML:
        if (typeof value !== 'string') {
          result.errors.push('值必须是字符串类型')
          result.isValid = false
        }
        break

      case DATA_TYPES.JSON:
        if (typeof value === 'string') {
          try {
            result.normalizedValue = JSON.parse(value)
          } catch (e) {
            result.errors.push('无效的JSON格式')
            result.isValid = false
          }
        } else if (typeof value !== 'object') {
          result.errors.push('值必须是有效的JSON格式')
          result.isValid = false
        }
        break

      case DATA_TYPES.NUMBER:
      case DATA_TYPES.FLOAT:
        const numValue = Number(value)
        if (isNaN(numValue)) {
          result.errors.push('值必须是有效数字')
          result.isValid = false
        } else {
          result.normalizedValue = numValue
        }
        break

      case DATA_TYPES.INTEGER:
        const intValue = Number(value)
        if (isNaN(intValue) || !Number.isInteger(intValue)) {
          result.errors.push('值必须是整数')
          result.isValid = false
        } else {
          result.normalizedValue = intValue
        }
        break

      case DATA_TYPES.BOOLEAN:
        if (typeof value === 'string') {
          if (value.toLowerCase() === 'true') {
            result.normalizedValue = true
          } else if (value.toLowerCase() === 'false') {
            result.normalizedValue = false
          } else {
            result.errors.push('字符串值必须是 "true" 或 "false"')
            result.isValid = false
          }
        } else if (typeof value !== 'boolean') {
          result.errors.push('值必须是布尔类型')
          result.isValid = false
        }
        break

      case DATA_TYPES.ARRAY:
        if (!Array.isArray(value)) {
          result.errors.push('值必须是数组类型')
          result.isValid = false
        }
        break

      case DATA_TYPES.OBJECT:
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          result.errors.push('值必须是对象类型')
          result.isValid = false
        }
        break

      case DATA_TYPES.URL:
        try {
          new URL(value)
        } catch (e) {
          result.errors.push('无效的URL格式')
          result.isValid = false
        }
        break

      case DATA_TYPES.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          result.errors.push('无效的邮箱格式')
          result.isValid = false
        }
        break

      case DATA_TYPES.DATE:
        if (typeof value === 'string') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/
          if (!dateRegex.test(value)) {
            result.errors.push('日期格式必须是 YYYY-MM-DD')
            result.isValid = false
          } else {
            const date = new Date(value)
            if (isNaN(date.getTime())) {
              result.errors.push('无效的日期')
              result.isValid = false
            }
          }
        }
        break

      case DATA_TYPES.TIME:
        if (typeof value === 'string') {
          const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/
          if (!timeRegex.test(value)) {
            result.errors.push('时间格式必须是 HH:MM 或 HH:MM:SS')
            result.isValid = false
          }
        }
        break

      case DATA_TYPES.IMAGE:
      case DATA_TYPES.AUDIO:
      case DATA_TYPES.VIDEO:
      case DATA_TYPES.FILE:
        if (value && !(value instanceof File) && typeof value !== 'string') {
          result.errors.push('文件值必须是 File 对象或文件路径字符串')
          result.isValid = false
        }
        break
    }

    return result
  }

  /**
   * 按验证规则进行验证
   */
  _validateByRules(value, dataType, rules) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // 字符串长度验证
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        result.errors.push(`长度不能少于 ${rules.minLength} 个字符`)
        result.isValid = false
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        result.errors.push(`长度不能超过 ${rules.maxLength} 个字符`)
        result.isValid = false
      }
    }

    // 数值范围验证
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        result.errors.push(`值不能小于 ${rules.min}`)
        result.isValid = false
      }
      if (rules.max !== undefined && value > rules.max) {
        result.errors.push(`值不能大于 ${rules.max}`)
        result.isValid = false
      }
    }

    // 文件大小验证
    if (value instanceof File) {
      const metadata = getDataTypeMetadata(dataType)
      if (metadata.validation.maxSize && value.size > metadata.validation.maxSize) {
        result.errors.push(`文件大小不能超过 ${this._formatFileSize(metadata.validation.maxSize)}`)
        result.isValid = false
      }
      
      if (metadata.validation.accept) {
        const acceptTypes = metadata.validation.accept.split(',').map(t => t.trim())
        const isAccepted = acceptTypes.some(type => {
          if (type.endsWith('/*')) {
            return value.type.startsWith(type.slice(0, -1))
          }
          return value.type === type
        })
        
        if (!isAccepted) {
          result.errors.push(`不支持的文件类型: ${value.type}`)
          result.isValid = false
        }
      }
    }

    // 正则表达式验证
    if (rules.pattern && typeof value === 'string') {
      const regex = new RegExp(rules.pattern)
      if (!regex.test(value)) {
        result.errors.push('格式不符合要求')
        result.isValid = false
      }
    }

    return result
  }

  /**
   * 运行自定义验证器
   */
  _runCustomValidator(value, validatorConfig, dataType) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      let validator
      
      if (typeof validatorConfig === 'function') {
        validator = validatorConfig
      } else if (typeof validatorConfig === 'string') {
        validator = this.customValidators.get(validatorConfig)
        if (!validator) {
          result.warnings.push(`未找到自定义验证器: ${validatorConfig}`)
          return result
        }
      } else {
        result.warnings.push('无效的自定义验证器配置')
        return result
      }

      const validationResult = validator(value, dataType)
      
      if (typeof validationResult === 'boolean') {
        if (!validationResult) {
          result.errors.push('自定义验证失败')
          result.isValid = false
        }
      } else if (typeof validationResult === 'object') {
        if (validationResult.isValid === false) {
          result.isValid = false
          if (validationResult.message) {
            result.errors.push(validationResult.message)
          } else {
            result.errors.push('自定义验证失败')
          }
        }
        if (validationResult.warning) {
          result.warnings.push(validationResult.warning)
        }
      }

    } catch (error) {
      result.errors.push(`自定义验证器执行出错: ${error.message}`)
      result.isValid = false
    }

    return result
  }

  /**
   * 格式化文件大小
   */
  _formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 注册自定义验证器
   * 
   * @param {string} name - 验证器名称
   * @param {function} validator - 验证函数
   */
  registerCustomValidator(name, validator) {
    if (typeof validator !== 'function') {
      throw new Error('验证器必须是函数')
    }
    
    this.customValidators.set(name, validator)
    this.log(`注册自定义验证器: ${name}`, 'success')
  }

  /**
   * 获取验证器状态信息
   */
  getValidatorInfo() {
    return {
      supportedDataTypes: Object.values(DATA_TYPES),
      customValidatorsCount: this.customValidators.size,
      customValidatorNames: Array.from(this.customValidators.keys()),
      debugMode: this.debugMode
    }
  }
}

// 创建单例实例
const dataValidator = new DataValidator()

// 开发环境调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__dataValidator = dataValidator
}

export default dataValidator

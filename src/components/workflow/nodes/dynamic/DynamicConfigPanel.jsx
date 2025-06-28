// ===== src/components/workflow/DynamicConfigPanel.jsx - 通用配置面板组件 =====
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'

/**
 * 通用动态配置面板组件 - 基于配置自动生成表单
 * 
 * 核心功能：
 * 1. 基于 nodeConfig.fields 自动生成配置表单
 * 2. 实时验证和错误显示
 * 3. 与 DynamicNode 保持数据同步
 * 4. 支持多种字段类型和复杂验证
 * 5. 完整的错误处理和降级保护
 * 
 * 使用方式：
 * <DynamicConfigPanel 
 *   nodeConfig={nodeConfig}
 *   node={selectedNode}
 *   onConfigSave={updateNodeData}
 * />
 */
const DynamicConfigPanel = ({ 
  nodeConfig, 
  node, 
  onConfigSave,
  // 可选的自定义渲染器
  customFieldRenderers = {},
  // 错误处理
  onError = null
}) => {
  // ===== 核心状态管理 =====
  const [fieldValues, setFieldValues] = useState({})
  const [validationErrors, setValidationErrors] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [renderError, setRenderError] = useState(null)
  
  // 🔧 关键修复：添加初始化状态追踪
  const [isInitialized, setIsInitialized] = useState(false)
  const initializationRef = useRef(false)

  // ===== 安全配置解析 =====
  const safeConfig = useMemo(() => {
    try {
      if (!nodeConfig || typeof nodeConfig !== 'object') {
        throw new Error('节点配置缺失或格式错误')
      }

      const {
        type = 'dynamic',
        label = '动态节点',
        icon = '⚙️',
        fields = [],
        validation = {},
        defaultData = {},
        description = ''
      } = nodeConfig

      // 修复：如果没有直接的fields，从jsonConfig中获取
      const actualFields = fields.length > 0 ? fields : (nodeConfig?.jsonConfig?.fields || [])
      const actualValidation = Object.keys(validation).length > 0 ? validation : (nodeConfig?.jsonConfig?.data?.validation || {})
      const actualDefaultData = Object.keys(defaultData).length > 0 ? defaultData : (nodeConfig?.jsonConfig?.data?.defaultData || {})

      // 验证字段配置
      if (!Array.isArray(actualFields)) {
        throw new Error('字段配置必须是数组')
      }

      actualFields.forEach((field, index) => {
        if (!field.name) {
          throw new Error(`字段 ${index} 缺少 name 属性`)
        }
        if (!field.type) {
          throw new Error(`字段 ${field.name} 缺少 type 属性`)
        }
      })

      return {
        type,
        label,
        icon,
        fields: actualFields,
        validation: actualValidation,
        defaultData: actualDefaultData,
        description
      }
    } catch (error) {
      console.error('[DynamicConfigPanel] 配置解析失败:', error)
      setRenderError(error.message)
      
      return {
        type: 'error',
        label: '配置错误',
        icon: '❌',
        fields: [],
        validation: {},
        defaultData: {},
        description: '节点配置解析失败'
      }
    }
  }, [nodeConfig])

  // 🔧 关键修复：节点数据同步优化 - 只在节点ID变化时初始化
  useEffect(() => {
    // 防止重复初始化
    if (!node?.id || initializationRef.current === node.id) {
      return
    }
    
    console.log('[DynamicConfigPanel] 初始化节点数据:', node.id)
    
    const initializeFromNode = () => {
      const initialValues = {}
      
      // 优先级：节点数据 > 字段默认值 > 配置默认数据
      Object.assign(initialValues, safeConfig.defaultData)
      
      safeConfig.fields.forEach(field => {
        if (node.data?.[field.name] !== undefined) {
          initialValues[field.name] = node.data[field.name]
        } else if (field.defaultValue !== undefined) {
          initialValues[field.name] = field.defaultValue
        }
      })
      
      setFieldValues(initialValues)
      setHasChanges(false)
      setValidationErrors({})
      setIsInitialized(true)
      
      // 记录当前初始化的节点ID
      initializationRef.current = node.id
    }
    
    initializeFromNode()
  }, [node?.id]) // 🔧 关键：只依赖节点ID，不依赖 safeConfig

  // 🔧 修复：单独处理配置变化，但不重新初始化
  useEffect(() => {
    if (!isInitialized || !initializationRef.current) return
    
    // 只在已初始化的情况下，处理配置字段的变化
    // 但不重新设置 fieldValues，避免丢失用户输入
    console.log('[DynamicConfigPanel] 配置已更新，但保持用户输入')
  }, [safeConfig.fields.length, isInitialized])

  // ===== 验证系统 =====
  const validateAllFields = useCallback(() => {
    try {
      const errors = {}
      const { validation, fields } = safeConfig

      // 检查必需字段
      if (validation.required && Array.isArray(validation.required)) {
        validation.required.forEach(fieldName => {
          const value = fieldValues[fieldName]
          if (!value || (typeof value === 'string' && !value.trim())) {
            const field = fields.find(f => f.name === fieldName)
            errors[fieldName] = `${field?.label || fieldName} 是必需的`
          }
        })
      }

      // 字段特定验证
      fields.forEach(field => {
        const value = fieldValues[field.name]
        
        // 字段标记为必需
        if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
          errors[field.name] = `${field.label} 是必需的`
          return
        }

        // 跳过空值的其他验证
        if (!value || (typeof value === 'string' && !value.trim())) {
          return
        }

        // 字段级验证规则
        if (field.validation) {
          const fieldValidation = field.validation

          // 最小长度
          if (fieldValidation.minLength && value.length < fieldValidation.minLength) {
            errors[field.name] = `${field.label} 至少需要 ${fieldValidation.minLength} 个字符`
          }

          // 最大长度
          if (fieldValidation.maxLength && value.length > fieldValidation.maxLength) {
            errors[field.name] = `${field.label} 不能超过 ${fieldValidation.maxLength} 个字符`
          }

          // 数字范围验证
          if (field.type === 'number') {
            const numValue = parseFloat(value)
            if (isNaN(numValue)) {
              errors[field.name] = `${field.label} 必须是有效数字`
            } else {
              if (fieldValidation.min !== undefined && numValue < fieldValidation.min) {
                errors[field.name] = `${field.label} 不能小于 ${fieldValidation.min}`
              }
              if (fieldValidation.max !== undefined && numValue > fieldValidation.max) {
                errors[field.name] = `${field.label} 不能大于 ${fieldValidation.max}`
              }
            }
          }

          // 正则表达式验证
          if (fieldValidation.pattern) {
            try {
              const regex = new RegExp(fieldValidation.pattern)
              if (!regex.test(value)) {
                errors[field.name] = fieldValidation.message || `${field.label} 格式不正确`
              }
            } catch (e) {
              console.warn(`[DynamicConfigPanel] 无效的正则表达式: ${fieldValidation.pattern}`)
            }
          }

          // 自定义验证函数
          if (fieldValidation.customValidator && typeof fieldValidation.customValidator === 'function') {
            try {
              const result = fieldValidation.customValidator(value, fieldValues)
              if (result && !result.valid) {
                errors[field.name] = result.message || `${field.label} 验证失败`
              }
            } catch (e) {
              console.warn(`[DynamicConfigPanel] 字段 ${field.name} 自定义验证失败:`, e)
            }
          }
        }
      })

      // 全局自定义验证
      if (validation.customValidator && typeof validation.customValidator === 'function') {
        try {
          const globalResult = validation.customValidator(fieldValues)
          if (globalResult && !globalResult.valid && globalResult.errors) {
            if (Array.isArray(globalResult.errors)) {
              globalResult.errors.forEach((error, index) => {
                errors[`global_${index}`] = error
              })
            } else if (typeof globalResult.errors === 'object') {
              Object.assign(errors, globalResult.errors)
            }
          }
        } catch (e) {
          console.warn('[DynamicConfigPanel] 全局验证失败:', e)
          errors.global = '配置验证失败'
        }
      }

      setValidationErrors(errors)
      return Object.keys(errors).length === 0
    } catch (error) {
      console.error('[DynamicConfigPanel] 验证过程失败:', error)
      setValidationErrors({ system: '验证系统错误' })
      return false
    }
  }, [fieldValues, safeConfig])

  // ===== 字段值变化处理 =====
  const handleFieldChange = useCallback((fieldName, newValue) => {
    console.log('[DynamicConfigPanel] 字段值变化:', fieldName, newValue)
    
    // 🔧 关键修复：简化状态更新逻辑
    setFieldValues(prev => {
      const updated = { ...prev, [fieldName]: newValue }
      
      // 🔧 延迟检查变化状态，避免在状态更新过程中触发其他更新
      setTimeout(() => {
        // 检查是否有变化（基于原始节点数据）
        const hasChanged = safeConfig.fields.some(field => {
          const originalValue = node?.data?.[field.name]
          const currentValue = updated[field.name]
          return originalValue !== currentValue
        })
        
        setHasChanges(hasChanged)
      }, 0)
      
      return updated
    })

    // 🔧 优化：延迟清除验证错误
    setTimeout(() => {
      setValidationErrors(prev => {
        if (prev[fieldName]) {
          const { [fieldName]: _, ...newErrors } = prev
          return newErrors
        }
        return prev
      })
    }, 200)
  }, [node?.data, safeConfig.fields]) // 🔧 关键修复：移除 validationErrors 依赖

  // 🔧 优化：防抖验证，减少验证频率
  const debouncedValidationRef = useRef()
  useEffect(() => {
    if (Object.keys(fieldValues).length === 0 || !isInitialized) return
    
    // 清除之前的定时器
    if (debouncedValidationRef.current) {
      clearTimeout(debouncedValidationRef.current)
    }
    
    // 设置新的防抖验证
    debouncedValidationRef.current = setTimeout(() => {
      validateAllFields()
    }, 300) // 减少防抖延迟
    
    // 清理函数
    return () => {
      if (debouncedValidationRef.current) {
        clearTimeout(debouncedValidationRef.current)
      }
    }
  }, [fieldValues, validateAllFields, isInitialized])

  // ===== 保存配置 =====
  const handleSave = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // 验证所有字段
      const isValid = validateAllFields()
      
      if (!isValid) {
        console.warn('[DynamicConfigPanel] 验证失败，无法保存')
        return
      }

      // 准备保存数据
      const configData = { ...fieldValues }
      
      // 🔧 关键修复：确保 onConfigSave 稳定调用
      if (onConfigSave && node?.id) {
        console.log('[DynamicConfigPanel] 保存配置:', configData)
        await onConfigSave(node.id, configData)
        setHasChanges(false)
        setLastSaved(new Date().toLocaleTimeString())
        console.log(`[DynamicConfigPanel] 配置已保存:`, configData)
      }
    } catch (error) {
      console.error('[DynamicConfigPanel] 保存失败:', error)
      if (onError) {
        onError(error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [fieldValues, validateAllFields, onConfigSave, node?.id, onError])

  // ===== 取消更改 =====
  const handleCancel = useCallback(() => {
    // 恢复到节点原始数据
    const originalValues = {}
    
    safeConfig.fields.forEach(field => {
      if (node?.data?.[field.name] !== undefined) {
        originalValues[field.name] = node.data[field.name]
      } else if (field.defaultValue !== undefined) {
        originalValues[field.name] = field.defaultValue
      }
    })
    
    setFieldValues(originalValues)
    setHasChanges(false)
    setValidationErrors({})
  }, [node?.data, safeConfig.fields])

  // ===== 重置为默认值 =====
  const handleReset = useCallback(() => {
    const defaultValues = {}
    
    // 使用字段默认值和配置默认值
    Object.assign(defaultValues, safeConfig.defaultData)
    safeConfig.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultValues[field.name] = field.defaultValue
      }
    })
    
    setFieldValues(defaultValues)
    setValidationErrors({})
  }, [safeConfig])

  // ===== 字段条件显示逻辑 =====
  const shouldShowField = useCallback((field) => {
    // 🔧 修复：简化条件逻辑，先显示所有字段进行测试
    if (safeConfig.type === 'media-input') {
      const inputType = fieldValues.inputType || safeConfig.defaultData?.inputType || 'file'
      
      // 只有特定字段需要条件显示，其他都显示
      switch (field.name) {
        case 'mediaFile':
          return inputType === 'file'
        case 'textInput':
          return inputType === 'text'  
        case 'urlInput':
          return inputType === 'url'
        case 'inputType':
        case 'mediaType':
        case 'enablePreview':
        case 'outputFormat':
          return true // 这些字段始终显示
        default:
          return true // 默认显示所有字段
      }
    }
    
    return true // 非 media-input 节点显示所有字段
  }, [fieldValues.inputType, safeConfig.type, safeConfig.defaultData])

  // ===== 过滤需要显示的字段 =====
  const visibleFields = useMemo(() => {
    // 🔧 临时修复：显示所有字段，避免过滤导致的问题
    return safeConfig.fields
    
    // TODO: 稍后启用条件过滤
    // return safeConfig.fields.filter(shouldShowField)
  }, [safeConfig.fields]) // 🔧 移除 shouldShowField 依赖，避免循环
  const renderField = useCallback((field) => {
    try {
      const value = fieldValues[field.name] || ''
      const error = validationErrors[field.name]
      const fieldId = `field-${field.name}`

      // 检查是否有自定义渲染器
      if (customFieldRenderers[field.type]) {
        return customFieldRenderers[field.type]({
          field,
          value,
          error,
          onChange: (newValue) => handleFieldChange(field.name, newValue),
          fieldId
        })
      }

      // 通用字段容器
      const FieldContainer = ({ children }) => (
        <div key={field.name} className="mb-4">
          <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}
            {(field.required || (safeConfig.validation.required && safeConfig.validation.required.includes(field.name))) && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          {children}
          {field.description && (
            <div className="text-xs text-gray-500 mt-1">{field.description}</div>
          )}
          {error && (
            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}
        </div>
      )

      // 根据字段类型渲染
      switch (field.type) {
        case 'text':
          return (
            <FieldContainer>
              <input
                key={`input-${field.name}-${node?.id}`} // 🔧 关键修复：稳定的key
                id={fieldId}
                type="text"
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                  error 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </FieldContainer>
          )

        case 'textarea':
          return (
            <FieldContainer>
              <textarea
                key={`textarea-${field.name}-${node?.id}`} // 🔧 关键修复：稳定的key
                id={fieldId}
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                rows={field.rows || 3}
                className={`w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 transition-colors ${
                  error 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                <span>字符数: {value.length}</span>
                {field.validation?.maxLength && (
                  <span className={value.length > field.validation.maxLength ? 'text-red-500' : ''}>
                    最多 {field.validation.maxLength} 字符
                  </span>
                )}
              </div>
            </FieldContainer>
          )

        case 'number':
          return (
            <FieldContainer>
              <input
                key={`number-${field.name}-${node?.id}`} // 🔧 关键修复：稳定的key
                id={fieldId}
                type="number"
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                min={field.validation?.min}
                max={field.validation?.max}
                step={field.step || 'any'}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                  error 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </FieldContainer>
          )

        case 'select':
          return (
            <FieldContainer>
              <select
                id={fieldId}
                value={value}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                disabled={field.disabled}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                  error 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">{field.placeholder || `请选择${field.label}`}</option>
                {field.options?.map(option => {
                  const optionValue = typeof option === 'string' ? option : option.value
                  const optionLabel = typeof option === 'string' ? option : option.label
                  return (
                    <option key={optionValue} value={optionValue}>
                      {optionLabel}
                    </option>
                  )
                })}
              </select>
            </FieldContainer>
          )

        case 'checkbox':
          return (
            <FieldContainer>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id={fieldId}
                  type="checkbox"
                  checked={!!value}
                  onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                  disabled={field.disabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{field.checkboxLabel || field.label}</span>
              </label>
            </FieldContainer>
          )

        case 'radio':
          return (
            <FieldContainer>
              <div className="space-y-2">
                {field.options?.map(option => {
                  const optionValue = typeof option === 'string' ? option : option.value
                  const optionLabel = typeof option === 'string' ? option : option.label
                  return (
                    <label key={optionValue} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={fieldId}
                        value={optionValue}
                        checked={value === optionValue}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        disabled={field.disabled}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{optionLabel}</span>
                    </label>
                  )
                })}
              </div>
            </FieldContainer>
          )

       case 'range':
          return (
            <FieldContainer>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">
                    当前值: {value || field.defaultValue || field.validation?.min || 0}
                  </span>
                  <span className="text-xs text-gray-500">
                    {field.validation?.min || 0} - {field.validation?.max || 100}
                  </span>
                </div>
                <input
                  id={fieldId}
                  type="range"
                  value={value || field.defaultValue || field.validation?.min || 0}
                  onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value))}
                  min={field.validation?.min || 0}
                  max={field.validation?.max || 100}
                  step={field.step || 1}
                  disabled={field.disabled}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>低 ({field.validation?.min || 0})</span>
                  <span>高 ({field.validation?.max || 100})</span>
                </div>
              </div>
            </FieldContainer>
          )

        case 'image':
          return (
            <FieldContainer>
              <input
                id={fieldId}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    handleFieldChange(field.name, URL.createObjectURL(file))
                  }
                }}
                disabled={field.disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {value && (
                <div className="mt-2">
                  <img 
                    src={value} 
                    alt="预览" 
                    className="max-w-32 max-h-32 object-cover rounded border border-gray-200 shadow-sm" 
                  />
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                支持 JPG、PNG、GIF 等图片格式
              </div>
            </FieldContainer>
          )

        case 'audio':
          return (
            <FieldContainer>
              <input
                id={fieldId}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    handleFieldChange(field.name, URL.createObjectURL(file))
                  }
                }}
                disabled={field.disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {value && (
                <div className="mt-2">
                  <audio controls className="w-full">
                    <source src={value} />
                    您的浏览器不支持音频播放
                  </audio>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                支持 MP3、WAV、OGG 等音频格式
              </div>
            </FieldContainer>
          )

        case 'video':
          return (
            <FieldContainer>
              <input
                id={fieldId}
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    handleFieldChange(field.name, URL.createObjectURL(file))
                  }
                }}
                disabled={field.disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {value && (
                <div className="mt-2">
                  <video controls className="max-w-64 max-h-32 rounded border border-gray-200">
                    <source src={value} />
                    您的浏览器不支持视频播放
                  </video>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                支持 MP4、WebM、OGV 等视频格式
              </div>
            </FieldContainer>
          )
        
        case 'url':
                return (
                  <FieldContainer>
                    <input
                      id={fieldId}
                      type="url"
                      value={value}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                        error 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                  </FieldContainer>
                )
        case 'file':
          return (
            <FieldContainer>
              <input
                id={fieldId}
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    handleFieldChange(field.name, file.name)
                  }
                }}
                disabled={field.disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {value && (
                <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">📎</span>
                    <span className="text-sm text-gray-800 truncate">{value}</span>
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                支持各种文件格式
              </div>
            </FieldContainer>
          )
        case 'date':
  return (
    <FieldContainer>
      <input
        id={fieldId}
        type="date"
        value={value}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        disabled={field.disabled}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
          error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
        } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
    </FieldContainer>
  )

      case 'time':
        return (
          <FieldContainer>
            <input
              id={fieldId}
              type="time"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={field.disabled}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                error 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </FieldContainer>
        )

      case 'datetime':
        return (
          <FieldContainer>
            <input
              id={fieldId}
              type="datetime-local"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={field.disabled}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                error 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </FieldContainer>
        )

      case 'color':
        return (
          <FieldContainer>
            <div className="flex gap-2">
              <input
                id={fieldId}
                type="color"
                value={value || '#000000'}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                disabled={field.disabled}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={value || '#000000'}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder="#000000"
                disabled={field.disabled}
                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                  error 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              点击色块选择颜色，或直接输入十六进制颜色值
            </div>
          </FieldContainer>
        )

      case 'email':
        return (
          <FieldContainer>
            <input
              id={fieldId}
              type="email"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder || '请输入邮箱地址'}
              disabled={field.disabled}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                error 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </FieldContainer>
        )

        default:
          return (
            <FieldContainer>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  不支持的字段类型: <code>{field.type}</code>
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  请使用自定义字段渲染器或更新字段类型
                </div>
              </div>
            </FieldContainer>
          )
      }
    } catch (error) {
      console.error(`[DynamicConfigPanel] 字段渲染失败 ${field.name}:`, error)
      return (
        <div key={field.name} className="mb-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800">字段渲染错误: {field.name}</div>
            <div className="text-xs text-red-600 mt-1">{error.message}</div>
          </div>
        </div>
      )
    }
  }, [fieldValues, validationErrors, handleFieldChange, customFieldRenderers, safeConfig])

  // ===== 错误状态渲染 =====
  if (renderError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white text-lg">❌</div>
          <div>
            <h4 className="font-semibold text-gray-900">配置面板错误</h4>
            <div className="text-xs text-gray-500">动态配置解析失败</div>
          </div>
        </div>
        
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm font-medium text-red-800 mb-2">渲染错误</div>
          <div className="text-sm text-red-700">{renderError}</div>
        </div>
        
        <div className="text-sm text-gray-600">
          请检查节点配置是否正确，或联系开发人员解决此问题。
        </div>
      </div>
    )
  }

  // ===== 主渲染 =====
  return (
    <div className="space-y-4">
     {/* 配置头部 */}
   <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-lg">
    {safeConfig.icon}
  </div>
  <div>
    <h4 className="font-semibold text-gray-900">{safeConfig.label}配置</h4>
    <div className="text-xs text-gray-500">第 {(node?.data?.nodeIndex || 0) + 1} 步</div>
  </div>
    </div>

      {/* 配置状态指示 */}
      <div className={`p-3 rounded-lg border ${
        Object.keys(validationErrors).length === 0 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            Object.keys(validationErrors).length === 0 ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <div className={`text-sm font-medium ${
            Object.keys(validationErrors).length === 0 ? 'text-green-700' : 'text-yellow-700'
          }`}>
            {Object.keys(validationErrors).length === 0 ? '✅ 配置完整' : '⚠️ 需要完善配置'}
          </div>
        </div>
        {lastSaved && (
          <div className="text-xs text-green-600 mt-1">
            最后保存: {lastSaved}
          </div>
        )}
      </div>

      {/* 节点描述 */}
      {safeConfig.description && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">{safeConfig.description}</div>
        </div>
      )}

      {/* 配置字段 */}
      <div className="space-y-0 max-h-80 overflow-y-auto">
        {safeConfig.fields.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-lg mb-2">📝</div>
            <div className="text-sm">此节点无需额外配置</div>
          </div>
        ) : (
          safeConfig.fields.map((field, index) => (
            <div key={`field-wrapper-${field.name}-${index}`}>
              {renderField(field)}
            </div>
          ))
        )}
      </div>

      {/* 全局错误显示 */}
      {Object.keys(validationErrors).some(key => key.startsWith('global')) && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-sm font-medium text-red-800 mb-2">配置错误</div>
          {Object.entries(validationErrors)
            .filter(([key]) => key.startsWith('global'))
            .map(([key, error]) => (
              <div key={key} className="text-sm text-red-700">• {error}</div>
            ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button 
            onClick={handleSave}
            disabled={!hasChanges || isLoading || Object.keys(validationErrors).length > 0}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              <>💾 保存配置</>
            )}
          </button>
          <button 
            onClick={handleCancel}
            disabled={!hasChanges || isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          >
            取消
          </button>
        </div>
        
        {safeConfig.fields.length > 0 && (
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 text-sm transition-colors"
          >
            🔄 重置为默认值
          </button>
        )}
      </div>
      
      {hasChanges && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          ⚠️ 有未保存的更改
        </div>
      )}

      {/* 调试信息（仅开发环境） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">调试信息</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>节点类型: {safeConfig.type}</div>
            <div>字段数量: {safeConfig.fields.length}</div>
            <div>字段列表: {safeConfig.fields.map(f => f.name).join(', ')}</div>
            <div>验证错误: {Object.keys(validationErrors).length}</div>
            <div>有未保存更改: {hasChanges ? '是' : '否'}</div>
            <div>初始化状态: {isInitialized ? '已初始化' : '未初始化'}</div>
            <div>当前节点ID: {initializationRef.current}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DynamicConfigPanel

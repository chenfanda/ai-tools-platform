// ===== 增强版 DynamicConfigPanel.jsx - 完整迁移 UnifiedConfigPanel 功能 =====
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'

// 导入统一接口层（迁移自 UnifiedConfigPanel）
import unifiedNodeManager from '../../../../services/workflow/UnifiedNodeManager'
import StandardDataModel from '../../../../services/workflow/StandardDataModel'

/**
 * 增强版动态配置面板 - 完全迁移 UnifiedConfigPanel 的键盘/鼠标分离功能
 * 
 * 核心功能：
 * 🎹 键盘输入：只操作 DOM 和 ref，零状态更新，零重新渲染
 * 🖱️ 鼠标操作：才进行状态更新、验证、保存
 * 🔧 统一节点管理：支持 legacy 和 dynamic 两种节点类型
 * 📋 完整表单支持：支持所有字段类型和复杂验证
 * ⚡ 高性能缓存：智能配置解析和缓存机制
 */
const DynamicConfigPanel = ({ 
  // 标准参数
  nodeConfig = null, 
  node = null, 
  onConfigSave = null,
  onError = null,
  customFieldRenderers = {},
  
  // 🔧 新增：兼容 UnifiedConfigPanel 的参数
  enableUnifiedMode = false  // 是否启用统一节点管理模式
}) => {
  
  // ===== 🔧 双重状态管理：支持两种模式 =====
  
  // 标准模式状态（保持向后兼容）
  const [standardFieldValues, setStandardFieldValues] = useState({})
  const [standardValidationErrors, setStandardValidationErrors] = useState({})
  const [standardHasChanges, setStandardHasChanges] = useState(false)
  
  // 🎹 键盘/鼠标分离模式状态（迁移自 UnifiedConfigPanel）
  const [configData, setConfigData] = useState({})          // 鼠标操作时更新
  const [validationErrors, setValidationErrors] = useState({})  // 只在保存时更新
  const [hasChanges, setHasChanges] = useState(false)       // 只在鼠标操作时更新
  
  // 🎹 键盘输入：全部存储在 ref 中，不触发任何状态更新
  const inputValuesRef = useRef({})                         // 键盘输入的即时值
  const fieldsRef = useRef([])                              // 字段定义缓存
  const initialValuesRef = useRef({})                       // 初始值，用于检测变化
  
  // 共用状态
  const [lastSaved, setLastSaved] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [renderError, setRenderError] = useState(null)
  
  // 🔧 统一节点管理相关状态
  const [isInitialized, setIsInitialized] = useState(false)
  const initializationRef = useRef(null)
  const configCacheRef = useRef(new Map())

  // ===== 🔧 配置解析：支持统一节点管理模式 =====
  
  const resolvedConfig = useMemo(() => {
    if (enableUnifiedMode && node) {
      // 🔧 使用 UnifiedConfigPanel 的配置解析逻辑
      return resolveUnifiedNodeConfig(node, configCacheRef)
    } else if (nodeConfig) {
      // 保持现有的 DynamicConfigPanel 配置解析
      return resolveDynamicConfig(nodeConfig)
    } else {
      return {
        valid: false,
        error: '缺少配置数据',
        fields: [],
        validation: { required: [], rules: {} }
      }
    }
  }, [enableUnifiedMode, node?.id, node?.type, nodeConfig])

  // ===== 🔧 初始化：支持两种模式 =====
  
  useEffect(() => {
    if (!resolvedConfig.valid) {
      return
    }

    if (enableUnifiedMode) {
      // 🎹 键盘/鼠标分离模式的初始化
      if (!node?.id || initializationRef.current === node.id) {
        return
      }
      
      console.log(`[DynamicConfigPanel] 统一模式初始化: ${node.id}`)
      initializeUnifiedMode()
    } else {
      // 保持现有的标准初始化
      console.log('[DynamicConfigPanel] 标准模式初始化')
      initializeStandardMode()
    }
  }, [enableUnifiedMode, node?.id, resolvedConfig.valid])

  // ===== 🔧 字段变化处理：双重逻辑 =====
  
  const handleFieldChange = useCallback((fieldName, newValue) => {
    if (enableUnifiedMode) {
      // 🎹 键盘输入：只存储到 ref，零状态更新，零重新渲染
      console.log(`[DynamicConfigPanel] 键盘输入: ${fieldName} =`, newValue)
      inputValuesRef.current[fieldName] = newValue
      // 🔧 关键：不调用任何 setState，不触发重新渲染
    } else {
      // 标准模式：保持现有逻辑
      console.log('[DynamicConfigPanel] 标准输入:', fieldName, newValue)
      setStandardFieldValues(prev => {
        const updated = { ...prev, [fieldName]: newValue }
        
        // 延迟检查变化状态
        setTimeout(() => {
          const hasChanged = Object.keys(updated).some(key => {
            const originalValue = node?.data?.[key]
            const currentValue = updated[key]
            return originalValue !== currentValue
          })
          setStandardHasChanges(hasChanged)
        }, 0)
        
        return updated
      })

      // 延迟清除验证错误
      setTimeout(() => {
        setStandardValidationErrors(prev => {
          if (prev[fieldName]) {
            const { [fieldName]: _, ...newErrors } = prev
            return newErrors
          }
          return prev
        })
      }, 200)
    }
  }, [enableUnifiedMode, node?.data])

  // ===== 🖱️ 鼠标操作处理：键盘/鼠标分离模式专用 =====
  
  const checkForChanges = useCallback(() => {
    if (!enableUnifiedMode) return
    
    // 比较当前输入值和初始值
    const hasChangedFields = fieldsRef.current.some(field => {
      const currentValue = inputValuesRef.current[field.name]
      const initialValue = initialValuesRef.current[field.name]
      return currentValue !== initialValue
    })
    
    setHasChanges(hasChangedFields)
  }, [enableUnifiedMode])

  const handleFieldBlur = useCallback(() => {
    if (enableUnifiedMode) {
      // 🖱️ 鼠标操作：触发变化检测
      checkForChanges()
    }
  }, [enableUnifiedMode, checkForChanges])

  const handleFieldFocus = useCallback(() => {
    if (enableUnifiedMode) {
      // 聚焦时也检测变化
      checkForChanges()
    }
  }, [enableUnifiedMode, checkForChanges])

  // ===== 🔧 验证系统：支持两种模式 =====
  
  const validateAllFields = useCallback(() => {
    try {
      const errors = {}
      const currentValues = enableUnifiedMode ? inputValuesRef.current : standardFieldValues
      const { validation, fields } = resolvedConfig

      // 检查必需字段
      if (validation.required && Array.isArray(validation.required)) {
        validation.required.forEach(fieldName => {
          const value = currentValues[fieldName]
          if (!value || (typeof value === 'string' && !value.trim())) {
            const field = fields.find(f => f.name === fieldName)
            errors[fieldName] = `${field?.label || fieldName} 是必需的`
          }
        })
      }

      // 字段特定验证
      fields.forEach(field => {
        const value = currentValues[field.name]
        
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
          const fieldErrors = validateFieldValue(value, field)
          if (fieldErrors.length > 0) {
            errors[field.name] = fieldErrors[0]
          }
        }
        
        // 规则验证
        if (validation.rules && validation.rules[field.name]) {
          const rule = validation.rules[field.name]
          const ruleErrors = validateFieldRule(value, rule, field)
          if (ruleErrors.length > 0) {
            errors[field.name] = ruleErrors[0]
          }
        }
      })

      // 全局自定义验证
      if (validation.customValidator && typeof validation.customValidator === 'function') {
        try {
          const globalResult = validation.customValidator(currentValues)
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

      if (enableUnifiedMode) {
        setValidationErrors(errors)
      } else {
        setStandardValidationErrors(errors)
      }
      
      return Object.keys(errors).length === 0
    } catch (error) {
      console.error('[DynamicConfigPanel] 验证过程失败:', error)
      if (enableUnifiedMode) {
        setValidationErrors({ system: '验证系统错误' })
      } else {
        setStandardValidationErrors({ system: '验证系统错误' })
      }
      return false
    }
  }, [enableUnifiedMode, standardFieldValues, resolvedConfig])

  // ===== 🔧 输入属性生成器 =====
  
  const generateInputProps = useCallback((field, value) => {
    const currentErrors = enableUnifiedMode ? validationErrors : standardValidationErrors
    const hasError = Boolean(currentErrors[field.name])
    
    const baseProps = {
      id: `field-${field.name}`,
      placeholder: field.placeholder,
      disabled: field.disabled,
      className: `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
        hasError
          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
      } ${field.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`
    }

    if (enableUnifiedMode) {
      // 🎹 键盘/鼠标分离模式：不受控组件
      return {
        ...baseProps,
        defaultValue: value || '',
        onChange: (e) => handleFieldChange(field.name, e.target.value),
        onBlur: handleFieldBlur,
        onFocus: handleFieldFocus,
      }
    } else {
      // 🖱️ 标准模式：受控组件（保持现有逻辑）
      return {
        ...baseProps,
        value: value || '',
        onChange: (e) => handleFieldChange(field.name, e.target.value)
      }
    }
  }, [enableUnifiedMode, validationErrors, standardValidationErrors, handleFieldChange, handleFieldBlur, handleFieldFocus])

  // ===== 💾 保存配置 =====
  
  const handleSave = useCallback(async () => {
    if (!onConfigSave || !node?.id) {
      console.warn('[DynamicConfigPanel] 缺少保存回调或节点ID')
      return
    }

    setIsLoading(true)
    
    try {
      let finalConfigData
      
      if (enableUnifiedMode) {
        // 🔧 现在才从 ref 中获取最新值
        finalConfigData = { 
          ...inputValuesRef.current,
          _userSaved: true,
          _savedAt: new Date().toISOString()
        }
        
        console.log(`[DynamicConfigPanel] 统一模式保存: ${node.id}`, finalConfigData)

        // 🔧 只在保存时进行验证
        const isValid = validateAllFields()
        if (!isValid) {
          console.warn('[DynamicConfigPanel] 验证失败，无法保存')
          return
        }

        // 🔧 保存成功，同步状态
        setConfigData(finalConfigData)
        initialValuesRef.current = { ...finalConfigData }
        setHasChanges(false)
        
      } else {
        // 标准模式：使用现有逻辑
        finalConfigData = { 
          ...standardFieldValues,
          _userSaved: true,
          _savedAt: new Date().toISOString()
        }
        
        const isValid = validateAllFields()
        if (!isValid) {
          console.warn('[DynamicConfigPanel] 验证失败，无法保存')
          return
        }
        
        setStandardHasChanges(false)
      }

      await onConfigSave(node.id, finalConfigData)
      
      // 🔧 清除状态缓存
     if (enableUnifiedMode) {
      try {
        const { default: nodeStatusCalculator } = await import('../../../../services/workflow/NodeStatusCalculator')
        nodeStatusCalculator.clearCache()
        console.log('[DynamicConfigPanel] 统一模式状态缓存已清除')
      } catch (error) {
        console.warn('[DynamicConfigPanel] 清除缓存失败:', error)
      }
    }
      
      setValidationErrors({})
      setStandardValidationErrors({})
      setLastSaved(new Date().toLocaleTimeString())
      console.log(`[DynamicConfigPanel] 配置保存成功`)

    } catch (error) {
      console.error(`[DynamicConfigPanel] 保存失败: ${error.message}`)
      if (onError) {
        onError(error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [enableUnifiedMode, standardFieldValues, onConfigSave, node?.id, validateAllFields, onError])

  // ===== 🔄 重置配置 =====
  
  const handleReset = useCallback(() => {
    if (!resolvedConfig.valid) return

    try {
      const resetConfig = {}
      
      resolvedConfig.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          resetConfig[field.name] = field.defaultValue
        }
      })

      if (enableUnifiedMode) {
        // 🔧 同时重置状态和 ref
        setConfigData(resetConfig)
        inputValuesRef.current = { ...resetConfig }
        initialValuesRef.current = { ...resetConfig }
        
        // 🔧 同时重置 DOM 输入框的值
        resolvedConfig.fields.forEach(field => {
          const inputElement = document.getElementById(`field-${field.name}`)
          if (inputElement) {
            if (inputElement.type === 'checkbox') {
              inputElement.checked = Boolean(resetConfig[field.name])
            } else {
              inputElement.value = resetConfig[field.name] || ''
            }
          }
        })
        
        setHasChanges(false)
        setValidationErrors({})
      } else {
        setStandardFieldValues(resetConfig)
        setStandardHasChanges(false)
        setStandardValidationErrors({})
      }
      
      console.log(`[DynamicConfigPanel] 配置已重置`)

    } catch (error) {
      console.error(`[DynamicConfigPanel] 重置失败: ${error.message}`)
    }
  }, [enableUnifiedMode, resolvedConfig])

  // ===== 📋 字段渲染 =====
  
  const renderField = useCallback((field) => {
    try {
      const currentValues = enableUnifiedMode ? inputValuesRef.current : standardFieldValues
      const currentErrors = enableUnifiedMode ? validationErrors : standardValidationErrors
      
      const value = currentValues[field.name] || ''
      const error = currentErrors[field.name]
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
            {(field.required || (resolvedConfig.validation?.required && resolvedConfig.validation.required.includes(field.name))) && (
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

      // 🔧 生成输入属性
      const inputProps = generateInputProps(field, value)

      // 根据字段类型渲染
      switch (field.type) {
        case 'text':
          return (
            <FieldContainer>
              <input
                key={`input-${field.name}-${node?.id}`}
                type="text"
                {...inputProps}
              />
            </FieldContainer>
          )

        case 'textarea':
          return (
            <FieldContainer>
              <textarea
                key={`textarea-${field.name}-${node?.id}`}
                rows={field.rows || 3}
                {...inputProps}
                className={`${inputProps.className} resize-none`}
              />
              <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                <span>字符数: {(value || '').length}</span>
                {field.validation?.maxLength && (
                  <span className={(value || '').length > field.validation.maxLength ? 'text-red-500' : ''}>
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
                key={`number-${field.name}-${node?.id}`}
                type="number"
                min={field.validation?.min}
                max={field.validation?.max}
                step={field.step || 'any'}
                {...inputProps}
              />
            </FieldContainer>
          )

        case 'select':
          return (
            <FieldContainer>
              <select
                {...inputProps}
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
                  defaultChecked={enableUnifiedMode ? Boolean(value) : undefined}
                  checked={enableUnifiedMode ? undefined : Boolean(value)}
                  onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                  onBlur={enableUnifiedMode ? handleFieldBlur : undefined}
                  onFocus={enableUnifiedMode ? handleFieldFocus : undefined}
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
                        defaultChecked={enableUnifiedMode ? (value === optionValue) : undefined}
                        checked={enableUnifiedMode ? undefined : (value === optionValue)}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        onBlur={enableUnifiedMode ? handleFieldBlur : undefined}
                        onFocus={enableUnifiedMode ? handleFieldFocus : undefined}
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
                  defaultValue={enableUnifiedMode ? (value || field.defaultValue || field.validation?.min || 0) : undefined}
                  value={enableUnifiedMode ? undefined : (value || field.defaultValue || field.validation?.min || 0)}
                  onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value))}
                  onBlur={enableUnifiedMode ? handleFieldBlur : undefined}
                  onFocus={enableUnifiedMode ? handleFieldFocus : undefined}
                  min={field.validation?.min || 0}
                  max={field.validation?.max || 100}
                  step={field.step || 1}
                  disabled={field.disabled}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
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
                    handleFieldChange(field.name, file)
                  }
                }}
                onBlur={enableUnifiedMode ? handleFieldBlur : undefined}
                onFocus={enableUnifiedMode ? handleFieldFocus : undefined}
                accept={field.accept}
                disabled={field.disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {value && (
                <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">📎</span>
                    <span className="text-sm text-gray-800 truncate">
                      {value instanceof File ? value.name : value}
                    </span>
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {field.accept ? `支持格式: ${field.accept}` : '支持各种文件格式'}
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
                    handleFieldChange(field.name, file)
                  }
                }}
                onBlur={enableUnifiedMode ? handleFieldBlur : undefined}
                onFocus={enableUnifiedMode ? handleFieldFocus : undefined}
                disabled={field.disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {value && (
                <div className="mt-2">
                  <img 
                    src={value instanceof File ? URL.createObjectURL(value) : value}
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
                    handleFieldChange(field.name, file)
                  }
                }}
                onBlur={enableUnifiedMode ? handleFieldBlur : undefined}
                onFocus={enableUnifiedMode ? handleFieldFocus : undefined}
                disabled={field.disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {value && (
                <div className="mt-2">
                  <audio controls className="w-full">
                    <source src={value instanceof File ? URL.createObjectURL(value) : value} />
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
                    handleFieldChange(field.name, file)
                  }
                }}
                onBlur={enableUnifiedMode ? handleFieldBlur : undefined}
                onFocus={enableUnifiedMode ? handleFieldFocus : undefined}
                disabled={field.disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {value && (
                <div className="mt-2">
                  <video controls className="max-w-64 max-h-32 rounded border border-gray-200">
                    <source src={value instanceof File ? URL.createObjectURL(value) : value} />
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
                type="url"
                {...inputProps}
              />
            </FieldContainer>
          )

        case 'date':
          return (
            <FieldContainer>
              <input
                type="date"
                {...inputProps}
              />
            </FieldContainer>
          )

        case 'time':
          return (
            <FieldContainer>
              <input
                type="time"
                {...inputProps}
              />
            </FieldContainer>
          )

        case 'datetime':
          return (
            <FieldContainer>
              <input
                type="datetime-local"
                {...inputProps}
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
                  defaultValue={enableUnifiedMode ? (value || '#000000') : undefined}
                  value={enableUnifiedMode ? undefined : (value || '#000000')}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  onBlur={enableUnifiedMode ? handleFieldBlur : undefined}
                  onFocus={enableUnifiedMode ? handleFieldFocus : undefined}
                  disabled={field.disabled}
                  className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  defaultValue={enableUnifiedMode ? (value || '#000000') : undefined}
                  value={enableUnifiedMode ? undefined : (value || '#000000')}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder="#000000"
                  disabled={field.disabled}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                type="email"
                {...inputProps}
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
                  字段名: {field.name}
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
  }, [enableUnifiedMode, standardFieldValues, validationErrors, standardValidationErrors, handleFieldChange, handleFieldBlur, handleFieldFocus, customFieldRenderers, resolvedConfig, generateInputProps, node?.id])

  // ===== 🔧 辅助函数：初始化方法 =====
  
  const initializeUnifiedMode = useCallback(() => {
    try {
      const initialConfig = {}

      // 设置默认值
      resolvedConfig.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialConfig[field.name] = field.defaultValue
        }
      })

      // 从节点数据中提取现有配置
      if (resolvedConfig.source === 'legacy') {
        Object.keys(node.data).forEach(key => {
          if (!isSystemField(key) && node.data[key] !== undefined) {
            initialConfig[key] = node.data[key]
          }
        })
        
        const legacyFieldMap = {
          'text-input': ['text'],
          'tts': ['mode', 'selectedCharacter', 'character', 'username', 'voice_id', 'gender', 'pitch', 'speed'],
          'download': ['autoDownload', 'customFileName', 'downloadFormat', 'showProgress', 'allowRetry']
        }
        
        const nodeFields = legacyFieldMap[node.type] || []
        nodeFields.forEach(fieldName => {
          if (node.data[fieldName] !== undefined) {
            initialConfig[fieldName] = node.data[fieldName]
          }
        })
        
      } else if (resolvedConfig.source === 'dynamic') {
        if (node.data.config) {
          Object.assign(initialConfig, node.data.config)
        }
        resolvedConfig.fields.forEach(field => {
          if (node.data[field.name] !== undefined) {
            initialConfig[field.name] = node.data[field.name]
          }
        })
      }

      const normalizedConfig = normalizeConfigTypes(initialConfig, resolvedConfig.fields)

      // 🔧 关键：同时初始化状态和 ref
      setConfigData(normalizedConfig)
      inputValuesRef.current = { ...normalizedConfig }
      initialValuesRef.current = { ...normalizedConfig }
      fieldsRef.current = [...resolvedConfig.fields]
      
      setValidationErrors({})
      setHasChanges(false)
      setIsInitialized(true)
      initializationRef.current = node.id

      console.log(`[DynamicConfigPanel] 统一模式初始化完成:`, normalizedConfig)

    } catch (error) {
      console.error(`[DynamicConfigPanel] 统一模式初始化失败: ${error.message}`)
      setRenderError(`配置初始化失败: ${error.message}`)
    }
  }, [resolvedConfig, node])

  const initializeStandardMode = useCallback(() => {
    if (!resolvedConfig.valid) return
    
    try {
      const initialValues = {}
      
      // 优先级：节点数据 > 字段默认值 > 配置默认数据
      if (resolvedConfig.defaultData) {
        Object.assign(initialValues, resolvedConfig.defaultData)
      }
      
      resolvedConfig.fields.forEach(field => {
        if (node?.data?.[field.name] !== undefined) {
          initialValues[field.name] = node.data[field.name]
        } else if (field.defaultValue !== undefined) {
          initialValues[field.name] = field.defaultValue
        }
      })
      
      setStandardFieldValues(initialValues)
      setStandardHasChanges(false)
      setStandardValidationErrors({})
      setIsInitialized(true)
      
      console.log('[DynamicConfigPanel] 标准模式初始化完成:', initialValues)
    } catch (error) {
      console.error('[DynamicConfigPanel] 标准模式初始化失败:', error)
      setRenderError(`标准模式初始化失败: ${error.message}`)
    }
  }, [resolvedConfig, node?.data])

  // ===== 🔧 辅助函数：配置解析 =====
  
  function resolveUnifiedNodeConfig(node, configCacheRef) {
    const cacheKey = `${node?.id}-${node?.type}`
    if (configCacheRef.current.has(cacheKey)) {
      return configCacheRef.current.get(cacheKey)
    }

    try {
      if (!node?.id) {
        return {
          valid: false,
          error: '节点数据为空',
          nodeType: 'unknown',
          fields: [],
          validation: { required: [], rules: {} }
        }
      }

      console.log(`[DynamicConfigPanel] 解析统一节点配置: ${node.type}`)

      const configResult = unifiedNodeManager.resolveNodeConfiguration(node, {
        validate: false,
        inputMode: true
      })

      const dataFormat = StandardDataModel.detectDataFormat(node)
      const nodeTypeConfig = unifiedNodeManager.getNodeTypeConfig(node.type)

      let fields = []
      let validation = { required: [], rules: {} }

      if (nodeTypeConfig?._source === 'dynamic' && nodeTypeConfig.fields) {
        fields = nodeTypeConfig.fields
        validation = unifiedNodeManager.configResolver.getDynamicValidationRules(nodeTypeConfig)
      } else if (nodeTypeConfig?._source === 'legacy') {
        fields = generateLegacyFields(node.type, node.data)
        validation = unifiedNodeManager.configResolver.getLegacyValidationRules(node.type)
      }

      const result = {
        valid: true,
        nodeType: node.type,
        dataFormat,
        fields,
        validation,
        nodeTypeConfig,
        source: nodeTypeConfig?._source || 'unknown'
      }

      configCacheRef.current.set(cacheKey, result)
      return result

    } catch (error) {
      console.error(`[DynamicConfigPanel] 统一配置解析失败: ${error.message}`)
      
      return {
        valid: false,
        error: error.message,
        nodeType: node?.type || 'unknown',
        fields: [],
        validation: { required: [], rules: {} }
      }
    }
  }

  function resolveDynamicConfig(nodeConfig) {
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
        valid: true,
        type,
        label,
        icon,
        fields: actualFields,
        validation: actualValidation,
        defaultData: actualDefaultData,
        description
      }
    } catch (error) {
      console.error('[DynamicConfigPanel] 动态配置解析失败:', error)
      
      return {
        valid: false,
        type: 'error',
        label: '配置错误',
        icon: '❌',
        fields: [],
        validation: {},
        defaultData: {},
        description: '节点配置解析失败',
        error: error.message
      }
    }
  }

  // ===== 🔧 辅助函数：工具方法（迁移自 UnifiedConfigPanel） =====
  
  function isSystemField(fieldName) {
    const systemFields = new Set([
      'label', 'nodeType', 'nodeIndex', 'totalNodes', 'config',
      'result', 'isProcessing', 'showAddButton', 'hideTestButton',
      'onDataChange', 'onAddNode', 'onSetProcessor', '_metadata', 'nodeConfig'
    ])
    return systemFields.has(fieldName) || fieldName.startsWith('_') || fieldName.startsWith('on')
  }

  function normalizeConfigTypes(config, fields) {
    const normalized = { ...config }
    
    fields.forEach(field => {
      const value = config[field.name]
      
      if (value !== undefined) {
        switch (field.type) {
          case 'number':
            if (typeof value === 'string' && !isNaN(value)) {
              normalized[field.name] = Number(value)
            }
            break
          case 'boolean':
          case 'checkbox':
            normalized[field.name] = Boolean(value)
            break
        }
      }
    })

    return normalized
  }

  function generateLegacyFields(nodeType, nodeData) {
    const fieldMaps = {
      'text-input': [
        { name: 'text', type: 'textarea', label: '文本内容', required: true, placeholder: '请输入文本内容...' }
      ],
      'tts': [
        { name: 'mode', type: 'select', label: '语音模式', required: true, options: [
          { value: 'character', label: '预设角色' },
          { value: 'custom', label: '自定义声音' }
        ]},
        { name: 'selectedCharacter', type: 'select', label: '选择角色', placeholder: '请选择角色' },
        { name: 'username', type: 'text', label: '用户名', placeholder: 'workflow_user' },
        { name: 'voice_id', type: 'select', label: '语音ID', placeholder: '请选择语音' },
        { name: 'gender', type: 'select', label: '性别', options: [
          { value: '', label: '自动' },
          { value: 'male', label: '男性' },
          { value: 'female', label: '女性' }
        ]},
        { name: 'pitch', type: 'select', label: '音调', options: [
          { value: '', label: '默认' },
          { value: 'very_low', label: '很低' },
          { value: 'low', label: '低' },
          { value: 'moderate', label: '中等' },
          { value: 'high', label: '高' },
          { value: 'very_high', label: '很高' }
        ]},
        { name: 'speed', type: 'select', label: '语速', options: [
          { value: '', label: '默认' },
          { value: 'very_low', label: '很慢' },
          { value: 'low', label: '慢' },
          { value: 'moderate', label: '中等' },
          { value: 'high', label: '快' },
          { value: 'very_high', label: '很快' }
        ]}
      ],
      'download': [
        { name: 'autoDownload', type: 'checkbox', label: '自动下载' },
        { name: 'customFileName', type: 'text', label: '自定义文件名', placeholder: '留空则自动生成' },
        { name: 'downloadFormat', type: 'select', label: '下载格式', options: [
          { value: 'auto', label: '自动检测 (推荐)' },
          { value: 'wav', label: 'WAV 音频' },
          { value: 'mp3', label: 'MP3 音频' },
          { value: 'txt', label: 'TXT 文本' },
          { value: 'json', label: 'JSON 数据' }
        ]},
        { name: 'showProgress', type: 'checkbox', label: '显示下载进度', defaultValue: true },
        { name: 'allowRetry', type: 'checkbox', label: '允许重试下载', defaultValue: true }
      ]
    }

    return fieldMaps[nodeType] || []
  }

  function validateFieldValue(value, field) {
    const errors = []

    if (!field.validation) return errors

    const { minLength, maxLength, pattern, min, max } = field.validation

    if (typeof value === 'string') {
      if (minLength && value.length < minLength) {
        errors.push(`${field.label} 长度不能少于 ${minLength} 个字符`)
      }
      if (maxLength && value.length > maxLength) {
        errors.push(`${field.label} 长度不能超过 ${maxLength} 个字符`)
      }
      if (pattern && !new RegExp(pattern).test(value)) {
        errors.push(field.validation.message || `${field.label} 格式不正确`)
      }
    }

    if (field.type === 'number' && typeof value === 'number') {
      if (min !== undefined && value < min) {
        errors.push(`${field.label} 不能小于 ${min}`)
      }
      if (max !== undefined && value > max) {
        errors.push(`${field.label} 不能大于 ${max}`)
      }
    }

    return errors
  }

  function validateFieldRule(value, rule, field) {
    const errors = []

    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push(`${field.label} 必须是文本类型`)
    } else if (rule.type === 'number' && typeof value !== 'number') {
      errors.push(`${field.label} 必须是数字类型`)
    } else if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${field.label} 的值必须是: ${rule.enum.join(', ')} 中的一个`)
    }

    return errors
  }

  // ===== 渲染：错误状态 =====
  
  if (renderError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white text-lg">❌</div>
          <div>
            <h4 className="font-semibold text-gray-900">配置面板错误</h4>
            <div className="text-xs text-gray-500">{enableUnifiedMode ? '统一模式' : '标准模式'} 解析失败</div>
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

  if (!resolvedConfig.valid) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">❌</span>
            <h4 className="font-medium text-red-800">配置面板错误</h4>
          </div>
          <div className="text-sm text-red-700 mb-3">
            {resolvedConfig.error}
          </div>
          <div className="text-xs text-red-600">
            节点: {node?.type} ({node?.id})
          </div>
        </div>
      </div>
    )
  }

  if (!node && enableUnifiedMode) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="text-3xl mb-3">⚙️</div>
        <div className="text-lg font-medium mb-1">节点配置</div>
        <div className="text-sm">请选择一个节点进行配置</div>
      </div>
    )
  }

  // ===== 主渲染 =====
  
  const currentValues = enableUnifiedMode ? inputValuesRef.current : standardFieldValues
  const currentErrors = enableUnifiedMode ? validationErrors : standardValidationErrors
  const currentHasChanges = enableUnifiedMode ? hasChanges : standardHasChanges

  return (
    <div className="space-y-4">
      {/* 配置头部 */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-lg">
          {enableUnifiedMode 
            ? (resolvedConfig.nodeTypeConfig?.icon || '⚙️')
            : (resolvedConfig.icon || '⚙️')
          }
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">
            {enableUnifiedMode 
              ? (resolvedConfig.nodeTypeConfig?.label || node?.type || '节点')
              : (resolvedConfig.label || '动态节点')
            } 配置
          </h4>
          <div className="text-xs text-gray-500">
            {enableUnifiedMode 
              ? `第 ${(node?.data?.nodeIndex || 0) + 1} 步 • ${resolvedConfig.source} 节点`
              : '动态配置节点'
            }
          </div>
        </div>
      </div>

      {/* 配置状态指示 */}
      <div className={`p-3 rounded-lg border ${
        Object.keys(currentErrors).length === 0 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            Object.keys(currentErrors).length === 0 ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <div className={`text-sm font-medium ${
            Object.keys(currentErrors).length === 0 ? 'text-green-700' : 'text-yellow-700'
          }`}>
            {Object.keys(currentErrors).length === 0 ? '✅ 配置完整' : '⚠️ 需要完善配置'}
          </div>
        </div>
        {lastSaved && (
          <div className="text-xs text-green-600 mt-1">
            最后保存: {lastSaved}
          </div>
        )}
      </div>

      {/* 节点描述 */}
      {resolvedConfig.description && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">{resolvedConfig.description}</div>
        </div>
      )}

      {/* 配置字段 */}
      <div className="space-y-0 max-h-80 overflow-y-auto">
        {resolvedConfig.fields.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-lg mb-2">📝</div>
            <div className="text-sm">此节点无需额外配置</div>
          </div>
        ) : (
          resolvedConfig.fields.map((field, index) => (
            <div key={`field-wrapper-${field.name}-${index}`}>
              {renderField(field)}
            </div>
          ))
        )}
      </div>

      {/* 全局错误显示 */}
      {Object.keys(currentErrors).some(key => key.startsWith('global')) && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-sm font-medium text-red-800 mb-2">配置错误</div>
          {Object.entries(currentErrors)
            .filter(([key]) => key.startsWith('global'))
            .map(([key, error]) => (
              <div key={key} className="text-sm text-red-700">• {error}</div>
            ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="space-y-2 pt-2 border-t border-gray-200">
        <div className="flex gap-2">
          <button 
            onClick={handleSave}
            disabled={isLoading || (Object.keys(currentErrors).length > 0)}
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
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm transition-colors"
          >
            🔄 重置
          </button>
        </div>
      </div>
      
      {currentHasChanges && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          ⚠️ 有未保存的更改
        </div>
      )}

      {/* 开发环境调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">
            🔧 {enableUnifiedMode ? '统一模式 (键盘/鼠标分离)' : '标准模式'}
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>模式: {enableUnifiedMode ? 'Unified Mode' : 'Standard Mode'}</div>
            <div>节点类型: {enableUnifiedMode ? resolvedConfig.nodeType : resolvedConfig.type}</div>
            <div>配置来源: {enableUnifiedMode ? resolvedConfig.source : 'dynamic'}</div>
            <div>字段数量: {resolvedConfig.fields.length}</div>
            <div>验证错误: {Object.keys(currentErrors).length}</div>
            <div>有未保存更改: {currentHasChanges ? '是' : '否'}</div>
            <div>初始化状态: {isInitialized ? '已初始化' : '未初始化'}</div>
            {enableUnifiedMode && (
              <>
                <div>🎹 键盘输入: 存储在 ref 中</div>
                <div>🖱️ 鼠标操作: 触发状态更新</div>
                <div>当前节点ID: {initializationRef.current}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DynamicConfigPanel
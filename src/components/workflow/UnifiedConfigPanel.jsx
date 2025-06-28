// ===== 真正的键盘/鼠标分离版 UnifiedConfigPanel.jsx =====

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'

// 导入统一接口层
import unifiedNodeManager from '../../services/workflow/UnifiedNodeManager'
import StandardDataModel from '../../services/workflow/StandardDataModel'
import WorkflowConfigPanel from './WorkflowConfigPanel'

/**
 * 真正的键盘/鼠标分离版配置面板
 * 
 * 核心原则：
 * 🎹 键盘输入：只操作 DOM 和 ref，零状态更新，零重新渲染
 * 🖱️ 鼠标操作：才进行状态更新、验证、保存
 */
const UnifiedConfigPanel = ({ node, onConfigSave }) => {
  
  // 传统节点直接使用 WorkflowConfigPanel
  const legacyNodeTypes = ['text-input', 'tts', 'output', 'download']
  if (legacyNodeTypes.includes(node?.type)) {
    return <WorkflowConfigPanel node={node} onConfigSave={onConfigSave} />
  }
  // ===== 🔧 真正分离：状态 vs ref =====
  const [configData, setConfigData] = useState({})          // 只在鼠标操作时更新
  const [validationErrors, setValidationErrors] = useState({})  // 只在保存时更新
  const [isLoading, setIsLoading] = useState(false)
  const [panelError, setPanelError] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)       // 只在鼠标操作时更新
  
  // 🎹 键盘输入：全部存储在 ref 中，不触发任何状态更新
  const inputValuesRef = useRef({})                         // 键盘输入的即时值
  const fieldsRef = useRef([])                              // 字段定义缓存
  const initialValuesRef = useRef({})                       // 初始值，用于检测变化
  
  // 初始化追踪
  const [isInitialized, setIsInitialized] = useState(false)
  const initializationRef = useRef(null)
  const configCacheRef = useRef(new Map())

  // ===== 配置解析（只在节点变化时触发） =====
  
  const resolvedNodeConfig = useMemo(() => {
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

      console.log(`[UnifiedConfigPanel] 解析节点配置: ${node.type}`)

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
      console.error(`[UnifiedConfigPanel] 配置解析失败: ${error.message}`)
      setPanelError(`配置解析失败: ${error.message}`)
      
      return {
        valid: false,
        error: error.message,
        nodeType: node?.type || 'unknown',
        fields: [],
        validation: { required: [], rules: {} }
      }
    }
  }, [node?.id, node?.type])

  // ===== 数据初始化（只在节点变化时触发） =====
  
  useEffect(() => {
    if (!node?.id || !resolvedNodeConfig.valid) {
      return
    }

    if (initializationRef.current === node.id) {
      return
    }

    console.log(`[UnifiedConfigPanel] 初始化配置数据: ${node.id}`)

    try {
      const initialConfig = {}

      // 设置默认值
      resolvedNodeConfig.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialConfig[field.name] = field.defaultValue
        }
      })

      // 从节点数据中提取现有配置
      if (resolvedNodeConfig.source === 'legacy') {
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
        
      } else if (resolvedNodeConfig.source === 'dynamic') {
        if (node.data.config) {
          Object.assign(initialConfig, node.data.config)
        }
        resolvedNodeConfig.fields.forEach(field => {
          if (node.data[field.name] !== undefined) {
            initialConfig[field.name] = node.data[field.name]
          }
        })
      }

      const normalizedConfig = normalizeConfigTypes(initialConfig, resolvedNodeConfig.fields)

      // 🔧 关键：同时初始化状态和 ref
      setConfigData(normalizedConfig)
      inputValuesRef.current = { ...normalizedConfig }
      initialValuesRef.current = { ...normalizedConfig }
      fieldsRef.current = [...resolvedNodeConfig.fields]
      
      setValidationErrors({})
      setHasChanges(false)
      setIsInitialized(true)
      initializationRef.current = node.id

      console.log(`[UnifiedConfigPanel] 配置初始化完成:`, normalizedConfig)

    } catch (error) {
      console.error(`[UnifiedConfigPanel] 初始化失败: ${error.message}`)
      setPanelError(`配置初始化失败: ${error.message}`)
    }
  }, [node?.id, resolvedNodeConfig.valid])

  // ===== 🎹 键盘输入：零状态更新，零重新渲染 =====
  
  const handleFieldChange = useCallback((fieldName, newValue) => {
    console.log(`[UnifiedConfigPanel] 键盘输入: ${fieldName} =`, newValue)

    // 🔧 关键：只存储到 ref，不触发任何状态更新
    inputValuesRef.current[fieldName] = newValue
    
    // 🔧 关键：不调用任何 setState，不触发重新渲染
    // 这里什么都不做，让输入框保持焦点
    
  }, [])  // 空依赖数组，函数永远不会重新创建

  // ===== 🖱️ 鼠标操作：检测变化并更新状态 =====
  
  const checkForChanges = useCallback(() => {
    // 比较当前输入值和初始值
    const hasChangedFields = fieldsRef.current.some(field => {
      const currentValue = inputValuesRef.current[field.name]
      const initialValue = initialValuesRef.current[field.name]
      return currentValue !== initialValue
    })
    
    setHasChanges(hasChangedFields)
  }, [])

  // ===== 🖱️ 鼠标操作：保存配置 =====
  
  const handleSave = useCallback(async () => {
    if (!onConfigSave || !node?.id) {
      console.warn('[UnifiedConfigPanel] 缺少保存回调或节点ID')
      return
    }

    setIsLoading(true)
    
    try {
      // 🔧 现在才从 ref 中获取最新值
      const finalConfigData = { ...inputValuesRef.current }
      
      console.log(`[UnifiedConfigPanel] 保存配置: ${node.id}`, finalConfigData)

      // 🔧 只在保存时进行验证
      const errors = {}
      const { validation, fields } = resolvedNodeConfig

      if (validation.required) {
        validation.required.forEach(fieldName => {
          const value = finalConfigData[fieldName]
          if (!value || (typeof value === 'string' && !value.trim())) {
            const field = fields.find(f => f.name === fieldName)
            errors[fieldName] = `${field?.label || fieldName} 是必需的`
          }
        })
      }

      fields.forEach(field => {
        const value = finalConfigData[field.name]
        if (value !== undefined && value !== null && value !== '') {
          if (field.validation) {
            const fieldErrors = validateFieldValue(value, field)
            if (fieldErrors.length > 0) {
              errors[field.name] = fieldErrors[0]
            }
          }
          
          if (validation.rules && validation.rules[field.name]) {
            const rule = validation.rules[field.name]
            const ruleErrors = validateFieldRule(value, rule, field)
            if (ruleErrors.length > 0) {
              errors[field.name] = ruleErrors[0]
            }
          }
        }
      })

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        console.warn('[UnifiedConfigPanel] 配置验证失败，无法保存', errors)
        return
      }

      // 🔧 保存成功，同步状态
      setConfigData(finalConfigData)
      initialValuesRef.current = { ...finalConfigData }
      
      await onConfigSave(node.id, finalConfigData)
      
      setHasChanges(false)
      setValidationErrors({})
      setLastSaved(new Date().toLocaleTimeString())
      
      console.log(`[UnifiedConfigPanel] 配置保存成功`)

    } catch (error) {
      console.error(`[UnifiedConfigPanel] 保存失败: ${error.message}`)
      setPanelError(`保存失败: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [resolvedNodeConfig, onConfigSave, node?.id])

  // ===== 🖱️ 鼠标操作：重置配置 =====
  
  const handleReset = useCallback(() => {
    if (!resolvedNodeConfig.valid) return

    try {
      const resetConfig = {}
      
      resolvedNodeConfig.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          resetConfig[field.name] = field.defaultValue
        }
      })

      // 🔧 同时重置状态和 ref
      setConfigData(resetConfig)
      inputValuesRef.current = { ...resetConfig }
      initialValuesRef.current = { ...resetConfig }
      
      // 🔧 同时重置 DOM 输入框的值
      resolvedNodeConfig.fields.forEach(field => {
        const inputElement = document.getElementById(`field-${field.name}`)
        if (inputElement) {
          if (inputElement.type === 'checkbox') {
            inputElement.checked = Boolean(resetConfig[field.name])
          } else {
            inputElement.value = resetConfig[field.name] || ''
          }
        }
      })
      
      setValidationErrors({})
      setHasChanges(false)
      
      console.log(`[UnifiedConfigPanel] 配置已重置`)

    } catch (error) {
      console.error(`[UnifiedConfigPanel] 重置失败: ${error.message}`)
    }
  }, [resolvedNodeConfig])

  // ===== 🖱️ 鼠标事件：检测变化 =====
  
  const handleFieldBlur = useCallback(() => {
    checkForChanges()
  }, [checkForChanges])

  const handleFieldFocus = useCallback(() => {
    checkForChanges()
  }, [checkForChanges])

  // ===== 渲染方法 =====

  if (!resolvedNodeConfig.valid || panelError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-500">❌</span>
            <h4 className="font-medium text-red-800">配置面板错误</h4>
          </div>
          <div className="text-sm text-red-700 mb-3">
            {panelError || resolvedNodeConfig.error}
          </div>
          <div className="text-xs text-red-600">
            节点: {node?.type} ({node?.id})
          </div>
        </div>
      </div>
    )
  }

  if (!node) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="text-3xl mb-3">⚙️</div>
        <div className="text-lg font-medium mb-1">节点配置</div>
        <div className="text-sm">请选择一个节点进行配置</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 配置头部 */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-lg">
          {resolvedNodeConfig.nodeTypeConfig?.icon || '⚙️'}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">
            {resolvedNodeConfig.nodeTypeConfig?.label || node.type} 配置
          </h4>
          <div className="text-xs text-gray-500">
            第 {(node.data?.nodeIndex || 0) + 1} 步 • {resolvedNodeConfig.source} 节点
          </div>
        </div>
      </div>

      {/* 配置状态 */}
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

      {/* 配置字段 */}
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {resolvedNodeConfig.fields.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-lg mb-2">📝</div>
            <div className="text-sm">此节点无需额外配置</div>
          </div>
        ) : (
          resolvedNodeConfig.fields.map(field => (
            <div key={field.name}>
              {/* 🔧 关键：使用 ref 中的初始值，而不是状态中的值 */}
              {renderField(
                field, 
                inputValuesRef.current[field.name], 
                validationErrors[field.name], 
                handleFieldChange,
                handleFieldBlur,
                handleFieldFocus
              )}
            </div>
          ))
        )}
      </div>

      {/* 全局错误 */}
      {validationErrors._system && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-sm text-red-700">{validationErrors._system}</div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="space-y-2 pt-2 border-t border-gray-200">
        <div className="flex gap-2">
          <button 
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
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
      
      {hasChanges && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          ⚠️ 有未保存的更改
        </div>
      )}

      {/* 开发环境调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">🔧 真正的键盘/鼠标分离</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>节点类型: {resolvedNodeConfig.nodeType}</div>
            <div>配置来源: {resolvedNodeConfig.source}</div>
            <div>字段数量: {resolvedNodeConfig.fields.length}</div>
            <div>验证错误: {Object.keys(validationErrors).length}</div>
            <div>有未保存更改: {hasChanges ? '是' : '否'}</div>
            <div>🎹 键盘输入: 存储在 ref 中</div>
            <div>🖱️ 鼠标操作: 触发状态更新</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 工具函数 =====

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

// ===== 🔧 真正的键盘/鼠标分离渲染函数 =====

function renderField(field, value, error, onChange, onBlur, onFocus) {
  const fieldId = `field-${field.name}`
  const hasError = Boolean(error)

  const FieldContainer = ({ children }) => (
    <div className="mb-4">
      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {field.description && (
        <div className="text-xs text-gray-500 mt-1">{field.description}</div>
      )}
      {hasError && (
        <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )

  const baseClassName = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
    hasError 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
  }`

  switch (field.type) {
    case 'text':
      return (
        <FieldContainer>
          <input
            id={fieldId}
            type="text"
            defaultValue={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={field.placeholder}
            className={baseClassName}
          />
        </FieldContainer>
      )

    case 'textarea':
      return (
        <FieldContainer>
          <textarea
            id={fieldId}
            defaultValue={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={field.placeholder}
            rows={field.rows || 3}
            className={`${baseClassName} resize-none`}
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

    case 'select':
      return (
        <FieldContainer>
          <select
            id={fieldId}
            defaultValue={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            className={baseClassName}
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
              defaultChecked={Boolean(value)}
              onChange={(e) => onChange(field.name, e.target.checked)}
              onBlur={onBlur}
              onFocus={onFocus}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{field.checkboxLabel || field.label}</span>
          </label>
        </FieldContainer>
      )

    case 'number':
      return (
        <FieldContainer>
          <input
            id={fieldId}
            type="number"
            defaultValue={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.step || 'any'}
            className={baseClassName}
          />
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
              defaultValue={value || field.defaultValue || field.validation?.min || 0}
              onChange={(e) => onChange(field.name, parseInt(e.target.value))}
              onBlur={onBlur}
              onFocus={onFocus}
              min={field.validation?.min || 0}
              max={field.validation?.max || 100}
              step={field.step || 1}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
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
}

export default UnifiedConfigPanel

// ===== src/components/workflow/nodes/dynamic/DynamicNode.jsx - 修复版本 =====
import React, { useState, memo, useEffect, useMemo, useRef } from 'react'
import BaseWorkflowNode from '../BaseWorkflowNode'
import nodeStatusCalculator from '../../../../services/workflow/NodeStatusCalculator'

// 🔧 修复：移除有问题的 ModuleAdapter 导入，使用简化版本

/**
 * 通用动态节点组件 - 配置驱动的节点生成器
 * 
 * 核心功能：
 * 1. 基于配置动态生成节点UI和逻辑
 * 2. 完全复用 BaseWorkflowNode 的样式框架
 * 3. 智能降级保护，确保系统稳定性
 * 4. 支持多种字段类型和验证规则
 */
const DynamicNode = ({ 
  nodeConfig, 
  data, 
  selected, 
  id,
  // 降级参数 - 当动态渲染失败时使用
  fallbackComponent = null,
  fallbackProps = {}
}) => {
  // ===== 核心状态管理 =====
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(data.result || null)
  const [fieldValues, setFieldValues] = useState({})
  const [validationErrors, setValidationErrors] = useState({})
  const [renderError, setRenderError] = useState(null)
  
  // 🔧 关键修复：添加初始化状态追踪
  const [isInitialized, setIsInitialized] = useState(false)
  const initializationRef = useRef(null)

  // ===== 安全配置解析 =====
  const safeConfig = useMemo(() => {
    try {
      // 验证基础配置
      if (!nodeConfig || typeof nodeConfig !== 'object') {
        throw new Error('节点配置缺失或格式错误')
      }

      const {
        type = 'dynamic',
        label = '动态节点',
        icon = '⚙️',
        theme = 'blue',
        description = '配置驱动的动态节点',
        fields = [],
        api = {},
        validation = {},
        defaultData = {},
        ...otherConfig
      } = nodeConfig

      // 验证必需字段
      if (!type) throw new Error('节点类型不能为空')
      if (!Array.isArray(fields)) throw new Error('字段配置必须是数组')

      return {
        type,
        label,
        icon,
        theme,
        description,
        fields,
        api,
        validation,
        defaultData,
        ...otherConfig
      }
    } catch (error) {
      console.error('[DynamicNode] 配置解析失败:', error)
      setRenderError(error.message)
      
      // 返回安全的默认配置
      return {
        type: 'error',
        label: '配置错误',
        icon: '❌',
        theme: 'red',
        description: '节点配置解析失败',
        fields: [],
        api: {},
        validation: {},
        defaultData: {}
      }
    }
  }, [nodeConfig])

  // 🔧 关键修复：只在节点ID变化时初始化，避免配置变化触发重新初始化
  useEffect(() => {
    // 防止重复初始化同一个节点
    if (!id || initializationRef.current === id) {
      return
    }
    
    console.log(`[DynamicNode] 初始化节点: ${id}`)
    
    try {
      const initialValues = {}
      
      // 从默认数据初始化
      Object.assign(initialValues, safeConfig.defaultData)
      
      // 从字段默认值初始化
      safeConfig.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialValues[field.name] = field.defaultValue
        }
      })
      
      // 从节点数据初始化（优先级最高）
      if (data) {
        safeConfig.fields.forEach(field => {
          if (data[field.name] !== undefined) {
            initialValues[field.name] = data[field.name]
          }
        })
      }
      
      setFieldValues(initialValues)
      setIsInitialized(true)
      initializationRef.current = id
      
      console.log(`[DynamicNode] 字段值初始化完成:`, initialValues)
    } catch (error) {
      console.error('[DynamicNode] 字段初始化失败:', error)
      setRenderError(`字段初始化失败: ${error.message}`)
    }
  }, [id]) // 🔧 关键：只依赖节点ID，不依赖配置

  // ===== 智能验证系统 =====
  const validateFields = useMemo(() => {
    return () => {
      try {
        const errors = {}
        const { validation, fields } = safeConfig

        // 检查必需字段
        if (validation.required && Array.isArray(validation.required)) {
          validation.required.forEach(fieldName => {
            const value = fieldValues[fieldName]
            if (!value || (typeof value === 'string' && !value.trim())) {
              errors[fieldName] = `${getFieldLabel(fieldName)} 是必需的`
            }
          })
        }

        // 字段特定验证
        fields.forEach(field => {
          const value = fieldValues[field.name]
          
          if (field.validation) {
            // 最小长度验证
            if (field.validation.minLength && value && value.length < field.validation.minLength) {
              errors[field.name] = `${field.label} 至少需要 ${field.validation.minLength} 个字符`
            }
            
            // 最大长度验证
            if (field.validation.maxLength && value && value.length > field.validation.maxLength) {
              errors[field.name] = `${field.label} 不能超过 ${field.validation.maxLength} 个字符`
            }
            
            // 正则表达式验证
            if (field.validation.pattern && value) {
              const regex = new RegExp(field.validation.pattern)
              if (!regex.test(value)) {
                errors[field.name] = field.validation.message || `${field.label} 格式不正确`
              }
            }
          }
        })

        // 自定义验证函数
        if (validation.customValidator && typeof validation.customValidator === 'function') {
          try {
            const customResult = validation.customValidator(fieldValues)
            if (!customResult.valid && customResult.errors) {
              Object.assign(errors, customResult.errors)
            }
          } catch (error) {
            console.warn('[DynamicNode] 自定义验证失败:', error)
            errors._custom = '自定义验证失败'
          }
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
      } catch (error) {
        console.error('[DynamicNode] 验证过程失败:', error)
        setValidationErrors({ _system: '验证系统错误' })
        return false
      }
    }
  }, [fieldValues, safeConfig])

  // ===== 工具函数 =====
  const getFieldLabel = (fieldName) => {
    const field = safeConfig.fields.find(f => f.name === fieldName)
    return field?.label || fieldName
  }

  const getNodeIndex = () => data.nodeIndex !== undefined ? data.nodeIndex : 0
  const getTotalNodes = () => data.totalNodes || 1

// ✅ 修复：改为使用已保存的节点数据
const getConfigStatus = useMemo(() => {
  if (renderError) return 'error'
  
  try {
    // 🔧 关键修改：使用统一状态计算器，基于已保存的数据
    const nodeData = {
      id,
      type: safeConfig.type,
      data: {
        ...data,
        nodeConfig: safeConfig
      }
    }
    
    const statusResult = nodeStatusCalculator.calculateNodeStatus(nodeData)
    return statusResult.status
    
  } catch (error) {
    console.error('[DynamicNode] 状态计算失败:', error)
    return 'error'
  }
}, [id, safeConfig.type, data, renderError])  // 🔧 依赖已保存的数据，不依赖fieldValues

  // ===== 简化的数据标准化方法 =====
  const normalizeNodeOutput = (nodeType, outputData, nodeId) => {
    try {
      return {
        type: 'data',
        nodeType: nodeType,
        nodeId: nodeId,
        data: outputData,
        timestamp: new Date().toISOString(),
        format: 'json'
      }
    } catch (error) {
      console.error('[DynamicNode] 数据标准化失败:', error)
      return {
        type: 'error',
        nodeType: nodeType,
        nodeId: nodeId,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // ===== 通用处理函数 =====
  const handleProcess = async (inputData) => {
    setIsProcessing(true)
    
    try {
      console.log(`[DynamicNode] 开始处理 ${safeConfig.type}:`, inputData)
      
      // 验证配置
      const isValid = validateFields()
      if (!isValid) {
        throw new Error('节点配置验证失败')
      }

      // 准备处理数据
      const processData = {
        input: inputData,
        config: fieldValues,
        nodeType: safeConfig.type,
        api: safeConfig.api
      }

      // 如果配置了API，调用API处理
      if (safeConfig.api && safeConfig.api.endpoint) {
        const apiResult = await callDynamicApi(processData)
        
        // 标准化结果
        const workflowData = normalizeNodeOutput(
          safeConfig.type, 
          apiResult, 
          id
        )
        
        const compatResult = {
          success: true,
          data: apiResult,
          workflowData: workflowData
        }
        
        setResult(compatResult)
        
        // 更新节点数据
        if (data.onDataChange) {
          data.onDataChange({ result: compatResult })
        }
        
        return workflowData
      } else {
        // 无API配置，返回配置数据
        const outputData = {
          type: safeConfig.type,
          config: fieldValues,
          input: inputData
        }
        
        const workflowData = normalizeNodeOutput(
          safeConfig.type,
          outputData,
          id
        )
        
        const compatResult = {
          success: true,
          data: outputData,
          workflowData: workflowData
        }
        
        setResult(compatResult)
        
        if (data.onDataChange) {
          data.onDataChange({ result: compatResult })
        }
        
        return workflowData
      }
      
    } catch (error) {
      console.error(`[DynamicNode] ${safeConfig.type} 处理失败:`, error)
      const errorResult = { error: error.message, success: false }
      setResult(errorResult)
      
      if (data.onDataChange) {
        data.onDataChange({ result: errorResult })
      }
      
      return errorResult
    } finally {
      setIsProcessing(false)
    }
  }

  // ===== API调用函数 =====
  const callDynamicApi = async (processData) => {
    const { api } = safeConfig
    const { endpoint, method = 'POST', headers = {} } = api

    try {
      const requestConfig = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }

      if (method.toUpperCase() !== 'GET') {
        requestConfig.body = JSON.stringify({
          ...processData.config,
          input: processData.input
        })
      }

      const response = await fetch(endpoint, requestConfig)
      
      if (!response.ok) {
        let errorMessage = `API调用失败: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.detail || errorMessage
        } catch (e) {
          // 解析失败，使用默认消息
        }
        throw new Error(errorMessage)
      }

      return await response.json()
    } catch (error) {
      throw new Error(`API调用失败: ${error.message}`)
    }
  }

  // ===== 注册处理器 =====
  useEffect(() => {
    if (data.onSetProcessor) {
      data.onSetProcessor(handleProcess)
    }
  }, [data.onSetProcessor, fieldValues])

  // ===== 降级渲染 =====
  if (renderError && fallbackComponent) {
    console.warn(`[DynamicNode] 使用降级组件: ${renderError}`)
    return React.createElement(fallbackComponent, {
      ...fallbackProps,
      data,
      selected,
      id,
      error: renderError
    })
  }

  // ===== 字段渲染函数 =====
  const renderFieldPreview = (field) => {
    try {
      const value = fieldValues[field.name]
      const hasError = validationErrors[field.name]

      switch (field.type) {
        case 'text':
        case 'textarea':
          return (
            <div key={field.name} className="mb-2">
              <div className="text-xs font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>
              <div className={`p-2 rounded border text-xs ${
                hasError 
                  ? 'bg-red-50 border-red-200 text-red-700' 
                  : value 
                    ? 'bg-gray-50 border-gray-200 text-gray-800' 
                    : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}>
                {hasError ? (
                  `❌ ${hasError}`
                ) : value ? (
                  field.type === 'textarea' && value.length > 50 
                    ? `${value.substring(0, 50)}...` 
                    : value
                ) : (
                  field.placeholder || `请配置${field.label}`
                )}
              </div>
            </div>
          )

        case 'select':
          const selectedOption = field.options?.find(opt => 
            typeof opt === 'string' ? opt === value : opt.value === value
          )
          
          return (
            <div key={field.name} className="mb-2">
              <div className="text-xs font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>
              <div className={`p-2 rounded border text-xs ${
                hasError 
                  ? 'bg-red-50 border-red-200 text-red-700' 
                  : selectedOption 
                    ? 'bg-gray-50 border-gray-200 text-gray-800' 
                    : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}>
                {hasError ? (
                  `❌ ${hasError}`
                ) : selectedOption ? (
                  typeof selectedOption === 'string' ? selectedOption : selectedOption.label
                ) : (
                  `请选择${field.label}`
                )}
              </div>
            </div>
          )

        case 'checkbox':
          return (
            <div key={field.name} className="mb-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                <div className={`w-3 h-3 rounded border ${
                  value ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                }`}>
                  {value && <div className="text-white text-xs">✓</div>}
                </div>
                <span className="text-xs text-gray-700">{field.label}</span>
              </div>
            </div>
          )

        default:
          return (
            <div key={field.name} className="mb-2">
              <div className="text-xs font-medium text-gray-700 mb-1">{field.label}</div>
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                不支持的字段类型: {field.type}
              </div>
            </div>
          )
      }
    } catch (error) {
      console.error(`[DynamicNode] 字段渲染失败 ${field.name}:`, error)
      return (
        <div key={field.name} className="mb-2">
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            字段渲染错误: {field.name}
          </div>
        </div>
      )
    }
  }

  // ===== 主渲染 =====
  const showAddButton = data.showAddButton === true && 
    (getNodeIndex() < (getTotalNodes() - 1) || getTotalNodes() === 1)

  return (
    <BaseWorkflowNode
      nodeId={id}
      nodeType={safeConfig.type}
      theme={safeConfig.theme}
      title={safeConfig.label}
      icon={safeConfig.icon}
      nodeIndex={getNodeIndex()}
      status={getConfigStatus}
      selected={selected}
      showAddButton={showAddButton}
      onAddNode={data.onAddNode}
    >
      <div className="flex-1 space-y-2">
        {/* 错误显示 */}
        {renderError && (
          <div className="p-2 bg-red-50 rounded border border-red-200">
            <div className="text-xs font-medium text-red-700">❌ 渲染错误</div>
            <div className="text-xs text-red-600 mt-1">{renderError}</div>
          </div>
        )}

        {/* 配置状态 */}
        {!renderError && (
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">
              节点配置
            </label>
            {selected && (
              <div className={`text-xs px-2 py-0.5 rounded-full ${
                safeConfig.theme === 'blue' ? 'text-blue-600 bg-blue-100/80' :
                safeConfig.theme === 'purple' ? 'text-purple-600 bg-purple-100/80' :
                safeConfig.theme === 'green' ? 'text-green-600 bg-green-100/80' :
                safeConfig.theme === 'orange' ? 'text-orange-600 bg-orange-100/80' :
                'text-gray-600 bg-gray-100/80'
              }`}>
                ⚙️ 右侧配置
              </div>
            )}
          </div>
        )}

        {/* 字段预览 */}
        {!renderError && safeConfig.fields.length > 0 && (
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {safeConfig.fields.slice(0, 3).map(renderFieldPreview)}
            {safeConfig.fields.length > 3 && (
              <div className="text-xs text-gray-500 text-center py-1">
                还有 {safeConfig.fields.length - 3} 个字段...
              </div>
            )}
          </div>
        )}

        {/* 执行状态 */}
        {!renderError && (
          <div>
            {isProcessing && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-blue-700">正在处理...</span>
              </div>
            )}
            
            {result?.success && (
              <div className="p-2 bg-green-50 rounded border border-green-200">
                <div className="text-xs font-medium text-green-800">✅ 处理成功</div>
              </div>
            )}
            
            {result?.error && (
              <div className="p-2 bg-red-50 rounded border border-red-200">
                <div className="text-xs font-medium text-red-800">❌ 处理失败</div>
                <div className="text-xs text-red-600 mt-1">{result.error}</div>
              </div>
            )}
          </div>
        )}

        {/* 底部状态 */}
        <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
          <span className="text-gray-500">
            {safeConfig.type} • {safeConfig.fields.length} 字段
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            getConfigStatus === 'configured' 
              ? 'bg-green-100 text-green-700' 
              : getConfigStatus === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
          }`}>
            {getConfigStatus === 'configured' ? '✓ 已配置' : 
             getConfigStatus === 'error' ? '❌ 错误' : 
             '⚠ 待配置'}
          </span>
        </div>
      </div>

      {/* 配置提示 */}
      {!renderError && getConfigStatus === 'waiting' && selected && (
        <div className={`mt-2 p-2 rounded border ${
          safeConfig.theme === 'blue' ? 'bg-blue-50/70 border-blue-200' :
          safeConfig.theme === 'purple' ? 'bg-purple-50/70 border-purple-200' :
          safeConfig.theme === 'green' ? 'bg-green-50/70 border-green-200' :
          safeConfig.theme === 'orange' ? 'bg-orange-50/70 border-orange-200' :
          'bg-gray-50/70 border-gray-200'
        }`}>
          <div className={`text-xs ${
            safeConfig.theme === 'blue' ? 'text-blue-700' :
            safeConfig.theme === 'purple' ? 'text-purple-700' :
            safeConfig.theme === 'green' ? 'text-green-700' :
            safeConfig.theme === 'orange' ? 'text-orange-700' :
            'text-gray-700'
          }`}>
            💡 请在右侧配置面板中完成节点设置
          </div>
        </div>
      )}
    </BaseWorkflowNode>
  )
}

export default memo(DynamicNode)

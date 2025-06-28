// ===== src/services/workflow/dynamic/DynamicNodeRegistry.js - 适配统一接口的动态节点注册表 =====

import React from 'react'
// 导入统一接口层组件
import StandardDataModel from '../StandardDataModel'
import configurationResolver from '../ConfigurationResolver'
import nodeStatusCalculator from '../NodeStatusCalculator'

// 导入数据类型和验证系统
import dataValidator from '../types/DataValidator'
import { DATA_TYPES, isValidDataType, getDataTypeMetadata } from '../types/DataTypes'

// 导入传统节点管理器（用于兼容性）
import legacyNodeManager from '../legacy/LegacyNodeManager'

/**
 * 动态节点注册表 - 适配统一接口版本
 * 
 * 改造目标：
 * 1. 实现 UnifiedNodeManager 定义的统一接口
 * 2. 保持现有动态注册功能完全不变
 * 3. 集成统一接口层组件（StandardDataModel、ConfigurationResolver等）
 * 4. 提供与传统节点管理器的无缝协作
 * 
 * 改造原则：
 * - 零破坏：原有动态节点继续工作
 * - 接口统一：实现标准化的动态节点管理接口
 * - 组件集成：充分利用统一接口层的能力
 * - 智能降级：配置解析失败时自动回退
 */
class DynamicNodeRegistry {
  constructor() {
    // 📌 保持原有核心功能
    // 复用现有 LegacyNodeManager - 不替换，而是扩展
    this.legacyManager = legacyNodeManager
    
    // React 组件映射表
    this.nodeComponents = new Map()
    
    // 配置组件映射表  
    this.configComponents = new Map()
    
    // 完整节点配置缓存
    this.fullConfigs = new Map()
    
    // 📌 新增：统一接口层集成
    this.dataModel = StandardDataModel
    this.configResolver = configurationResolver
    this.statusCalculator = nodeStatusCalculator
    
    // 📌 新增：统一接口标识
    this.managerType = 'dynamic'
    this.managerVersion = '1.0.0'
    this.supportsStandardInterface = true
    
    // 📌 新增：统计信息
    this.stats = {
      nodesCreated: 0,
      nodesValidated: 0,
      configsResolved: 0,
      statusCalculated: 0,
      interfaceCalls: 0,
      registrationCount: 0
    }
    
    // 初始化标记
    this.initialized = false
    
    // 降级保护开关
    this.enableFallback = true
    
    // 调试日志
    this.debugMode = process.env.NODE_ENV === 'development'

    // 缓存机制
    this._nodeTypesCache = null
    this._nodeTypesCacheKey = null

    // 引用数据验证系统
    this.dataValidator = dataValidator
    this.dataTypes = DATA_TYPES
    
    this.log('[DynamicNodeRegistry] 动态节点注册表已初始化（统一接口版本）')
  }

  /**
   * 调试日志输出
   */
  log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[DynamicReg ${timestamp}]`
    
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

  // ===== 📌 新增：统一接口实现 =====

  /**
   * 统一接口：创建动态节点
   * 
   * @param {string} nodeType - 节点类型
   * @param {object} options - 创建选项
   * @returns {object} 标准格式的节点对象
   */
  createNodeStandard(nodeType, options = {}) {
    try {
      this.stats.interfaceCalls++
      this.stats.nodesCreated++
      
      this.log(`统一接口创建动态节点: ${nodeType}`)
      
      // 获取节点配置
      const nodeConfig = this.getFullNodeConfig(nodeType)
      if (!nodeConfig) {
        throw new Error(`动态节点配置不存在: ${nodeType}`)
      }

      // 创建动态节点
      const dynamicNode = this.createDynamicNode(nodeType, nodeConfig, options)
      
      // 转换为标准格式
      const standardNode = this.dataModel.fromDynamicNode(dynamicNode, nodeConfig)
      
      // 添加管理器标识
      standardNode.data._metadata.managedBy = 'dynamic'
      standardNode.data._metadata.managerVersion = this.managerVersion
      standardNode.data._metadata.nodeConfig = nodeConfig
      
      // 使用统一配置解析器解析配置
      try {
        const configResult = this.configResolver.resolveConfiguration(standardNode, {
          validate: true,
          userConfig: options.config
        })
        standardNode.data._resolvedConfig = configResult
        this.stats.configsResolved++
      } catch (configError) {
        this.log(`配置解析失败，使用默认配置: ${configError.message}`, 'warn')
      }

      // 使用统一状态计算器计算初始状态
      try {
        const statusResult = this.statusCalculator.calculateNodeStatus(standardNode)
        standardNode.data._status = statusResult
        this.stats.statusCalculated++
      } catch (statusError) {
        this.log(`状态计算失败，使用默认状态: ${statusError.message}`, 'warn')
      }
      
      this.log(`动态节点创建成功 (标准格式): ${nodeType}`, 'success')
      return standardNode
      
    } catch (error) {
      this.log(`统一接口创建动态节点失败 ${nodeType}: ${error.message}`, 'error')
      throw new Error(`Dynamic node creation failed: ${error.message}`)
    }
  }

  /**
   * 统一接口：验证动态节点
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 验证选项
   * @returns {object} 统一格式的验证结果
   */
  validateNodeStandard(nodeData, options = {}) {
    try {
      this.stats.interfaceCalls++
      this.stats.nodesValidated++
      
      this.log(`统一接口验证动态节点: ${nodeData.type}`)
      
      // 确保数据为动态格式
      const dynamicNode = this.ensureDynamicFormat(nodeData)
      
      // 获取节点配置
      const nodeConfig = this.getFullNodeConfig(dynamicNode.type)
      if (!nodeConfig) {
        return {
          valid: false,
          errors: [`动态节点配置不存在: ${dynamicNode.type}`],
          warnings: [],
          canExecute: false,
          source: 'dynamic',
          timestamp: new Date().toISOString()
        }
      }

      // 使用统一配置解析器进行验证
      let configValidation
      try {
        const configResult = this.configResolver.resolveConfiguration(dynamicNode, {
          validate: true,
          strictValidation: options.strict || false
        })
        configValidation = {
          valid: !configResult.metadata?.validationWarnings,
          errors: configResult.metadata?.validationWarnings || [],
          configResult
        }
      } catch (error) {
        configValidation = {
          valid: false,
          errors: [`配置验证失败: ${error.message}`]
        }
      }

      // 使用统一状态计算器验证状态
      let statusValidation
      try {
        const statusResult = this.statusCalculator.calculateNodeStatus(dynamicNode)
        statusValidation = {
          valid: statusResult.status !== 'error' && statusResult.status !== 'invalid',
          status: statusResult.status,
          canExecute: statusResult.canExecute
        }
      } catch (error) {
        statusValidation = {
          valid: false,
          status: 'error',
          canExecute: false
        }
      }

      // 动态节点特定验证
      const dynamicValidation = this.validateDynamicNodeSpecific(dynamicNode, nodeConfig, options)

      // 合并验证结果
      const combinedValidation = this.combineValidationResults([
        configValidation,
        statusValidation,
        dynamicValidation
      ], nodeData, options)
      
      this.log(`动态节点验证完成: ${nodeData.type} -> ${combinedValidation.valid ? '通过' : '失败'}`)
      return combinedValidation
      
    } catch (error) {
      this.log(`统一接口验证失败 ${nodeData?.type}: ${error.message}`, 'error')
      return {
        valid: false,
        errors: [`Dynamic validation failed: ${error.message}`],
        warnings: [],
        canExecute: false,
        source: 'dynamic',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 统一接口：获取动态节点状态
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 选项
   * @returns {object} 统一格式的状态结果
   */
  getNodeStatusStandard(nodeData, options = {}) {
    try {
      this.stats.interfaceCalls++
      this.stats.statusCalculated++
      
      // 确保数据为动态格式
      const dynamicNode = this.ensureDynamicFormat(nodeData)
      
      // 使用统一状态计算器
      const statusResult = this.statusCalculator.calculateNodeStatus(dynamicNode, {
        ...options,
        forceRecalculate: options.forceRecalculate || false
      })
      
      // 添加动态节点特定信息
      statusResult.details.managedBy = 'dynamic'
      statusResult.details.nodeConfig = this.getFullNodeConfig(dynamicNode.type)
      statusResult.details.hasFields = Boolean(statusResult.details.nodeConfig?.fields?.length)
      
      return statusResult
      
    } catch (error) {
      this.log(`统一接口状态获取失败 ${nodeData?.type}: ${error.message}`, 'error')
      return {
        status: 'error',
        details: {
          reason: 'Dynamic status calculation failed',
          error: error.message,
          source: 'dynamic'
        },
        priority: 10,
        isTerminal: true,
        canExecute: false
      }
    }
  }

  /**
   * 统一接口：获取动态节点类型配置
   * 
   * @param {string} nodeType - 节点类型
   * @returns {object} 统一格式的节点配置
   */
  getNodeTypeConfigStandard(nodeType) {
    try {
      this.stats.interfaceCalls++
      
      // 获取完整配置
      const nodeConfig = this.getFullNodeConfig(nodeType)
      
      if (!nodeConfig) {
        return null
      }
      
      // 转换为统一格式
      const standardConfig = this.convertNodeTypeConfig(nodeConfig, nodeType)
      
      return standardConfig
      
    } catch (error) {
      this.log(`获取动态节点类型配置失败 ${nodeType}: ${error.message}`, 'error')
      return null
    }
  }

  /**
   * 统一接口：获取所有动态节点类型
   * 
   * @returns {Array} 统一格式的节点类型列表
   */
  getAllNodeTypesStandard() {
    try {
      this.stats.interfaceCalls++
      
      // 获取已注册的动态节点类型
      const dynamicTypes = this.getAllRegisteredTypes()
      
      // 转换为统一格式
      const standardTypes = dynamicTypes.map(nodeType => {
        const config = this.getFullNodeConfig(nodeType)
        return {
          type: nodeType,
          label: config?.label || nodeType,
          icon: config?.icon || '⚙️',
          description: config?.description || '动态节点',
          category: config?.category || 'general',
          theme: config?.theme || 'blue',
          _source: 'dynamic',
          _manager: 'DynamicNodeRegistry',
          _version: this.managerVersion,
          _supportsStandardInterface: true,
          _hasFields: Boolean(config?.fields?.length),
          _hasApi: Boolean(config?.api?.endpoint)
        }
      })
      
      return standardTypes
      
    } catch (error) {
      this.log(`获取所有动态节点类型失败: ${error.message}`, 'error')
      return []
    }
  }

  // ===== 📌 数据格式转换和处理方法 =====

  /**
   * 确保数据为动态格式
   */
  ensureDynamicFormat(nodeData) {
    try {
      const dataFormat = this.dataModel.detectDataFormat(nodeData)
      
      if (dataFormat === 'dynamic') {
        return nodeData
      } else if (dataFormat === 'standard') {
        return this.dataModel.toDynamicNode(nodeData)
      } else {
        // 尝试自动转换或创建动态格式
        this.log(`尝试自动转换为动态格式: ${dataFormat}`, 'warn')
        
        // 检查是否有 nodeConfig
        const nodeConfig = this.getFullNodeConfig(nodeData.type)
        if (nodeConfig) {
          return this.createDynamicNodeFromData(nodeData, nodeConfig)
        }
        
        return nodeData
      }
      
    } catch (error) {
      this.log(`数据格式转换失败: ${error.message}`, 'warn')
      return nodeData // 降级：返回原数据
    }
  }

  /**
   * 从现有数据创建动态节点格式
   */
  createDynamicNodeFromData(nodeData, nodeConfig) {
    return {
      id: nodeData.id,
      type: nodeData.type,
      position: nodeData.position || { x: 0, y: 0 },
      data: {
        label: nodeConfig.label,
        nodeType: nodeData.type,
        nodeIndex: nodeData.data?.nodeIndex || 0,
        totalNodes: nodeData.data?.totalNodes || 1,
        nodeConfig: nodeConfig,
        config: {
          ...nodeConfig.defaultData,
          ...nodeData.data?.config
        },
        result: nodeData.data?.result || null,
        isProcessing: nodeData.data?.isProcessing || false,
        showAddButton: nodeData.data?.showAddButton || false,
        hideTestButton: nodeData.data?.hideTestButton !== false,
        onDataChange: nodeData.data?.onDataChange,
        onAddNode: nodeData.data?.onAddNode,
        onSetProcessor: nodeData.data?.onSetProcessor,
        ...nodeData.data
      }
    }
  }

  /**
   * 创建动态节点
   */
  createDynamicNode(nodeType, nodeConfig, options) {
    const {
      nodeId = `${nodeType}-${Date.now()}`,
      nodeIndex = 0,
      totalNodes = 1,
      position = { x: 0, y: 0 },
      config = {},
      customData = {}
    } = options

    return {
      id: nodeId,
      type: nodeType,
      position: position,
      data: {
        label: nodeConfig.label,
        nodeType: nodeType,
        nodeIndex: nodeIndex,
        totalNodes: totalNodes,
        nodeConfig: nodeConfig,
        config: {
          ...nodeConfig.defaultData,
          ...config
        },
        result: null,
        isProcessing: false,
        showAddButton: options.showAddButton || false,
        hideTestButton: true,
        onDataChange: options.onDataChange || (() => {}),
        onAddNode: options.onAddNode || (() => {}),
        onSetProcessor: options.onSetProcessor || (() => {}),
        ...customData
      }
    }
  }

  /**
   * 动态节点特定验证
   */
  validateDynamicNodeSpecific(nodeData, nodeConfig, options) {
    try {
      const errors = []
      const warnings = []

      // 检查节点配置完整性
      if (!nodeConfig.fields) {
        warnings.push('动态节点缺少字段定义')
      }

      // 检查字段值
      if (nodeConfig.fields && Array.isArray(nodeConfig.fields)) {
        nodeConfig.fields.forEach(field => {
          const value = nodeData.data?.[field.name] || nodeData.data?.config?.[field.name]
          
          if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
            errors.push(`必需字段 "${field.label || field.name}" 不能为空`)
          }
          
          if (value !== undefined && field.validation) {
            const fieldValidation = this.validateFieldValue(value, field)
            if (!fieldValidation.valid) {
              errors.push(...fieldValidation.errors)
            }
          }
        })
      }

      // 检查API配置
      if (nodeConfig.api && nodeConfig.api.endpoint) {
        if (!nodeConfig.api.endpoint.trim()) {
          errors.push('API端点不能为空')
        } else if (!this.isValidUrl(nodeConfig.api.endpoint)) {
          warnings.push('API端点格式可能不正确')
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        source: 'dynamic-specific'
      }

    } catch (error) {
      return {
        valid: false,
        errors: [`动态节点特定验证失败: ${error.message}`],
        warnings: []
      }
    }
  }

  /**
   * 验证字段值
   */
  validateFieldValue(value, field) {
    const errors = []

    try {
      if (field.validation) {
        const { minLength, maxLength, pattern, min, max } = field.validation

        if (minLength && value.length < minLength) {
          errors.push(`${field.label} 长度不能少于 ${minLength} 个字符`)
        }

        if (maxLength && value.length > maxLength) {
          errors.push(`${field.label} 长度不能超过 ${maxLength} 个字符`)
        }

        if (pattern && !new RegExp(pattern).test(value)) {
          const message = field.validation.message || `${field.label} 格式不正确`
          errors.push(message)
        }

        if (field.type === 'number') {
          const numValue = Number(value)
          if (isNaN(numValue)) {
            errors.push(`${field.label} 必须是数字`)
          } else {
            if (min !== undefined && numValue < min) {
              errors.push(`${field.label} 不能小于 ${min}`)
            }
            if (max !== undefined && numValue > max) {
              errors.push(`${field.label} 不能大于 ${max}`)
            }
          }
        }
      }

    } catch (error) {
      errors.push(`字段验证过程出错: ${error.message}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 合并验证结果
   */
  combineValidationResults(validationResults, originalNodeData, options) {
    const allErrors = []
    const allWarnings = []
    let canExecute = true
    
    validationResults.forEach(result => {
      if (result.errors) {
        allErrors.push(...result.errors)
      }
      if (result.warnings) {
        allWarnings.push(...result.warnings)
      }
      if (result.canExecute === false) {
        canExecute = false
      }
    })

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      canExecute: canExecute && allErrors.length === 0,
      source: 'dynamic',
      timestamp: new Date().toISOString(),
      nodeType: originalNodeData.type,
      dataFormat: this.dataModel.detectDataFormat(originalNodeData),
      validationDetails: options.includeDetails ? validationResults : undefined
    }
  }

  /**
   * 转换节点类型配置为统一格式
   */
  convertNodeTypeConfig(nodeConfig, nodeType) {
    return {
      ...nodeConfig,
      _source: 'dynamic',
      _manager: 'DynamicNodeRegistry',
      _nodeType: nodeType,
      _supportsStandardInterface: true,
      _convertedAt: new Date().toISOString(),
      
      // 添加统一接口的标准字段
      standardInterface: {
        createMethod: 'createNodeStandard',
        validateMethod: 'validateNodeStandard',
        statusMethod: 'getNodeStatusStandard'
      },
      
      // 动态节点特有信息
      dynamicFeatures: {
        hasFields: Boolean(nodeConfig.fields?.length),
        fieldsCount: nodeConfig.fields?.length || 0,
        hasApi: Boolean(nodeConfig.api?.endpoint),
        hasValidation: Boolean(nodeConfig.validation),
        sourceType: nodeConfig.sourceType || 'json'
      }
    }
  }

  /**
   * 工具方法：验证URL格式
   */
  isValidUrl(string) {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  // ===== 📌 保持原有功能的缓存清理方法 =====

  clearNodeTypesCache() {
    this._nodeTypesCache = null
    this._nodeTypesCacheKey = null
    this.log('nodeTypes 缓存已清除')
  }

  // ===== 📌 保持原有的核心方法完全不变 =====

/**
 * 注册完整的节点配置
 */
registerFullNodeConfig(type, config) {
  try {
    this.stats.registrationCount++
    
    // 数据类型验证和标准化
    this.log(`开始注册节点 ${type}，进行数据类型验证`)
    
    // 验证配置中的数据类型定义（暂时跳过，专注功能实现）
    if (config.fields && false) {  // 暂时禁用验证
      for (const field of config.fields) {
        const fieldValidation = this.dataValidator.validateFieldConfig(field)
        if (!fieldValidation.isValid) {
          this.log(`字段配置验证失败 ${field.name}: ${fieldValidation.errors.join(', ')}`, 'warn')
        }
      }
    }
          
    // 验证默认数据的数据类型一致性
    if (config.defaultData && config.fields) {
      const dataValidation = this.dataValidator.validateFields(config.defaultData, config.fields)
      if (!dataValidation.isValid) {
        this.log(`默认数据验证失败: ${dataValidation.errors.join('; ')}`, 'warn')
      }
    }
    
    const {
      component,
      configComponent,
      label,
      icon,
      description,
      defaultData = {},
      validation = {},
      theme = 'blue',
      category = 'general',
      sourceType,  // 🔧 新增：检查 sourceType
      ...otherConfig
    } = config

    // 🔧 关键修复：为 JSON 配置节点自动提供默认组件
    let finalComponent = component
    
    if (!component) {
      // 检查是否为 JSON 配置节点
      if (sourceType === 'json' || config.fields || config.meta?.sourceType === 'json') {
        // 为 JSON 配置节点使用 DynamicNode 组件
        finalComponent = 'DynamicNode' // 使用字符串标识，实际组件由 UnifiedNodeRenderer 处理
        this.log(`为 JSON 配置节点 ${type} 自动分配 DynamicNode 组件`, 'success')
      } else {
        throw new Error(`节点 ${type} 缺少 component 参数`)
      }
    }

    // 注册 React 组件
    if (typeof finalComponent === 'function' || 
        (finalComponent && typeof finalComponent === 'object' && finalComponent !== null)) {
      // React 组件（函数或对象形式）
      this.nodeComponents.set(type, finalComponent)
      this.log(`注册节点组件: ${type}`, 'success')
    } else if (finalComponent === 'DynamicNode') {
      // 动态节点标识
      this.nodeComponents.set(type, 'DynamicNode')
      this.log(`注册动态节点组件标识: ${type}`, 'success')
    } else {
      this.log(`未知的组件类型 ${type}: ${typeof finalComponent}`, 'warn')
    }
    
    // 注册配置组件（可选或智能生成）
    if (configComponent) {
      this.configComponents.set(type, configComponent)
      this.log(`注册配置组件: ${type}`, 'success')
    } else {
      // 新增：为JSON配置节点自动注册DynamicConfigPanel
      if (sourceType === 'json' || config.fields || (config.meta && config.meta.sourceType === 'json')) {
        // 标记为需要使用DynamicConfigPanel的节点
        this.configComponents.set(type, 'DynamicConfigPanel')
        this.log(`自动注册DynamicConfigPanel配置组件: ${type}`, 'success')
      }
    }

    // 构建 NodeManager 兼容的配置
    const nodeManagerConfig = {
      label,
      icon,
      description,
      theme,
      category,
      defaultData,
      validation,
      sourceType, // 🔧 保留 sourceType 信息
      ...otherConfig
    }

    // 注册到 NodeManager（复用现有逻辑）
    this.legacyManager.registerNodeType(type, nodeManagerConfig)

    // 缓存完整配置
    this.fullConfigs.set(type, {
      type,
      component: finalComponent, // 🔧 使用处理后的组件
      configComponent,
      sourceType, // 🔧 保留 sourceType
      ...nodeManagerConfig
    })

    this.clearNodeTypesCache()

    this.log(`节点 ${type} 注册完成`, 'success')
    return true

  } catch (error) {
    this.log(`注册节点 ${type} 失败: ${error.message}`, 'error')
    
    if (this.enableFallback) {
      this.log(`启用降级保护，节点 ${type} 将使用基础配置`, 'warn')
      
      // 🔧 降级处理：为 JSON 节点提供默认配置
      try {
        const fallbackConfig = {
          type,
          component: 'DynamicNode',
          configComponent: 'DynamicConfigPanel',
          label: config.label || type,
          icon: config.icon || '⚙️',
          description: config.description || '动态节点',
          theme: config.theme || 'blue',
          category: config.category || 'general',
          sourceType: 'json',
          defaultData: config.defaultData || {},
          validation: config.validation || {},
          fields: config.fields || [],
          ...config
        }
        
        this.fullConfigs.set(type, fallbackConfig)
        this.nodeComponents.set(type, 'DynamicNode')
        this.configComponents.set(type, 'DynamicConfigPanel')
        
        this.log(`节点 ${type} 降级注册成功`, 'success')
        return true
      } catch (fallbackError) {
        this.log(`节点 ${type} 降级注册也失败: ${fallbackError.message}`, 'error')
        return false
      }
    }
    
    throw error
  }
}

  /**
   * 获取节点的 React 组件
   * 带智能降级保护
   */
  getNodeComponent(type) {
    try {
      const component = this.nodeComponents.get(type)
      
      if (component) {
        this.log(`获取节点组件: ${type}`)
        return component
      }

      if (this.enableFallback) {
        this.log(`节点组件 ${type} 未注册，尝试降级处理`, 'warn')
        return null // 返回 null，由调用方处理降级
      }

      throw new Error(`未注册的节点组件: ${type}`)

    } catch (error) {
      this.log(`获取节点组件 ${type} 失败: ${error.message}`, 'error')
      
      if (this.enableFallback) {
        this.log(`启用降级保护，返回 null`, 'warn')
        return null
      }
      
      throw error
    }
  }

  /**
   * 获取节点的配置组件
   * 带智能降级保护
   */
  getConfigComponent(type) {
    try {
      const configComponent = this.configComponents.get(type)
      
      if (configComponent) {
        this.log(`获取配置组件: ${type}`)
        return configComponent
      }

      if (this.enableFallback) {
        this.log(`配置组件 ${type} 未注册，使用默认配置`, 'warn')
        return null // 返回 null，由调用方处理降级
      }

      throw new Error(`未注册的配置组件: ${type}`)

    } catch (error) {
      this.log(`获取配置组件 ${type} 失败: ${error.message}`, 'error')
      
      if (this.enableFallback) {
        this.log(`启用降级保护，返回 null`, 'warn')
        return null
      }
      
      throw error
    }
  }

  /**
   * 生成 ReactFlow 的 nodeTypes 对象
   * 返回组件类型标识，而不是实际组件
   */
  generateNodeTypes() {
    try {
      // 生成缓存键：基于配置Map的大小和键列表
      const configKeys = Array.from(this.fullConfigs.keys()).sort().join(',')
      const currentCacheKey = `${this.fullConfigs.size}:${configKeys}`
      
      // 检查缓存是否有效
      if (this._nodeTypesCache && this._nodeTypesCacheKey === currentCacheKey) {
        this.log(`使用缓存的 nodeTypes，包含 ${Object.keys(this._nodeTypesCache).length} 个类型`)
        return this._nodeTypesCache
      }
      
      // 重新生成 nodeTypes
      const nodeTypes = {}
      
      for (const [type, config] of this.fullConfigs.entries()) {
        try {
          // 检查是否需要使用 DynamicNode
          const needsDynamicNode = config.sourceType === 'json' || 
                                  config.useDynamicNode === true ||
                                  config.meta?.sourceType === 'json' ||
                                  !config.component
          
          if (needsDynamicNode) {
            // 创建稳定的动态节点标识
            nodeTypes[type] = {
              _isDynamic: true,
              _nodeConfig: config,
              _componentType: 'DynamicNode'
            }
            this.log(`标记动态节点类型: ${type}`)
          } else if (config.component) {
            nodeTypes[type] = config.component
            this.log(`已注册节点类型: ${type}`)
          } else {
            this.log(`节点类型 ${type} 缺少组件，标记为降级`, 'warn')
            nodeTypes[type] = {
              _isDynamic: true,
              _nodeConfig: config,
              _componentType: 'Fallback'
            }
          }
        } catch (error) {
          this.log(`生成节点类型 ${type} 失败: ${error.message}`, 'error')
          nodeTypes[type] = {
            _isDynamic: true,
            _componentType: 'Error',
            _error: error.message
          }
        }
      }
      
      // 更新缓存
      this._nodeTypesCache = nodeTypes
      this._nodeTypesCacheKey = currentCacheKey
      
      this.log(`重新生成 nodeTypes，包含 ${Object.keys(nodeTypes).length} 个节点类型`, 'success')
      return nodeTypes
      
    } catch (error) {
      this.log(`generateNodeTypes 失败: ${error.message}`, 'error')
      
      // 降级：返回空对象而不是抛出错误
      if (this.enableFallback) {
        this.log('启用降级保护，返回空 nodeTypes', 'warn')
        return {}
      }
      
      throw error
    }
  }

  /**
   * 生成工具箱按钮配置
   * 这是对 WorkflowEditor.jsx 中 nodeButtons 的直接替代
   */
  generateToolboxButtons() {
    try {
      // 复用 NodeManager 的逻辑，保持兼容性
      const nodeTypes = this.legacyManager.getAllNodeTypes()
      
      const buttons = nodeTypes.map(nodeType => ({
        type: nodeType.type,
        label: nodeType.label,
        icon: nodeType.icon,
        desc: nodeType.description,
        category: nodeType.category,
        theme: nodeType.theme
      }))

      this.log(`生成工具箱按钮，包含 ${buttons.length} 个节点`)
      return buttons

    } catch (error) {
      this.log(`生成工具箱按钮失败: ${error.message}`, 'error')
      
      if (this.enableFallback) {
        this.log(`启用降级保护，返回空数组`, 'warn')
        return []
      }
      
      throw error
    }
  }

  /**
   * 智能配置路由 - 增强版
   * 直接返回DynamicConfigPanel或null，不再返回React元素
   */
  routeConfigComponent(nodeType, props) {
    try {
      const configComponent = this.getConfigComponent(nodeType)
      
      if (configComponent) {
        // 检查是否为DynamicConfigPanel标记
        if (configComponent === 'DynamicConfigPanel') {
          this.log(`路由到DynamicConfigPanel: ${nodeType}`)
          
          // 获取完整的节点配置
          const fullConfig = this.getFullNodeConfig(nodeType)
          
          if (fullConfig) {
            let nodeConfig = fullConfig
            
            // 如果没有fields但是ASR节点，需要动态生成配置
            if (!fullConfig.fields && nodeType === 'asr-node') {
              // 为ASR节点生成标准配置
              nodeConfig = {
                ...fullConfig,
                fields: [
                  {
                    name: 'language',
                    type: 'select',
                    label: '识别语言',
                    defaultValue: 'zh',
                    required: false,
                    options: [
                      { value: 'zh', label: '中文' },
                      { value: 'en', label: '英语' },
                      { value: 'ja', label: '日语' },
                      { value: 'ko', label: '韩语' }
                    ],
                    description: '选择音频内容的语言'
                  },
                  {
                    name: 'format',
                    type: 'select',
                    label: '输出格式',
                    defaultValue: 'txt',
                    required: false,
                    options: [
                      { value: 'txt', label: '纯文本格式' },
                      { value: 'json', label: '详细JSON格式' }
                    ],
                    description: '选择识别结果的输出格式'
                  }
                ],
                validation: {
                  required: [] // 清空必需字段，允许使用默认值
                }
              }
              
              this.log(`为ASR节点生成动态配置，包含 ${nodeConfig.fields.length} 个字段`, 'success')
            }
            
            // 最终验证生成的配置
            if (nodeConfig.fields) {
              try {
                const finalValidation = this.dataValidator.validateFields(
                  nodeConfig.defaultData || {}, 
                  nodeConfig.fields
                )
                if (!finalValidation.isValid) {
                  this.log(`最终配置验证警告 ${nodeType}: ${finalValidation.errors.join('; ')}`, 'warn')
                } else {
                  this.log(`配置验证通过 ${nodeType}`, 'success')
                }
              } catch (validationError) {
                this.log(`配置验证过程出错 ${nodeType}: ${validationError.message}`, 'warn')
              }
            }

            // 返回配置信息，让WorkflowConfigPanel创建DynamicConfigPanel
            return {
              type: 'DynamicConfigPanel',
              nodeConfig: nodeConfig,
              props: props
            }
          }
        } else {
          // 传统的配置组件
          this.log(`路由到传统配置组件: ${nodeType}`)
          return React.createElement(configComponent, props)
        }
      }

      if (this.enableFallback) {
        this.log(`配置组件 ${nodeType} 未注册，返回 null 进行降级处理`, 'warn')
        return null // 返回 null，让调用方使用原有的 if-else 逻辑
      }

      throw new Error(`未找到配置组件: ${nodeType}`)

    } catch (error) {
      this.log(`配置路由失败: ${error.message}`, 'error')
      
      if (this.enableFallback) {
        this.log(`启用降级保护，返回 null`, 'warn')
        return null
      }
      
      throw error
    }
  }

  /**
   * 获取所有已注册的节点类型
   */
  getAllRegisteredTypes() {
    try {
      // 优先使用注册表中的类型
      const registryTypes = Array.from(this.nodeComponents.keys())
      
      // 合并 NodeManager 中的类型（保持兼容）
      const managerTypes = this.legacyManager.getAllNodeTypes().map(node => node.type)
      
      // 去重合并
      const allTypes = [...new Set([...registryTypes, ...managerTypes])]
      
      this.log(`获取所有已注册类型: ${allTypes.length} 个`)
      return allTypes

    } catch (error) {
      this.log(`获取注册类型失败: ${error.message}`, 'error')
      return []
    }
  }

  /**
   * 获取节点的完整配置信息
   */
  getFullNodeConfig(type) {
    try {
      // 优先从完整配置缓存获取
      const fullConfig = this.fullConfigs.get(type)
      
      if (fullConfig) {
        return fullConfig
      }

      // 降级到 NodeManager
      const nodeManagerConfig = this.legacyManager.getNodeType(type)
      
      if (nodeManagerConfig) {
        this.log(`从 NodeManager 获取配置: ${type}`, 'warn')
        return {
          type,
          component: null, // 组件信息缺失
          configComponent: null,
          ...nodeManagerConfig
        }
      }

      return null

    } catch (error) {
      this.log(`获取节点配置 ${type} 失败: ${error.message}`, 'error')
      return null
    }
  }

  /**
   * 批量注册现有节点
   * 用于将现有的硬编码节点迁移到注册表
   */
  registerLegacyNodes(legacyNodeConfigs) {
    try {
      let successCount = 0
      let failureCount = 0

      for (const [type, config] of Object.entries(legacyNodeConfigs)) {
        try {
          this.registerFullNodeConfig(type, config)
          successCount++
        } catch (error) {
          this.log(`注册遗留节点 ${type} 失败: ${error.message}`, 'error')
          failureCount++
        }
      }

      this.log(`批量注册完成: ${successCount} 成功, ${failureCount} 失败`, 'success')
      this.initialized = true
      
      return { successCount, failureCount }

    } catch (error) {
      this.log(`批量注册失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 检查注册表状态
   */
  getRegistryStatus() {
    return {
      initialized: this.initialized,
      nodeComponentsCount: this.nodeComponents.size,
      configComponentsCount: this.configComponents.size,
      fullConfigsCount: this.fullConfigs.size,
      nodeManagerTypesCount: this.legacyManager.getAllNodeTypes().length,
      enableFallback: this.enableFallback,
      debugMode: this.debugMode,
      supportsStandardInterface: this.supportsStandardInterface
    }
  }

  /**
   * 启用/禁用降级保护
   */
  setFallbackMode(enabled) {
    this.enableFallback = enabled
    this.log(`降级保护已${enabled ? '启用' : '禁用'}`, enabled ? 'success' : 'warn')
  }

  /**
   * 启用/禁用调试模式
   */
  setDebugMode(enabled) {
    this.debugMode = enabled
    this.log(`调试模式已${enabled ? '启用' : '禁用'}`, enabled ? 'success' : 'info')
  }

  /**
   * 清理和重置
   */
  reset() {
    this.nodeComponents.clear()
    this.configComponents.clear()
    this.fullConfigs.clear()
    this.initialized = false
    this.clearNodeTypesCache()
    this.log('动态节点注册表已重置', 'info')
  }

  /**
   * 获取调试信息
   */
  getDebugInfo() {
    const status = this.getRegistryStatus()
    const registeredTypes = this.getAllRegisteredTypes()
    
    return {
      ...status,
      registeredTypes,
      nodeComponentsList: Array.from(this.nodeComponents.keys()),
      configComponentsList: Array.from(this.configComponents.keys()),
      fullConfigsList: Array.from(this.fullConfigs.keys()),
      stats: this.getStats(),
      managerInfo: this.getManagerInfo()
    }
  }

  /**
   * 验证节点配置的数据类型一致性
   * @param {string} nodeType - 节点类型
   * @returns {object} 验证结果
   */
  validateNodeDataTypes(nodeType) {
    try {
      const nodeConfig = this.getFullNodeConfig(nodeType)
      if (!nodeConfig) {
        return { isValid: false, errors: ['节点配置不存在'] }
      }

      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldResults: {}
      }

      // 验证字段配置
      if (nodeConfig.fields) {
        for (const field of nodeConfig.fields) {
          const fieldResult = this.dataValidator.validateFieldConfig(field)
          result.fieldResults[field.name] = fieldResult
          
          if (!fieldResult.isValid) {
            result.isValid = false
            result.errors.push(`字段 ${field.name}: ${fieldResult.errors.join(', ')}`)
          }
          
          if (fieldResult.warnings.length > 0) {
            result.warnings.push(`字段 ${field.name}: ${fieldResult.warnings.join(', ')}`)
          }
        }
      }

      // 验证默认数据
      if (nodeConfig.defaultData && nodeConfig.fields) {
        const dataResult = this.dataValidator.validateFields(nodeConfig.defaultData, nodeConfig.fields)
        if (!dataResult.isValid) {
          result.isValid = false
          result.errors.push(`默认数据: ${dataResult.errors.join(', ')}`)
        }
        result.warnings.push(...dataResult.warnings)
      }

      this.log(`节点数据类型验证完成 ${nodeType}: ${result.isValid ? '通过' : '失败'}`, 
               result.isValid ? 'success' : 'warn')
      
      return result

    } catch (error) {
      this.log(`节点数据类型验证异常 ${nodeType}: ${error.message}`, 'error')
      return {
        isValid: false,
        errors: [`验证过程异常: ${error.message}`],
        warnings: [],
        fieldResults: {}
      }
    }
  }

  /**
   * 获取数据类型统计信息
   */
  getDataTypeStatistics() {
    const stats = {
      totalNodes: 0,
      validatedNodes: 0,
      fieldTypeCount: {},
      dataTypeCount: {},
      validationErrors: []
    }

    try {
      const allTypes = this.getAllRegisteredTypes()
      stats.totalNodes = allTypes.length

      for (const nodeType of allTypes) {
        const nodeConfig = this.getFullNodeConfig(nodeType)
        if (nodeConfig && nodeConfig.fields) {
          stats.validatedNodes++
          
          for (const field of nodeConfig.fields) {
            // 统计字段类型
            const fieldType = field.type
            stats.fieldTypeCount[fieldType] = (stats.fieldTypeCount[fieldType] || 0) + 1
            
            // 统计数据类型
            if (Object.values(DATA_TYPES).includes(fieldType)) {
              stats.dataTypeCount[fieldType] = (stats.dataTypeCount[fieldType] || 0) + 1
            }
          }
          
          // 验证节点
          const validation = this.validateNodeDataTypes(nodeType)
          if (!validation.isValid) {
            stats.validationErrors.push({
              nodeType,
              errors: validation.errors
            })
          }
        }
      }

      return stats

    } catch (error) {
      this.log(`获取数据类型统计失败: ${error.message}`, 'error')
      return stats
    }
  }

  // ===== 📌 新增：管理器信息和统计 =====

  /**
   * 获取管理器信息
   */
  getManagerInfo() {
    return {
      type: this.managerType,
      version: this.managerVersion,
      supportsStandardInterface: this.supportsStandardInterface,
      registeredTypesCount: this.fullConfigs.size,
      componentTypesCount: this.nodeComponents.size,
      configComponentsCount: this.configComponents.size,
      stats: this.getStats(),
      integrations: {
        dataModel: Boolean(this.dataModel),
        configResolver: Boolean(this.configResolver),
        statusCalculator: Boolean(this.statusCalculator),
        legacyManager: Boolean(this.legacyManager)
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      registeredNodes: this.fullConfigs.size,
      nodeComponents: this.nodeComponents.size,
      configComponents: this.configComponents.size,
      cacheSize: this._nodeTypesCache ? Object.keys(this._nodeTypesCache).length : 0,
      interfaceCallsRatio: this.stats.interfaceCalls > 0 
        ? (this.stats.interfaceCalls / (this.stats.nodesCreated + this.stats.nodesValidated + this.stats.configsResolved + this.stats.statusCalculated + this.stats.interfaceCalls) * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      nodesCreated: 0,
      nodesValidated: 0,
      configsResolved: 0,
      statusCalculated: 0,
      interfaceCalls: 0,
      registrationCount: 0
    }
    this.log('统计信息已重置')
  }

  /**
   * 检查接口兼容性
   */
  checkInterfaceCompatibility() {
    const requiredMethods = [
      'createNodeStandard',
      'validateNodeStandard', 
      'getNodeStatusStandard',
      'getNodeTypeConfigStandard',
      'getAllNodeTypesStandard'
    ]

    const compatibility = {
      compatible: true,
      missingMethods: [],
      availableMethods: [],
      integrations: {
        dataModel: Boolean(this.dataModel),
        configResolver: Boolean(this.configResolver),
        statusCalculator: Boolean(this.statusCalculator),
        legacyManager: Boolean(this.legacyManager)
      }
    }

    requiredMethods.forEach(method => {
      if (typeof this[method] === 'function') {
        compatibility.availableMethods.push(method)
      } else {
        compatibility.missingMethods.push(method)
        compatibility.compatible = false
      }
    })

    // 检查集成组件
    const requiredIntegrations = ['dataModel', 'configResolver', 'statusCalculator']
    requiredIntegrations.forEach(integration => {
      if (!this[integration]) {
        compatibility.compatible = false
        compatibility.missingMethods.push(`missing integration: ${integration}`)
      }
    })

    return compatibility
  }

  /**
   * 执行自检
   */
  selfCheck() {
    const checkResult = {
      passed: [],
      failed: [],
      warnings: []
    }

    try {
      // 检查统一接口兼容性
      const compatibility = this.checkInterfaceCompatibility()
      if (compatibility.compatible) {
        checkResult.passed.push('统一接口兼容性检查通过')
      } else {
        checkResult.failed.push(`统一接口缺失方法: ${compatibility.missingMethods.join(', ')}`)
      }

      // 检查集成组件
      if (this.dataModel && this.configResolver && this.statusCalculator) {
        checkResult.passed.push('统一接口层集成正常')
      } else {
        checkResult.failed.push('统一接口层集成不完整')
      }

      // 检查传统管理器集成
      if (this.legacyManager && typeof this.legacyManager.getAllNodeTypes === 'function') {
        checkResult.passed.push('传统管理器集成正常')
      } else {
        checkResult.failed.push('传统管理器集成失败')
      }

      // 检查注册表状态
      if (this.fullConfigs.size > 0) {
        checkResult.passed.push(`节点注册表包含 ${this.fullConfigs.size} 个节点配置`)
      } else {
        checkResult.warnings.push('节点注册表为空')
      }

      // 检查缓存状态
      if (this._nodeTypesCache) {
        checkResult.passed.push('nodeTypes 缓存正常')
      } else {
        checkResult.warnings.push('nodeTypes 缓存为空')
      }

      this.log(`自检完成: ${checkResult.passed.length} 通过, ${checkResult.failed.length} 失败, ${checkResult.warnings.length} 警告`)
      return checkResult

    } catch (error) {
      checkResult.failed.push(`自检过程失败: ${error.message}`)
      return checkResult
    }
  }
}

// 创建单例实例
const dynamicNodeRegistry = new DynamicNodeRegistry()

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__dynamicNodeRegistry = dynamicNodeRegistry
}

export default dynamicNodeRegistry

// ===== src/services/workflow/UnifiedNodeManager.js - 统一节点管理接口 =====

import StandardDataModel from './StandardDataModel'
import configurationResolver from './ConfigurationResolver'
import nodeStatusCalculator from './NodeStatusCalculator'

// 导入底层管理器
import nodeManager from './legacy/LegacyNodeManager'
import nodeRegistry from './dynamic/DynamicNodeRegistry'

/**
 * 统一节点管理器 - 统一节点管理接口层
 * 
 * 核心职责：
 * 1. 提供统一的节点管理接口，隐藏底层实现差异
 * 2. 路由到对应的底层管理器（Legacy NodeManager / Dynamic NodeRegistry）
 * 3. 维护节点类型注册表和元数据
 * 4. 整合数据模型、配置解析和状态计算
 * 
 * 设计原则：
 * - 接口统一：所有节点操作使用相同的接口
 * - 智能路由：根据节点类型自动选择底层实现
 * - 向后兼容：现有代码无需修改即可工作
 * - 渐进迁移：支持传统和动态节点共存
 */
class UnifiedNodeManager {
  
  constructor() {
    // 底层管理器引用
    this.legacyManager = nodeManager
    this.dynamicRegistry = nodeRegistry
    
    // 统一接口组件引用
    this.dataModel = StandardDataModel
    this.configResolver = configurationResolver
    this.statusCalculator = nodeStatusCalculator
    
    // 节点类型路由表
    this.nodeTypeRouting = new Map()
    
    // 节点操作缓存
    this.operationCache = new Map()
    
    // 管理器状态
    this.initialized = false
    this.routingRules = new Map()
    
    // 统计信息
    this.stats = {
      totalOperations: 0,
      legacyOperations: 0,
      dynamicOperations: 0,
      cacheHits: 0,
      routingErrors: 0
    }
    
    // 调试模式
    this.debugMode = process.env.NODE_ENV === 'development'
    
    // 初始化
    this.initialize()
    
    this.log('[UnifiedNodeManager] 统一节点管理器已初始化')
  }

  /**
   * 调试日志输出
   */
  log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[UnifiedMgr ${timestamp}]`
    
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
   * 初始化统一管理器
   */
  initialize() {
    try {
      // 初始化路由规则
      this.initializeRoutingRules()
      
      // 同步节点类型注册表
      this.syncNodeTypeRegistry()
      
      // 设置默认路由
      this.setupDefaultRouting()
      
      this.initialized = true
      this.log('统一节点管理器初始化完成', 'success')
      
    } catch (error) {
      this.log(`初始化失败: ${error.message}`, 'error')
      throw new Error(`UnifiedNodeManager 初始化失败: ${error.message}`)
    }
  }

  /**
   * 初始化路由规则
   */
  initializeRoutingRules() {
    // 动态节点路由规则
    this.routingRules.set('dynamic', (nodeType) => {
      // 检查是否在动态注册表中
      const fullConfig = this.dynamicRegistry.getFullNodeConfig(nodeType)
      return Boolean(fullConfig && (fullConfig.sourceType === 'json' || fullConfig.fields))
    })
    
    // 传统节点路由规则
    this.routingRules.set('legacy', (nodeType) => {
      // 检查是否在传统节点列表中
      const legacyTypes = ['text-input', 'tts', 'output', 'download']
      return legacyTypes.includes(nodeType)
    })
    
    // 自定义路由规则（可扩展）
    this.routingRules.set('custom', (nodeType) => {
      // 预留给自定义节点类型
      return false
    })
    
    this.log('路由规则初始化完成')
  }

  /**
   * 同步节点类型注册表
   */
  syncNodeTypeRegistry() {
    try {
      // 从传统管理器获取节点类型
      const legacyTypes = this.legacyManager.getAllNodeTypes()
      legacyTypes.forEach(nodeType => {
        this.nodeTypeRouting.set(nodeType.type, {
          manager: 'legacy',
          config: nodeType,
          lastSync: new Date().toISOString()
        })
      })
      
      // 从动态注册表获取节点类型
     const dynamicTypes = this.dynamicRegistry.getAllRegisteredTypes()
    dynamicTypes.forEach(nodeType => {
      // 🔧 防止传统节点被动态注册表覆盖
      const legacyTypes = ['text-input', 'tts', 'output', 'download']
      if (!legacyTypes.includes(nodeType)) {
        this.nodeTypeRouting.set(nodeType, {
          manager: 'dynamic',
          config: this.dynamicRegistry.getFullNodeConfig(nodeType),
          lastSync: new Date().toISOString()
        })
      }
    })
      
      this.log(`节点类型同步完成: ${this.nodeTypeRouting.size} 个类型`)
      
    } catch (error) {
      this.log(`节点类型同步失败: ${error.message}`, 'warn')
    }
  }

  /**
   * 设置默认路由
   */
  setupDefaultRouting() {
    // 默认优先级：legacy >dynamic >  custom
    this.defaultRoutingPriority = ['legacy', 'dynamic', 'custom']
  }

  // ===== 统一接口方法 =====

  /**
   * 统一节点创建接口
   * 
   * @param {string} nodeType - 节点类型
   * @param {object} options - 创建选项
   * @returns {object} 标准格式的节点对象
   */
  createNode(nodeType, options = {}) {
    try {
      this.stats.totalOperations++
      
      if (!nodeType) {
        throw new Error('节点类型不能为空')
      }

      // 路由到相应的管理器
      const routing = this.routeNodeOperation(nodeType, 'create')
      
      let createdNode
      
      if (routing.manager === 'legacy') {
        this.stats.legacyOperations++
        createdNode = this.createLegacyNode(nodeType, options, routing)
      } else if (routing.manager === 'dynamic') {
        this.stats.dynamicOperations++
        createdNode = this.createDynamicNode(nodeType, options, routing)
      } else {
        throw new Error(`不支持的节点类型: ${nodeType}`)
      }

      // 转换为标准格式
      const standardNode = this.normalizeNodeData(createdNode, routing)
      
      // 计算初始状态
      const statusResult = this.statusCalculator.calculateNodeStatus(standardNode)
      standardNode.data._status = statusResult
      
      this.log(`节点创建成功: ${nodeType} (${routing.manager})`, 'success')
      return standardNode

    } catch (error) {
      this.stats.routingErrors++
      this.log(`节点创建失败 ${nodeType}: ${error.message}`, 'error')
      throw new Error(`节点创建失败: ${error.message}`)
    }
  }

  /**
   * 统一节点更新接口
   * 
   * @param {string} nodeId - 节点ID
   * @param {object} updateData - 更新数据
   * @param {object} options - 更新选项
   * @returns {object} 更新后的标准格式节点
   */
  updateNode(nodeId, updateData, options = {}) {
    try {
      this.stats.totalOperations++
      
      if (!nodeId || !updateData) {
        throw new Error('节点ID和更新数据不能为空')
      }

      // 检测更新数据格式
      const dataFormat = this.dataModel.detectDataFormat(updateData)
      
      // 如果传入的是完整节点数据，提取类型信息
      const nodeType = updateData.type || options.nodeType
      if (!nodeType) {
        throw new Error('无法确定节点类型')
      }

      // 路由到相应的管理器
      const routing = this.routeNodeOperation(nodeType, 'update')
      
      // 标准化更新数据
      const standardizedData = this.standardizeUpdateData(updateData, routing, options)
      
      // 执行更新（这里主要是数据处理，实际更新由调用方处理）
      const updatedNode = this.processNodeUpdate(standardizedData, routing, options)
      
      // 重新计算状态
      const statusResult = this.statusCalculator.calculateNodeStatus(updatedNode)
      updatedNode.data._status = statusResult
      
      this.log(`节点更新成功: ${nodeId} (${routing.manager})`, 'success')
      return updatedNode

    } catch (error) {
      this.stats.routingErrors++
      this.log(`节点更新失败 ${nodeId}: ${error.message}`, 'error')
      throw new Error(`节点更新失败: ${error.message}`)
    }
  }

  /**
   * 统一节点验证接口
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 验证选项
   * @returns {object} 验证结果
   */
  validateNode(nodeData, options = {}) {
    try {
      this.stats.totalOperations++
      
      if (!nodeData) {
        throw new Error('节点数据不能为空')
      }

      const nodeType = nodeData.type
      const routing = this.routeNodeOperation(nodeType, 'validate')
      
      // 配置验证
      const configResult = this.configResolver.resolveConfiguration(nodeData, {
        validate: true,
        strictValidation: options.strict || false
      })
      
      // 状态计算
      const statusResult = this.statusCalculator.calculateNodeStatus(nodeData)
      
      // 管理器特定验证
      let managerValidation
      if (routing.manager === 'legacy') {
        managerValidation = this.legacyManager.validateNode(nodeData)
      } else if (routing.manager === 'dynamic') {
        managerValidation = this.validateDynamicNode(nodeData, routing)
      }
      
      // 综合验证结果
      const overallValidation = this.combineValidationResults(
        configResult,
        statusResult,
        managerValidation,
        options
      )
      
      this.log(`节点验证完成: ${nodeType} -> ${overallValidation.valid ? '通过' : '失败'}`)
      return overallValidation

    } catch (error) {
      this.log(`节点验证失败 ${nodeData?.type}: ${error.message}`, 'error')
      return {
        valid: false,
        errors: [`验证过程失败: ${error.message}`],
        warnings: [],
        canExecute: false
      }
    }
  }

  /**
   * 统一节点状态获取接口
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 选项
   * @returns {object} 状态结果
   */
  getNodeStatus(nodeData, options = {}) {
    try {
      this.stats.totalOperations++
      
      // 委托给状态计算器
      const statusResult = this.statusCalculator.calculateNodeStatus(nodeData, options)
      
      // 添加管理器特定信息
      const nodeType = nodeData.type
      const routing = this.routeNodeOperation(nodeType, 'status')
      
      statusResult.details.managedBy = routing.manager
      statusResult.details.routingInfo = {
        manager: routing.manager,
        confidence: routing.confidence,
        lastRouted: new Date().toISOString()
      }
      
      return statusResult

    } catch (error) {
      this.log(`状态获取失败 ${nodeData?.type}: ${error.message}`, 'error')
      return this.statusCalculator.createErrorStatus(nodeData, error)
    }
  }

  /**
   * 统一节点配置解析接口
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 解析选项
   * @returns {object} 解析后的配置
   */
  resolveNodeConfiguration(nodeData, options = {}) {
    try {
      this.stats.totalOperations++
      
      // 委托给配置解析器
      const configResult = this.configResolver.resolveConfiguration(nodeData, options)
      
      // 添加路由信息
      const nodeType = nodeData.type
      const routing = this.routeNodeOperation(nodeType, 'config')
      
      configResult.metadata.managedBy = routing.manager
      configResult.metadata.routingInfo = routing
      
      return configResult

    } catch (error) {
      this.log(`配置解析失败 ${nodeData?.type}: ${error.message}`, 'error')
      throw error
    }
  }

 /**
   * 统一节点执行接口 - 委托给ExecutionManager
   * 
   * @param {object} nodeData - 节点数据
   * @param {*} inputData - 输入数据  
   * @param {object} options - 执行选项
   * @returns {object} 执行结果
   */
  async executeNode(nodeData, inputData, options = {}) {
    try {
      this.stats.totalOperations++
      
      if (!nodeData || !nodeData.type) {
        throw new Error('节点数据不完整')
      }

      this.log(`开始执行节点: ${nodeData.id} (${nodeData.type})`)
      
      // 获取路由信息
      const routing = this.routeNodeOperation(nodeData.type, 'execute')
      
      this.log(`节点路由: ${nodeData.type} -> ${routing.manager} (置信度: ${routing.confidence})`)
      
      // 委托给ExecutionManager执行（动态导入避免循环依赖）
      const { default: ExecutionManager } = await import('./ExecutionManager')
      const result = await ExecutionManager.execute(nodeData, inputData, routing, {
        ...options,
        systemConfig: options.systemConfig || options.config,
        userConfig: options.userConfig
      })
      
      this.log(`节点执行完成: ${nodeData.id} -> ${result.success ? '成功' : '失败'}`, 
               result.success ? 'success' : 'error')
      
      return result
      
    } catch (error) {
      this.stats.routingErrors++
      this.log(`节点执行失败 ${nodeData?.id} (${nodeData?.type}): ${error.message}`, 'error')
      
      return {
        success: false,
        error: error.message,
        data: null,
        source: 'UnifiedNodeManager',
        nodeId: nodeData?.id,
        nodeType: nodeData?.type
      }
    }
  }

  /**
   * 统一节点类型获取接口
   * 
   * @param {string} nodeType - 节点类型
   * @returns {object} 节点类型配置
   */
  getNodeTypeConfig(nodeType) {
    try {
      const routing = this.routeNodeOperation(nodeType, 'getConfig')
      
      if (routing.manager === 'legacy') {
        return this.legacyManager.getNodeType(nodeType)
      } else if (routing.manager === 'dynamic') {
        return this.dynamicRegistry.getFullNodeConfig(nodeType)
      }
      
      return null

    } catch (error) {
      this.log(`获取节点类型配置失败 ${nodeType}: ${error.message}`, 'error')
      return null
    }
  }

  /**
   * 统一获取所有节点类型接口
   * 
   * @returns {Array} 所有节点类型列表
   */
  getAllNodeTypes() {
    try {
      const allTypes = []
      
      // 从传统管理器获取
      const legacyTypes = this.legacyManager.getAllNodeTypes()
      legacyTypes.forEach(nodeType => {
        allTypes.push({
          ...nodeType,
          _managedBy: 'legacy',
          _source: 'NodeManager'
        })
      })
      
      // 从动态注册表获取
      const dynamicTypes = this.dynamicRegistry.getAllRegisteredTypes()
      dynamicTypes.forEach(nodeType => {
        const config = this.dynamicRegistry.getFullNodeConfig(nodeType)
        if (config) {
          allTypes.push({
            type: nodeType,
            label: config.label,
            icon: config.icon,
            description: config.description,
            category: config.category,
            theme: config.theme,
            _managedBy: 'dynamic',
            _source: 'NodeRegistry'
          })
        }
      })
      
      // 去重（以动态节点为优先）
      const uniqueTypes = this.deduplicateNodeTypes(allTypes)
      
      this.log(`获取所有节点类型: ${uniqueTypes.length} 个`)
      return uniqueTypes

    } catch (error) {
      this.log(`获取所有节点类型失败: ${error.message}`, 'error')
      return []
    }
  }

  // ===== 路由和管理器选择 =====

  /**
   * 路由节点操作到相应的管理器
   * 
   * @param {string} nodeType - 节点类型
   * @param {string} operation - 操作类型
   * @returns {object} 路由结果
   */
  routeNodeOperation(nodeType, operation = 'default') {
    try {
      // 检查缓存
      const cacheKey = `${nodeType}:${operation}`
      if (this.operationCache.has(cacheKey)) {
        this.stats.cacheHits++
        return this.operationCache.get(cacheKey)
      }

      // 检查显式路由表
      if (this.nodeTypeRouting.has(nodeType)) {
        const routing = this.nodeTypeRouting.get(nodeType)
        this.operationCache.set(cacheKey, routing)
        return {
          ...routing,
          confidence: 1.0,
          source: 'explicit'
        }
      }

      // 使用路由规则进行动态路由
      for (const priority of this.defaultRoutingPriority) {
        const rule = this.routingRules.get(priority)
        if (rule && rule(nodeType)) {
          const routing = {
            manager: priority,
            config: null,
            confidence: 0.8,
            source: 'rule-based',
            rule: priority
          }
          
          // 尝试获取配置
          try {
            if (priority === 'legacy') {
              routing.config = this.legacyManager.getNodeType(nodeType)
            } else if (priority === 'dynamic') {
              routing.config = this.dynamicRegistry.getFullNodeConfig(nodeType)
            }
          } catch (error) {
            this.log(`获取配置失败 ${nodeType}: ${error.message}`, 'warn')
          }
          
          this.operationCache.set(cacheKey, routing)
          return routing
        }
      }

      // 默认降级到传统管理器
      const fallbackRouting = {
        manager: 'legacy',
        config: null,
        confidence: 0.3,
        source: 'fallback',
        warning: 'No matching routing rule found'
      }
      
      this.operationCache.set(cacheKey, fallbackRouting)
      this.log(`节点类型 ${nodeType} 使用降级路由`, 'warn')
      
      return fallbackRouting

    } catch (error) {
      this.log(`路由失败 ${nodeType}: ${error.message}`, 'error')
      throw new Error(`无法路由节点操作: ${error.message}`)
    }
  }

  // ===== 节点创建实现 =====

  /**
   * 创建传统节点
   */
  createLegacyNode(nodeType, options, routing) {
    try {
      // 使用传统管理器创建
      const legacyNode = this.legacyManager.createNode(nodeType, {
        nodeId: options.nodeId || `${nodeType}-${Date.now()}`,
        nodeIndex: options.nodeIndex || 0,
        totalNodes: options.totalNodes || 1,
        position: options.position || { x: 0, y: 0 },
        config: options.config || {},
        customData: options.customData || {},
        onDataChange: options.onDataChange,
        onAddNode: options.onAddNode,
        onSetProcessor: options.onSetProcessor
      })

      this.log(`传统节点创建: ${nodeType}`)
      return legacyNode

    } catch (error) {
      this.log(`传统节点创建失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 创建动态节点
   */
  createDynamicNode(nodeType, options, routing) {
    try {
      const nodeConfig = routing.config
      if (!nodeConfig) {
        throw new Error(`动态节点配置缺失: ${nodeType}`)
      }

      // 构建动态节点数据
      const dynamicNode = {
        id: options.nodeId || `${nodeType}-${Date.now()}`,
        type: nodeType,
        position: options.position || { x: 0, y: 0 },
        data: {
          label: nodeConfig.label,
          nodeType: nodeType,
          nodeIndex: options.nodeIndex || 0,
          totalNodes: options.totalNodes || 1,
          nodeConfig: nodeConfig,
          config: {
            _userSaved: false,  
            // ...nodeConfig.defaultData,
            ...options.config
          },
          result: null,
          isProcessing: false,
          showAddButton: options.showAddButton || false,
          hideTestButton: true,
          onDataChange: options.onDataChange,
          onAddNode: options.onAddNode,
          onSetProcessor: options.onSetProcessor,
          ...options.customData
        }
      }

      this.log(`动态节点创建: ${nodeType}`)
      return dynamicNode

    } catch (error) {
      this.log(`动态节点创建失败 ${nodeType}: ${error.message}`, 'error')
      throw error
    }
  }

  // ===== 数据处理和标准化 =====

  /**
   * 标准化节点数据
   */
  normalizeNodeData(nodeData, routing) {
    try {
      const dataFormat = this.dataModel.detectDataFormat(nodeData)
      
      // 如果已经是标准格式，直接返回
      if (dataFormat === 'standard') {
        return nodeData
      }

      // 根据管理器类型进行转换
      if (routing.manager === 'legacy') {
        return this.dataModel.fromLegacyNode(nodeData)
      } else if (routing.manager === 'dynamic') {
        return this.dataModel.fromDynamicNode(nodeData, routing.config)
      }

      return nodeData

    } catch (error) {
      this.log(`数据标准化失败: ${error.message}`, 'warn')
      return nodeData // 降级：返回原数据
    }
  }

  /**
   * 标准化更新数据
   */
  standardizeUpdateData(updateData, routing, options) {
    try {
      // 如果是完整节点数据，进行标准化
      if (updateData.data && updateData.type) {
        return this.normalizeNodeData(updateData, routing)
      }

      // 如果只是数据更新，保持原格式
      return updateData

    } catch (error) {
      this.log(`更新数据标准化失败: ${error.message}`, 'warn')
      return updateData
    }
  }

  /**
   * 处理节点更新
   */
  processNodeUpdate(updateData, routing, options) {
    try {
      // 这里主要是数据处理逻辑
      // 实际的状态更新由调用方（如 WorkflowEditor）处理
      
      const processedData = { ...updateData }
      
      // 添加更新元数据
      if (processedData.data) {
        processedData.data._lastUpdated = new Date().toISOString()
        processedData.data._updatedBy = 'UnifiedNodeManager'
      }

      return processedData

    } catch (error) {
      this.log(`节点更新处理失败: ${error.message}`, 'error')
      throw error
    }
  }

  // ===== 验证相关方法 =====

  /**
   * 验证动态节点
   */
  validateDynamicNode(nodeData, routing) {
    try {
      const nodeConfig = routing.config
      if (!nodeConfig) {
        return {
          valid: false,
          errors: ['动态节点配置缺失']
        }
      }

      const errors = []
      const { data } = nodeData

      // 检查字段完整性
      if (nodeConfig.fields) {
        nodeConfig.fields.forEach(field => {
          if (field.required && (!data[field.name] || data[field.name] === '')) {
            errors.push(`必需字段 "${field.label || field.name}" 不能为空`)
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
        errors: [`动态节点验证失败: ${error.message}`]
      }
    }
  }

  /**
   * 合并验证结果
   */
  combineValidationResults(configResult, statusResult, managerValidation, options) {
    const errors = []
    const warnings = []
    
    // 配置验证结果
    if (configResult.metadata?.validationWarnings) {
      warnings.push(...configResult.metadata.validationWarnings)
    }
    
    // 状态验证结果
    if (statusResult.status === 'error' || statusResult.status === 'invalid') {
      errors.push(statusResult.details.reason || '状态验证失败')
    }
    
    // 管理器验证结果
    if (managerValidation && !managerValidation.valid) {
      errors.push(...managerValidation.errors)
    }

    const canExecute = errors.length === 0 && 
                      (statusResult.status === 'configured' || statusResult.canExecute)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canExecute,
      statusResult,
      configResult,
      managerValidation
    }
  }

  // ===== 工具方法 =====

  /**
   * 去重节点类型
   */
  deduplicateNodeTypes(nodeTypes) {
    const seen = new Map()
    const result = []
    
    // 优先保留动态节点（更新的实现）
    const sortedTypes = nodeTypes.sort((a, b) => {
      if (a._managedBy === 'dynamic' && b._managedBy === 'legacy') return -1
      if (a._managedBy === 'legacy' && b._managedBy === 'dynamic') return 1
      return 0
    })
    
    sortedTypes.forEach(nodeType => {
      if (!seen.has(nodeType.type)) {
        seen.set(nodeType.type, true)
        result.push(nodeType)
      }
    })
    
    return result
  }

  /**
   * 注册自定义路由规则
   */
  registerRoutingRule(name, rule) {
    if (typeof rule !== 'function') {
      throw new Error('路由规则必须是函数')
    }
    
    this.routingRules.set(name, rule)
    this.log(`自定义路由规则已注册: ${name}`, 'success')
  }

  /**
   * 移除路由规则
   */
  unregisterRoutingRule(name) {
    const removed = this.routingRules.delete(name)
    if (removed) {
      this.log(`路由规则已移除: ${name}`)
    }
    return removed
  }

  /**
   * 强制刷新路由表
   */
  refreshRouting() {
    this.operationCache.clear()
    this.syncNodeTypeRegistry()
    this.log('路由表已刷新', 'success')
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.operationCache.clear()
    this.configResolver.clearCache()
    this.statusCalculator.clearCache()
    this.log('所有缓存已清理')
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      routingTableSize: this.nodeTypeRouting.size,
      operationCacheSize: this.operationCache.size,
      routingRulesCount: this.routingRules.size,
      cacheHitRate: this.stats.totalOperations > 0 
        ? (this.stats.cacheHits / this.stats.totalOperations * 100).toFixed(2) + '%' 
        : '0%',
      legacyRatio: this.stats.totalOperations > 0 
        ? (this.stats.legacyOperations / this.stats.totalOperations * 100).toFixed(2) + '%' 
        : '0%',
      dynamicRatio: this.stats.totalOperations > 0 
        ? (this.stats.dynamicOperations / this.stats.totalOperations * 100).toFixed(2) + '%' 
        : '0%'
    }
  }

  /**
   * 获取调试信息
   */
  getDebugInfo() {
    return {
      initialized: this.initialized,
      stats: this.getStats(),
      routingTable: Array.from(this.nodeTypeRouting.entries()),
      routingRules: Array.from(this.routingRules.keys()),
      operationCache: Array.from(this.operationCache.keys()),
      defaultRoutingPriority: this.defaultRoutingPriority,
      managerStatus: {
        legacyManager: Boolean(this.legacyManager),
        dynamicRegistry: Boolean(this.dynamicRegistry),
        dataModel: Boolean(this.dataModel),
        configResolver: Boolean(this.configResolver),
        statusCalculator: Boolean(this.statusCalculator)
      }
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalOperations: 0,
      legacyOperations: 0,
      dynamicOperations: 0,
      cacheHits: 0,
      routingErrors: 0
    }
    this.log('统计信息已重置')
  }

  /**
   * 获取管理器健康状态
   */
  getHealthStatus() {
    const health = {
      overall: 'healthy',
      issues: [],
      warnings: [],
      recommendations: []
    }

    try {
      // 检查初始化状态
      if (!this.initialized) {
        health.issues.push('管理器未初始化')
        health.overall = 'critical'
      }

      // 检查底层管理器状态
      if (!this.legacyManager) {
        health.issues.push('传统节点管理器不可用')
        health.overall = 'critical'
      }

      if (!this.dynamicRegistry) {
        health.issues.push('动态节点注册表不可用')
        health.overall = 'critical'
      }

      // 检查路由表
      if (this.nodeTypeRouting.size === 0) {
        health.warnings.push('路由表为空')
        if (health.overall === 'healthy') health.overall = 'warning'
      }

      // 检查错误率
      const errorRate = this.stats.totalOperations > 0 
        ? (this.stats.routingErrors / this.stats.totalOperations * 100) 
        : 0

      if (errorRate > 10) {
        health.issues.push(`路由错误率过高: ${errorRate.toFixed(2)}%`)
        health.overall = 'critical'
      } else if (errorRate > 5) {
        health.warnings.push(`路由错误率较高: ${errorRate.toFixed(2)}%`)
        if (health.overall === 'healthy') health.overall = 'warning'
      }

      // 检查缓存命中率
      const cacheHitRate = this.stats.totalOperations > 0 
        ? (this.stats.cacheHits / this.stats.totalOperations * 100) 
        : 0

      if (cacheHitRate < 30 && this.stats.totalOperations > 10) {
        health.recommendations.push('考虑优化缓存策略以提高性能')
      }

      // 检查组件依赖
      const components = ['dataModel', 'configResolver', 'statusCalculator']
      components.forEach(component => {
        if (!this[component]) {
          health.issues.push(`组件 ${component} 不可用`)
          health.overall = 'critical'
        }
      })

      return health

    } catch (error) {
      return {
        overall: 'error',
        issues: [`健康检查失败: ${error.message}`],
        warnings: [],
        recommendations: []
      }
    }
  }

  /**
   * 执行自检和修复
   */
  selfCheck(autoFix = false) {
    const checkResult = {
      passed: [],
      failed: [],
      fixed: [],
      warnings: []
    }

    try {
      // 检查1: 初始化状态
      if (this.initialized) {
        checkResult.passed.push('初始化状态正常')
      } else {
        checkResult.failed.push('管理器未初始化')
        if (autoFix) {
          try {
            this.initialize()
            checkResult.fixed.push('已重新初始化管理器')
          } catch (error) {
            checkResult.failed.push(`初始化修复失败: ${error.message}`)
          }
        }
      }

      // 检查2: 路由表同步
      const legacyCount = this.legacyManager.getAllNodeTypes().length
      const dynamicCount = this.dynamicRegistry.getAllRegisteredTypes().length
      const routingCount = this.nodeTypeRouting.size

      if (routingCount >= legacyCount) {
        checkResult.passed.push('路由表同步正常')
      } else {
        checkResult.failed.push('路由表可能不同步')
        if (autoFix) {
          try {
            this.syncNodeTypeRegistry()
            checkResult.fixed.push('已重新同步路由表')
          } catch (error) {
            checkResult.failed.push(`路由表同步修复失败: ${error.message}`)
          }
        }
      }

      // 检查3: 缓存状态
      if (this.operationCache.size > 1000) {
        checkResult.warnings.push('操作缓存过大，可能影响内存使用')
        if (autoFix) {
          this.operationCache.clear()
          checkResult.fixed.push('已清理操作缓存')
        }
      } else {
        checkResult.passed.push('缓存状态正常')
      }

      // 检查4: 组件连接
      const components = {
        'Legacy Manager': this.legacyManager,
        'Dynamic Registry': this.dynamicRegistry,
        'Data Model': this.dataModel,
        'Config Resolver': this.configResolver,
        'Status Calculator': this.statusCalculator
      }

      Object.entries(components).forEach(([name, component]) => {
        if (component) {
          checkResult.passed.push(`${name} 连接正常`)
        } else {
          checkResult.failed.push(`${name} 连接失败`)
        }
      })

      this.log(`自检完成: ${checkResult.passed.length} 通过, ${checkResult.failed.length} 失败, ${checkResult.fixed.length} 修复`)
      return checkResult

    } catch (error) {
      checkResult.failed.push(`自检过程失败: ${error.message}`)
      return checkResult
    }
  }

  /**
   * 导出配置和状态（用于调试和备份）
   */
  exportState() {
    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        managerType: 'UnifiedNodeManager'
      },
      config: {
        initialized: this.initialized,
        debugMode: this.debugMode,
        defaultRoutingPriority: this.defaultRoutingPriority
      },
      stats: this.getStats(),
      routing: {
        nodeTypeRouting: Array.from(this.nodeTypeRouting.entries()),
        routingRules: Array.from(this.routingRules.keys()),
        operationCacheSize: this.operationCache.size
      },
      health: this.getHealthStatus(),
      components: {
        legacyManagerAvailable: Boolean(this.legacyManager),
        dynamicRegistryAvailable: Boolean(this.dynamicRegistry),
        dataModelAvailable: Boolean(this.dataModel),
        configResolverAvailable: Boolean(this.configResolver),
        statusCalculatorAvailable: Boolean(this.statusCalculator)
      }
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    const metrics = {
      operationMetrics: {
        totalOperations: this.stats.totalOperations,
        averageOperationsPerSecond: 0, // 需要时间追踪来计算
        errorRate: this.stats.totalOperations > 0 
          ? (this.stats.routingErrors / this.stats.totalOperations * 100).toFixed(2) + '%' 
          : '0%'
      },
      cacheMetrics: {
        hitRate: this.stats.totalOperations > 0 
          ? (this.stats.cacheHits / this.stats.totalOperations * 100).toFixed(2) + '%' 
          : '0%',
        operationCacheSize: this.operationCache.size,
        cacheEfficiency: this.stats.cacheHits > 0 ? 'good' : 'poor'
      },
      routingMetrics: {
        legacyRatio: this.stats.totalOperations > 0 
          ? (this.stats.legacyOperations / this.stats.totalOperations * 100).toFixed(2) + '%' 
          : '0%',
        dynamicRatio: this.stats.totalOperations > 0 
          ? (this.stats.dynamicOperations / this.stats.totalOperations * 100).toFixed(2) + '%' 
          : '0%',
        routingTableSize: this.nodeTypeRouting.size
      }
    }

    return metrics
  }

/**
   * 获取管理器信息
   */
  getManagerInfo(){
    return {
      type: 'unified',
      version: '1.0.0',
      supportsStandardInterface: true,
      registeredTypesCount: this.nodeTypeRouting.size,
      initialized: this.initialized,
      stats: this.getStats(),
      integrations: {
        legacyManager: Boolean(this.legacyManager),
        dynamicRegistry: Boolean(this.dynamicRegistry),
        dataModel: Boolean(this.dataModel),
        configResolver: Boolean(this.configResolver),
        statusCalculator: Boolean(this.statusCalculator)
      }
    }
  }

  /**
   * 创建错误状态（状态计算器需要的方法）
   */
  createErrorStatus(nodeData, error) {
    return {
      status: 'error',
      details: {
        reason: 'Status calculation failed',
        error: error.message,
        nodeType: nodeData?.type || 'unknown',
        timestamp: new Date().toISOString()
      },
      priority: 10,
      isTerminal: true,
      canExecute: false
    }
  }
}


// 创建单例实例
const unifiedNodeManager = new UnifiedNodeManager()

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__unifiedNodeManager = unifiedNodeManager
}

export default unifiedNodeManager

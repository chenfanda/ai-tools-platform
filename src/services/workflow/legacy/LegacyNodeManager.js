// ===== src/services/workflow/legacy/LegacyNodeManager.js - 适配统一接口的传统节点管理器 =====

import StandardDataModel from '../StandardDataModel'

/**
 * 传统节点管理器 - 适配统一接口版本
 * 
 * 改造目标：
 * 1. 实现 UnifiedNodeManager 定义的统一接口
 * 2. 保持现有功能完全不变
 * 3. 添加标准数据模型支持
 * 4. 提供向后兼容保护
 * 
 * 改造原则：
 * - 零破坏：原有代码继续工作
 * - 接口统一：实现标准化的节点管理接口
 * - 数据标准：支持标准数据模型转换
 * - 渐进迁移：为未来升级做准备
 */
class LegacyNodeManager {
  constructor() {
    // 注册的节点类型
    this.registeredTypes = new Map()
    
    // 节点配置模板
    this.nodeTemplates = new Map()
    
    // 📌 新增：统一接口标识
    this.managerType = 'legacy'
    this.managerVersion = '1.0.0'
    this.supportsStandardInterface = true
    
    // 📌 新增：数据模型引用
    this.dataModel = StandardDataModel
    
    // 📌 新增：统计信息
    this.stats = {
      nodesCreated: 0,
      nodesValidated: 0,
      dataConversions: 0,
      interfaceCalls: 0
    }
    
    // 调试模式
    this.debugMode = process.env.NODE_ENV === 'development'
    
    // 默认节点配置
    this.initializeDefaultTypes()
    
    this.log('[LegacyNodeManager] 传统节点管理器已初始化（统一接口版本）')
  }

  /**
   * 调试日志输出
   */
  log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[LegacyMgr ${timestamp}]`
    
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
   * 统一接口：创建节点
   * 
   * @param {string} nodeType - 节点类型
   * @param {object} options - 创建选项
   * @returns {object} 标准格式的节点对象
   */
  createNodeStandard(nodeType, options = {}) {
    try {
      this.stats.interfaceCalls++
      this.stats.nodesCreated++
      
      this.log(`统一接口创建节点: ${nodeType}`)
      
      // 使用原有方法创建传统节点
      const legacyNode = this.createNode(nodeType, options)
      
      // 转换为标准格式
      const standardNode = this.dataModel.fromLegacyNode(legacyNode)
      this.stats.dataConversions++
      
      // 添加管理器标识
      standardNode.data._metadata.managedBy = 'legacy'
      standardNode.data._metadata.managerVersion = this.managerVersion
      
      this.log(`节点创建成功 (标准格式): ${nodeType}`, 'success')
      return standardNode
      
    } catch (error) {
      this.log(`统一接口创建节点失败 ${nodeType}: ${error.message}`, 'error')
      throw new Error(`Legacy node creation failed: ${error.message}`)
    }
  }

  /**
   * 统一接口：验证节点
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 验证选项
   * @returns {object} 统一格式的验证结果
   */
  validateNodeStandard(nodeData, options = {}) {
    try {
      this.stats.interfaceCalls++
      this.stats.nodesValidated++
      
      // 检测数据格式并转换
      const legacyNode = this.ensureLegacyFormat(nodeData)
      
      // 使用原有验证方法
      const legacyValidation = this.validateNode(legacyNode)
      
      // 转换为统一格式
      const standardValidation = this.convertValidationResult(legacyValidation, nodeData, options)
      
      this.log(`节点验证完成: ${nodeData.type} -> ${standardValidation.valid ? '通过' : '失败'}`)
      return standardValidation
      
    } catch (error) {
      this.log(`统一接口验证失败 ${nodeData?.type}: ${error.message}`, 'error')
      return {
        valid: false,
        errors: [`Legacy validation failed: ${error.message}`],
        warnings: [],
        canExecute: false,
        source: 'legacy',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * 统一接口：获取节点状态
   * 
   * @param {object} nodeData - 节点数据
   * @param {object} options - 选项
   * @returns {object} 统一格式的状态结果
   */
  getNodeStatusStandard(nodeData, options = {}) {
    try {
      this.stats.interfaceCalls++
      
      // 检测数据格式并转换
      const legacyNode = this.ensureLegacyFormat(nodeData)
      
      // 使用原有状态计算
      const legacyStatus = this.getNodeStatus(legacyNode)
      
      // 转换为统一格式
      const standardStatus = this.convertStatusResult(legacyStatus, nodeData, options)
      
      return standardStatus
      
    } catch (error) {
      this.log(`统一接口状态获取失败 ${nodeData?.type}: ${error.message}`, 'error')
      return {
        status: 'error',
        details: {
          reason: 'Legacy status calculation failed',
          error: error.message,
          source: 'legacy'
        },
        priority: 10,
        isTerminal: true,
        canExecute: false
      }
    }
  }

  /**
   * 统一接口：获取节点类型配置
   * 
   * @param {string} nodeType - 节点类型
   * @returns {object} 统一格式的节点配置
   */
  getNodeTypeConfigStandard(nodeType) {
    try {
      this.stats.interfaceCalls++
      
      // 使用原有方法获取配置
      const legacyConfig = this.getNodeType(nodeType)
      
      if (!legacyConfig) {
        return null
      }
      
      // 转换为统一格式
      const standardConfig = this.convertNodeTypeConfig(legacyConfig, nodeType)
      
      return standardConfig
      
    } catch (error) {
      this.log(`获取节点类型配置失败 ${nodeType}: ${error.message}`, 'error')
      return null
    }
  }

  /**
   * 统一接口：获取所有节点类型
   * 
   * @returns {Array} 统一格式的节点类型列表
   */
  getAllNodeTypesStandard() {
    try {
      this.stats.interfaceCalls++
      
      // 使用原有方法获取所有类型
      const legacyTypes = this.getAllNodeTypes()
      
      // 转换为统一格式
      const standardTypes = legacyTypes.map(nodeType => ({
        ...nodeType,
        _source: 'legacy',
        _manager: 'LegacyNodeManager',
        _version: this.managerVersion,
        _supportsStandardInterface: true
      }))
      
      return standardTypes
      
    } catch (error) {
      this.log(`获取所有节点类型失败: ${error.message}`, 'error')
      return []
    }
  }

  // ===== 📌 数据格式转换方法 =====

  /**
   * 确保数据为传统格式
   */
  ensureLegacyFormat(nodeData) {
    try {
      const dataFormat = this.dataModel.detectDataFormat(nodeData)
      
      if (dataFormat === 'legacy') {
        return nodeData
      } else if (dataFormat === 'standard') {
        return this.dataModel.toLegacyNode(nodeData)
      } else {
        // 尝试自动转换
        this.log(`尝试自动转换未知格式: ${dataFormat}`, 'warn')
        return nodeData
      }
      
    } catch (error) {
      this.log(`数据格式转换失败: ${error.message}`, 'warn')
      return nodeData // 降级：返回原数据
    }
  }

  /**
   * 转换验证结果为统一格式
   */
  convertValidationResult(legacyValidation, originalNodeData, options) {
    const standardValidation = {
      valid: legacyValidation.valid,
      errors: legacyValidation.errors || [],
      warnings: [],
      canExecute: legacyValidation.valid,
      source: 'legacy',
      timestamp: new Date().toISOString(),
      nodeType: originalNodeData.type,
      dataFormat: this.dataModel.detectDataFormat(originalNodeData)
    }

    // 添加额外的传统节点特定验证信息
    if (options.includeDetails) {
      standardValidation.details = {
        legacyValidation: legacyValidation,
        managerType: this.managerType,
        originalErrors: legacyValidation.errors
      }
    }

    return standardValidation
  }

  /**
   * 转换状态结果为统一格式
   */
  convertStatusResult(legacyStatus, originalNodeData, options) {
    // 映射传统状态到标准状态
    const statusMapping = {
      'configured': 'configured',
      'waiting': 'waiting', 
      'processing': 'processing',
      'error': 'error',
      'success': 'success'
    }

    const standardStatus = statusMapping[legacyStatus] || 'unknown'

    return {
      status: standardStatus,
      details: {
        legacyStatus: legacyStatus,
        reason: `Legacy status: ${legacyStatus}`,
        nodeType: originalNodeData.type,
        source: 'legacy',
        calculatedAt: new Date().toISOString()
      },
      priority: this.getStatusPriority(standardStatus),
      isTerminal: this.isTerminalStatus(standardStatus),
      canExecute: standardStatus === 'configured'
    }
  }

  /**
   * 转换节点类型配置为统一格式
   */
  convertNodeTypeConfig(legacyConfig, nodeType) {
    return {
      ...legacyConfig,
      _source: 'legacy',
      _manager: 'LegacyNodeManager',
      _nodeType: nodeType,
      _supportsStandardInterface: true,
      _convertedAt: new Date().toISOString(),
      
      // 添加统一接口的标准字段
      standardInterface: {
        createMethod: 'createNodeStandard',
        validateMethod: 'validateNodeStandard',
        statusMethod: 'getNodeStatusStandard'
      }
    }
  }

  /**
   * 获取状态优先级
   */
  getStatusPriority(status) {
    const priorities = {
      'error': 10,
      'processing': 8,
      'success': 5,
      'configured': 4,
      'waiting': 1,
      'unknown': 0
    }
    return priorities[status] || 0
  }

  /**
   * 检查是否为终端状态
   */
  isTerminalStatus(status) {
    const terminalStatuses = ['success', 'error']
    return terminalStatuses.includes(status)
  }

  // ===== 原有方法保持不变 =====

  /**
   * 初始化默认节点类型
   */
  initializeDefaultTypes() {
    // 📌 保持原有逻辑完全不变
    
    // 文本输入节点
    this.registerNodeType('text-input', {
      label: '文本输入',
      icon: '📝',
      description: '输入文本内容',
      theme: 'purple',
      category: 'input',
      defaultData: {
        text: '',
        placeholder: '请输入文本内容...'
      },
      validation: {
        required: ['text'],
        textMinLength: 1
      }
    })

    // TTS节点
    this.registerNodeType('tts', {
      label: '语音合成',
      icon: '🎤',
      description: '文字转语音',
      theme: 'purple',
      category: 'processor',
      defaultData: {
        mode: 'character',
        character: '',
        selectedCharacter: '',
        gender: '',
        pitch: '',
        speed: '',
        result: null
      },
      validation: {
        required: ['mode'],
        conditionalRequired: {
          character: ['selectedCharacter'],
          custom: ['username', 'voice_id']
        }
      }
    })

    // 输出节点
    this.registerNodeType('output', {
      label: '结果输出',
      icon: '📤',
      description: '输出最终结果',
      theme: 'orange',
      category: 'output',
      defaultData: {
        result: null,
        timestamp: null
      },
      validation: {
        required: []
      }
    })

    // 下载节点
    this.registerNodeType('download', {
      label: '文件下载',
      icon: '📥',
      description: '下载文件到本地',
      theme: 'green',
      category: 'output',
      defaultData: {
        autoDownload: false,
        customFileName: '',
        customPath: '',
        downloadFormat: 'auto',
        showProgress: true,
        allowRetry: true,
        result: null
      },
      validation: {
        required: []
      }
    })
  }

  /**
   * 注册新的节点类型
   * @param {string} type - 节点类型
   * @param {object} config - 节点配置
   */
  registerNodeType(type, config) {
    this.registeredTypes.set(type, {
      ...config,
      type,
      registeredAt: new Date().toISOString()
    })
  }

  /**
   * 获取已注册的节点类型
   * @param {string} type - 节点类型
   * @returns {object|null} 节点配置
   */
  getNodeType(type) {
    return this.registeredTypes.get(type) || null
  }

  /**
   * 获取所有已注册的节点类型
   * @returns {Array} 节点类型列表
   */
  getAllNodeTypes() {
    return Array.from(this.registeredTypes.entries()).map(([type, config]) => ({
      type,
      ...config
    }))
  }

  /**
   * 按分类获取节点类型
   * @param {string} category - 分类名称
   * @returns {Array} 该分类的节点类型
   */
  getNodeTypesByCategory(category) {
    return this.getAllNodeTypes().filter(node => node.category === category)
  }

  /**
   * 创建新节点
   * @param {string} type - 节点类型
   * @param {object} options - 创建选项
   * @returns {object} 新节点对象
   */
  createNode(type, options = {}) {
    const nodeConfig = this.getNodeType(type)
    if (!nodeConfig) {
      throw new Error(`未知的节点类型: ${type}`)
    }

    const {
      nodeId = `${type}-${Date.now()}`,
      nodeIndex = 0,
      totalNodes = 1,
      position = { x: 0, y: 0 },
      config = {},
      customData = {}
    } = options

    return {
      id: nodeId,
      type: type,
      position: position,
      data: {
        label: nodeConfig.label,
        nodeType: type,
        nodeIndex: nodeIndex,
        totalNodes: totalNodes,
        config: config,
        ...nodeConfig.defaultData,
        ...customData,
        // 回调函数由调用方提供
        onDataChange: options.onDataChange || (() => {}),
        onAddNode: options.onAddNode || (() => {}),
        hideTestButton: true
      }
    }
  }

  /**
   * 计算节点位置
   * @param {number} index - 节点索引
   * @param {object} layoutConfig - 布局配置
   * @returns {object} 位置坐标 {x, y}
   */
  calculateNodePosition(index, layoutConfig = {}) {
    const {
      startX = 400,
      startY = 100,
      verticalSpacing = 180,
      horizontalSpacing = 350
    } = layoutConfig

    // 默认垂直堆叠布局
    return {
      x: startX,
      y: startY + index * verticalSpacing
    }
  }

  /**
   * 重新布局节点列表
   * @param {Array} nodes - 节点列表
   * @param {object} layoutConfig - 布局配置
   * @returns {Array} 重新布局后的节点列表
   */
  relayoutNodes(nodes, layoutConfig = {}) {
    return nodes.map((node, index) => ({
      ...node,
      position: this.calculateNodePosition(index, layoutConfig),
      data: {
        ...node.data,
        nodeIndex: index,
        totalNodes: nodes.length
      }
    }))
  }

  /**
   * 验证节点配置
   * @param {object} node - 节点对象
   * @returns {object} 验证结果 {valid: boolean, errors: Array}
   */
  validateNode(node) {
    const nodeConfig = this.getNodeType(node.type)
    if (!nodeConfig) {
      return {
        valid: false,
        errors: [`未知的节点类型: ${node.type}`]
      }
    }

    const errors = []
    const validation = nodeConfig.validation || {}

    // 检查必需字段
    if (validation.required) {
      validation.required.forEach(field => {
        if (!node.data[field] || node.data[field] === '') {
          errors.push(`字段 "${field}" 是必需的`)
        }
      })
    }

    // 检查条件必需字段
    if (validation.conditionalRequired) {
      Object.entries(validation.conditionalRequired).forEach(([condition, fields]) => {
        if (node.data.mode === condition) {
          fields.forEach(field => {
            if (!node.data[field] || node.data[field] === '') {
              errors.push(`在 "${condition}" 模式下，字段 "${field}" 是必需的`)
            }
          })
        }
      })
    }

    // 检查文本长度
    if (validation.textMinLength && node.data.text) {
      if (node.data.text.length < validation.textMinLength) {
        errors.push(`文本长度至少需要 ${validation.textMinLength} 个字符`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取节点状态
   * @param {object} node - 节点对象
   * @returns {string} 节点状态 (configured, waiting, processing, error, success)
   */
  getNodeStatus(node) {
    const validation = this.validateNode(node)
    
    if (!validation.valid) {
      return 'waiting'
    }

    if (node.data.result) {
      return node.data.result.error ? 'error' : 'success'
    }

    if (node.data.isProcessing) {
      return 'processing'
    }

    return 'configured'
  }

  /**
   * 插入节点到指定位置
   * @param {Array} nodes - 原节点列表
   * @param {object} newNode - 新节点
   * @param {number} insertIndex - 插入位置索引
   * @returns {Array} 更新后的节点列表
   */
  insertNodeAtPosition(nodes, newNode, insertIndex) {
    const targetIndex = insertIndex !== null ? insertIndex + 1 : nodes.length
    
    let newNodes
    if (insertIndex !== null) {
      // 插入到指定位置
      newNodes = [
        ...nodes.slice(0, targetIndex),
        newNode,
        ...nodes.slice(targetIndex)
      ]
    } else {
      // 添加到末尾
      newNodes = [...nodes, newNode]
    }
    
    // 重新布局
    return this.relayoutNodes(newNodes)
  }

  /**
   * 删除节点
   * @param {Array} nodes - 原节点列表
   * @param {Array} nodeIdsToDelete - 要删除的节点ID列表
   * @returns {Array} 更新后的节点列表
   */
  deleteNodes(nodes, nodeIdsToDelete) {
    const remainingNodes = nodes.filter(node => !nodeIdsToDelete.includes(node.id))
    return this.relayoutNodes(remainingNodes)
  }

  /**
   * 获取节点主题配置
   * @param {string} theme - 主题名称
   * @returns {object} 主题配置
   */
  getNodeTheme(theme) {
    const themes = {
      blue: { primary: '#3B82F6', secondary: '#EFF6FF' },
      purple: { primary: '#8B5CF6', secondary: '#F3E8FF' },
      orange: { primary: '#F97316', secondary: '#FFF7ED' },
      green: { primary: '#10B981', secondary: '#ECFDF5' },
      red: { primary: '#EF4444', secondary: '#FEF2F2' }
    }
    
    return themes[theme] || themes.blue
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
      registeredTypesCount: this.registeredTypes.size,
      stats: this.getStats()
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      registeredTypes: this.registeredTypes.size,
      cacheEfficiency: this.stats.interfaceCalls > 0 ? 'good' : 'unknown'
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      nodesCreated: 0,
      nodesValidated: 0,
      dataConversions: 0,
      interfaceCalls: 0
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
      availableMethods: []
    }

    requiredMethods.forEach(method => {
      if (typeof this[method] === 'function') {
        compatibility.availableMethods.push(method)
      } else {
        compatibility.missingMethods.push(method)
        compatibility.compatible = false
      }
    })

    return compatibility
  }
}

// 创建单例实例
const legacyNodeManager = new LegacyNodeManager()

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__legacyNodeManager = legacyNodeManager
}

export default legacyNodeManager

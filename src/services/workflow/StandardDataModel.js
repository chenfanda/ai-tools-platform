// ===== src/services/workflow/StandardDataModel.js - 统一数据标准 =====

/**
 * 统一数据模型 - 工作流节点数据标准化
 * 
 * 核心职责：
 * 1. 定义统一的节点数据结构标准
 * 2. 解决传统节点和动态节点数据存储不一致问题
 * 3. 提供数据转换方法，确保双向兼容
 * 4. 为后续的配置解析和状态计算提供数据基础
 * 
 * 设计原则：
 * - 向后兼容：不破坏现有数据结构
 * - 渐进迁移：支持新旧格式并存
 * - 数据完整性：确保配置数据不丢失
 * - 类型安全：提供清晰的数据类型定义
 */

/**
 * 标准节点数据结构定义
 * 
 * 基于对现有代码的分析：
 * - 传统节点：配置直接存储在 node.data 根级别
 * - 动态节点：配置可能存储在 node.data.config 或通过 nodeConfig 传递
 * - 工作流数据：通过 onDataChange 回调更新
 */
class StandardDataModel {
  
  /**
   * 标准节点数据结构模板
   * 
   * 这是所有节点应该遵循的统一格式
   */
  static get STANDARD_NODE_STRUCTURE() {
    return {
      // ===== 节点标识信息 =====
      id: '',                    // 节点唯一标识
      type: '',                  // 节点类型（如 'text-input', 'tts'）
      
      // ===== 节点位置信息 =====
      position: {
        x: 0,
        y: 0
      },
      
      // ===== 节点数据容器 =====
      data: {
        // --- 基础元数据 ---
        label: '',               // 节点显示标签
        nodeType: '',            // 节点类型（冗余，保持兼容）
        nodeIndex: 0,            // 节点在工作流中的索引
        totalNodes: 1,           // 工作流中节点总数
        
        // --- 配置数据 ---
        config: {},              // 📌 统一配置存储位置
        
        // --- 执行状态 ---
        result: null,            // 执行结果
        isProcessing: false,     // 是否正在处理
        
        // --- 显示控制 ---
        showAddButton: false,    // 是否显示添加按钮
        hideTestButton: true,    // 是否隐藏测试按钮
        
        // --- 回调函数 ---
        onDataChange: null,      // 数据变化回调
        onAddNode: null,         // 添加节点回调
        onSetProcessor: null,    // 设置处理器回调
        
        // --- 节点特定数据 ---
        // 传统节点的字段会直接存储在这里（保持兼容）
        // 动态节点通过 nodeConfig 定义结构
        
        // --- 扩展元数据 ---
        _metadata: {
          sourceType: 'legacy',  // 数据源类型：'legacy' | 'dynamic' | 'json'
          version: '1.0',        // 数据模型版本
          migratedAt: null,      // 迁移时间戳
          originalStructure: null // 原始数据结构备份
        }
      }
    }
  }

  /**
   * 数据字段类型定义
   * 
   * 为配置验证和UI生成提供类型信息
   */
  static get FIELD_TYPES() {
    return {
      // 基础类型
      TEXT: 'text',
      TEXTAREA: 'textarea',
      NUMBER: 'number',
      BOOLEAN: 'boolean',
      
      // 选择类型
      SELECT: 'select',
      RADIO: 'radio',
      CHECKBOX: 'checkbox',
      
      // 高级类型
      FILE: 'file',
      DATE: 'date',
      COLOR: 'color',
      RANGE: 'range',
      
      // 自定义类型
      JSON: 'json',
      ARRAY: 'array',
      OBJECT: 'object'
    }
  }

  /**
   * 节点状态枚举
   */
  static get NODE_STATUS() {
    return {
      WAITING: 'waiting',       // 等待配置
      CONFIGURED: 'configured', // 已配置
      PROCESSING: 'processing', // 处理中
      SUCCESS: 'success',       // 成功
      ERROR: 'error',          // 错误
      DISABLED: 'disabled'      // 禁用
    }
  }

  /**
   * 检测节点数据格式类型
   * 
   * @param {object} nodeData - 节点数据
   * @returns {string} 数据格式类型：'legacy' | 'dynamic' | 'standard'
   */
  static detectDataFormat(nodeData) {
    if (!nodeData || typeof nodeData !== 'object') {
      return 'unknown'
    }

    // 检查是否为标准格式
    if (nodeData.data && nodeData.data._metadata && nodeData.data._metadata.sourceType) {
      return 'standard'
    }

    // 🔧 修复：检查是否为动态节点格式
    if (nodeData.data && nodeData.data.nodeConfig) {
      return 'dynamic'
    }
    
    // 🔧 新增：检查是否通过外部传递了 nodeConfig（DynamicExecutor的情况）
    if (nodeData.nodeConfig) {
      return 'dynamic'
    }
    
    // 🔧 新增：根据节点类型判断是否为动态节点
    if (nodeData.type && this.isDynamicNodeType(nodeData.type)) {
      return 'dynamic'
    }

    // 检查是否为传统节点格式
    if (nodeData.data && nodeData.type && nodeData.data.nodeType) {
      return 'legacy'
    }
    
    // 🔧 新增：根据节点类型判断是否为传统节点
    if (nodeData.type && this.isLegacyNodeType(nodeData.type)) {
      return 'legacy'
    }

    return 'unknown'
  }

  /**
   * 🔧 新增：判断是否为动态节点类型
   */
  static isDynamicNodeType(nodeType) {
    const dynamicNodeTypes = [
      'asr-node',
      'media-input', 
      'simple-test'
      // 可以扩展更多动态节点类型
    ]
    
    // 包含连字符的通常是动态节点
    return dynamicNodeTypes.includes(nodeType) || nodeType.includes('-')
  }

  /**
   * 🔧 新增：判断是否为传统节点类型
   */
  static isLegacyNodeType(nodeType) {
    const legacyNodeTypes = [
      'text-input',
      'tts', 
      'output',
      'download'
    ]
    
    return legacyNodeTypes.includes(nodeType)
  }

  /**
   * 传统节点数据 → 标准格式
   * 
   * 分析得出传统节点的特征：
   * - 配置数据直接存储在 data 根级别（如 text, mode, character 等）
   * - 有 config 字段但通常存储外部配置（如 API 地址）
   * - 通过 onDataChange 更新数据
   * 
   * @param {object} legacyNode - 传统节点数据
   * @returns {object} 标准格式节点数据
   */
  static fromLegacyNode(legacyNode) {
    try {
      if (!legacyNode || !legacyNode.data) {
        throw new Error('无效的传统节点数据')
      }

      const { data } = legacyNode
      
      // 提取传统节点的配置字段
      const legacyFields = this.extractLegacyConfigFields(data)
      
      // 创建标准结构
      const standardNode = {
        id: legacyNode.id,
        type: legacyNode.type,
        position: legacyNode.position || { x: 0, y: 0 },
        data: {
          // 基础元数据
          label: data.label || '',
          nodeType: data.nodeType || legacyNode.type,
          nodeIndex: data.nodeIndex || 0,
          totalNodes: data.totalNodes || 1,
          
          // 📌 关键：将传统配置迁移到统一位置
          config: {
            // 保留原有的外部配置
            ...data.config,
            // 将传统字段迁移到配置中
            ...legacyFields
          },
          
          // 执行状态
          result: data.result || null,
          isProcessing: data.isProcessing || false,
          
          // 显示控制
          showAddButton: data.showAddButton || false,
          hideTestButton: data.hideTestButton !== false,
          
          // 回调函数
          onDataChange: data.onDataChange || null,
          onAddNode: data.onAddNode || null,
          onSetProcessor: data.onSetProcessor || null,
          
          // 保持向后兼容：传统字段仍然存储在根级别
          ...legacyFields,
          
          // 扩展元数据
          _metadata: {
            sourceType: 'legacy',
            version: '1.0',
            migratedAt: new Date().toISOString(),
            originalStructure: {
              preservedFields: Object.keys(legacyFields),
              originalConfigKeys: Object.keys(data.config || {})
            }
          }
        }
      }

      return standardNode

    } catch (error) {
      console.error('[StandardDataModel] 传统节点转换失败:', error)
      throw new Error(`传统节点数据转换失败: ${error.message}`)
    }
  }

  /**
   * 动态节点数据 → 标准格式
   * 
   * 分析得出动态节点的特征：
   * - 通过 nodeConfig 定义字段结构
   * - 配置数据可能存储在多个位置
   * - 使用 fieldValues 管理配置
   * 
   * @param {object} dynamicNode - 动态节点数据
   * @param {object} nodeConfig - 节点配置定义
   * @returns {object} 标准格式节点数据
   */
  static fromDynamicNode(dynamicNode, nodeConfig = null) {
    try {
      if (!dynamicNode || !dynamicNode.data) {
        throw new Error('无效的动态节点数据')
      }

      const { data } = dynamicNode
      const config = nodeConfig || data.nodeConfig
      
      if (!config) {
        throw new Error('缺少节点配置定义')
      }

      // 提取动态节点的配置数据
      const dynamicConfigData = this.extractDynamicConfigFields(data, config)
      
      // 创建标准结构
      const standardNode = {
        id: dynamicNode.id,
        type: dynamicNode.type,
        position: dynamicNode.position || { x: 0, y: 0 },
        data: {
          // 基础元数据
          label: config.label || data.label || '',
          nodeType: config.type || dynamicNode.type,
          nodeIndex: data.nodeIndex || 0,
          totalNodes: data.totalNodes || 1,
          
          // 📌 关键：统一配置存储
          config: {
            // 节点定义的默认数据
            ...config.defaultData,
            // 用户配置的数据
            ...dynamicConfigData,
            // 保留原有配置
            ...data.config
          },
          
          // 执行状态
          result: data.result || null,
          isProcessing: data.isProcessing || false,
          
          // 显示控制
          showAddButton: data.showAddButton || false,
          hideTestButton: data.hideTestButton !== false,
          
          // 回调函数
          onDataChange: data.onDataChange || null,
          onAddNode: data.onAddNode || null,
          onSetProcessor: data.onSetProcessor || null,
          
          // 节点配置引用
          nodeConfig: config,
          
          // 扩展元数据
          _metadata: {
            sourceType: 'dynamic',
            version: '1.0',
            migratedAt: new Date().toISOString(),
            originalStructure: {
              nodeConfigType: config.type,
              fieldsCount: config.fields ? config.fields.length : 0,
              hasValidation: Boolean(config.validation)
            }
          }
        }
      }

      return standardNode

    } catch (error) {
      console.error('[StandardDataModel] 动态节点转换失败:', error)
      throw new Error(`动态节点数据转换失败: ${error.message}`)
    }
  }

  /**
   * 标准格式 → 传统节点数据
   * 
   * 确保传统节点组件能正常工作
   * 
   * @param {object} standardNode - 标准格式节点数据
   * @returns {object} 传统节点格式数据
   */
  static toLegacyNode(standardNode) {
    try {
      if (!standardNode || !standardNode.data) {
        throw new Error('无效的标准节点数据')
      }

      const { data } = standardNode
      
      // 如果原本就是传统格式，直接返回
      if (data._metadata && data._metadata.sourceType === 'legacy') {
        // 恢复原始传统结构，但保持配置同步
        const legacyNode = {
          id: standardNode.id,
          type: standardNode.type,
          position: standardNode.position,
          data: {
            // 基础信息
            label: data.label,
            nodeType: data.nodeType,
            nodeIndex: data.nodeIndex,
            totalNodes: data.totalNodes,
            
            // 📌 关键：将统一配置分解回传统字段
            ...this.extractConfigToLegacyFields(data.config, standardNode.type),
            
            // 保留原有的外部配置结构
            config: this.extractExternalConfig(data.config),
            
            // 执行状态
            result: data.result,
            isProcessing: data.isProcessing,
            
            // 显示控制
            showAddButton: data.showAddButton,
            hideTestButton: data.hideTestButton,
            
            // 回调函数
            onDataChange: data.onDataChange,
            onAddNode: data.onAddNode,
            onSetProcessor: data.onSetProcessor
          }
        }
        
        return legacyNode
      }

      // 从其他格式转换为传统格式
      throw new Error('暂不支持从非传统格式转换为传统格式')

    } catch (error) {
      console.error('[StandardDataModel] 标准转传统格式失败:', error)
      throw new Error(`标准转传统格式失败: ${error.message}`)
    }
  }

  /**
   * 标准格式 → 动态节点数据
   * 
   * 确保动态节点组件能正常工作
   * 
   * @param {object} standardNode - 标准格式节点数据
   * @returns {object} 动态节点格式数据
   */
  static toDynamicNode(standardNode) {
    try {
      if (!standardNode || !standardNode.data) {
        throw new Error('无效的标准节点数据')
      }

      const { data } = standardNode
      
      // 动态节点需要有 nodeConfig
      if (!data.nodeConfig) {
        throw new Error('缺少动态节点配置')
      }

      const dynamicNode = {
        id: standardNode.id,
        type: standardNode.type,
        position: standardNode.position,
        data: {
          // 基础信息
          label: data.label,
          nodeType: data.nodeType,
          nodeIndex: data.nodeIndex,
          totalNodes: data.totalNodes,
          
          // 节点配置
          nodeConfig: data.nodeConfig,
          
          // 📌 关键：配置数据保持在统一位置
          config: data.config,
          
          // 执行状态
          result: data.result,
          isProcessing: data.isProcessing,
          
          // 显示控制
          showAddButton: data.showAddButton,
          hideTestButton: data.hideTestButton,
          
          // 回调函数
          onDataChange: data.onDataChange,
          onAddNode: data.onAddNode,
          onSetProcessor: data.onSetProcessor
        }
      }

      return dynamicNode

    } catch (error) {
      console.error('[StandardDataModel] 标准转动态格式失败:', error)
      throw new Error(`标准转动态格式失败: ${error.message}`)
    }
  }

  /**
   * 智能数据格式自动转换
   * 
   * 根据节点类型和目标格式自动选择转换方法
   * 
   * @param {object} nodeData - 原始节点数据
   * @param {string} targetFormat - 目标格式：'standard' | 'legacy' | 'dynamic'
   * @param {object} options - 转换选项
   * @returns {object} 转换后的节点数据
   */
  static autoConvert(nodeData, targetFormat = 'standard', options = {}) {
    try {
      const currentFormat = this.detectDataFormat(nodeData)
      
      // 如果已经是目标格式，直接返回
      if (currentFormat === targetFormat) {
        return nodeData
      }

      // 转换逻辑
      switch (targetFormat) {
        case 'standard':
          if (currentFormat === 'legacy') {
            return this.fromLegacyNode(nodeData)
          } else if (currentFormat === 'dynamic') {
            return this.fromDynamicNode(nodeData, options.nodeConfig)
          }
          break
          
        case 'legacy':
          if (currentFormat === 'standard') {
            return this.toLegacyNode(nodeData)
          }
          break
          
        case 'dynamic':
          if (currentFormat === 'standard') {
            return this.toDynamicNode(nodeData)
          }
          break
      }

      throw new Error(`不支持从 ${currentFormat} 转换为 ${targetFormat}`)

    } catch (error) {
      console.error('[StandardDataModel] 自动转换失败:', error)
      throw new Error(`数据格式自动转换失败: ${error.message}`)
    }
  }

  // ===== 数据流处理方法 =====

  /**
   * 标准化节点输出数据 - 配置驱动版本
   * 
   * 在节点执行完成后，将输出数据转换为统一的 WorkflowData 格式
   * 
   * @param {string} nodeType - 节点类型
   * @param {*} nodeOutput - 节点原始输出数据
   * @param {string} nodeId - 节点ID
   * @param {object} nodeConfig - 节点JSON配置
   * @returns {object} 标准化的 WorkflowData 格式数据
   */
  static normalizeNodeOutput(nodeType, nodeOutput, nodeId, nodeConfig = null) {
    try {
      console.log(`[StandardDataModel] 标准化 ${nodeType} 节点输出:`, nodeOutput)
      
      // 🔧 核心修复：区分传统节点和动态节点的处理方式
      if (this.isLegacyNodeType(nodeType)) {
        // 传统节点：使用原有逻辑，确保兼容性
        console.log(`[StandardDataModel] 传统节点使用原有标准化逻辑`)
        return this.normalizeLegacyNodeOutput(nodeType, nodeOutput, nodeId)
      }
      
      if (this.isDynamicNodeType(nodeType)) {
        // 动态节点：根据JSON配置处理
        console.log(`[StandardDataModel] 动态节点使用配置驱动标准化`)
        return this.normalizeDynamicNodeOutput(nodeType, nodeOutput, nodeId, nodeConfig)
      }
      
      // 未知节点类型：使用原有逻辑作为降级
      console.log(`[StandardDataModel] 未知节点类型，使用降级逻辑`)
      return this.normalizeLegacyNodeOutput(nodeType, nodeOutput, nodeId)

    } catch (error) {
      console.error(`[StandardDataModel] 标准化失败: ${error.message}`)
      return this.createWorkflowData('error', { error: error.message }, {
        nodeId,
        source: nodeType,
        errorType: 'normalization_failed'
      })
    }
  }

  /**
   * 🔧 新增：传统节点输出标准化（保持原有逻辑）
   */
  static normalizeLegacyNodeOutput(nodeType, nodeOutput, nodeId) {
    // 如果已经是标准 WorkflowData 格式，直接返回
    if (this.isWorkflowData(nodeOutput)) {
      console.log(`[StandardDataModel] 传统节点数据已是 WorkflowData 格式`)
      return nodeOutput
    }

    // 根据节点类型和数据特征进行标准化
    const workflowData = this.createWorkflowDataFromOutput(nodeType, nodeOutput, nodeId)
    
    console.log(`[StandardDataModel] ${nodeType} 传统节点标准化完成:`, workflowData.getPreview())
    return workflowData
  }

  /**
   * 🔧 新增：动态节点输出标准化（配置驱动）
   */
  static normalizeDynamicNodeOutput(nodeType, nodeOutput, nodeId, nodeConfig) {
    try {
      // 🔧 关键原则：如果已经是 WorkflowData，尊重节点的输出意图
      if (this.isWorkflowData(nodeOutput)) {
        console.log(`[StandardDataModel] 动态节点已输出 WorkflowData，保持原格式`)
        return nodeOutput
      }

      // 🔧 关键原则：如果有 outputSchema，严格按照配置处理
      if (nodeConfig && nodeConfig.outputSchema) {
        return this.standardizeByOutputSchema(nodeType, nodeOutput, nodeId, nodeConfig.outputSchema)
      }

      // 🔧 降级：没有配置时的最小处理
      console.log(`[StandardDataModel] 动态节点无 outputSchema，最小化处理`)
      
      // 直接返回原数据，不强制转换
      if (nodeOutput instanceof File) {
        console.log(`[StandardDataModel] 保持 File 对象格式`)
        return nodeOutput
      }
      
      if (typeof nodeOutput === 'string') {
        console.log(`[StandardDataModel] 保持字符串格式`)
        return nodeOutput
      }
      
      // 其他情况，创建通用的 WorkflowData
      return this.createWorkflowData('data', nodeOutput, {
        nodeId,
        source: nodeType,
        preserveOriginal: true
      })

    } catch (error) {
      console.error(`[StandardDataModel] 动态节点标准化失败: ${error.message}`)
      return nodeOutput // 降级：返回原数据
    }
  }

  /**
   * 🔧 新增：根据 outputSchema 进行标准化
   */
  static standardizeByOutputSchema(nodeType, nodeOutput, nodeId, outputSchema) {
    try {
      const firstOutputKey = Object.keys(outputSchema)[0]
      const expectedType = outputSchema[firstOutputKey]?.type
      
      console.log(`[StandardDataModel] 按 outputSchema 标准化: ${nodeType} 期望 ${expectedType}`)
      
      switch (expectedType) {
        case 'File':
          // 期望 File 对象
          if (nodeOutput instanceof File) {
            console.log(`[StandardDataModel] File 对象符合期望，直接返回`)
            return nodeOutput
          }
          break
          
        case 'string':
          // 期望字符串
          if (typeof nodeOutput === 'string') {
            console.log(`[StandardDataModel] 字符串符合期望，创建文本 WorkflowData`)
            return this.createWorkflowData('text', { text: nodeOutput }, {
              nodeId,
              source: nodeType
            })
          }
          break
          
        case 'object':
          // 期望对象
          if (typeof nodeOutput === 'object' && nodeOutput !== null) {
            console.log(`[StandardDataModel] 对象符合期望，创建数据 WorkflowData`)
            return this.createWorkflowData('data', nodeOutput, {
              nodeId,
              source: nodeType
            })
          }
          break
          
        default:
          console.log(`[StandardDataModel] 未知期望类型 ${expectedType}，保持原格式`)
          return nodeOutput
      }
      
      // 类型不匹配时的处理
      console.warn(`[StandardDataModel] 输出类型不匹配: 期望 ${expectedType}, 实际 ${typeof nodeOutput}`)
      return nodeOutput // 保持原格式，不强制转换
      
    } catch (error) {
      console.error(`[StandardDataModel] outputSchema 标准化失败:`, error)
      return nodeOutput // 降级：返回原数据
    }
  }

  /**
   * 为目标节点准备输入数据
   * 
   * 将标准化的数据转换为目标节点期望的格式
   * 
   * @param {*} sourceData - 源数据
   * @param {string} targetNodeType - 目标节点类型
   * @returns {*} 目标节点期望格式的数据
   */
  static prepareNodeInput(sourceData, targetNodeType) {
    try {
      if (!sourceData) {
        console.log(`[StandardDataModel] 没有源数据传递给 ${targetNodeType}`)
        return null
      }

      console.log(`[StandardDataModel] 为 ${targetNodeType} 准备输入数据:`, sourceData)

      // 🔧 修复：区分传统节点和动态节点的输入处理
      if (this.isLegacyNodeType(targetNodeType)) {
        // 传统节点：使用原有转换逻辑
        return this.prepareLegacyNodeInput(sourceData, targetNodeType)
      }
      
      if (this.isDynamicNodeType(targetNodeType)) {
        // 动态节点：直接传递数据，让 DynamicAdapter 处理
        console.log(`[StandardDataModel] 动态节点直接传递数据给 DynamicAdapter`)
        return sourceData
      }
      
      // 未知节点：使用传统逻辑
      return this.prepareLegacyNodeInput(sourceData, targetNodeType)

    } catch (error) {
      console.error(`[StandardDataModel] 输入准备失败: ${error.message}`)
      return sourceData
    }
  }

  /**
   * 🔧 新增：为传统节点准备输入（保持原有逻辑）
   */
  static prepareLegacyNodeInput(sourceData, targetNodeType) {
    // 确保数据是标准格式
    const workflowData = this.isWorkflowData(sourceData) 
      ? sourceData 
      : this.normalizeNodeOutput('unknown', sourceData, 'temp')

    // 转换为目标节点期望的格式
    const compatibleInput = this.convertToTargetFormat(workflowData, targetNodeType)

    console.log(`[StandardDataModel] ${targetNodeType} 传统节点输入准备完成:`, {
      originalType: workflowData.type,
      compatibleFormat: typeof compatibleInput
    })

    return compatibleInput
  }

  // ===== 工具方法：WorkflowData 创建和处理 =====

  /**
   * 检查数据是否为 WorkflowData 格式
   */
  static isWorkflowData(data) {
    return data && 
           typeof data === 'object' && 
           data.type && 
           data.content && 
           data.metadata &&
           typeof data.getPreview === 'function'
  }

  /**
   * 从节点输出创建 WorkflowData
   */
  static createWorkflowDataFromOutput(nodeType, nodeOutput, nodeId) {
    // 根据数据特征智能识别类型
    
    // 1. 字符串类型 (text-input 节点输出)
    if (typeof nodeOutput === 'string') {
      return this.createWorkflowData('text', { text: nodeOutput }, {
        nodeId,
        source: nodeType,
        originalFormat: 'string'
      })
    }

// 2. 音频数据检测 (tts 节点输出)
    if (this.isAudioData(nodeOutput)) {
      const audioInfo = this.extractAudioInfo(nodeOutput)
      return this.createWorkflowData('audio', { audio: audioInfo }, {
        nodeId,
        source: nodeType,
        originalFormat: 'legacy_audio',
        originalText: nodeOutput.metadata?.originalText || nodeOutput.originalText
      })
    }

    // 3. 错误数据检测
    if (nodeOutput?.error || nodeOutput instanceof Error) {
      return this.createWorkflowData('error', { 
        error: nodeOutput.error || nodeOutput.message 
      }, {
        nodeId,
        source: nodeType,
        originalFormat: 'error'
      })
    }

    // 4. 对象类型的文本数据 (某些节点可能返回 {text: "..."})
    if (nodeOutput?.text || nodeOutput?.content?.text) {
      const text = nodeOutput.text || nodeOutput.content.text
      return this.createWorkflowData('text', { text }, {
        nodeId,
        source: nodeType,
        originalFormat: 'object_text'
      })
    }

    // 5. 默认作为数据对象处理
    return this.createWorkflowData('data', nodeOutput, {
      nodeId,
      source: nodeType,
      originalFormat: 'object'
    })
  }

  /**
   * 转换为目标节点格式
   */
  static convertToTargetFormat(workflowData, targetNodeType) {
    switch (targetNodeType) {
      case 'text-input':
        // text-input 节点期望接收字符串
        if (workflowData.type === 'text') {
          return workflowData.content.text
        }
        return String(workflowData.content)
      
      case 'tts':
        // tts 节点可以接收字符串
        if (workflowData.type === 'text') {
          return workflowData.content.text
        }
        if (workflowData.metadata?.originalText) {
          return workflowData.metadata.originalText
        }
        return String(workflowData.content)
      
      case 'download':
      case 'output':
        // 这些节点接收完整的 WorkflowData
        return workflowData
      
      default:
        // 其他节点类型，返回完整的 WorkflowData
        console.log(`[StandardDataModel] 未知节点类型 ${targetNodeType}，返回完整数据`)
        return workflowData
    }
  }

  /**
   * 创建 WorkflowData 对象
   */
  static createWorkflowData(type, content, metadata = {}) {
    const workflowData = {
      type: type,
      content: content,
      metadata: {
        timestamp: Date.now(),
        nodeId: null,
        ...metadata
      },
      
      // 添加 getPreview 方法
      getPreview() {
        return StandardDataModel.getWorkflowDataPreview(this)
      }
    }

    return workflowData
  }

  /**
   * 检查是否为音频数据
   */
  static isAudioData(data) {
    return data?.content?.audio || 
           data?.audio_id || 
           data?.audio_url ||
           (data?.type === 'audio')
  }

  /**const legacyTypes = ['text-input', 'tts', 'output', 'download']
   * 提取音频信息
   */
  static extractAudioInfo(data) {
    if (data.content?.audio) {
      return data.content.audio
    }
    
    return {
      id: data.audio_id,
      url: data.audio_url || data.url,
      name: data.name || `audio_${Date.now()}.wav`,
      size: data.file_size || data.size,
      format: data.format || 'wav',
      type: data.type || 'audio/wav'
    }
  }

  /**
   * 检查是否为下载数据
   */
  static isDownloadData(data) {
    return data?.fileName || 
           data?.downloadInfo || 
           data?.canDownload ||
           (data?.type === 'download')
  }

  /**
   * 获取 WorkflowData 预览信息
   */
  static getWorkflowDataPreview(workflowData) {
    switch (workflowData.type) {
      case 'text':
        const text = workflowData.content.text || ''
        return {
          type: '📝 文本',
          summary: text.length > 50 ? text.substring(0, 50) + '...' : text,
          details: `${text.length} 字符`,
          displayType: 'text'
        }
      
      case 'audio':
        const audio = workflowData.content.audio || {}
        return {
          type: '🎵 音频',
          summary: audio.name || 'audio.wav',
          details: `格式: ${audio.format || 'wav'}, 大小: ${this.formatFileSize(audio.size)}`,
          displayType: 'audio',
          audioData: audio
        }
      
      case 'error':
        return {
          type: '❌ 错误',
          summary: workflowData.content.error || 'Unknown error',
          details: `来源: ${workflowData.metadata.source || 'unknown'}`,
          displayType: 'error'
        }
      
      case 'download':
        const download = workflowData.content.download || {}
        return {
          type: '📥 下载',
          summary: download.fileName || 'download',
          details: `类型: ${download.type || 'unknown'}, 大小: ${this.formatFileSize(download.size)}`,
          displayType: 'download'
        }
      
      case 'data':
        return {
          type: '📊 数据',
          summary: 'Data object',
          details: `${Object.keys(workflowData.content).length} 个属性`,
          displayType: 'data'
        }
      
      default:
        return {
          type: `📄 ${workflowData.type}`,
          summary: 'Unknown content',
          details: `类型: ${workflowData.type}`,
          displayType: 'unknown'
        }
    }
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes) {
    if (!bytes || typeof bytes !== 'number') return 'unknown'
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // ===== 私有工具方法 =====

  /**
   * 提取传统节点的配置字段
   * 
   * 基于代码分析，传统节点的配置字段包括：
   * - TextInputNode: text, placeholder
   * - TTSNode: mode, character, selectedCharacter, gender, pitch, speed, username, voice_id
   * - OutputNode: displayMode, autoExpand, showValidation, downloadEnabled, maxPreviewSize, preferredPanel
   * - DownloadNode: autoDownload, customFileName, customPath, downloadFormat, showProgress, allowRetry
   */
  static extractLegacyConfigFields(data) {
    const excludeFields = new Set([
      'label', 'nodeType', 'nodeIndex', 'totalNodes', 'config',
      'result', 'isProcessing', 'showAddButton', 'hideTestButton',
      'onDataChange', 'onAddNode', 'onSetProcessor', '_metadata'
    ])

    const configFields = {}
    
    Object.keys(data).forEach(key => {
      if (!excludeFields.has(key) && !key.startsWith('_')) {
        configFields[key] = data[key]
      }
    })

    return configFields
  }

  /**
   * 提取动态节点的配置字段
   */
  static extractDynamicConfigFields(data, nodeConfig) {
    const configFields = {}
    
    // 从字段定义中提取配置值
    if (nodeConfig.fields && Array.isArray(nodeConfig.fields)) {
      nodeConfig.fields.forEach(field => {
        if (data[field.name] !== undefined) {
          configFields[field.name] = data[field.name]
        } else if (field.defaultValue !== undefined) {
          configFields[field.name] = field.defaultValue
        }
      })
    }

    // 从已有配置中提取
    if (data.config) {
      Object.assign(configFields, data.config)
    }

    return configFields
  }

  /**
   * 将统一配置分解回传统字段格式
   */
  static extractConfigToLegacyFields(config, nodeType) {
    if (!config || typeof config !== 'object') {
      return {}
    }

    // 根据节点类型提取相应的传统字段
    const legacyFieldMaps = {
      'text-input': ['text', 'placeholder'],
      'tts': ['mode', 'character', 'selectedCharacter', 'gender', 'pitch', 'speed', 'username', 'voice_id'],
      'output': ['displayMode', 'autoExpand', 'showValidation', 'downloadEnabled', 'maxPreviewSize', 'preferredPanel'],
      'download': ['autoDownload', 'customFileName', 'customPath', 'downloadFormat', 'showProgress', 'allowRetry']
    }

    const expectedFields = legacyFieldMaps[nodeType] || []
    const legacyFields = {}

    expectedFields.forEach(field => {
      if (config[field] !== undefined) {
        legacyFields[field] = config[field]
      }
    })

    return legacyFields
  }

  /**
   * 提取外部配置（如 API 地址等）
   */
  static extractExternalConfig(config) {
    if (!config || typeof config !== 'object') {
      return {}
    }

    const externalConfigKeys = [
      'ttsApiUrl', 'asrApiUrl', 'apiKey', 'baseUrl', 'timeout',
      'retryAttempts', 'debug', 'logLevel'
    ]

    const externalConfig = {}
    
    externalConfigKeys.forEach(key => {
      if (config[key] !== undefined) {
        externalConfig[key] = config[key]
      }
    })

    return externalConfig
  }

  /**
   * 验证节点数据完整性
   */
  static validateNodeData(nodeData) {
    try {
      const format = this.detectDataFormat(nodeData)
      const errors = []
      const warnings = []

      // 基础验证
      if (!nodeData.id) errors.push('缺少节点ID')
      if (!nodeData.type) errors.push('缺少节点类型')
      if (!nodeData.data) errors.push('缺少节点数据')

      // 格式特定验证
      if (format === 'legacy') {
        if (!nodeData.data.nodeType) warnings.push('传统节点缺少 nodeType')
      } else if (format === 'dynamic') {
        if (!nodeData.data.nodeConfig) errors.push('动态节点缺少 nodeConfig')
      }

      return {
        valid: errors.length === 0,
        format,
        errors,
        warnings
      }

    } catch (error) {
      return {
        valid: false,
        format: 'unknown',
        errors: [`验证过程异常: ${error.message}`],
        warnings: []
      }
    }
  }

  /**
   * 获取模型版本信息
   */
  static getVersion() {
    return {
      version: '1.0.0',
      supportedFormats: ['legacy', 'dynamic', 'standard'],
      author: 'WorkflowEditor Team',
      lastUpdated: '2025-01-01'
    }
  }
}

export default StandardDataModel
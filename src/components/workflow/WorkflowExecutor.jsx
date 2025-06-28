// ===== WorkflowExecutor.jsx - 新架构版本 =====
// 基于原始代码，仅修改执行方式使用新架构

// 🔧 新架构导入
import unifiedNodeManager from '@/services/workflow/UnifiedNodeManager'
import StandardDataModel from '@/services/workflow/StandardDataModel'

/**
 * UI工作流执行器 - 新架构版本
 * 使用 UnifiedNodeManager + ExecutionManager + LegacyExecutor/DynamicExecutor
 */
export class UIWorkflowExecutor {
  constructor(config) {
    this.config = config
    this.executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      lastExecutionTime: null
    }
    console.log('[UI执行器] 初始化完成 (新架构)', config)
  }

  /**
   * 🔧 修改：执行单个节点 - 使用新架构
   */
  async executeNode(node, inputData) {
    try {
      console.log(`[UI执行器-新架构] 执行节点: ${node.id} (${node.type})`)
      console.log(`[UI执行器-新架构] 输入数据摘要:`, this.getDataSummary(inputData))
      
      // 🔑 关键修改：使用 UnifiedNodeManager
      const result = await unifiedNodeManager.executeNode(node, inputData, {
        // 系统配置传递
        systemConfig: this.config,
        // 用户配置传递（包括 selectedCharacter 等）
        userConfig: node.data?.config || {},
        // 全局配置
        config: this.config,
        // 执行上下文
        context: 'ui-workflow-executor',
        nodeId: node.id
      })
      
      console.log(`[UI执行器-新架构] 节点执行结果:`, {
        success: result.success,
        dataType: result.data?.type || 'unknown',
        executionTime: result.execution_time,
        source: result.source || 'unknown'
      })
      
      return result
      
    } catch (error) {
      console.error(`[UI执行器-新架构] 节点执行失败 ${node.id}:`, error)
      throw error
    }
  }

  /**
   * 🔧 修改：执行堆叠式工作流 - 使用新架构
   */
  async executeStackedWorkflow(nodes, addExecutionLog, setNodes) {
    if (!nodes || nodes.length === 0) {
      addExecutionLog('工作流为空，请添加节点', 'error')
      throw new Error('工作流为空，请添加节点')
    }

    const workflowStartTime = Date.now()
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    
    addExecutionLog(`🚀 开始执行工作流 (${nodes.length} 个节点) - ID: ${workflowId} [新架构]`, 'info')
    
    try {
      let previousResult = null
      const nodeResults = []
      const nodeDataFlow = []
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const stepNum = i + 1
        const nodeStartTime = Date.now()
        
        addExecutionLog(`[步骤 ${stepNum}/${nodes.length}] 🔄 开始执行: ${node.data.label || node.type} [新架构]`, 'info')
        
        try {
          // 🔑 关键修改：使用新架构执行节点
          const executionResult = await unifiedNodeManager.executeNode(node, previousResult, {
            systemConfig: this.config,
            userConfig: node.data?.config || {},
            workflowId: workflowId,
            stepNumber: stepNum,
            totalSteps: nodes.length,
            context: 'stacked-workflow',
            nodeId: node.id
          })
          
          const nodeExecutionTime = Date.now() - nodeStartTime
          
          console.log(`[UI执行器-新架构] 步骤 ${stepNum} 执行结果:`, {
            success: executionResult.success,
            nodeId: node.id,
            executionTime: nodeExecutionTime,
            manager: executionResult.source || 'unknown'
          })
          
          if (executionResult.success) {
            // 🔧 修改：使用新架构的数据处理
            console.log(`[UI执行器-新架构] 步骤 ${stepNum} 执行结果:`, executionResult)
            
            const processedResult = this.processSuccessResult(node, executionResult, addExecutionLog, stepNum)
            console.log(`[UI执行器-新架构] 处理后传递给下一步的数据:`, processedResult)
            
            // 记录数据流
            nodeDataFlow.push({
              stepNum,
              nodeId: node.id,
              nodeType: node.type,
              inputData: previousResult,
              outputData: processedResult,
              executedBy: executionResult.source || 'new-architecture'
            })
            
            previousResult = processedResult
            
            // 记录节点结果
            nodeResults.push({
              nodeId: node.id,
              nodeType: node.type,
              success: true,
              executionTime: nodeExecutionTime,
              outputSummary: this.getDataSummary(executionResult.data),
              executedBy: executionResult.source || 'new-architecture'
            })
            
            // 特殊节点的数据传递处理
            if (node.type === 'download' || node.type === 'output') {
              console.log(`[UI执行器-新架构] 当前数据流状态:`, nodeDataFlow)
              
              const dataForComponent = this.getDataForComponent(node, nodeDataFlow, i)
              console.log(`[UI执行器-新架构] 为${node.type}节点准备的数据:`, dataForComponent)
              
              this.updateNodeResult(node, setNodes, executionResult.data, true, {
                executionTime: nodeExecutionTime,
                stepNumber: stepNum,
                workflowId: workflowId,
                architecture: 'new'
              })
              
              // 延迟传递数据给React组件
              setTimeout(() => {
                console.log(`[UI执行器-新架构] 开始向${node.type}节点传递数据`)
                this.passDataToReactComponent(node, dataForComponent)
              }, 300)
            } else {
              // 其他节点正常更新
              this.updateNodeResult(node, setNodes, executionResult.data, true, {
                executionTime: nodeExecutionTime,
                stepNumber: stepNum,
                workflowId: workflowId,
                architecture: 'new'
              })
            }
            
          } else {
            // 处理执行失败的情况
            throw new Error(executionResult.error || '节点执行失败')
          }
          
        } catch (error) {
          // 处理节点执行错误
          const nodeExecutionTime = Date.now() - nodeStartTime
          console.error(`[UI执行器-新架构] 步骤 ${stepNum} 执行错误:`, error)
          
          const errorResult = { 
            type: 'error', 
            error: error.message,
            step: stepNum,
            nodeId: node.id,
            executionTime: nodeExecutionTime,
            architecture: 'new'
          }
          
          // 记录错误结果
          nodeResults.push({
            nodeId: node.id,
            nodeType: node.type,
            success: false,
            executionTime: nodeExecutionTime,
            error: error.message,
            executedBy: 'new-architecture'
          })
          
          previousResult = errorResult
          addExecutionLog(`[步骤 ${stepNum}] ❌ 执行失败: ${error.message} [新架构]`, 'error')
          
          // 更新节点错误状态
          this.updateNodeResult(node, setNodes, errorResult, false, {
            executionTime: nodeExecutionTime,
            stepNumber: stepNum,
            workflowId: workflowId,
            architecture: 'new'
          })
          
          // 根据节点类型决定是否继续执行
          if (node.type === 'output' || node.type === 'download') {
            addExecutionLog(`[步骤 ${stepNum}] ⚠️ ${node.type === 'download' ? '下载' : '输出'}节点失败，但工作流继续 [新架构]`, 'warning')
            continue
          } else {
            addExecutionLog(`💥 工作流因步骤 ${stepNum} 失败而中断 [新架构]`, 'error')
            this.updateExecutionStats(false, Date.now() - workflowStartTime)
            throw error
          }
        }
        
        // 添加步骤间的延迟
        if (i < nodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      // 工作流执行完成
      const totalExecutionTime = Date.now() - workflowStartTime
      
      // 生成执行报告
      const executionReport = this.generateExecutionReport(nodeResults, totalExecutionTime, workflowId)
      addExecutionLog(`📊 执行报告: ${executionReport.summary} [新架构]`, 'info')
      
      // 更新执行统计
      this.updateExecutionStats(true, totalExecutionTime)
      
      addExecutionLog(`🎉 工作流执行完成 - 总耗时: ${totalExecutionTime}ms [新架构]`, 'success')
      return { 
        success: true, 
        finalResult: previousResult,
        executionReport: executionReport,
        workflowId: workflowId,
        dataFlow: nodeDataFlow,
        architecture: 'new'
      }
      
    } catch (error) {
      const totalExecutionTime = Date.now() - workflowStartTime
      console.error('[UI执行器-新架构] 工作流执行失败:', error)
      addExecutionLog(`❌ 工作流执行失败: ${error.message} (耗时: ${totalExecutionTime}ms) [新架构]`, 'error')
      
      this.updateExecutionStats(false, totalExecutionTime)
      throw error
    }
  }

  /**
   * 🔧 修改：使用新架构的结果处理方法
   */
  processSuccessResult(node, executionResult, addExecutionLog, stepNum) {
    const nodeLabel = node.data.label || node.type
    let originalResult
    
    switch (node.type) {
      case 'text-input':
        const text = executionResult.data.content.text
        const textStats = {
          length: text.length,
          words: text.split(/\s+/).filter(w => w.length > 0).length,
          lines: text.split('\n').length
        }
        addExecutionLog(
          `[${nodeLabel}] ✅ 输出文本 (${textStats.length}字符, ${textStats.words}词, ${textStats.lines}行): "${this.truncateText(text, 40)}"`, 
          'success'
        )
        originalResult = text
        break
        
      case 'tts':
        const audioData = executionResult.data
        const audioInfo = audioData.content.audio
        addExecutionLog(
          `[${nodeLabel}] ✅ 语音合成成功 - ID: ${audioInfo.id}, 格式: ${audioInfo.format} [新架构]`, 
          'success'
        )
        originalResult = audioData
        break
        
      case 'download':
        const downloadSummary = this.getDataSummary(executionResult.data)
        addExecutionLog(
          `[${nodeLabel}] ✅ 下载处理完成 - 类型: ${downloadSummary.type}, 大小: ${downloadSummary.size || 'unknown'} [新架构]`, 
          'success'
        )
        originalResult = executionResult.data
        break
        
      case 'output':
        const outputSummary = this.getDataSummary(executionResult.data)
        addExecutionLog(
          `[${nodeLabel}] ✅ 结果接收完成 - 类型: ${outputSummary.type}, 大小: ${outputSummary.size || 'unknown'} [新架构]`, 
          'success'
        )
        originalResult = executionResult.data
        break
        
      default:
        // 支持动态节点
        addExecutionLog(`[${nodeLabel}] ✅ 执行成功 [新架构]`, 'success')
        originalResult = executionResult.data
    }
    
    // 🔧 修改：使用新架构的数据标准化
    try {
      const normalizedResult = StandardDataModel.normalizeNodeOutput(
        node.type, 
        originalResult, 
        node.id
      )
      
      console.log(`[UI执行器-新架构] 步骤 ${stepNum} 数据标准化完成:`, normalizedResult.getPreview())
      return normalizedResult
      
    } catch (error) {
      console.warn(`[UI执行器-新架构] 步骤 ${stepNum} 标准化失败，使用原始结果:`, error)
      return originalResult
    }
  }

  /**
   * 🔧 修改：使用新架构的组件数据获取
   */
  getDataForComponent(node, nodeDataFlow, currentIndex) {
    console.log(`[UI执行器-新架构] 为${node.type}节点获取数据, 当前索引: ${currentIndex}`)
    
    if (node.type === 'download' || node.type === 'output') {
      if (currentIndex > 0 && nodeDataFlow.length >= currentIndex) {
        const previousStepData = nodeDataFlow[currentIndex - 1]
        console.log(`[UI执行器-新架构] 上一步节点:`, previousStepData)
        
        // 🔧 修改：使用新架构的数据准备
        try {
          const preparedData = StandardDataModel.prepareNodeInput(
            previousStepData.outputData, 
            node.type
          )
          
          console.log(`[UI执行器-新架构] 为${node.type}节点返回数据:`, preparedData?.getPreview?.() || preparedData)
          return preparedData
          
        } catch (error) {
          console.warn(`[UI执行器-新架构] 数据准备失败，使用原始数据:`, error)
          return previousStepData.outputData
        }
      } else {
        console.warn(`[UI执行器-新架构] 无法获取上一步数据`)
      }
    }
    return null
  }

  /**
   * 🔧 修改：使用新架构的数据传递
   */
  passDataToReactComponent(node, inputData) {
    try {
      if (!inputData) {
        console.warn(`[UI执行器-新架构] 没有数据传递给${node.type}节点`)
        return
      }
      
      console.log(`[UI执行器-新架构] 准备向${node.type}节点传递数据:`, inputData)
      
      // 确保数据格式正确
      let componentData = inputData
      
      try {
        // 如果数据有 getPreview 方法，说明已经是标准格式
        if (inputData?.getPreview) {
          console.log(`[UI执行器-新架构] 数据已是标准格式:`, inputData.getPreview())
          componentData = inputData
        } else {
          // 尝试标准化数据
          console.log(`[UI执行器-新架构] 尝试标准化数据`)
          componentData = StandardDataModel.prepareNodeInput(inputData, node.type)
        }
      } catch (error) {
        console.warn(`[UI执行器-新架构] 数据标准化失败，使用原始数据:`, error)
        componentData = inputData
      }
      
      // 构建事件名称
      const eventName = `workflow-data-${node.id}`
      console.log(`[UI执行器-新架构] 事件名称: ${eventName}`)
      
      // 发送数据事件
      const event = new CustomEvent(eventName, {
        detail: componentData
      })
      
      console.log(`[UI执行器-新架构] 发送事件给${node.type}节点`)
      window.dispatchEvent(event)
      console.log(`[UI执行器-新架构] 事件已发送`)
      
    } catch (error) {
      console.error(`[UI执行器-新架构] 向${node.type}节点传递数据失败:`, error)
      
      // 降级处理
      try {
        const eventName = `workflow-data-${node.id}`
        const event = new CustomEvent(eventName, { detail: inputData })
        console.log(`[UI执行器-新架构] 降级到原始传递方式`)
        window.dispatchEvent(event)
      } catch (fallbackError) {
        console.error(`[UI执行器-新架构] 降级传递也失败:`, fallbackError)
      }
    }
  }

  // ===== 以下方法保持不变 =====

  /**
   * 更新节点的执行结果
   */
  updateNodeResult(node, setNodes, resultData, isSuccess, executionInfo = {}) {
    console.log(`[WorkflowExecutor-新架构] 更新节点结果 - ID: ${node.id}, 类型: ${node.type}, 成功: ${isSuccess}`)
    
    setNodes(currentNodes => 
      currentNodes.map(n => {
        if (n.id === node.id) {
          const updatedNode = { 
            ...n, 
            data: { 
              ...n.data, 
              result: {
                success: isSuccess,
                data: resultData,
                timestamp: Date.now(),
                executionInfo: executionInfo,
                ...(isSuccess ? {} : { error: resultData.error })
              }
            } 
          }
          return updatedNode
        } else {
          return n
        }
      })
    )
  }

  /**
   * 生成执行报告
   */
  generateExecutionReport(nodeResults, totalExecutionTime, workflowId) {
    const successCount = nodeResults.filter(r => r.success).length
    const failureCount = nodeResults.filter(r => !r.success).length
    const avgNodeTime = nodeResults.length > 0 ? 
      Math.round(nodeResults.reduce((sum, r) => sum + r.executionTime, 0) / nodeResults.length) : 0
    
    return {
      workflowId,
      totalExecutionTime,
      nodeCount: nodeResults.length,
      successCount,
      failureCount,
      averageNodeTime: avgNodeTime,
      summary: `${successCount}/${nodeResults.length} 节点成功, 平均耗时: ${avgNodeTime}ms`,
      nodeResults: nodeResults,
      architecture: 'new'
    }
  }

  /**
   * 更新执行统计信息
   */
  updateExecutionStats(success, executionTime) {
    this.executionStats.totalExecutions++
    this.executionStats.lastExecutionTime = executionTime
    
    if (success) {
      this.executionStats.successfulExecutions++
    } else {
      this.executionStats.failedExecutions++
    }
    
    const totalExecs = this.executionStats.totalExecutions
    const currentAvg = this.executionStats.averageExecutionTime
    this.executionStats.averageExecutionTime = Math.round(
      (currentAvg * (totalExecs - 1) + executionTime) / totalExecs
    )
  }

  /**
   * 获取数据摘要
   */
  getDataSummary(data) {
    if (!data) return { type: 'null', size: 0 }
    
    if (data.type && data.content) {
      return {
        type: data.type,
        size: data.metadata?.dataSize || 'unknown',
        format: data.metadata?.format || 'unknown'
      }
    }
    
    if (typeof data === 'string') {
      return { type: 'string', size: data.length }
    }
    
    if (typeof data === 'object') {
      return { 
        type: 'object', 
        size: JSON.stringify(data).length,
        keys: Object.keys(data).length
      }
    }
    
    return { type: typeof data, size: String(data).length }
  }

  /**
   * 截断文本用于日志显示
   */
  truncateText(text, maxLength) {
    if (!text) return '(空文本)'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  /**
   * 获取执行统计信息
   */
  getExecutionStats() {
    return {
      ...this.executionStats,
      successRate: this.executionStats.totalExecutions > 0 ? 
        Math.round((this.executionStats.successfulExecutions / this.executionStats.totalExecutions) * 100) : 0,
      architecture: 'new'
    }
  }

  /**
   * 验证工作流配置
   */
  validateWorkflow(nodes) {
    const errors = []
    const warnings = []
    
    if (!nodes || nodes.length === 0) {
      errors.push('工作流为空')
      return { valid: false, errors, warnings }
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const stepNum = i + 1
      
      switch (node.type) {
        case 'text-input':
          if (!node.data.text || !node.data.text.trim()) {
            errors.push(`步骤 ${stepNum} (文本输入): 缺少文本内容`)
          } else if (node.data.text.length > 5000) {
            warnings.push(`步骤 ${stepNum} (文本输入): 文本过长可能影响处理速度`)
          }
          break
          
        case 'tts':
          const mode = node.data.mode || 'character'
          if (mode === 'character' && !node.data.selectedCharacter) {
            errors.push(`步骤 ${stepNum} (语音合成): 未选择语音角色`)
          }
          if (mode === 'custom' && (!node.data.username || !node.data.voice_id)) {
            errors.push(`步骤 ${stepNum} (语音合成): 自定义模式缺少用户名或语音ID`)
          }
          if (!node.data.config?.ttsApiUrl) {
            errors.push(`步骤 ${stepNum} (语音合成): TTS API地址未配置`)
          }
          break
          
        case 'download':
          if (i === 0) {
            warnings.push(`步骤 ${stepNum} (下载): 下载节点作为首节点可能无法接收到数据`)
          }
          if (node.data.autoDownload && (!node.data.customFileName && !node.data.downloadFormat)) {
            warnings.push(`步骤 ${stepNum} (下载): 自动下载建议配置文件名或格式`)
          }
          break
          
        case 'output':
          if (i === 0) {
            warnings.push(`步骤 ${stepNum} (输出): 输出节点作为首节点可能无法接收到数据`)
          }
          break
          
        default:
          // 支持动态节点（包含连字符的节点类型）
          if (!node.type.includes('-')) {
            warnings.push(`步骤 ${stepNum}: 未知的节点类型 "${node.type}"`)
          }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canExecute: errors.length === 0
    }
  }

  /**
   * 获取工作流摘要信息
   */
  getWorkflowSummary(nodes) {
    if (!nodes || nodes.length === 0) {
      return '空工作流'
    }

    const nodeTypes = nodes.map(node => {
      switch (node.type) {
        case 'text-input': return '📝文本'
        case 'tts': return '🎤TTS'
        case 'download': return '📥下载'
        case 'output': return '👁️预览'
        case 'asr-node': return '🎙️语音识别'
        case 'media-input': return '🎵媒体输入'
        default: return `⚙️${node.type}`
      }
    })

    const estimatedTime = this.estimateExecutionTime(nodes)
    return `${nodes.length}步工作流: ${nodeTypes.join(' → ')} (预计耗时: ${estimatedTime}ms) [新架构]`
  }

  /**
   * 估算执行时间
   */
  estimateExecutionTime(nodes) {
    let estimatedTime = 0
    
    for (const node of nodes) {
      switch (node.type) {
        case 'text-input':
          estimatedTime += 10
          break
        case 'tts':
          const textLength = this.getTextLengthFromPreviousNodes(nodes, node)
          estimatedTime += Math.max(1000, textLength * 50)
          break
        case 'download':
          estimatedTime += 200
          break
        case 'output':
          estimatedTime += 100
          break
        case 'asr-node':
          estimatedTime += 3000
          break
        case 'media-input':
          estimatedTime += 500
          break
        default:
          estimatedTime += 500
      }
    }
    
    return estimatedTime
  }

  /**
   * 从前置节点获取文本长度
   */
  getTextLengthFromPreviousNodes(nodes, currentNode) {
    const currentIndex = nodes.findIndex(n => n.id === currentNode.id)
    
    for (let i = currentIndex - 1; i >= 0; i--) {
      const node = nodes[i]
      if (node.type === 'text-input' && node.data.text) {
        return node.data.text.length
      }
    }
    
    return 100
  }

  /**
   * 获取新架构状态信息
   */
  getArchitectureStatus() {
    return {
      architecture: 'new',
      version: '2.0',
      features: {
        unifiedNodeManager: true,
        executionManager: true,
        legacyExecutor: true,
        dynamicExecutor: true,
        configurationResolver: true,
        standardDataModel: true
      },
      supportedNodeTypes: {
        legacy: ['text-input', 'tts', 'download', 'output'],
        dynamic: ['asr-node', 'media-input', 'simple-test']
      },
      stats: this.getExecutionStats()
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    const healthStatus = {
      overall: 'healthy',
      components: {},
      issues: [],
      timestamp: new Date().toISOString()
    }

    try {
      // 检查 UnifiedNodeManager
      if (typeof unifiedNodeManager?.executeNode === 'function') {
        healthStatus.components.unifiedNodeManager = 'available'
      } else {
        healthStatus.components.unifiedNodeManager = 'unavailable'
        healthStatus.issues.push('UnifiedNodeManager不可用')
        healthStatus.overall = 'degraded'
      }

      // 检查 StandardDataModel
      if (typeof StandardDataModel?.normalizeNodeOutput === 'function') {
        healthStatus.components.standardDataModel = 'available'
      } else {
        healthStatus.components.standardDataModel = 'unavailable'
        healthStatus.issues.push('StandardDataModel不可用')
      }

      // 检查配置
      if (this.config) {
        healthStatus.components.config = 'available'
      } else {
        healthStatus.components.config = 'unavailable'
        healthStatus.issues.push('配置缺失')
        healthStatus.overall = 'critical'
      }

      return healthStatus

    } catch (error) {
      healthStatus.overall = 'error'
      healthStatus.issues.push(`健康检查失败: ${error.message}`)
      return healthStatus
    }
  }
}

// 默认导出类
export default UIWorkflowExecutor

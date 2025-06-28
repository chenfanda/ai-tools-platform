// ===== src/services/workflow/ExecutionManager.js - 执行调度中心 =====

/**
 * 执行管理器 - 统一执行调度中心
 * 
 * 核心职责：
 * 1. 作为新架构的执行调度中心
 * 2. 根据路由信息分发到具体执行器
 * 3. 提供统一的执行接口给 UnifiedNodeManager
 * 4. 处理执行过程中的错误处理和日志记录
 * 
 * 设计原则：
 * - 轻量级调度：不直接处理配置，委托给具体执行器
 * - 统一接口：为所有节点类型提供相同的执行入口
 * - 错误隔离：执行失败不影响管理器状态
 * - 可扩展性：支持新增节点执行器类型
 */
class ExecutionManager {
  
  /**
   * 执行统计信息
   */
  static stats = {
    totalExecutions: 0,
    legacyExecutions: 0,
    dynamicExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0
  }

  /**
   * 调试模式
   */
  static debugMode = process.env.NODE_ENV === 'development'

  /**
   * 调试日志输出
   */
  static log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[ExecutionMgr ${timestamp}]`
    
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
   * 执行单个节点 - 统一入口
   * 
   * @param {object} node - 节点数据
   * @param {*} inputData - 输入数据
   * @param {object} routing - 路由信息（来自UnifiedNodeManager）
   * @param {object} options - 执行选项
   * @returns {object} 执行结果
   */
  static async execute(node, inputData, routing, options = {}) {
    const startTime = Date.now()
    
    try {
      this.stats.totalExecutions++
      
      if (!node) {
        throw new Error('节点数据不能为空')
      }
      
      if (!routing || !routing.manager) {
        throw new Error('路由信息不完整')
      }

      this.log(`开始执行节点: ${node.id} (${node.type}) -> 路由到: ${routing.manager}`)
      
      // 根据路由管理器分发到具体执行器
      let executionResult
      
      if (routing.manager === 'legacy') {
        executionResult = await this.executeLegacyNode(node, inputData, routing, options)
        this.stats.legacyExecutions++
        
      } else if (routing.manager === 'dynamic') {
        executionResult = await this.executeDynamicNode(node, inputData, routing, options)
        this.stats.dynamicExecutions++
        
      } else {
        throw new Error(`不支持的路由管理器: ${routing.manager}`)
      }
      
      // 记录执行时间
      const executionTime = Date.now() - startTime
      if (executionResult.success) {
        executionResult.execution_time = executionTime
      }
      
      // 更新统计信息
      this.updateExecutionStats(executionResult.success, executionTime)
      
      this.log(
        `节点执行完成: ${node.id} -> ${executionResult.success ? '成功' : '失败'} (${executionTime}ms)`, 
        executionResult.success ? 'success' : 'error'
      )
      
      return executionResult

    } catch (error) {
      const executionTime = Date.now() - startTime
      this.stats.failedExecutions++
      
      this.log(`节点执行异常 ${node?.id}: ${error.message}`, 'error')
      
      return {
        success: false,
        error: error.message,
        data: null,
        execution_time: executionTime,
        source: 'ExecutionManager'
      }
    }
  }

  /**
   * 执行传统节点
   * 委托给 LegacyExecutor 处理
   */
  static async executeLegacyNode(node, inputData, routing, options) {
    try {
      this.log(`分发传统节点执行: ${node.type}`)
      
      // 动态导入 LegacyExecutor（避免循环依赖）
      const { default: LegacyExecutor } = await import('./LegacyExecutor')
      
      // 委托给传统节点执行器
      const result = await LegacyExecutor.execute(node, inputData, routing, options)
      
      this.log(`传统节点执行完成: ${node.type}`, 'success')
      return result
      
    } catch (error) {
      this.log(`传统节点执行失败 ${node.type}: ${error.message}`, 'error')
      throw new Error(`传统节点执行失败: ${error.message}`)
    }
  }

  /**
   * 执行动态节点
   * 委托给 DynamicExecutor 处理
   */
  static async executeDynamicNode(node, inputData, routing, options) {
    try {
      this.log(`分发动态节点执行: ${node.type}`)
      
      // 动态导入 DynamicExecutor（避免循环依赖）
      const { default: DynamicExecutor } = await import('./DynamicExecutor')
      
      // 委托给动态节点执行器
      const result = await DynamicExecutor.execute(node, inputData, routing, options)
      
      this.log(`动态节点执行完成: ${node.type}`, 'success')
      return result
      
    } catch (error) {
      this.log(`动态节点执行失败 ${node.type}: ${error.message}`, 'error')
      throw new Error(`动态节点执行失败: ${error.message}`)
    }
  }

  /**
   * 执行工作流
   * 按顺序执行多个节点
   * 
   * @param {Array} nodes - 节点列表
   * @param {object} options - 执行选项
   * @returns {object} 工作流执行结果
   */
  static async executeWorkflow(nodes, options = {}) {
    try {
      if (!nodes || nodes.length === 0) {
        throw new Error('工作流节点列表为空')
      }

      this.log(`开始执行工作流: ${nodes.length} 个节点`)
      
      const workflowId = options.workflowId || `workflow_${Date.now()}`
      const executionResults = []
      let previousResult = null
      let successCount = 0
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const stepNum = i + 1
        
        try {
          this.log(`执行工作流步骤 ${stepNum}/${nodes.length}: ${node.type}`)
          
          // 获取节点路由信息（需要从UnifiedNodeManager获取）
          const routing = await this.getNodeRouting(node.type)
          
          // 执行节点
          const result = await this.execute(node, previousResult, routing, {
            ...options,
            stepNumber: stepNum,
            workflowId: workflowId
          })
          
          // 记录步骤结果
          const stepResult = {
            nodeId: node.id,
            stepNumber: stepNum,
            nodeType: node.type,
            success: result.success,
            executionTime: result.execution_time,
            error: result.success ? null : result.error
          }
          
          executionResults.push(stepResult)
          
          // 调用步骤完成回调
          if (options.onStepComplete) {
            options.onStepComplete(stepResult)
          }
          
          if (result.success) {
            successCount++
            previousResult = result.data
          } else {
            // 根据节点类型决定是否继续
            const shouldContinue = this.shouldContinueOnError(node, options)
            
            if (shouldContinue) {
              this.log(`步骤 ${stepNum} 失败但继续执行: ${result.error}`, 'warn')
              continue
            } else {
              throw new Error(`步骤 ${stepNum} 执行失败，中断工作流: ${result.error}`)
            }
          }
          
        } catch (error) {
          const stepResult = {
            nodeId: node.id,
            stepNumber: stepNum,
            nodeType: node.type,
            success: false,
            executionTime: 0,
            error: error.message
          }
          
          executionResults.push(stepResult)
          
          // 调用步骤错误回调
          if (options.onStepError) {
            options.onStepError(stepResult)
          }
          
          // 决定是否中断工作流
          if (!options.continueOnError) {
            throw error
          }
        }
      }
      
      this.log(`工作流执行完成: ${successCount}/${nodes.length} 成功`, 'success')
      
      return {
        success: successCount > 0,
        workflowId: workflowId,
        totalSteps: nodes.length,
        successCount: successCount,
        failureCount: nodes.length - successCount,
        finalResult: previousResult,
        executionResults: executionResults
      }
      
    } catch (error) {
      this.log(`工作流执行失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 批量执行节点
   * 支持并行和串行执行
   * 
   * @param {Array} nodeExecutions - 节点执行配置列表
   * @param {object} options - 执行选项
   * @returns {object} 批量执行结果
   */
  static async executeBatch(nodeExecutions, options = {}) {
    try {
      if (!nodeExecutions || nodeExecutions.length === 0) {
        throw new Error('批量执行列表为空')
      }

      this.log(`开始批量执行: ${nodeExecutions.length} 个节点 (${options.parallel ? '并行' : '串行'})`)
      
      const batchResults = []
      
      if (options.parallel) {
        // 并行执行
        const promises = nodeExecutions.map(async (execution, index) => {
          try {
            const routing = await this.getNodeRouting(execution.node.type)
            const result = await this.execute(
              execution.node, 
              execution.inputData, 
              routing,
              execution.options
            )
            return { index, success: true, result }
          } catch (error) {
            return { index, success: false, error: error.message }
          }
        })
        
        const results = await Promise.allSettled(promises)
        batchResults.push(...results.map(r => r.value || r.reason))
        
      } else {
        // 串行执行
        for (let i = 0; i < nodeExecutions.length; i++) {
          const execution = nodeExecutions[i]
          try {
            const routing = await this.getNodeRouting(execution.node.type)
            const result = await this.execute(
              execution.node, 
              execution.inputData, 
              routing,
              execution.options
            )
            batchResults.push({ index: i, success: true, result })
          } catch (error) {
            batchResults.push({ index: i, success: false, error: error.message })
          }
        }
      }
      
      const successCount = batchResults.filter(r => r.success).length
      
      this.log(`批量执行完成: ${successCount}/${nodeExecutions.length} 成功`)
      
      return {
        success: successCount > 0,
        totalCount: nodeExecutions.length,
        successCount,
        failureCount: nodeExecutions.length - successCount,
        results: batchResults
      }
      
    } catch (error) {
      this.log(`批量执行失败: ${error.message}`, 'error')
      throw error
    }
  }

  /**
   * 获取节点路由信息
   * 从 UnifiedNodeManager 获取路由
   */
  static async getNodeRouting(nodeType) {
    try {
      // 动态导入 UnifiedNodeManager（避免循环依赖）
      const { default: unifiedNodeManager } = await import('./UnifiedNodeManager')
      
      // 获取路由信息
      const routing = unifiedNodeManager.routeNodeOperation(nodeType, 'execute')
      
      return routing
      
    } catch (error) {
      this.log(`获取节点路由失败 ${nodeType}: ${error.message}`, 'warn')
      
      // 降级：根据节点类型推测路由
      const legacyTypes = ['tts', 'download', 'text-input', 'output']
      
      return {
        manager: legacyTypes.includes(nodeType) ? 'legacy' : 'dynamic',
        confidence: 0.5,
        source: 'fallback'
      }
    }
  }

  /**
   * 判断错误时是否继续执行
   */
  static shouldContinueOnError(node, options) {
    // 全局设置
    if (options.continueOnError === true) {
      return true
    }
    
    // 节点类型特定规则
    const continuableNodeTypes = ['output', 'download']
    return continuableNodeTypes.includes(node.type)
  }

  /**
   * 更新执行统计信息
   */
  static updateExecutionStats(success, executionTime) {
    if (success) {
      this.stats.successfulExecutions++
    } else {
      this.stats.failedExecutions++
    }
    
    // 更新平均执行时间
    const totalExecs = this.stats.totalExecutions
    const currentAvg = this.stats.averageExecutionTime
    this.stats.averageExecutionTime = Math.round(
      (currentAvg * (totalExecs - 1) + executionTime) / totalExecs
    )
  }

  /**
   * 获取执行统计信息
   */
  static getExecutionStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalExecutions > 0 
        ? Math.round((this.stats.successfulExecutions / this.stats.totalExecutions) * 100) 
        : 0,
      legacyRate: this.stats.totalExecutions > 0 
        ? Math.round((this.stats.legacyExecutions / this.stats.totalExecutions) * 100) 
        : 0,
      dynamicRate: this.stats.totalExecutions > 0 
        ? Math.round((this.stats.dynamicExecutions / this.stats.totalExecutions) * 100) 
        : 0
    }
  }

  /**
   * 重置统计信息
   */
  static resetStats() {
    this.stats = {
      totalExecutions: 0,
      legacyExecutions: 0,
      dynamicExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    }
    this.log('执行统计信息已重置')
  }

  /**
   * 获取执行管理器健康状态
   */
  static getHealthStatus() {
    const health = {
      status: 'healthy',
      issues: [],
      warnings: [],
      stats: this.getExecutionStats()
    }

    try {
      // 检查错误率
      const errorRate = this.stats.totalExecutions > 0 
        ? (this.stats.failedExecutions / this.stats.totalExecutions * 100) 
        : 0

      if (errorRate > 20) {
        health.status = 'critical'
        health.issues.push(`执行错误率过高: ${errorRate.toFixed(2)}%`)
      } else if (errorRate > 10) {
        health.status = 'warning'
        health.warnings.push(`执行错误率较高: ${errorRate.toFixed(2)}%`)
      }

      // 检查执行器可用性
      const capabilities = {
        legacyExecutor: true,  // 假设可用，实际会在运行时检查
        dynamicExecutor: true, // 假设可用，实际会在运行时检查
        unifiedNodeManager: true
      }

      health.capabilities = capabilities

    } catch (error) {
      health.status = 'error'
      health.issues.push(`健康检查失败: ${error.message}`)
    }

    return health
  }
}

// 开发环境下暴露到全局，便于调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__executionManager = ExecutionManager
}

export default ExecutionManager

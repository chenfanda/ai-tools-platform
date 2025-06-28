// ===== src/services/workflow/WorkflowValidator.js - 修复版本 =====

// 🔧 修复：更新为新的导入路径
import legacyNodeManager from './legacy/LegacyNodeManager.js'

/**
 * 工作流验证工具
 * 负责工作流完整性验证、逻辑检查、依赖分析等功能
 */
class WorkflowValidator {
  constructor() {
    this.validationRules = new Map()
    this.initializeDefaultRules()
  }

  /**
   * 初始化默认验证规则
   */
  initializeDefaultRules() {
    // 工作流基本结构规则
    this.addValidationRule('workflow-structure', {
      name: '工作流基本结构',
      validate: (workflow) => {
        const errors = []
        
        if (!workflow.nodes || workflow.nodes.length === 0) {
          errors.push('工作流必须包含至少一个节点')
        }
        
        return { valid: errors.length === 0, errors }
      }
    })

    // 节点顺序规则
    this.addValidationRule('node-sequence', {
      name: '节点顺序验证',
      validate: (workflow) => {
        const errors = []
        const { nodes } = workflow
        
        if (nodes.length === 0) return { valid: true, errors: [] }
        
        // 检查是否有输入节点
        const inputNodes = nodes.filter(node => this.getNodeCategory(node.type) === 'input')
        if (inputNodes.length === 0) {
          errors.push('工作流应该包含至少一个输入节点')
        }
        
        // 检查是否有输出节点
        const outputNodes = nodes.filter(node => this.getNodeCategory(node.type) === 'output')
        if (outputNodes.length === 0) {
          errors.push('工作流应该包含至少一个输出节点')
        }
        
        // 检查输出节点是否在末尾
        if (outputNodes.length > 0) {
          const lastNode = nodes[nodes.length - 1]
          if (this.getNodeCategory(lastNode.type) !== 'output') {
            errors.push('建议将输出节点放在工作流的末尾')
          }
        }
        
        return { valid: errors.length === 0, errors }
      }
    })

    // 节点配置规则
    this.addValidationRule('node-configuration', {
      name: '节点配置验证',
      validate: (workflow) => {
        const errors = []
        const { nodes } = workflow
        
        nodes.forEach((node, index) => {
          const nodeValidation = legacyNodeManager.validateNode(node)
          if (!nodeValidation.valid) {
            errors.push(`第 ${index + 1} 个节点 (${node.data.label}): ${nodeValidation.errors.join(', ')}`)
          }
        })
        
        return { valid: errors.length === 0, errors }
      }
    })

    // 数据流规则
    this.addValidationRule('data-flow', {
      name: '数据流验证',
      validate: (workflow) => {
        const errors = []
        const { nodes } = workflow
        
        if (nodes.length < 2) return { valid: true, errors: [] }
        
        // 检查数据流连续性
        for (let i = 1; i < nodes.length; i++) {
          const prevNode = nodes[i - 1]
          const currentNode = nodes[i]
          
          // 检查前一个节点是否能为当前节点提供数据
          if (!this.canProvideDataTo(prevNode.type, currentNode.type)) {
            errors.push(`第 ${i} 个节点 (${prevNode.data.label}) 无法为第 ${i + 1} 个节点 (${currentNode.data.label}) 提供合适的数据`)
          }
        }
        
        return { valid: errors.length === 0, errors }
      }
    })

    // 重复节点检查
    this.addValidationRule('duplicate-detection', {
      name: '重复节点检测',
      validate: (workflow) => {
        const errors = []
        const { nodes } = workflow
        
        // 检查输入节点重复
        const inputNodes = nodes.filter(node => this.getNodeCategory(node.type) === 'input')
        if (inputNodes.length > 1) {
          errors.push(`工作流包含 ${inputNodes.length} 个输入节点，建议只保留一个`)
        }
        
        // 检查输出节点重复
        const outputNodes = nodes.filter(node => this.getNodeCategory(node.type) === 'output')
        if (outputNodes.length > 1) {
          errors.push(`工作流包含 ${outputNodes.length} 个输出节点，建议只保留一个`)
        }
        
        return { valid: errors.length === 0, errors }
      }
    })
  }

  /**
   * 添加验证规则
   * @param {string} ruleId - 规则ID
   * @param {object} rule - 规则配置
   */
  addValidationRule(ruleId, rule) {
    this.validationRules.set(ruleId, {
      id: ruleId,
      ...rule,
      addedAt: new Date().toISOString()
    })
  }

  /**
   * 移除验证规则
   * @param {string} ruleId - 规则ID
   */
  removeValidationRule(ruleId) {
    this.validationRules.delete(ruleId)
  }

  /**
   * 验证完整工作流
   * @param {object} workflow - 工作流对象 {nodes: Array, edges: Array}
   * @param {Array} enabledRules - 启用的规则ID列表，为空则启用所有规则
   * @returns {object} 验证结果
   */
  validateWorkflow(workflow, enabledRules = []) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      ruleResults: {},
      summary: {
        totalRules: 0,
        passedRules: 0,
        failedRules: 0
      }
    }

    // 确定要运行的规则
    const rulesToRun = enabledRules.length > 0 
      ? enabledRules.filter(id => this.validationRules.has(id))
      : Array.from(this.validationRules.keys())

    results.summary.totalRules = rulesToRun.length

    // 运行每个验证规则
    rulesToRun.forEach(ruleId => {
      const rule = this.validationRules.get(ruleId)
      try {
        const ruleResult = rule.validate(workflow)
        results.ruleResults[ruleId] = {
          ...ruleResult,
          ruleName: rule.name
        }

        if (ruleResult.valid) {
          results.summary.passedRules++
        } else {
          results.summary.failedRules++
          results.valid = false
          results.errors.push(...ruleResult.errors.map(error => `[${rule.name}] ${error}`))
        }

        // 收集警告（如果规则提供）
        if (ruleResult.warnings) {
          results.warnings.push(...ruleResult.warnings.map(warning => `[${rule.name}] ${warning}`))
        }
      } catch (error) {
        results.summary.failedRules++
        results.valid = false
        results.errors.push(`[${rule.name}] 验证规则执行失败: ${error.message}`)
      }
    })

    return results
  }

  /**
   * 快速验证工作流是否可执行
   * @param {object} workflow - 工作流对象
   * @returns {object} 简化的验证结果
   */
  quickValidate(workflow) {
    const result = this.validateWorkflow(workflow, ['workflow-structure', 'node-configuration'])
    
    return {
      valid: result.valid,
      canExecute: result.valid,
      criticalErrors: result.errors,
      nodeCount: workflow.nodes ? workflow.nodes.length : 0
    }
  }

  /**
   * 验证单个节点
   * @param {object} node - 节点对象
   * @returns {object} 验证结果
   */
  validateSingleNode(node) {
    return legacyNodeManager.validateNode(node)
  }

  /**
   * 获取节点分类
   * @param {string} nodeType - 节点类型
   * @returns {string} 节点分类
   */
  getNodeCategory(nodeType) {
    const nodeConfig = legacyNodeManager.getNodeType(nodeType)
    return nodeConfig ? nodeConfig.category : 'unknown'
  }

  /**
   * 检查节点是否可以为另一个节点提供数据
   * @param {string} fromNodeType - 源节点类型
   * @param {string} toNodeType - 目标节点类型
   * @returns {boolean} 是否兼容
   */
  canProvideDataTo(fromNodeType, toNodeType) {
    const compatibility = {
      'text-input': ['tts', 'output', 'download'],
      'tts': ['output', 'download'],
      'output': ['download'],
      'download': []
    }
    
    return compatibility[fromNodeType]?.includes(toNodeType) || false
  }

  /**
   * 获取工作流建议
   * @param {object} workflow - 工作流对象
   * @returns {Array} 建议列表
   */
  getWorkflowSuggestions(workflow) {
    const suggestions = []
    const { nodes } = workflow

    if (!nodes || nodes.length === 0) {
      suggestions.push({
        type: 'structure',
        message: '开始构建工作流：添加一个文本输入节点',
        action: 'add-text-input'
      })
      return suggestions
    }

    // 检查是否缺少输入节点
    const hasInputNode = nodes.some(node => this.getNodeCategory(node.type) === 'input')
    if (!hasInputNode) {
      suggestions.push({
        type: 'structure',
        message: '建议添加一个输入节点作为数据源',
        action: 'add-input-node'
      })
    }

    // 检查是否缺少输出节点
    const hasOutputNode = nodes.some(node => this.getNodeCategory(node.type) === 'output')
    if (!hasOutputNode) {
      suggestions.push({
        type: 'structure',
        message: '建议添加一个输出节点来展示结果',
        action: 'add-output-node'
      })
    }

    // 检查是否只有输入和输出节点，缺少处理节点
    if (nodes.length === 2 && hasInputNode && hasOutputNode) {
      suggestions.push({
        type: 'functionality',
        message: '考虑添加处理节点（如语音合成）来增强工作流功能',
        action: 'add-processor-node'
      })
    }

    return suggestions
  }

  /**
   * 分析工作流性能
   * @param {object} workflow - 工作流对象
   * @returns {object} 性能分析结果
   */
  analyzePerformance(workflow) {
    const { nodes } = workflow
    
    return {
      nodeCount: nodes ? nodes.length : 0,
      estimatedExecutionTime: this.estimateExecutionTime(nodes || []),
      complexity: this.calculateComplexity(nodes || []),
      recommendations: this.getPerformanceRecommendations(nodes || [])
    }
  }

  /**
   * 估算执行时间
   * @param {Array} nodes - 节点列表
   * @returns {number} 估算的执行时间（秒）
   */
  estimateExecutionTime(nodes) {
    const timeEstimates = {
      'text-input': 0.1,
      'tts': 3.0,
      'output': 0.5,
      'download': 1.0
    }
    
    return nodes.reduce((total, node) => {
      return total + (timeEstimates[node.type] || 1.0)
    }, 0)
  }

  /**
   * 计算工作流复杂度
   * @param {Array} nodes - 节点列表
   * @returns {string} 复杂度等级
   */
  calculateComplexity(nodes) {
    const nodeCount = nodes.length
    
    if (nodeCount <= 2) return 'simple'
    if (nodeCount <= 5) return 'moderate'
    return 'complex'
  }

  /**
   * 获取性能建议
   * @param {Array} nodes - 节点列表
   * @returns {Array} 性能建议列表
   */
  getPerformanceRecommendations(nodes) {
    const recommendations = []
    
    if (nodes.length > 10) {
      recommendations.push('工作流节点较多，考虑拆分为多个子工作流')
    }
    
    const ttsNodes = nodes.filter(node => node.type === 'tts')
    if (ttsNodes.length > 3) {
      recommendations.push('包含多个语音合成节点，执行时间可能较长')
    }
    
    return recommendations
  }
}

// 创建单例实例
const workflowValidator = new WorkflowValidator()

export default workflowValidator

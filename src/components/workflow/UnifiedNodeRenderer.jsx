// ===== src/components/workflow/UnifiedNodeRenderer.jsx - 干净版本 =====

import React, { memo, useMemo } from 'react'

// 导入传统节点组件（新路径）
import TextInputNode from './nodes/legacy/TextInputNode'
import TTSNode from './nodes/legacy/TTSNode'
import OutputNode from './nodes/legacy/OutputNode'
import DownloadNode from './nodes/legacy/DownloadNode'

// 导入动态节点组件
import DynamicNode from './nodes/dynamic/DynamicNode'

// 导入基础框架
import BaseWorkflowNode from './nodes/BaseWorkflowNode'

// 导入统一管理器
import unifiedNodeManager from '../../services/workflow/UnifiedNodeManager'

/**
 * 节点组件映射表
 */
const NODE_COMPONENTS = {
  // 传统节点组件
  'text-input': TextInputNode,
  'tts': TTSNode,
  'output': OutputNode,
  'download': DownloadNode,
  
  // 特殊组件
  'dynamic': DynamicNode,      // 动态节点通用组件
  'fallback': BaseWorkflowNode // 降级组件
}

/**
 * 错误边界组件
 */
class NodeErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[UnifiedNodeRenderer] 节点渲染错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <BaseWorkflowNode
          nodeId={this.props.nodeId}
          nodeType="error"
          theme="red"
          title="渲染错误"
          icon="❌"
          status="error"
          selected={this.props.selected}
        >
          <div className="p-3 text-center">
            <div className="text-sm text-red-700 mb-2">
              节点渲染失败
            </div>
            <div className="text-xs text-red-600">
              {this.state.error?.message || '未知错误'}
            </div>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              重试
            </button>
          </div>
        </BaseWorkflowNode>
      )
    }

    return this.props.children
  }
}

/**
 * 统一节点渲染器主组件
 */
const UnifiedNodeRenderer = ({ id, data, selected, type, ...otherProps }) => {
  
  // ===== 智能组件选择 =====
  
  const selectedComponent = useMemo(() => {
    try {
      // 1. 检查是否为传统节点类型
      if (NODE_COMPONENTS[type]) {
        return {
          component: NODE_COMPONENTS[type],
          type: 'legacy',
          nodeType: type
        }
      }

      // 2. 通过统一管理器获取节点配置
      const nodeConfig = unifiedNodeManager.getNodeTypeConfig(type)
      
      if (nodeConfig) {
        // 检查是否为动态节点
        if (nodeConfig._source === 'dynamic' || nodeConfig.fields || nodeConfig.sourceType === 'json') {
          return {
            component: DynamicNode,
            type: 'dynamic',
            nodeType: type,
            nodeConfig: nodeConfig
          }
        }
        
        // 传统节点但可能映射关系缺失
        if (nodeConfig._source === 'legacy') {
          return {
            component: DynamicNode,
            type: 'dynamic-fallback',
            nodeType: type,
            nodeConfig: nodeConfig
          }
        }
      }

      // 3. 最终降级
      return {
        component: BaseWorkflowNode,
        type: 'fallback',
        nodeType: type
      }

    } catch (error) {
      return {
        component: BaseWorkflowNode,
        type: 'error',
        nodeType: type,
        error: error.message
      }
    }
  }, [type])

  // ===== 数据标准化 =====

  const standardizedData = useMemo(() => {
    try {
      // 确保数据包含基本字段
      const baseData = {
        label: data.label || `${type} 节点`,
        nodeType: data.nodeType || type,
        nodeIndex: data.nodeIndex || 0,
        totalNodes: data.totalNodes || 1,
        config: data.config || {},
        result: data.result || null,
        isProcessing: data.isProcessing || false,
        showAddButton: data.showAddButton || false,
        hideTestButton: data.hideTestButton !== false,
        ...data
      }

      // 为动态节点添加配置
      if (selectedComponent.type === 'dynamic' || selectedComponent.type === 'dynamic-fallback') {
        baseData.nodeConfig = selectedComponent.nodeConfig
      }

      return baseData

    } catch (error) {
      return data // 降级：返回原数据
    }
  }, [data, selectedComponent])

  // ===== 组件渲染 =====

  const renderNode = () => {
    const { component: SelectedComponent, type: componentType, error } = selectedComponent

    // 错误状态处理
    if (componentType === 'error') {
      return (
        <BaseWorkflowNode
          nodeId={id}
          nodeType={type}
          theme="red"
          title="组件错误"
          icon="❌"
          status="error"
          selected={selected}
        >
          <div className="p-3 text-center">
            <div className="text-sm text-red-700 mb-2">
              组件选择失败
            </div>
            <div className="text-xs text-red-600">
              {error || '未知错误'}
            </div>
          </div>
        </BaseWorkflowNode>
      )
    }

    // 降级状态处理
    if (componentType === 'fallback') {
      return (
        <BaseWorkflowNode
          nodeId={id}
          nodeType={type}
          theme="gray"
          title={standardizedData.label}
          icon="⚙️"
          status="unknown"
          selected={selected}
        >
          <div className="p-3 text-center">
            <div className="text-sm text-gray-700 mb-2">
              未知节点类型
            </div>
            <div className="text-xs text-gray-600">
              类型: {type}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              使用基础渲染器
            </div>
          </div>
        </BaseWorkflowNode>
      )
    }

    // 正常组件渲染
    return (
      <SelectedComponent
        nodeConfig={standardizedData.nodeConfig}
        id={id}
        data={standardizedData}
        selected={selected}
        type={type}
        {...otherProps}
      />
    )
  }

  // ===== 主渲染 =====

  return (
    <NodeErrorBoundary nodeId={id} selected={selected}>
      <div 
        className="unified-node-renderer" 
        data-node-type={type}
        data-component-type={selectedComponent.type}
        data-node-id={id}
      >
        {renderNode()}
      </div>
    </NodeErrorBoundary>
  )
}

/**
 * 创建节点类型映射对象
 */
export const createUnifiedNodeTypes = () => {
  try {
    // 获取所有已注册的节点类型
    const allNodeTypes = unifiedNodeManager.getAllNodeTypes()
    
    // 创建统一的 nodeTypes 对象
    const nodeTypes = {}
    
    allNodeTypes.forEach(nodeType => {
      nodeTypes[nodeType.type] = memo((props) => (
        <UnifiedNodeRenderer {...props} />
      ))
    })

    // 添加特殊节点类型
    nodeTypes['unified-fallback'] = memo((props) => (
      <UnifiedNodeRenderer {...props} />
    ))
    
    return nodeTypes

  } catch (error) {
    console.error(`[UnifiedNodeRenderer] 创建 nodeTypes 失败: ${error.message}`)
    
    // 降级：返回基础映射
    return {
      'text-input': memo((props) => <TextInputNode {...props} />),
      'tts': memo((props) => <TTSNode {...props} />),
      'output': memo((props) => <OutputNode {...props} />),
      'download': memo((props) => <DownloadNode {...props} />),
      'dynamic': memo((props) => <DynamicNode {...props} />),
      'fallback': memo((props) => <BaseWorkflowNode {...props} />)
    }
  }
}

/**
 * 获取节点组件统计信息
 */
export const getNodeComponentStats = () => {
  return {
    availableComponents: Object.keys(NODE_COMPONENTS),
    registeredNodeTypes: unifiedNodeManager.getAllNodeTypes().length,
    supportedFeatures: {
      legacyNodes: true,
      dynamicNodes: true,
      errorBoundary: true,
      fallbackSupport: true
    }
  }
}

export default memo(UnifiedNodeRenderer)

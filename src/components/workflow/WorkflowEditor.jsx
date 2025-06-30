import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import ReactFlow, { Controls, Background, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'

// ===== 📌 新：使用统一入口替代单独的节点导入 =====
import { createUnifiedNodeTypes } from './UnifiedNodeRenderer'
import UnifiedConfigPanel from './UnifiedConfigPanel'

// ===== 保持原有的其他组件导入 =====
import UIWorkflowExecutor from './WorkflowExecutor'
import WorkflowLogPanel from './WorkflowLogPanel'
import workflowValidator from '../../services/workflow/WorkflowValidator'

// ===== 📌 新：使用统一管理器替代原有管理器 =====
import unifiedNodeManager from '../../services/workflow/UnifiedNodeManager'

// ===== 📌 保持 NodeRegistry 用于动态功能（但现在通过统一管理器访问） =====
import dynamicNodeInitializer from '../../services/workflow/dynamic/DynamicNodeInitializer'

const WorkflowEditor = ({ config, onNotification }) => {

  // 核心状态
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [nodeId, setNodeId] = useState(1)
  const [isExecuting, setIsExecuting] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState([])
  const [executionLogs, setExecutionLogs] = useState([])
  const [workflowValidation, setWorkflowValidation] = useState({ valid: true, errors: [] })
  
  // UI状态
  const [showLogPanel, setShowLogPanel] = useState(true)
  const [rightPanelMode, setRightPanelMode] = useState('logs')
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState(null)
  const [showNodeSelector, setShowNodeSelector] = useState(false)
  const [insertAfterIndex, setInsertAfterIndex] = useState(null)
  
  // ===== 📌 简化：统一管理器状态 =====
  const [managerInitialized, setManagerInitialized] = useState(false)
  const [managerError, setManagerError] = useState(null)
  const [usingFallback, setUsingFallback] = useState(false)
  
  // 引用
  const reactFlowWrapper = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [workflowExecutor] = useState(() => new UIWorkflowExecutor(config))

  // 🔧 修复：使用 useRef 存储稳定的日志函数
  const addExecutionLogRef = useRef()
  const addExecutionLog = useCallback((message, type = 'info') => {
    setExecutionLogs(logs => [...logs, { 
      id: Date.now() + Math.random(), 
      timestamp: new Date().toLocaleTimeString(), 
      message: String(message), 
      type 
    }])
  }, [])
  
  // 更新 ref
  addExecutionLogRef.current = addExecutionLog

  // ===== 📌 新：统一管理器初始化 =====
  useEffect(() => {
    const initializeUnifiedManager = async () => {
      try {
        addExecutionLogRef.current('开始初始化统一节点管理器...', 'info')
        
        // 检查统一管理器状态
        const managerInfo = unifiedNodeManager.getManagerInfo()
        if (managerInfo.supportsStandardInterface) {
          setManagerInitialized(true)
          setUsingFallback(false)
          setManagerError(null)
          addExecutionLogRef.current(`统一管理器初始化成功 - 支持 ${managerInfo.registeredTypesCount} 个节点类型`, 'success')
          
          // 尝试初始化动态节点
          try {
            const result = await dynamicNodeInitializer.safeAutoInitialize()
            if (result && result.success) {
              addExecutionLogRef.current(`动态节点注册成功 - Legacy: ${result.legacy?.success || 0}, JSON: ${result.json?.success || 0}`, 'success')
              setManagerInitialized(false)
              setTimeout(() => setManagerInitialized(true), 100)
            } else {
              addExecutionLogRef.current('动态节点注册失败，但统一管理器正常工作', 'warn')
            }
          } catch (dynamicError) {
            addExecutionLogRef.current(`动态节点初始化失败: ${dynamicError.message}，但不影响核心功能`, 'warn')
          }
        } else {
          throw new Error('统一管理器不支持标准接口')
        }
        
      } catch (error) {
        // 管理器初始化失败，启用降级模式
        setManagerInitialized(false)
        setUsingFallback(true)
        setManagerError(error.message)
        addExecutionLogRef.current(`统一管理器初始化失败: ${error.message}，启用降级模式`, 'error')
      }
    }
    
    // 立即初始化
    initializeUnifiedManager()
  }, [])

  // 清空日志
  const clearExecutionLogs = useCallback(() => {
    setExecutionLogs([])
  }, [])

  // ===== 修复：重新计算所有节点数据 =====
  const recalculateAllNodes = useCallback((nodesList) => {
    return nodesList.map((node, index) => ({
      ...node,
      data: {
        ...node.data,
        nodeIndex: index,
        totalNodes: nodesList.length,
      },
      position: {
        x: 400,
        y: 100 + index * 200 // 增加间距避免重叠
      }
    }))
  }, [])

  // ===== 修复：节点位置计算 =====
  const calculateNodePosition = useCallback((index) => {
    return {
      x: 400,
      y: 100 + index * 200 // 固定200px间距
    }
  }, [])

  // ===== 修复：重新布局 =====
  const relayoutNodes = useCallback(() => {
    setNodes(currentNodes => recalculateAllNodes(currentNodes))
  }, [setNodes, recalculateAllNodes])

  // 添加节点后自动调整视图
  const adjustViewAfterNodeChange = useCallback(() => {
    if (reactFlowInstance && nodes.length > 0) {
      // 先让节点布局完成
      setTimeout(() => {
        // 动态调整视图以包含所有节点
        reactFlowInstance.fitView({
          padding: 0.1,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 1.2,
          duration: 600
        })
      }, 100)
    }
  }, [reactFlowInstance, nodes.length])

  // 🔧 修复：稳定化 updateNodeData 函数
  const updateNodeData = useCallback((nodeId, newData) => {
    console.log('[WorkflowEditor] updateNodeData 被调用:', { nodeId, newData })
    
    setNodes(currentNodes => {
      const updatedNodes = currentNodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
      // 重新计算所有节点数据
      return recalculateAllNodes(updatedNodes)
    })
    
    // 使用 ref 避免依赖循环
    addExecutionLogRef.current(`节点配置已更新`, 'success')
  }, [setNodes, recalculateAllNodes])

  // ===== 修复：添加节点函数 =====
  const addNodeAtPosition = useCallback((nodeType, nodeLabel, insertIndex = null) => {
    try {
      const targetIndex = insertIndex !== null ? insertIndex + 1 : nodes.length
      const newNodeId = `${nodeType}-${nodeId}`
      
      // 使用统一管理器创建节点
      const newNode = unifiedNodeManager.createNode(nodeType, {
        nodeId: newNodeId,
        nodeIndex: targetIndex,
        totalNodes: nodes.length + 1,
        position: calculateNodePosition(targetIndex),
        config: config,
        onDataChange: (newData) => updateNodeData(newNodeId, newData),
        onAddNode: (afterIndex) => openNodeSelector(afterIndex)
      })

      // 插入新节点
      setNodes(currentNodes => {
        let newNodesList
        if (insertIndex !== null) {
          // 插入到指定位置
          newNodesList = [
            ...currentNodes.slice(0, targetIndex),
            newNode,
            ...currentNodes.slice(targetIndex)
          ]
        } else {
          // 添加到末尾
          newNodesList = [...currentNodes, newNode]
        }
        
        // 重新计算所有节点的索引和位置
        return recalculateAllNodes(newNodesList)
      })

      const logMessage = insertIndex !== null 
        ? `已在第 ${insertIndex + 1} 步后添加 ${nodeLabel}`
        : `已添加 ${nodeLabel} 到工作流`
      
      addExecutionLogRef.current(logMessage, 'success')
      setNodeId(id => id + 1)
      
      // 关闭选择器
      setShowNodeSelector(false)
      setInsertAfterIndex(null)
      
      // 调整视图
      setTimeout(() => {
        adjustViewAfterNodeChange()
      }, 200)
    } catch (error) {
      addExecutionLogRef.current(`添加节点失败: ${error.message}`, 'error')
    }
  }, [nodes.length, nodeId, config, calculateNodePosition, updateNodeData, recalculateAllNodes])

  // 节点选择器
  const openNodeSelector = useCallback((afterIndex) => {
    setInsertAfterIndex(afterIndex)
    setShowNodeSelector(true)
  }, [])

  const closeNodeSelector = useCallback(() => {
    setShowNodeSelector(false)
    setInsertAfterIndex(null)
  }, [])

  // ===== 修复：删除节点 =====
  const deleteSelectedNodes = useCallback(() => {
    if (selectedNodes.length === 0) return
    
    const nodeIdsToDelete = selectedNodes.map(node => node.id)
    
    setNodes(currentNodes => {
      const remainingNodes = currentNodes.filter(node => !nodeIdsToDelete.includes(node.id))
      // 重新计算剩余节点的索引和位置
      return recalculateAllNodes(remainingNodes)
    })
    
    setSelectedNodes([])
    setSelectedNodeForConfig(null)
    addExecutionLogRef.current(`已删除 ${nodeIdsToDelete.length} 个节点`, 'success')
    
    // 调整视图
    setTimeout(() => {
      adjustViewAfterNodeChange()
    }, 150)
  }, [selectedNodes, setNodes, recalculateAllNodes, adjustViewAfterNodeChange])

  // ===== 修复：选择变化处理 =====
  const onSelectionChange = useCallback((selection) => {
    const selectedNodesList = selection?.nodes || []
    setSelectedNodes(selectedNodesList)
    
    if (selectedNodesList.length === 1) {
      const selectedNode = selectedNodesList[0]
      setSelectedNodeForConfig(selectedNode)
      setRightPanelMode('config')
      setShowLogPanel(true)
      
      // 更新节点状态
      setNodes(currentNodes => 
        currentNodes.map(node => ({
          ...node,
          selected: node.id === selectedNode.id,
          data: {
            ...node.data,
            showAddButton: node.id === selectedNode.id
          }
        }))
      )
    } else {
      setSelectedNodeForConfig(null)
      setRightPanelMode('logs')
      
      // 清除所有选中状态
      setNodes(currentNodes => 
        currentNodes.map(node => ({
          ...node,
          selected: false,
          data: {
            ...node.data,
            showAddButton: false
          }
        }))
      )
    }
  }, [])

  // 视图控制 - 增强版本
  const fitViewToNodes = useCallback(() => {
    if (reactFlowInstance && nodes.length > 0) {
      adjustViewAfterNodeChange()
    }
  }, [reactFlowInstance, adjustViewAfterNodeChange])

  // 验证工作流
  const validateCurrentWorkflow = useCallback(() => {
    const workflow = { nodes, edges: [] }
    const validation = workflowValidator.quickValidate(workflow)
    setWorkflowValidation(validation)
    return validation
  }, [nodes])

  // 监听节点变化
  useEffect(() => {
    if (nodes.length > 0) {
      adjustViewAfterNodeChange()
    }
    validateCurrentWorkflow()
  }, [nodes.length, adjustViewAfterNodeChange, validateCurrentWorkflow])

  // 添加手动重新布局功能
  const handleRelayout = useCallback(() => {
    relayoutNodes()
    setTimeout(() => {
      adjustViewAfterNodeChange()
    }, 150)
    addExecutionLogRef.current('节点布局已重新对齐', 'success')
  }, [relayoutNodes, adjustViewAfterNodeChange])

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isEditing = document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'TEXTAREA' || 
         document.activeElement.contentEditable === 'true')
      
      if (event.key === 'Delete' && !isEditing && selectedNodes.length > 0) {
        event.preventDefault()
        deleteSelectedNodes()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedNodes, selectedNodes])

  // 工作流执行 - 添加验证
  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      addExecutionLogRef.current('工作流为空，请添加节点', 'error')
      return
    }

    addExecutionLogRef.current('开始执行前数据校准和验证...', 'info')

    // 🔑 关键修复：同步数据校准和状态更新
    let calibratedNodes = nodes

    // 先进行数据校准处理
    calibratedNodes = nodes.map(node => {
      const calibratedData = { ...node.data }
      
      // 提取直接保存的配置字段
      const directConfigFields = {}
      
      // 根据节点类型提取配置字段
      switch (node.type) {
        case 'text-input':
          if (calibratedData.text !== undefined) {
            directConfigFields.text = calibratedData.text
          }
          break
          
        case 'tts':
          // TTS 节点的所有配置字段
          const ttsFields = [
            'mode', 'selectedCharacter', 'character', 'username', 
            'voice_id', 'gender', 'pitch', 'speed'
          ]
          ttsFields.forEach(field => {
            if (calibratedData[field] !== undefined) {
              directConfigFields[field] = calibratedData[field]
            }
          })
          break
          
        case 'download':
          // 下载节点的配置字段
          const downloadFields = [
            'autoDownload', 'customFileName', 'customPath', 
            'downloadFormat', 'showProgress', 'allowRetry'
          ]
          downloadFields.forEach(field => {
            if (calibratedData[field] !== undefined) {
              directConfigFields[field] = calibratedData[field]
            }
          })
          
          // 🔧 下载节点特殊处理：确保有基本配置
          if (Object.keys(directConfigFields).length === 0) {
            // 如果没有任何配置，提供默认配置确保节点可执行
            directConfigFields.autoDownload = calibratedData.autoDownload !== undefined ? calibratedData.autoDownload : false
            directConfigFields.downloadFormat = calibratedData.downloadFormat || 'auto'
            directConfigFields.showProgress = calibratedData.showProgress !== undefined ? calibratedData.showProgress : true
            directConfigFields.allowRetry = calibratedData.allowRetry !== undefined ? calibratedData.allowRetry : true
            addExecutionLogRef.current(`[数据校准] ${node.type} 节点使用默认配置`, 'info')
          }
          
          // 🔧 额外调试：输出下载节点的详细状态
          console.log(`📥 下载节点 ${node.id} 校准详情:`, {
            原始数据字段: Object.keys(calibratedData),
            提取的配置: directConfigFields,
            最终config: { ...calibratedData.config, ...directConfigFields }
          })
          break
          
        case 'output':
          // 输出节点通常不需要特殊配置，但保持一致性
          if (calibratedData.displayMode !== undefined) {
            directConfigFields.displayMode = calibratedData.displayMode
          }
          break
          
        default:
          // 动态节点或其他类型节点的通用处理
          Object.keys(calibratedData).forEach(key => {
            // 排除系统字段
            const systemFields = [
              'label', 'nodeType', 'nodeIndex', 'totalNodes', 'config',
              'result', 'isProcessing', 'showAddButton', 'hideTestButton',
              'onDataChange', 'onAddNode', 'onSetProcessor', '_metadata', 'nodeConfig'
            ]
            if (!systemFields.includes(key) && !key.startsWith('_') && !key.startsWith('on')) {
              directConfigFields[key] = calibratedData[key]
            }
          })
      }
      
      // 同步配置到多个位置，确保执行器能找到
      if (Object.keys(directConfigFields).length > 0) {
        // 位置1: config 对象中（ConfigurationResolver 优先读取位置）
        calibratedData.config = {
          ...calibratedData.config,
          ...directConfigFields
        }
        
        // 位置2: nodeConfig.defaultData 中（动态节点兼容）
        if (calibratedData.nodeConfig && calibratedData.nodeConfig.defaultData) {
          calibratedData.nodeConfig.defaultData = {
            ...calibratedData.nodeConfig.defaultData,
            ...directConfigFields
          }
        }
        
        addExecutionLogRef.current(`[数据校准] ${node.type} 节点配置已同步: ${Object.keys(directConfigFields).join(', ')}`, 'info')
      }
      
      return { ...node, data: calibratedData }
    })

    // 🔑 关键修复：清除状态缓存，强制重新计算状态
    try {
      const { default: nodeStatusCalculator } = await import('../../services/workflow/NodeStatusCalculator')
      nodeStatusCalculator.clearCache()
      addExecutionLogRef.current('状态缓存已清除，将重新验证所有节点配置', 'success')
      
      // 🔧 新增：强制刷新React组件的状态显示
      setTimeout(() => {
        // 触发节点状态重新计算和UI更新
        setNodes(currentNodes => 
          currentNodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              _statusUpdateKey: Date.now() // 添加时间戳强制组件更新
            }
          }))
        )
        addExecutionLogRef.current('已触发节点状态UI刷新', 'info')
      }, 100)
      
    } catch (error) {
      addExecutionLogRef.current(`清除状态缓存失败: ${error.message}，但不影响执行`, 'warn')
    }

    // 🔑 应用校准后的节点数据
    setNodes(calibratedNodes)
    
    // 🔑 等待 React 状态更新完成
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 🔧 开发环境：暴露节点数据到全局，便于调试
    if (process.env.NODE_ENV === 'development') {
      window.__workflowNodes = calibratedNodes
      window.__originalNodes = nodes
      console.log('🔧 调试模式：节点数据已暴露到 window.__workflowNodes 和 window.__originalNodes')
    }

    // 执行前验证 - 使用最新的节点状态
    const validation = validateCurrentWorkflow()
    if (!validation.canExecute) {
      addExecutionLogRef.current('工作流验证失败，无法执行', 'error')
      validation.criticalErrors.forEach(error => {
        addExecutionLogRef.current(error, 'error')
      })
      return
    }

    // 🔑 添加执行前的最终数据一致性检查 - 基于校准后的数据
    let hasDataInconsistency = false
    calibratedNodes.forEach((node, index) => {
      if (node.type === 'text-input') {
        const hasText = node.data.text || node.data.config?.text
        if (!hasText || !hasText.trim()) {
          addExecutionLogRef.current(`第 ${index + 1} 步 (${node.type}): 检测到文本内容为空，实际数据: ${JSON.stringify({
            text: node.data.text,
            configText: node.data.config?.text,
            allKeys: Object.keys(node.data)
          })}`, 'error')
          hasDataInconsistency = true
        } else {
          addExecutionLogRef.current(`第 ${index + 1} 步 (${node.type}): 文本内容检查通过 (${hasText.length} 字符)`, 'success')
        }
      }
      
      // 🔧 下载节点特殊检查
      if (node.type === 'download') {
        // 下载节点通常不需要严格的配置验证，只要有基本设置就可以执行
        const hasValidConfig = node.data.config && Object.keys(node.data.config).length > 0
        if (hasValidConfig) {
          addExecutionLogRef.current(`第 ${index + 1} 步 (${node.type}): 下载节点配置检查通过`, 'success')
        } else {
          addExecutionLogRef.current(`第 ${index + 1} 步 (${node.type}): 下载节点缺少配置，将使用默认设置`, 'info')
          // 不设置为错误，下载节点可以使用默认配置执行
        }
      }
    })
    
    if (hasDataInconsistency) {
      addExecutionLogRef.current('发现数据不一致，请检查节点配置后重试', 'error')
      return
    }
    
    setIsExecuting(true)
    addExecutionLogRef.current(`开始执行工作流 (${calibratedNodes.length} 个节点)...`, 'info')
    
    try {
      // 🔑 使用校准后的节点数据执行工作流
      await workflowExecutor.executeStackedWorkflow(calibratedNodes, addExecutionLogRef.current, setNodes)
      addExecutionLogRef.current('🎉 工作流执行完成', 'success')
    } catch (error) {
      addExecutionLogRef.current(`❌ 执行失败: ${error.message}`, 'error')
      
      // 输出更详细的错误信息用于调试
      if (error.stack) {
        console.error('工作流执行详细错误:', error.stack)
      }
    } finally {
      setIsExecuting(false)
    }
  }

  // ===== 📌 新：使用统一节点类型生成器 =====
  const nodeTypes = useMemo(() => {
    try {
      // 使用统一节点渲染器生成 nodeTypes
      const unifiedTypes = createUnifiedNodeTypes()
      
      if (unifiedTypes && Object.keys(unifiedTypes).length > 0) {
        addExecutionLogRef.current(`统一 nodeTypes 已生成，包含 ${Object.keys(unifiedTypes).length} 个节点类型`, 'success')
        return unifiedTypes
      }
      
      throw new Error('统一 nodeTypes 生成失败')
      
    } catch (error) {
      addExecutionLogRef.current(`nodeTypes 生成失败: ${error.message}，使用降级方案`, 'error')
      
      // 降级：返回基础映射
      return {
        'fallback': (props) => (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <div className="text-sm text-red-700">节点渲染失败</div>
            <div className="text-xs text-red-600">{error.message}</div>
          </div>
        )
      }
    }
  }, [managerInitialized, usingFallback])

  // ===== 📌 新：使用统一管理器生成工具箱按钮 =====
  const nodeButtons = useMemo(() => {
    try {
      // 通过统一管理器获取所有节点类型
      const allNodeTypes = unifiedNodeManager.getAllNodeTypes()
      
      if (allNodeTypes && allNodeTypes.length > 0) {
        const buttons = allNodeTypes.map(nodeType => ({
          type: nodeType.type,
          label: nodeType.label,
          icon: nodeType.icon,
          desc: nodeType.description,
          category: nodeType.category,
          theme: nodeType.theme
        }))
        
        addExecutionLogRef.current(`使用统一管理器工具箱，包含 ${buttons.length} 个节点`, 'success')
        return buttons
      }
      
      throw new Error('统一管理器返回空节点列表')
      
    } catch (error) {
      addExecutionLogRef.current(`工具箱按钮生成失败: ${error.message}，使用降级方案`, 'error')
      
      // 最终降级：硬编码按钮
      return [
        { type: 'text-input', label: '文本输入', icon: '📝', desc: '输入文本内容' },
        { type: 'tts', label: '语音合成', icon: '🎤', desc: '文字转语音' },
        { type: 'output', label: '结果输出', icon: '📤', desc: '输出最终结果' },
        { type: 'download', label: '文件下载', icon: '📥', desc: '下载文件到本地' }
      ]
    }
  }, [managerInitialized, usingFallback])

  // ===== 📌 新增：管理器重新初始化功能 (开发环境) =====
  const handleManagerReinit = useCallback(async () => {
    if (process.env.NODE_ENV !== 'development') {
      addExecutionLogRef.current('管理器重新初始化仅在开发环境可用', 'warn')
      return
    }

    try {
      addExecutionLogRef.current('重新初始化统一管理器...', 'info')
      
      // 获取管理器健康状态
      const health = unifiedNodeManager.getHealthStatus()
      if (health.overall === 'healthy') {
        setManagerInitialized(true)
        setUsingFallback(false)
        setManagerError(null)
        addExecutionLogRef.current('统一管理器重新初始化成功', 'success')
      } else {
        throw new Error(`管理器健康检查失败: ${health.issues.join('; ')}`)
      }
    } catch (error) {
      setManagerError(error.message)
      addExecutionLogRef.current(`重新初始化失败: ${error.message}`, 'error')
    }
  }, [])

  return (
    <div className="w-full h-screen bg-gray-50">
      {/* 标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
              📦
            </div>
            <h1 className="text-xl font-semibold text-gray-900">AI创作工作流</h1>
            <div className="text-sm text-gray-500">
              节点数: {nodes.length}
              {selectedNodes.length > 0 && ` | 选中: ${selectedNodes.length}`}
              {!workflowValidation.canExecute && (
                <span className="text-red-500 ml-2">⚠️ 配置不完整</span>
              )}
            </div>
            
            {/* ===== 📌 新：统一管理器状态指示器 ===== */}
            <div className={`text-xs px-2 py-1 rounded ${
              managerInitialized && !usingFallback
                ? 'text-green-600 bg-green-50' 
                : usingFallback
                  ? 'text-yellow-600 bg-yellow-50'
                  : 'text-red-600 bg-red-50'
            }`}>
              {managerInitialized && !usingFallback
                ? '🔄 统一管理器' 
                : usingFallback
                  ? '⚠️ 降级模式'
                  : '❌ 管理器错误'
              }
            </div>
            
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              🧱 堆叠式 • 无连线
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* ===== 开发环境调试按钮 ===== */}
            {process.env.NODE_ENV === 'development' && (
              <button 
                onClick={handleManagerReinit} 
                className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
              >
                🔄 重载管理器
              </button>
            )}
            
            <button 
              onClick={handleRelayout} 
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              🎯 对齐
            </button>
            <button 
              onClick={() => { 
                setNodes([])
                setExecutionLogs([])
                setSelectedNodeForConfig(null)
                setWorkflowValidation({ valid: true, errors: [] })
                addExecutionLogRef.current('工作流已清空', 'info')
              }} 
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              🗑️ 清空
            </button>
            {selectedNodes.length > 0 && (
              <button 
                onClick={deleteSelectedNodes} 
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                ❌ 删除选中 ({selectedNodes.length})
              </button>
            )}
            <button 
              onClick={() => setShowLogPanel(!showLogPanel)} 
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              📋 面板 {showLogPanel ? '隐藏' : '显示'}
            </button>
            <button 
              onClick={executeWorkflow} 
              disabled={isExecuting || nodes.length === 0 || !workflowValidation.canExecute} 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  执行中...
                </>
              ) : (
                '▶️ 执行'
              )}
            </button>
          </div>
        </div>
        
        {/* ===== 📌 新：统一管理器错误提示 ===== */}
        {managerError && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <span className="text-yellow-800">
              ⚠️ 统一管理器错误: {managerError} (已启用降级模式，功能正常)
            </span>
          </div>
        )}
      </div>

      <div className="flex h-full relative">
        {/* 左侧节点面板 */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">节点工具箱</h3>
            <div className={`text-xs px-2 py-0.5 rounded ${
              managerInitialized && !usingFallback
                ? 'text-green-600 bg-green-100' 
                : 'text-gray-600 bg-gray-100'
            }`}>
              {managerInitialized && !usingFallback ? '统一' : '降级'}
            </div>
          </div>
          
          <div className="space-y-2">
            {nodeButtons.map(btn => (
              <button 
                key={btn.type} 
                onClick={() => addNodeAtPosition(btn.type, btn.label)}
                className="w-full flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-colors border border-gray-200 text-left"
              >
                <span className="text-lg mt-0.5 flex-shrink-0">{btn.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 mb-1">{btn.label}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{btn.desc}</div>
                </div>
                <div className="text-gray-400">➕</div>
              </button>
            ))}
          </div>
          
          <div className="mt-8 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 text-sm">💡</span>
              <div className="text-xs text-blue-800">
                <div className="font-medium mb-1">
                  {managerInitialized && !usingFallback ? '统一工具箱:' : '降级工具箱:'}
                </div>
                <div>
                  {managerInitialized && !usingFallback
                    ? '支持传统和动态节点，智能路由' 
                    : '基础功能，稳定可靠'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 中间画布 */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow 
            nodes={nodes} 
            edges={[]} 
            onNodesChange={onNodesChange} 
            onSelectionChange={onSelectionChange} 
            onInit={setReactFlowInstance} 
            nodeTypes={nodeTypes} 
            className="bg-gray-50" 
            fitView 
            nodesDraggable={false} 
            nodesConnectable={false} 
            elementsSelectable={true} 
            multiSelectionKeyCode="Shift" 
            deleteKeyCode="Delete" 
            panOnDrag={true} 
            zoomOnPinch={true}
          >
            <Controls showInteractive={false} />
            <Background variant="dots" gap={20} size={1} color="#e5e7eb" />
            
            {/* 修复节点缩放样式 */}
            <style>{`
              /* 基础节点容器清理 */
              .react-flow__node {
                width: 320px !important;
                height: 160px !important;
                min-width: 320px !important;
                max-width: 320px !important;
                min-height: 160px !important;
                max-height: 160px !important;
                box-sizing: border-box !important;
                background: transparent !important;
                border: none !important;
                outline: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              
              /* TTS 节点需要更高的高度 */
              .react-flow__node[data-nodetype="tts"] {
              
              }
              
              /* 移除所有默认状态样式 */
              .react-flow__node.selected,
              .react-flow__node-selected,
              .react-flow__node:focus,
              .react-flow__node:focus-visible,
              .react-flow__node:hover {
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
              }
              
              /* 移除伪元素 */
              .react-flow__node::before,
              .react-flow__node::after {
                display: none !important;
                content: none !important;
              }
              
              /* 确保节点内容容器统一 */
              .react-flow__node > div {
                width: 100% !important;
                height: 100% !important;
                outline: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
            `}</style>
          </ReactFlow>

          {/* 节点选择器浮窗 */}
          {showNodeSelector && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 text-center">
                  选择要添加的节点
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {nodeButtons.map(btn => (
                    <button
                      key={btn.type}
                      onClick={() => addNodeAtPosition(btn.type, btn.label, insertAfterIndex)}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 hover:scale-105 transition-all duration-200 border border-transparent hover:border-blue-200"
                    >
                      <span className="text-2xl">{btn.icon}</span>
                      <span className="text-xs font-medium text-gray-700">{btn.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={closeNodeSelector}
                  className="w-full mt-3 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 初始状态提示 */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-4 workflow-box-bounce">📦</div>
                <div className="text-lg font-medium mb-2">开始搭建工作流</div>
                <div className="text-sm">像搭积木一样堆叠节点</div>
                <div className="text-xs mt-2 text-gray-500">
                  {managerInitialized && !usingFallback
                    ? '统一节点系统已就绪，从左侧添加节点' 
                    : '基础节点系统，从左侧添加第一个节点'
                  }
                </div>
              </div>
            </div>
          )}

          {/* 局部CSS动画 */}
          <style>{`
            .workflow-box-bounce {
              animation: workflowBounce 2s ease-in-out infinite;
            }
            
            @keyframes workflowBounce {
              0%, 20%, 53%, 80%, 100% {
                transform: translateY(0);
              }
              40%, 43% {
                transform: translateY(-8px);
              }
              70% {
                transform: translateY(-4px);
              }
              90% {
                transform: translateY(-2px);
              }
            }
          `}</style>
        </div>

        {/* 右侧面板 */}
        {showLogPanel && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  {rightPanelMode === 'logs' ? '执行日志' : '节点配置'}
                </h3>
                <button 
                  onClick={() => setShowLogPanel(false)} 
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                  onClick={() => setRightPanelMode('logs')} 
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    rightPanelMode === 'logs' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 日志
                </button>
                <button 
                  onClick={() => setRightPanelMode('config')} 
                  disabled={!selectedNodeForConfig} 
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    rightPanelMode === 'config' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ⚙️ 配置
                </button>
              </div>
              {rightPanelMode === 'config' && selectedNodeForConfig && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800">
                    正在配置: {selectedNodeForConfig.data.label}
                  </div>
                  <div className="text-xs text-blue-600">
                    第 {(selectedNodeForConfig.data.nodeIndex || 0) + 1} 步 • {selectedNodeForConfig.type}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {rightPanelMode === 'logs' ? (
                <WorkflowLogPanel 
                  executionLogs={executionLogs}
                  onClearLogs={clearExecutionLogs}
                />
              ) : (
                <div className="p-4">
                  <UnifiedConfigPanel 
                    node={selectedNodeForConfig} 
                    onConfigSave={updateNodeData} 
                  />
                </div>
              )}
            </div>
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-600 text-center">
                {rightPanelMode === 'logs' ? (
                  `当前模式: 执行日志 ${managerInitialized && !usingFallback ? '(统一系统)' : '(降级系统)'}`
                ) : (
                  selectedNodeForConfig ? `节点ID: ${selectedNodeForConfig.id}` : '未选择节点'
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkflowEditor
// ===== 简化版 UnifiedConfigPanel.jsx - 只保留路由逻辑 =====

import React from 'react'

// 导入配置面板组件
import DynamicConfigPanel from './nodes/dynamic/DynamicConfigPanel'
import WorkflowConfigPanel from './WorkflowConfigPanel'

/**
 * 简化版统一配置面板 - 只负责路由分发
 * 
 * 核心功能：
 * 🔀 路由分发：根据节点类型选择合适的配置面板
 * 📦 传统节点：使用 WorkflowConfigPanel
 * ⚡ 其他节点：使用增强版 DynamicConfigPanel（启用统一模式）
 * 
 * 迁移说明：
 * ❌ 已删除：字段渲染、验证、状态管理等功能（已迁移到 DynamicConfigPanel）
 * ✅ 保留：节点类型判断和路由逻辑
 * 🔧 简化：从 ~1500 行代码减少到 ~50 行代码
 */
const UnifiedConfigPanel = ({ node, onConfigSave }) => {
  
  // ===== 🔀 节点类型路由 =====
  
  // 传统节点：继续使用 WorkflowConfigPanel
  const legacyNodeTypes = ['text-input', 'tts', 'output', 'download']
  if (legacyNodeTypes.includes(node?.type)) {
    console.log(`[UnifiedConfigPanel] 路由到传统面板: ${node.type}`)
    return <WorkflowConfigPanel node={node} onConfigSave={onConfigSave} />
  }
  
  // ⚡ 其他节点：使用增强版 DynamicConfigPanel，启用统一模式
  console.log(`[UnifiedConfigPanel] 路由到统一模式: ${node?.type}`)
  return (
    <DynamicConfigPanel
      node={node}
      onConfigSave={onConfigSave}
      enableUnifiedMode={true}  // 🔧 启用统一节点管理模式
      onError={(error) => {
        console.error('[UnifiedConfigPanel] 配置面板错误:', error)
      }}
    />
  )
}


export default UnifiedConfigPanel
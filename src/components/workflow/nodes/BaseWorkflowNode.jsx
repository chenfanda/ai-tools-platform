// ===== src/components/workflow/nodes/BaseWorkflowNode.jsx =====
import React, { memo } from 'react'

/**
 * 统一的工作流节点基础组件
 * 负责样式统一、主题管理、尺寸控制
 */
const BaseWorkflowNode = ({
  children,
  selected = false,
  nodeId,
  nodeType = 'default',
  theme = 'blue',
  title,
  icon,
  nodeIndex = 0,
  status = 'configured', // configured, waiting, processing, error, success
  showAddButton = false,
  onAddNode,
  className = '',
  ...props
}) => {
  // 主题配置
  const themes = {
    blue: {
      bg: 'from-white to-blue-50',
      header: 'from-blue-50 to-blue-100',
      accent: 'blue',
      icon: 'from-blue-500 to-blue-600',
      border: 'border-blue-200 hover:border-blue-300',
      selectedBorder: 'border-blue-400',
      ring: 'ring-blue-400',
      shadow: 'shadow-blue-500/10 hover:shadow-blue-500/20',
      selectedShadow: 'shadow-blue-500/25'
    },
    purple: {
      bg: 'from-white to-purple-50',
      header: 'from-purple-50 to-purple-100',
      accent: 'purple',
      icon: 'from-purple-500 to-purple-600',
      border: 'border-purple-200 hover:border-purple-300',
      selectedBorder: 'border-purple-400',
      ring: 'ring-purple-400',
      shadow: 'shadow-purple-500/10 hover:shadow-purple-500/20',
      selectedShadow: 'shadow-purple-500/25'
    },
    orange: {
      bg: 'from-white to-orange-50',
      header: 'from-orange-50 to-red-100',
      accent: 'orange',
      icon: 'from-orange-500 to-red-600',
      border: 'border-orange-200 hover:border-orange-300',
      selectedBorder: 'border-orange-400',
      ring: 'ring-orange-400',
      shadow: 'shadow-orange-500/10 hover:shadow-orange-500/20',
      selectedShadow: 'shadow-orange-500/25'
    },
    green: {
      bg: 'from-white to-green-50',
      header: 'from-green-50 to-green-100',
      accent: 'green',
      icon: 'from-green-500 to-green-600',
      border: 'border-green-200 hover:border-green-300',
      selectedBorder: 'border-green-400',
      ring: 'ring-green-400',
      shadow: 'shadow-green-500/10 hover:shadow-green-500/20',
      selectedShadow: 'shadow-green-500/25'
    }
  }

  const currentTheme = themes[theme] || themes.blue

  // 状态配置
  const statusConfig = {
    configured: { color: 'green', dot: 'bg-green-500', text: '已配置' },
    waiting: { color: 'gray', dot: 'bg-gray-300', text: '等待' },
    processing: { color: 'blue', dot: 'bg-blue-500 animate-pulse', text: '处理中' },
    error: { color: 'red', dot: 'bg-red-500', text: '错误' },
    success: { color: 'green', dot: 'bg-green-500', text: '完成' }
  }

  const currentStatus = statusConfig[status] || statusConfig.waiting

  // 处理添加节点
  const handleAddNode = (e) => {
    e.stopPropagation()
    if (onAddNode) {
      onAddNode(nodeIndex)
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* 隐藏 ReactFlow 默认样式 */}
      <style jsx>{`
        :global(.react-flow__node[data-id="${nodeId}"]) {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        :global(.react-flow__node[data-id="${nodeId}"].selected) {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        :global(.react-flow__node[data-id="${nodeId}"]:focus) {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        
        :global(.react-flow__node[data-id="${nodeId}"]::before),
        :global(.react-flow__node[data-id="${nodeId}"]::after) {
          display: none !important;
        }
      `}</style>

      {/* 节点主体 - 使用WorkflowEditor统一控制的尺寸 */}
      <div 
        className={`
          relative bg-gradient-to-br ${currentTheme.bg} rounded-2xl 
          transition-all duration-300 w-full h-full
          overflow-hidden ${className}
          ${selected 
            ? `shadow-2xl ${currentTheme.selectedShadow} ring-2 ${currentTheme.ring} ring-opacity-60 scale-105 border-2 ${currentTheme.selectedBorder}` 
            : `shadow-md ${currentTheme.shadow} hover:shadow-lg hover:scale-95 scale-90 border-2 ${currentTheme.border}`
          }
        `}
        data-nodetype={nodeType}
        {...props}
      >
        {/* 顶部装饰条 */}
        <div className={`h-1 bg-gradient-to-r from-${currentTheme.accent}-400 via-${currentTheme.accent}-500 to-${currentTheme.accent}-600`}></div>
        
        {/* 节点头部 */}
        <div className={`bg-gradient-to-r ${currentTheme.header} px-4 py-2 border-b border-${currentTheme.accent}-100`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 bg-gradient-to-br ${currentTheme.icon} rounded-lg flex items-center justify-center text-white text-xs shadow-md`}>
                {icon || '⚙️'}
              </div>
              <div>
                <div className={`font-semibold text-${currentTheme.accent}-900 text-sm`}>
                  {title || '节点'}
                </div>
                <div className={`text-xs text-${currentTheme.accent}-600`}>
                  第 {nodeIndex + 1} 步
                </div>
              </div>
            </div>
            
            {/* 状态指示 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full transition-colors ${currentStatus.dot}`} />
                <span className={`text-xs text-${currentTheme.accent}-600 font-medium`}>
                  {currentStatus.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 节点内容区域 */}
        <div className="p-3 flex flex-col" style={{ height: 'calc(100% - 45px)' }}>
          {children}
        </div>

        {/* 底部连接点 */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className={`w-3 h-3 bg-gradient-to-br ${currentTheme.icon} rounded-full border-2 border-white shadow-lg`}></div>
        </div>
      </div>

      {/* 添加节点按钮 */}
      {showAddButton && (
        <div className="flex flex-col items-center py-2">
          <div className={`w-0.5 h-3 bg-gradient-to-b from-${currentTheme.accent}-400 to-${currentTheme.accent}-500`}></div>
          
          <button
            onClick={handleAddNode}
            className={`
              group relative w-8 h-8 
              bg-gradient-to-br from-${currentTheme.accent}-500 via-${currentTheme.accent}-500 to-${currentTheme.accent}-600 
              hover:from-${currentTheme.accent}-600 hover:via-${currentTheme.accent}-600 hover:to-${currentTheme.accent}-700 
              text-white rounded-full shadow-lg hover:shadow-xl 
              flex items-center justify-center text-lg font-normal 
              hover:scale-110 transform transition-all duration-300 
              ring-2 ring-white/50 hover:ring-white/80
            `}
            title="添加新节点"
          >
            <span className="transform group-hover:rotate-180 transition-transform duration-300">⊕</span>
            
            {/* 悬浮提示 */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl border border-gray-700">
                ✨ 添加新步骤
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-800"></div>
            </div>
          </button>
          
          <div className={`w-0.5 h-3 bg-gradient-to-b from-${currentTheme.accent}-500 to-${currentTheme.accent}-400`}></div>
        </div>
      )}
    </div>
  )
}

export default memo(BaseWorkflowNode)

// ===== src/components/workflow/WorkflowLogPanel.jsx =====
import React from 'react'

/**
 * 工作流执行日志面板组件
 * 负责显示工作流执行过程中的日志信息
 */
const WorkflowLogPanel = ({ 
  executionLogs, 
  onClearLogs 
}) => {
  
  // 空日志状态
  if (executionLogs.length === 0) {
    return (
      <div className="p-4 space-y-2">
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">📝</div>
          <div>暂无执行日志</div>
          <div className="text-sm">执行工作流时会显示详细日志</div>
        </div>
      </div>
    )
  }

  // 获取日志类型对应的图标
  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  // 获取日志类型对应的样式
  const getLogStyle = (type) => {
    switch (type) {
      case 'success': 
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error': 
        return 'bg-red-50 border-red-200 text-red-800'
      case 'info': 
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default: 
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  return (
    <>
      {/* 日志列表 */}
      <div className="p-4 space-y-2">
        {executionLogs.map(log => (
          <div 
            key={log.id} 
            className={`p-3 rounded-lg border text-sm ${getLogStyle(log.type)}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 mt-0.5 flex-shrink-0">
                {log.timestamp}
              </span>
              <span className="flex-1">
                {log.message}
              </span>
              <span className="text-xs flex-shrink-0">
                {getLogIcon(log.type)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 日志底部状态栏 */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 text-center">
          共 {executionLogs.length} 条日志
          {executionLogs.length > 0 && (
            <>
              <span className="mx-2">•</span>
              <button 
                onClick={onClearLogs} 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                清空日志
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default WorkflowLogPanel

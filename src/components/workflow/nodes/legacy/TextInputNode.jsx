// ===== src/components/workflow/nodes/legacy/TextInputNode.jsx - 干净修复版本 =====
import React, { useState, memo, useEffect } from 'react'
import BaseWorkflowNode from '../BaseWorkflowNode'

const TextInputNode = ({ data, selected, id }) => {
  const [text, setText] = useState(data.text || '')

  // 获取节点位置信息
  const nodeIndex = data.nodeIndex !== undefined ? data.nodeIndex : 0
  const totalNodes = data.totalNodes || 1

  // 同步外部数据变化
  useEffect(() => {
    if (data.text !== text) {
      setText(data.text || '')
    }
  }, [data.text])

  // 处理函数 - 返回文本内容
  const handleProcess = async () => {
    return text || ''
  }

  // 注册处理器
  useEffect(() => {
    if (data.onSetProcessor && id) {
      data.onSetProcessor(handleProcess)
    }
  }, [data.onSetProcessor, id])

  // 获取配置状态
  const getStatus = () => {
    if (data.result?.error) return 'error'
    if (data.result?.success) return 'success'
    if (data.isProcessing) return 'processing'
    if (!text || text.trim().length === 0) {
      return 'waiting'
    }
    return 'configured'
  }

  const showAddButton = data.showAddButton === true && (nodeIndex < (totalNodes - 1) || totalNodes === 1)

  return (
    <BaseWorkflowNode
      nodeId={id}
      nodeType="text-input"
      theme="purple"
      title="文本输入"
      icon="📝"
      nodeIndex={nodeIndex}
      status={getStatus()}
      selected={selected}
      showAddButton={showAddButton}
      onAddNode={data.onAddNode}
    >
      {/* 内容预览区域 */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700">
            文本内容
          </label>
          {selected && (
            <div className="text-xs text-purple-600 bg-purple-100/80 px-2 py-0.5 rounded-full">
              ⚙️ 右侧配置
            </div>
          )}
        </div>
        
        {/* 文本预览 */}
        <div className={`w-full h-16 px-2 py-1 border rounded-lg bg-gray-50/70 text-xs overflow-hidden transition-all duration-300 ${
          selected ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200'
        }`}>
          {text ? (
            <div className="text-gray-800 line-clamp-3">
              {text}
            </div>
          ) : (
            <div className="text-gray-400 italic flex items-center h-full">
              暂无文本内容，点击右侧配置面板进行设置
            </div>
          )}
        </div>
        
        {/* 底部信息 */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">
            {text.length > 0 ? `${text.length} 字符` : '等待配置'}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs transition-all duration-300 ${
            text.length > 0 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {text.length > 0 ? '✓ 已配置' : '⚠ 待配置'}
          </span>
        </div>
      </div>

      {/* 配置提示 */}
      {!text && selected && (
        <div className="mt-2 p-2 bg-purple-50/70 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700">
            💡 请在右侧配置面板中输入文本内容
          </div>
        </div>
      )}

      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </BaseWorkflowNode>
  )
}

export default memo(TextInputNode)

// ===== src/components/workflow/NodePanel.jsx - 点击式节点选择面板 =====
import React, { useState, useMemo } from 'react'

/**
 * 节点选择面板组件
 * 提供可点击的节点类型列表，用户点击后添加到工作流末尾
 */
const NodePanel = ({ onAddNode, isVisible = true }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 节点类型定义
  const nodeTypes = [
    {
      id: 'text-input',
      name: '文本输入',
      description: '输入要处理的文本内容',
      icon: '📝',
      category: 'input',
      theme: 'blue',
      keywords: ['文本', '输入', 'text', 'input'],
      usage: '工作流的起始步骤，输入需要处理的文本'
    },
    {
      id: 'tts',
      name: '语音合成',
      description: '将文本转换为语音',
      icon: '🎤',
      category: 'processing',
      theme: 'purple',
      keywords: ['语音', '合成', 'tts', 'speech', '声音'],
      usage: '将文本内容转换为音频文件'
    },
    {
      id: 'download',
      name: '文件下载',
      description: '下载处理结果到本地',
      icon: '📥',
      category: 'output',
      theme: 'green',
      keywords: ['下载', 'download', '保存', 'save', '文件'],
      usage: '保存音频、文本等处理结果到本地'
    },
    {
      id: 'output',
      name: '内容预览',
      description: '预览和查看处理结果',
      icon: '👁️',
      category: 'output',
      theme: 'blue',
      keywords: ['预览', '查看', '输出', 'preview', 'view', 'output'],
      usage: '在线预览文本、播放音频等内容'
    }
  ]

  // 节点分类
  const categories = [
    { id: 'all', name: '全部', icon: '📋', count: nodeTypes.length },
    { id: 'input', name: '输入', icon: '📝', count: nodeTypes.filter(n => n.category === 'input').length },
    { id: 'processing', name: '处理', icon: '⚙️', count: nodeTypes.filter(n => n.category === 'processing').length },
    { id: 'output', name: '输出', icon: '📤', count: nodeTypes.filter(n => n.category === 'output').length }
  ]

  // 过滤节点
  const filteredNodes = useMemo(() => {
    let filtered = nodeTypes

    // 按分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(node => node.category === selectedCategory)
    }

    // 按搜索关键词过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(node => 
        node.name.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query) ||
        node.keywords.some(keyword => keyword.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [selectedCategory, searchQuery])

  // 处理节点添加
  const handleAddNode = (nodeType) => {
    if (onAddNode) {
      onAddNode({
        type: nodeType.id,
        name: nodeType.name,
        theme: nodeType.theme
      })
    }
  }

  // 获取主题样式
  const getThemeStyles = (theme) => {
    const themes = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: 'text-blue-500',
        hover: 'hover:bg-blue-100',
        button: 'bg-blue-500 hover:bg-blue-600'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        icon: 'text-purple-500',
        hover: 'hover:bg-purple-100',
        button: 'bg-purple-500 hover:bg-purple-600'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: 'text-green-500',
        hover: 'hover:bg-green-100',
        button: 'bg-green-500 hover:bg-green-600'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        icon: 'text-orange-500',
        hover: 'hover:bg-orange-100',
        button: 'bg-orange-500 hover:bg-orange-600'
      }
    }
    return themes[theme] || themes.blue
  }

  if (!isVisible) return null

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-xl">🧩</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">节点工具箱</h3>
            <div className="text-xs text-gray-500">点击添加到工作流末尾</div>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索节点类型..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
          />
          <div className="absolute left-3 top-3 text-gray-400 text-sm">
            🔍
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 分类标签 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-2 text-sm rounded-lg transition-all flex items-center justify-between ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span className="font-medium">{category.name}</span>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                selectedCategory === category.id
                  ? 'bg-blue-400 text-blue-50'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 节点列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredNodes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-lg font-medium text-gray-700 mb-2">
              {searchQuery ? '未找到匹配的节点' : '该分类下暂无节点'}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {searchQuery ? '尝试使用其他关键词搜索' : '请选择其他分类查看'}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                清除搜索条件
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNodes.map(nodeType => {
              const themeStyles = getThemeStyles(nodeType.theme)
              return (
                <div
                  key={nodeType.id}
                  className={`group p-4 rounded-xl border-2 transition-all cursor-pointer ${themeStyles.bg} ${themeStyles.border} ${themeStyles.hover} hover:shadow-lg hover:scale-102 active:scale-98`}
                  onClick={() => handleAddNode(nodeType)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {/* 节点图标 */}
                    <div className={`text-2xl ${themeStyles.icon} group-hover:scale-110 transition-transform duration-200`}>
                      {nodeType.icon}
                    </div>
                    
                    {/* 节点信息 */}
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold ${themeStyles.text} group-hover:font-bold transition-all text-base`}>
                        {nodeType.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {nodeType.description}
                      </div>
                    </div>
                  </div>

                  {/* 使用说明 */}
                  <div className="text-xs text-gray-500 mb-3 bg-white/60 rounded-lg p-2 border border-gray-100">
                    <span className="font-medium">用途:</span> {nodeType.usage}
                  </div>

                  {/* 添加按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddNode(nodeType)
                    }}
                    className={`w-full py-2.5 px-4 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${themeStyles.button} shadow-md hover:shadow-lg group-hover:scale-105`}
                  >
                    <span className="text-lg">⊕</span>
                    <span>添加到工作流</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">可用节点:</span>
            <span className="font-bold text-blue-600">{filteredNodes.length}</span>
          </div>
          {selectedCategory !== 'all' && (
            <div className="flex items-center justify-between">
              <span className="font-medium">当前分类:</span>
              <span className="font-bold text-purple-600">
                {categories.find(c => c.id === selectedCategory)?.name}
              </span>
            </div>
          )}
        </div>

        {/* 快速操作提示 */}
        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div className="text-xs text-blue-700">
            <div className="font-semibold mb-2 flex items-center gap-1">
              <span>💡</span>
              <span>快速操作</span>
            </div>
            <div className="space-y-1">
              <div>• 点击节点卡片添加到工作流</div>
              <div>• 使用搜索快速找到节点</div>
              <div>• 分类筛选精确定位</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NodePanel

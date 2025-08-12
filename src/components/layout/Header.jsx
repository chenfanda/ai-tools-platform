// ===== src/components/layout/Header.jsx =====
import React from 'react'

const Header = ({ 
  currentPage, 
  onPageChange, 
  onConfigToggle, 
  onTestConnections 
}) => {
  const navTabs = [
    { id: 'home', label: '首页' },
    { id: 'tts', label: '语音模块' },
    { id: 'video', label: '视频生成' },
    { id: 'image', label: '图像处理' },
    { id: 'media', label: '多媒体处理' }
  ]

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg">
            🤖
          </div>
          <span className="text-xl font-semibold text-gray-900">
            AI工具平台
          </span>
        </div>
        
        {/* 导航标签 - 桌面版 */}
        <div className="hidden md:flex gap-2">
          {navTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onPageChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentPage === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          <button
            onClick={onConfigToggle}
            className="w-9 h-9 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            title="设置"
          >
            ⚙️
          </button>
          <button
            onClick={onTestConnections}
            className="w-9 h-9 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            title="测试连接"
          >
            🔗
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Header

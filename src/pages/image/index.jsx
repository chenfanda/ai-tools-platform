// ===== src/pages/image/index.jsx =====
import React from 'react'
import BasicImageTools from '@/components/image/BasicImageTools'
import FaceBeauty from '@/components/image/FaceBeauty'
import FaceStylization from '@/components/image/FaceStylization'

const ImageProcessingPage = ({ config, onNotification, activeSubPage }) => {
  const getPageTitle = () => {
    const titles = {
      'basic-tools': '基础图像工具',
      'face-beauty': '轻美颜',
      'face-stylization': '人脸风格化'
    }
    return titles[activeSubPage] || '图像处理'
  }

  const getPageIcon = () => {
    const icons = {
      'basic-tools': '🔧',
      'face-beauty': '✨',
      'face-stylization': '🎭'
    }
    return icons[activeSubPage] || '🎨'
  }

  return (
    <div className="image-processing-page max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: 'home' }))}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors duration-200"
        >
          ← 返回首页
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
          {getPageIcon()}
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          {getPageTitle()}
        </h2>
      </div>

      {/* 功能组件渲染 */}
      {activeSubPage === 'basic-tools' && (
        <BasicImageTools config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'face-beauty' && (
        <FaceBeauty config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'face-stylization' && (
        <FaceStylization config={config} onNotification={onNotification} />
      )}
    </div>
  )
}

export default ImageProcessingPage
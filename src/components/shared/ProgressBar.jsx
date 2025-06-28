// ===== src/components/shared/ProgressBar.jsx =====
import React from 'react'

const ProgressBar = ({
  isVisible = false,
  progress = 0,
  title = "正在处理...",
  message = "",
  showSpinner = true,
  className = ""
}) => {
  if (!isVisible) {
    return null
  }

  return (
    <div className={`progress-section bg-white rounded-xl p-6 my-6 shadow-sm border border-gray-200 ${className}`}>
      {/* 进度头部 */}
      <div className="flex items-center gap-3 mb-4">
        {showSpinner && (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
        )}
        <span className="text-base font-medium text-gray-900">
          {title}
        </span>
      </div>

      {/* 进度条 */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden my-4">
        <div 
          className="h-full bg-gradient-to-r from-primary-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(Math.max(progress * 100, 0), 100)}%` }}
        />
      </div>

      {/* 状态消息 */}
      {message && (
        <div className="text-sm text-gray-600 mt-3">
          {message}
        </div>
      )}
    </div>
  )
}

export default ProgressBar

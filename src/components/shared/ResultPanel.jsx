// ===== src/components/shared/ResultPanel.jsx =====
import React from 'react'

const ResultPanel = ({
  isVisible = false,
  type = 'success', // 'success' | 'error'
  title,
  children,
  actions = [],
  className = ""
}) => {
  if (!isVisible) {
    return null
  }

  const getResultStyles = () => {
    const baseStyles = "bg-white rounded-xl p-6 my-6 shadow-sm border"
    
    switch (type) {
      case 'error':
        return `${baseStyles} border-l-4 border-l-red-500 bg-red-50 border-red-200`
      case 'success':
      default:
        return `${baseStyles} border-l-4 border-l-green-500 bg-green-50 border-green-200`
    }
  }

  const getIconStyles = () => {
    const baseStyles = "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
    
    switch (type) {
      case 'error':
        return `${baseStyles} bg-red-500 text-white`
      case 'success':
      default:
        return `${baseStyles} bg-green-500 text-white`
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '✕'
      case 'success':
      default:
        return '✓'
    }
  }

  return (
    <div className={`result-section ${getResultStyles()} ${className}`}>
      {/* 结果头部 */}
      {title && (
        <div className="flex items-center gap-3 mb-4">
          <div className={getIconStyles()}>
            {getIcon()}
          </div>
          <span className="text-base font-medium text-gray-900">
            {title}
          </span>
        </div>
      )}

      {/* 结果内容 */}
      <div className="result-content text-sm leading-relaxed">
        {children}
      </div>

      {/* 操作按钮 */}
      {actions && actions.length > 0 && (
        <div className="result-actions flex gap-2 mt-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                action.variant === 'primary'
                  ? 'bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 disabled:opacity-60'
              } disabled:cursor-not-allowed`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ResultPanel

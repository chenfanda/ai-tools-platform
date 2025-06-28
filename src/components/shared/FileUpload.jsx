// ===== src/components/shared/FileUpload.jsx =====
import React, { useState, useRef } from 'react'

const FileUpload = ({
  id,
  accept = "*/*",
  multiple = false,
  icon = "📄",
  title = "拖拽文件到这里，或点击选择",
  hint = "支持多种文件格式",
  onChange,
  className = ""
}) => {
  const [files, setFiles] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // 处理文件变化
  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles)
    
    if (!multiple) {
      setFiles(fileArray.slice(0, 1))
      onChange?.(fileArray.slice(0, 1))
    } else {
      const updatedFiles = [...files, ...fileArray]
      setFiles(updatedFiles)
      onChange?.(updatedFiles)
    }
  }

  // 点击上传区域
  const handleUploadAreaClick = (e) => {
    // 避免点击删除按钮时触发文件选择
    if (e.target.classList.contains('file-remove') || 
        e.target.closest('.file-remove')) {
      return
    }
    fileInputRef.current?.click()
  }

  // 文件输入变化
  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  // 拖拽事件处理
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // 移除文件
  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)
    onChange?.(updatedFiles)
    
    // 清空input的值
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 获取文件图标
  const getFileIcon = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return '🖼️'
    } else if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(extension)) {
      return '🎵'
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(extension)) {
      return '🎬'
    } else if (['txt', 'srt', 'vtt'].includes(extension)) {
      return '📝'
    }
    return '📄'
  }

  return (
    <div className={`file-upload ${className}`}>
      {/* 上传区域 */}
      <div
        onClick={handleUploadAreaClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center bg-gray-50 transition-all duration-300 cursor-pointer ${
          isDragOver 
            ? 'border-primary-500 bg-primary-50 scale-105' 
            : 'border-gray-300 hover:border-primary-500 hover:bg-blue-50'
        }`}
      >
        {/* 上传图标 */}
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 text-xl text-gray-600">
          {icon}
        </div>
        
        {/* 上传文本 */}
        <div className="text-base font-medium text-gray-700 mb-2">
          {title}
        </div>
        
        {/* 提示文本 */}
        <div className="text-sm text-gray-600">
          {hint}
        </div>
        
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-4 max-h-48 overflow-y-auto">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg mb-2 last:mb-0"
            >
              {/* 文件图标 */}
              <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center text-white text-sm flex-shrink-0">
                {getFileIcon(file.name)}
              </div>
              
              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">
                  {file.name}
                </div>
                <div className="text-xs text-gray-600">
                  {formatFileSize(file.size)}
                </div>
              </div>
              
              {/* 删除按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
                className="file-remove w-6 h-6 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200 flex items-center justify-center text-sm flex-shrink-0"
                title="删除文件"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUpload

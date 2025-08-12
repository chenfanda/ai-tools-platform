// ===== src/components/image/BasicImageTools.jsx =====
import React, { useState } from 'react'
import FileUpload from '@/components/shared/FileUpload'
import ProgressBar from '@/components/shared/ProgressBar'
import ResultPanel from '@/components/shared/ResultPanel'
import ImageAPIService from '@/services/api/imageAPI'


const BasicImageTools = ({ config, onNotification }) => {
  // 基础工具的子功能状态
  const [basicToolTab, setBasicToolTab] = useState('remove-bg')
  
  // 文件状态
  const [imageFiles, setImageFiles] = useState([])
  const [foregroundFiles, setForegroundFiles] = useState([])
  const [backgroundFiles, setBackgroundFiles] = useState([])
  
  // 图片预览状态
  const [imagePreview, setImagePreview] = useState(null)
  const [foregroundPreview, setForegroundPreview] = useState(null)
  const [backgroundPreview, setBgPreview] = useState(null)
  
  // 处理参数
  const [upscaleFactor, setUpscaleFactor] = useState(2)
  const [superResScale, setSuperResScale] = useState(4)
  
  // 状态管理
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingTime, setProcessingTime] = useState(0)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [resultType, setResultType] = useState('success')

  // 生成图片预览URL
  const generatePreview = (file) => {
    if (!file) return null
    return URL.createObjectURL(file)
  }

  // 文件变化处理函数
  const handleImageFilesChange = (files) => {
    setImageFiles(files)
    setImagePreview(files.length > 0 ? generatePreview(files[0]) : null)
  }

  const handleForegroundFilesChange = (files) => {
    setForegroundFiles(files)
    setForegroundPreview(files.length > 0 ? generatePreview(files[0]) : null)
  }

  const handleBackgroundFilesChange = (files) => {
    setBackgroundFiles(files)
    setBgPreview(files.length > 0 ? generatePreview(files[0]) : null)
  }

  // 清理预览URL，避免内存泄漏
  const clearPreviews = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    if (foregroundPreview) URL.revokeObjectURL(foregroundPreview)
    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview)
    
    setImagePreview(null)
    setForegroundPreview(null)
    setBgPreview(null)
  }

  // 处理图像的通用函数
  const processImage = async (apiCall, processingMessage = '正在处理图像...') => {
    setIsProcessing(true)
    setShowResult(false)
    const startTime = Date.now()

    try {
      const data = await apiCall()
      const endTime = Date.now()
      setProcessingTime((endTime - startTime) / 1000)

      if (data.success) {
        setResult({
          ...data,
          imageBase64: data.image_base64,
          processingSteps: data.processing_steps
        })
        setResultType('success')
        setShowResult(true)
        onNotification(data.message, 'success')
      } else {
        throw new Error(data.message || '处理失败')
      }
    } catch (error) {
      setResult({ error: error.message })
      setResultType('error')
      setShowResult(true)
      onNotification(`处理失败: ${error.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // 背景移除处理函数
  const handleRemoveBackground = async () => {
    if (imageFiles.length === 0) {
      onNotification('请选择图片文件', 'error')
      return
    }

    const imageAPI = new ImageAPIService(config.imageApiUrl)
    await processImage(
      () => imageAPI.removeBackground(imageFiles[0]),
      '正在移除背景...'
    )
  }

  // 人脸增强处理函数
  const handleFaceEnhancement = async () => {
    if (imageFiles.length === 0) {
      onNotification('请选择人脸图片', 'error')
      return
    }

    const imageAPI = new ImageAPIService(config.imageApiUrl)
    await processImage(
      () => imageAPI.enhanceFace(imageFiles[0], upscaleFactor),
      '正在增强人脸...'
    )
  }

  // 超分辨率处理函数
  const handleSuperResolution = async () => {
    if (imageFiles.length === 0) {
      onNotification('请选择低分辨率图片', 'error')
      return
    }

    const imageAPI = new ImageAPIService(config.imageApiUrl)
    await processImage(
      () => imageAPI.superResolution(imageFiles[0], superResScale),
      '正在进行超分辨率处理...'
    )
  }

  // 智能换背景处理函数
  const handleChangeBackground = async () => {
    if (foregroundFiles.length === 0 || backgroundFiles.length === 0) {
      onNotification('请选择前景和背景图片', 'error')
      return
    }

    const imageAPI = new ImageAPIService(config.imageApiUrl)
    await processImage(
      () => imageAPI.changeBackground(foregroundFiles[0], backgroundFiles[0]),
      '正在智能换背景...'
    )
  }

  // 下载处理结果
  const handleDownload = () => {
    if (!result?.imageBase64) return

    const link = document.createElement('a')
    link.href = `data:image/png;base64,${result.imageBase64}`
    
    const tabNames = {
      'remove-bg': 'background_removed',
      'face-enhance': 'face_enhanced',
      'super-resolution': 'super_resolution',
      'change-bg': 'background_changed'
    }
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    link.download = `${tabNames[basicToolTab] || 'processed'}_${timestamp}.png`
    link.click()
  }

  // 复制图片到剪贴板
  const handleCopyImage = async () => {
    if (!result?.imageBase64) return

    try {
      const response = await fetch(`data:image/png;base64,${result.imageBase64}`)
      const blob = await response.blob()
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      
      onNotification('图片已复制到剪贴板', 'success')
    } catch (error) {
      onNotification('复制失败，请使用下载功能', 'error')
    }
  }

  // 基础工具子标签配置
  const basicToolTabs = [
    {
      id: 'remove-bg',
      label: '🔧 背景移除',
      description: '智能移除图片背景，保留主体对象'
    },
    {
      id: 'face-enhance',
      label: '💎 人脸增强',
      description: '使用GFPGAN增强人脸细节，提升照片质量'
    },
    {
      id: 'super-resolution',
      label: '🔍 超分辨率',
      description: '使用RealESRGAN放大图片分辨率，增强清晰度'
    },
    {
      id: 'change-bg',
      label: '🌅 智能换背景',
      description: '自动抠图并更换背景，无需手动处理'
    }
  ]

  // 结果操作按钮配置
  const resultActions = resultType === 'success' ? [
    {
      label: '📥 下载图片',
      variant: 'primary',
      onClick: handleDownload
    },
    {
      label: '📋 复制图片',
      onClick: handleCopyImage
    },
    {
      label: '🔄 重新处理',
      onClick: () => {
        switch (basicToolTab) {
          case 'remove-bg': return handleRemoveBackground()
          case 'face-enhance': return handleFaceEnhancement()
          case 'super-resolution': return handleSuperResolution()
          case 'change-bg': return handleChangeBackground()
        }
      }
    }
  ] : [
    {
      label: '🔄 重试',
      variant: 'primary',
      onClick: () => {
        switch (basicToolTab) {
          case 'remove-bg': return handleRemoveBackground()
          case 'face-enhance': return handleFaceEnhancement()
          case 'super-resolution': return handleSuperResolution()
          case 'change-bg': return handleChangeBackground()
        }
      }
    }
  ]

  return (
    <div className="basic-image-tools">
      {/* 基础工具子标签导航 */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">选择基础工具</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {basicToolTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setBasicToolTab(tab.id)
                setShowResult(false)
                clearPreviews()
                setImageFiles([])
                setForegroundFiles([])
                setBackgroundFiles([])
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                basicToolTab === tab.id
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">{tab.label}</div>
              <div className="text-sm text-gray-600">{tab.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 背景移除 */}
      {basicToolTab === 'remove-bg' && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">背景移除</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <FileUpload
                accept="image/*"
                icon="🖼️"
                title="上传需要移除背景的图片"
                hint="支持 JPG、PNG 等格式"
                onChange={handleImageFilesChange}
              />
            </div>
            {imagePreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">原图预览</label>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <img 
                    src={imagePreview} 
                    alt="原图预览"
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-sm object-contain"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={handleRemoveBackground}
              disabled={isProcessing || imageFiles.length === 0}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              🔧 移除背景
            </button>
          </div>
        </div>
      )}

      {/* 人脸增强 */}
      {basicToolTab === 'face-enhance' && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">人脸增强</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <FileUpload
                accept="image/*"
                icon="👤"
                title="上传人脸图片"
                hint="建议上传包含清晰人脸的图片"
                onChange={handleImageFilesChange}
              />
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">增强倍数</label>
                <select
                  value={upscaleFactor}
                  onChange={(e) => setUpscaleFactor(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value={1}>1倍 (原尺寸)</option>
                  <option value={2}>2倍 (推荐)</option>
                  <option value={3}>3倍</option>
                  <option value={4}>4倍</option>
                </select>
              </div>
            </div>
            {imagePreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">原图预览</label>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <img 
                    src={imagePreview} 
                    alt="原图预览"
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-sm object-contain"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={handleFaceEnhancement}
              disabled={isProcessing || imageFiles.length === 0}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              💎 增强人脸
            </button>
          </div>
        </div>
      )}

      {/* 超分辨率 */}
      {basicToolTab === 'super-resolution' && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">超分辨率处理</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <FileUpload
                accept="image/*"
                icon="🔍"
                title="上传低分辨率图片"
                hint="将被放大并增强清晰度"
                onChange={handleImageFilesChange}
              />
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">放大倍数</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value={2}
                      checked={superResScale === 2}
                      onChange={(e) => setSuperResScale(parseInt(e.target.value))}
                      className="mr-2"
                    />
                    2倍 (快速)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value={4}
                      checked={superResScale === 4}
                      onChange={(e) => setSuperResScale(parseInt(e.target.value))}
                      className="mr-2"
                    />
                    4倍 (推荐)
                  </label>
                </div>
              </div>
            </div>
            {imagePreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">原图预览</label>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <img 
                    src={imagePreview} 
                    alt="原图预览"
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-sm object-contain"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={handleSuperResolution}
              disabled={isProcessing || imageFiles.length === 0}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              🔍 超分辨率处理
            </button>
          </div>
        </div>
      )}

      {/* 智能换背景 */}
      {basicToolTab === 'change-bg' && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">智能换背景</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">前景图片（主体）</label>
              <FileUpload
                accept="image/*"
                icon="👤"
                title="上传前景图片"
                hint="包含要保留的主体对象"
                onChange={handleForegroundFilesChange}
              />
              {foregroundPreview && (
                <div className="mt-4">
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <img 
                      src={foregroundPreview} 
                      alt="前景预览"
                      className="w-full max-h-32 rounded object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">背景图片</label>
              <FileUpload
                accept="image/*"
                icon="🌅"
                title="上传新背景"
                hint="将作为新的背景图像"
                onChange={handleBackgroundFilesChange}
              />
              {backgroundPreview && (
                <div className="mt-4">
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <img 
                      src={backgroundPreview} 
                      alt="背景预览"
                      className="w-full max-h-32 rounded object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 text-center">
            <button
              onClick={handleChangeBackground}
              disabled={isProcessing || foregroundFiles.length === 0 || backgroundFiles.length === 0}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              🌅 智能换背景
            </button>
          </div>
        </div>
      )}

      {/* 进度条 */}
      <ProgressBar
        isVisible={isProcessing}
        progress={0.6}
        title="正在处理图像..."
        message="请稍候，AI正在处理您的图片..."
      />

      {/* 结果展示 */}
      <ResultPanel
        isVisible={showResult}
        type={resultType}
        title={resultType === 'success' ? '图像处理完成' : '图像处理失败'}
        actions={resultActions}
      >
        {resultType === 'success' ? (
          <div>
            <p><strong>处理时间:</strong> {processingTime.toFixed(2)} 秒</p>
            <p><strong>处理类型:</strong> {basicToolTabs.find(t => t.id === basicToolTab)?.label || '基础工具'}</p>
            {result?.processingSteps && (
              <p><strong>处理步骤:</strong> {result.processingSteps.join(' → ')}</p>
            )}
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-medium">✨ 处理结果:</span>
              </div>
              <div className="text-center">
                <img 
                  src={`data:image/png;base64,${result?.imageBase64}`}
                  alt="处理结果"
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-md"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-red-700">错误信息: {result?.error}</p>
        )}
      </ResultPanel>
    </div>
  )
}

export default BasicImageTools

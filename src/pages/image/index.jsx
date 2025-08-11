// ===== src/pages/image/index.jsx =====
import React, { useState, useEffect, useCallback, useRef } from 'react'
import FileUpload from '@/components/shared/FileUpload'
import ProgressBar from '@/components/shared/ProgressBar'
import ResultPanel from '@/components/shared/ResultPanel'
import BeautyAdjustmentPanel from '@/components/image/BeautyAdjustmentPanel'
import StyleGAN2Panel from '@/components/image/StyleGAN2Panel'  // 新增导入

const ImageProcessingPage = ({ config, onNotification, activeSubPage }) => {
  // 使用传入的 activeSubPage 作为初始值
  const [activeTab, setActiveTab] = useState(activeSubPage || 'basic-tools')
  
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
  
  // 轻美颜参数状态
  const [beautyParams, setBeautyParams] = useState({
    // 下巴调整
    chin_enabled: false,
    chin_type: 'length',
    chin_intensity: 0.3,
    
    // 眼睛调整  
    eye_adjust_enabled: false,
    eye_adjust_mode: 'tps',
    eye_adjust_intensity: 0.2,
    
    // 瘦脸功能
    face_slim_enabled: false,
    face_slim_region: 'both',
    face_slim_intensity: 0.3,
    
    // 额头调整
    forehead_enabled: false,
    forehead_type: 'shrink', 
    forehead_intensity: 0.3,
    
    // 嘴巴调整
    mouth_enabled: false,
    mouth_type: 'thickness',
    mouth_intensity: 0.3,
    
    // 鼻子调整
    nose_enabled: false,
    nose_type: 'wings',
    nose_intensity: 0.3,
    
    // 美白功能
    whitening_enabled: false,
    whitening_region: 'both',
    whitening_intensity: 0.5
  })
  
  // 实时预览相关状态
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const [realtimeResult, setRealtimeResult] = useState(null)
  const [isRealtimeProcessing, setIsRealtimeProcessing] = useState(false)
  const realtimeTimeoutRef = useRef(null)
  
  // ===== 新增: StyleGAN2相关状态 =====
  
  // StyleGAN2参数状态
  const [styleganParams, setStyleganParams] = useState({
    selectedGenerator: '官方FFHQ模型',
    directionsDir: 'default',
    encoderConfig: {
      n_iters: 5,
      refinement_steps: 200,
      use_lpips: true,
      use_face_align: true
    },
    editAttributes: {}
  })
  
  // StyleGAN2可用属性列表
  const [availableAttributes, setAvailableAttributes] = useState([])
  
  // StyleGAN2属性加载状态
  const [attributesLoading, setAttributesLoading] = useState(false)
  
  // StyleGAN2硬编码属性列表（作为fallback）
  const FALLBACK_ATTRIBUTES = [
    'age', 'gender', 'beauty', 'smile', 'emotion_happy', 'emotion_angry',
    'emotion_sad', 'emotion_surprise', 'eyes_open', 'glasses', 'face_shape',
    'height', 'width', 'angle_horizontal', 'angle_pitch', 'race_white',
    'race_black', 'race_yellow', 'emotion_easy', 'emotion_disgust', 'emotion_fear'
  ]
  
  // 状态管理
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingTime, setProcessingTime] = useState(0)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [resultType, setResultType] = useState('success')

  // 监听 activeSubPage 变化
  useEffect(() => {
    if (activeSubPage) {
      setActiveTab(activeSubPage)
      // 切换tab时清理状态
      setShowResult(false)
      clearPreviews()
      setImageFiles([])
      setForegroundFiles([])
      setBackgroundFiles([])
      // 清理实时预览状态
      setRealtimeResult(null)
      setRealTimeEnabled(false)
      if (activeSubPage === 'face-beauty') {
        resetBeautyParams()
      }
      // 新增: StyleGAN2切换逻辑
      if (activeSubPage === 'face-stylization') {
        resetStyleganParams()
        loadAvailableAttributes()
      }
    }
  }, [activeSubPage])

  // 生成图片预览URL
  const generatePreview = (file) => {
    if (!file) return null
    return URL.createObjectURL(file)
  }

  // 文件变化处理函数
  const handleImageFilesChange = (files) => {
    setImageFiles(files)
    setImagePreview(files.length > 0 ? generatePreview(files[0]) : null)
    // 清理实时预览结果
    setRealtimeResult(null)
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

  // 轻美颜参数更新辅助函数
  const updateBeautyParam = (key, value) => {
    setBeautyParams(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 重置轻美颜参数
  const resetBeautyParams = () => {
    setBeautyParams({
      chin_enabled: false, chin_type: 'length', chin_intensity: 0.3,
      eye_adjust_enabled: false, eye_adjust_mode: 'tps', eye_adjust_intensity: 0.2,
      face_slim_enabled: false, face_slim_region: 'both', face_slim_intensity: 0.3,
      forehead_enabled: false, forehead_type: 'shrink', forehead_intensity: 0.3,
      mouth_enabled: false, mouth_type: 'thickness', mouth_intensity: 0.3,
      nose_enabled: false, nose_type: 'wings', nose_intensity: 0.3,
      whitening_enabled: false, whitening_region: 'both', whitening_intensity: 0.5
    })
    // 清理实时预览结果
    setRealtimeResult(null)
  }

  // ===== 新增: StyleGAN2辅助函数 =====
  
  // 重置StyleGAN2参数
  const resetStyleganParams = () => {
    setStyleganParams({
      selectedGenerator: '官方FFHQ模型',
      directionsDir: 'default',
      encoderConfig: {
        n_iters: 5,
        refinement_steps: 200,
        use_lpips: true,
        use_face_align: true
      },
      editAttributes: {}
    })
  }

  // 加载可用属性列表
  const loadAvailableAttributes = async () => {
    if (!config.styleganApiUrl) {
      console.warn('StyleGAN2 API地址未配置，使用fallback属性列表')
      setAvailableAttributes(FALLBACK_ATTRIBUTES)
      return
    }

    setAttributesLoading(true)
    try {
      const response = await fetch(`${config.styleganApiUrl}/attributes`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.attributes && Array.isArray(data.attributes)) {
          setAvailableAttributes(data.attributes)
          console.log(`✅ 加载了 ${data.attributes.length} 个StyleGAN2属性`)
        } else {
          throw new Error('API返回格式错误')
        }
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.warn(`StyleGAN2属性加载失败: ${error.message}，使用fallback列表`)
      setAvailableAttributes(FALLBACK_ATTRIBUTES)
    } finally {
      setAttributesLoading(false)
    }
  }

  // 实时预览处理函数（防抖800ms）
  const handleRealtimePreview = useCallback(() => {
    if (!realTimeEnabled || imageFiles.length === 0) {
      return
    }

    // 清除之前的定时器
    if (realtimeTimeoutRef.current) {
      clearTimeout(realtimeTimeoutRef.current)
    }

    // 设置新的防抖定时器
    realtimeTimeoutRef.current = setTimeout(async () => {
      // 检查是否至少启用了一个功能
      const enabledFeatures = Object.keys(beautyParams).filter(key => 
        key.endsWith('_enabled') && beautyParams[key]
      )
      
      if (enabledFeatures.length === 0) {
        setRealtimeResult(null)
        return
      }

      setIsRealtimeProcessing(true)

      try {
        // 构建FormData参数（复用原有逻辑）
        const formData = new FormData()
        formData.append('file', imageFiles[0])
        
        // 7种功能的参数映射
        const features = ['chin', 'eye_adjust', 'face_slim', 'forehead', 'mouth', 'nose', 'whitening']
        
        features.forEach(feature => {
          const enabled = beautyParams[`${feature}_enabled`] || false
          const intensity = beautyParams[`${feature}_intensity`] || 0.3
          
          formData.append(`${feature}_enabled`, enabled.toString())
          formData.append(`${feature}_intensity`, intensity.toString())
          
          // 特殊参数处理
          if (feature === 'chin' && beautyParams.chin_type) {
            formData.append('chin_type', beautyParams.chin_type)
          } else if (feature === 'eye_adjust' && beautyParams.eye_adjust_mode) {
            formData.append('eye_adjust_mode', beautyParams.eye_adjust_mode)
          } else if (feature === 'face_slim' && beautyParams.face_slim_region) {
            formData.append('face_slim_region', beautyParams.face_slim_region)
          } else if (feature === 'forehead' && beautyParams.forehead_type) {
            formData.append('forehead_type', beautyParams.forehead_type)
          } else if (feature === 'mouth' && beautyParams.mouth_type) {
            formData.append('mouth_type', beautyParams.mouth_type)
          } else if (feature === 'nose' && beautyParams.nose_type) {
            formData.append('nose_type', beautyParams.nose_type)
          } else if (feature === 'whitening' && beautyParams.whitening_region) {
            formData.append('whitening_region', beautyParams.whitening_region)
          }
        })

        // 调用API
        const response = await fetch(`${config.facialApiUrl}/process`, {
          method: 'POST',
          body: formData
        })

        const data = await response.json()

        if (data.success) {
          setRealtimeResult({
            ...data,
            imageBase64: data.image_base64,
            processingSteps: data.processing_steps
          })
        } else {
          setRealtimeResult(null)
        }
      } catch (error) {
        console.error('实时预览失败:', error)
        setRealtimeResult(null)
      } finally {
        setIsRealtimeProcessing(false)
      }
    }, 800)
  }, [realTimeEnabled, imageFiles, beautyParams, config.facialApiUrl])

  // 处理图像的通用函数
  const processImage = async (endpoint, formData, processingMessage = '正在处理图像...', apiUrl = config.imageApiUrl) => {
    setIsProcessing(true)
    setShowResult(false)
    const startTime = Date.now()

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
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

  // 轻美颜处理函数
  const handleFacialAdjustment = async () => {
    if (imageFiles.length === 0) {
      onNotification('请选择人脸图片', 'error')
      return
    }

    // 检查是否至少启用了一个功能
    const enabledFeatures = Object.keys(beautyParams).filter(key => 
      key.endsWith('_enabled') && beautyParams[key]
    )
    
    if (enabledFeatures.length === 0) {
      onNotification('请至少启用一个美颜功能', 'error')
      return
    }

    // 构建FormData参数
    const formData = new FormData()
    formData.append('file', imageFiles[0])
    
    // 7种功能的参数映射
    const features = ['chin', 'eye_adjust', 'face_slim', 'forehead', 'mouth', 'nose', 'whitening']
    
    features.forEach(feature => {
      const enabled = beautyParams[`${feature}_enabled`] || false
      const intensity = beautyParams[`${feature}_intensity`] || 0.3
      
      formData.append(`${feature}_enabled`, enabled.toString())
      formData.append(`${feature}_intensity`, intensity.toString())
      
      // 特殊参数处理
      if (feature === 'chin' && beautyParams.chin_type) {
        formData.append('chin_type', beautyParams.chin_type)
      } else if (feature === 'eye_adjust' && beautyParams.eye_adjust_mode) {
        formData.append('eye_adjust_mode', beautyParams.eye_adjust_mode)
      } else if (feature === 'face_slim' && beautyParams.face_slim_region) {
        formData.append('face_slim_region', beautyParams.face_slim_region)
      } else if (feature === 'forehead' && beautyParams.forehead_type) {
        formData.append('forehead_type', beautyParams.forehead_type)
      } else if (feature === 'mouth' && beautyParams.mouth_type) {
        formData.append('mouth_type', beautyParams.mouth_type)
      } else if (feature === 'nose' && beautyParams.nose_type) {
        formData.append('nose_type', beautyParams.nose_type)
      } else if (feature === 'whitening' && beautyParams.whitening_region) {
        formData.append('whitening_region', beautyParams.whitening_region)
      }
    })

    // 使用轻美颜API端点和地址
    await processImage('/process', formData, '正在进行美颜处理...', config.facialApiUrl)
  }

  // ===== 新增: StyleGAN2处理函数 =====
  
  // StyleGAN2风格化处理函数
  const handleStyleGAN2Processing = async () => {
    if (imageFiles.length === 0) {
      onNotification('请选择人脸图片', 'error')
      return
    }

    if (!config.styleganApiUrl) {
      onNotification('StyleGAN2服务地址未配置', 'error')
      return
    }

    // 构建FormData参数（对应后端API格式）
    const formData = new FormData()
    formData.append('file', imageFiles[0])
    formData.append('generator_name', styleganParams.selectedGenerator)
    formData.append('directions_dir', styleganParams.directionsDir || 'default')
    formData.append('encoder_config', JSON.stringify(styleganParams.encoderConfig))
    formData.append('edit_attributes', JSON.stringify(styleganParams.editAttributes))
    formData.append('save_temp', 'false')

    // 使用StyleGAN2专用API
    await processImage('/edit', formData, '正在进行风格化处理...', config.styleganApiUrl)
  }

  // 基础工具处理函数
  const handleRemoveBackground = async () => {
    if (imageFiles.length === 0) {
      onNotification('请选择图片文件', 'error')
      return
    }

    const formData = new FormData()
    formData.append('file', imageFiles[0])

    await processImage('/remove-background', formData, '正在移除背景...')
  }

  const handleFaceEnhancement = async () => {
    if (imageFiles.length === 0) {
      onNotification('请选择人脸图片', 'error')
      return
    }

    const formData = new FormData()
    formData.append('file', imageFiles[0])
    formData.append('upscale_factor', upscaleFactor.toString())

    await processImage('/face-enhancement', formData, '正在增强人脸...')
  }

  const handleSuperResolution = async () => {
    if (imageFiles.length === 0) {
      onNotification('请选择低分辨率图片', 'error')
      return
    }

    const formData = new FormData()
    formData.append('file', imageFiles[0])
    formData.append('scale', superResScale.toString())

    await processImage('/super-resolution', formData, '正在进行超分辨率处理...')
  }

  const handleChangeBackground = async () => {
    if (foregroundFiles.length === 0 || backgroundFiles.length === 0) {
      onNotification('请选择前景和背景图片', 'error')
      return
    }

    const formData = new FormData()
    formData.append('foreground', foregroundFiles[0])
    formData.append('background', backgroundFiles[0])

    await processImage('/change-background', formData, '正在智能换背景...')
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
      'change-bg': 'background_changed',
      'face-beauty': 'facial_beauty',
      'face-stylization': 'stylegan2_stylized'  // 新增
    }
    
    const currentOperation = activeTab === 'basic-tools' ? basicToolTab : activeTab
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    link.download = `${tabNames[currentOperation] || 'processed'}_${timestamp}.png`
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

  // 获取当前操作的显示名称
  const getCurrentOperationLabel = () => {
    if (activeTab === 'basic-tools') {
      return basicToolTabs.find(t => t.id === basicToolTab)?.label || '基础工具'
    } else if (activeTab === 'face-beauty') {
      return '✨ 轻美颜'
    } else if (activeTab === 'face-stylization') {
      return '🎭 人脸风格化'
    }
    return '图像处理'
  }

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
        if (activeTab === 'basic-tools') {
          switch (basicToolTab) {
            case 'remove-bg': return handleRemoveBackground()
            case 'face-enhance': return handleFaceEnhancement()
            case 'super-resolution': return handleSuperResolution()
            case 'change-bg': return handleChangeBackground()
          }
        } else if (activeTab === 'face-beauty') {
          return handleFacialAdjustment()
        } else if (activeTab === 'face-stylization') {  // 新增
          return handleStyleGAN2Processing()
        }
      }
    }
  ] : [
    {
      label: '🔄 重试',
      variant: 'primary',
      onClick: () => {
        if (activeTab === 'basic-tools') {
          switch (basicToolTab) {
            case 'remove-bg': return handleRemoveBackground()
            case 'face-enhance': return handleFaceEnhancement()
            case 'super-resolution': return handleSuperResolution()
            case 'change-bg': return handleChangeBackground()
          }
        } else if (activeTab === 'face-beauty') {
          return handleFacialAdjustment()
        } else if (activeTab === 'face-stylization') {  // 新增
          return handleStyleGAN2Processing()
        }
      }
    }
  ]

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
          🎨
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">图像处理</h2>
      </div>

      {/* 基础图像工具 */}
      {activeTab === 'basic-tools' && (
        <>
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
        </>
      )}

      {/* 轻美颜功能 - 左右图片 + 下方固定参数面板 */}
      {activeTab === 'face-beauty' && (
        <>
          {/* 图片上传区域 */}
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4">轻美颜处理</h3>
            <FileUpload
              accept="image/*"
              icon="👤"
              title="上传人脸图片"
              hint="支持JPG、PNG等格式，建议包含清晰人脸"
              onChange={handleImageFilesChange}
            />
          </div>

          {/* 左右图片对比区域 */}
          {imagePreview && (
            <>
              <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                <h4 className="text-base font-semibold text-gray-900 mb-4">图片对比</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* 左侧：原图 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">📷 原始图片</label>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <img 
                        src={imagePreview} 
                        alt="原图"
                        className="w-full max-h-[500px] mx-auto rounded-lg shadow-sm object-contain"
                      />
                    </div>
                  </div>

                  {/* 右侧：处理结果 */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="block text-sm font-medium text-gray-700">✨ 处理结果</label>
                      {isRealtimeProcessing && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          处理中...
                        </div>
                      )}
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {(realtimeResult?.imageBase64 || result?.imageBase64) ? (
                        <img 
                          src={`data:image/png;base64,${realtimeResult?.imageBase64 || result?.imageBase64}`}
                          alt="处理结果"
                          className="w-full max-h-[500px] mx-auto rounded-lg shadow-sm object-contain"
                        />
                      ) : (
                        <div className="w-full h-[500px] flex items-center justify-center text-gray-400 bg-gray-100 rounded-lg">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🎨</div>
                            <div className="text-sm">
                              {realTimeEnabled ? '调整参数查看效果' : '点击"开始美颜处理"'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 参数面板 - 固定高度，内部可滚动 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                
                {/* 实时预览开关 - 固定在参数面板顶部 */}
                <div className="p-4 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="realtime-preview"
                      checked={realTimeEnabled}
                      onChange={(e) => setRealTimeEnabled(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                    <label htmlFor="realtime-preview" className="flex items-center gap-2 text-sm font-medium text-gray-900 cursor-pointer">
                      <span className="text-lg">⚡</span>
                      实时预览模式
                      <span className="text-xs text-gray-600 ml-2">
                        ({realTimeEnabled ? '已启用' : '已关闭'}) - 拖动参数滑条时自动生成预览效果
                      </span>
                    </label>
                  </div>
                </div>

                {/* 参数配置区域 - 固定高度，内部滚动 */}
                <div className="h-[400px] overflow-y-auto">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">美颜功能配置</h4>
                      <button
                        onClick={resetBeautyParams}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                      >
                        🔄 重置参数
                      </button>
                    </div>
                    
                    {/* 下巴调整 */}
                    <BeautyAdjustmentPanel
                      title="下巴调整"
                      icon="🫤"
                      feature="chin"
                      enabled={beautyParams.chin_enabled}
                      onEnabledChange={(enabled) => updateBeautyParam('chin_enabled', enabled)}
                      intensity={beautyParams.chin_intensity}
                      onIntensityChange={(intensity) => updateBeautyParam('chin_intensity', intensity)}
                      beautyParams={beautyParams}
                      updateBeautyParam={updateBeautyParam}
                      onRealtimeChange={handleRealtimePreview}
                      options={{
                        typeKey: 'chin_type',
                        typeOptions: ['length', 'width', 'sharp', 'round'],
                        typeLabels: { length: '拉长', width: '收窄', sharp: '尖锐', round: '圆润' }
                      }}
                    />
                    
                    {/* 眼睛调整 */}
                    <BeautyAdjustmentPanel
                      title="眼睛调整"
                      icon="👁️"
                      feature="eye_adjust"
                      enabled={beautyParams.eye_adjust_enabled}
                      onEnabledChange={(enabled) => updateBeautyParam('eye_adjust_enabled', enabled)}
                      intensity={beautyParams.eye_adjust_intensity}
                      onIntensityChange={(intensity) => updateBeautyParam('eye_adjust_intensity', intensity)}
                      beautyParams={beautyParams}
                      updateBeautyParam={updateBeautyParam}
                      onRealtimeChange={handleRealtimePreview}
                      intensityRange={{ min: 0.05, max: 0.4, step: 0.05 }}
                      options={{
                        modeKey: 'eye_adjust_mode',
                        modeOptions: ['tps', 'simple'],
                        modeLabels: { tps: 'TPS模式(精确)', simple: '简单模式(快速)' }
                      }}
                    />
                    
                    {/* 瘦脸功能 */}
                    <BeautyAdjustmentPanel
                      title="瘦脸功能"
                      icon="😊"
                      feature="face_slim"
                      enabled={beautyParams.face_slim_enabled}
                      onEnabledChange={(enabled) => updateBeautyParam('face_slim_enabled', enabled)}
                      intensity={beautyParams.face_slim_intensity}
                      onIntensityChange={(intensity) => updateBeautyParam('face_slim_intensity', intensity)}
                      beautyParams={beautyParams}
                      updateBeautyParam={updateBeautyParam}
                      onRealtimeChange={handleRealtimePreview}
                      options={{
                        regionKey: 'face_slim_region',
                        regionOptions: ['both', 'left', 'right'],
                        regionLabels: { both: '双侧', left: '左脸', right: '右脸' }
                      }}
                    />
                    
                    {/* 额头调整 */}
                    <BeautyAdjustmentPanel
                      title="额头调整"
                      icon="🤔"
                      feature="forehead"
                      enabled={beautyParams.forehead_enabled}
                      onEnabledChange={(enabled) => updateBeautyParam('forehead_enabled', enabled)}
                      intensity={beautyParams.forehead_intensity}
                      onIntensityChange={(intensity) => updateBeautyParam('forehead_intensity', intensity)}
                      beautyParams={beautyParams}
                      updateBeautyParam={updateBeautyParam}
                      onRealtimeChange={handleRealtimePreview}
                      options={{
                        typeKey: 'forehead_type',
                        typeOptions: ['shrink', 'expand'],
                        typeLabels: { shrink: '收缩(饱满)', expand: '扩展(平整)' }
                      }}
                    />
                    
                    {/* 嘴巴调整 */}
                    <BeautyAdjustmentPanel
                      title="嘴巴调整"
                      icon="👄"
                      feature="mouth"
                      enabled={beautyParams.mouth_enabled}
                      onEnabledChange={(enabled) => updateBeautyParam('mouth_enabled', enabled)}
                      intensity={beautyParams.mouth_intensity}
                      onIntensityChange={(intensity) => updateBeautyParam('mouth_intensity', intensity)}
                      beautyParams={beautyParams}
                      updateBeautyParam={updateBeautyParam}
                      onRealtimeChange={handleRealtimePreview}
                      options={{
                        typeKey: 'mouth_type',
                        typeOptions: ['thickness', 'peak', 'corners', 'resize', 'enlarge'],
                        typeLabels: { 
                          thickness: '厚度调整', 
                          peak: '唇峰塑造', 
                          corners: '嘴角上扬', 
                          resize: '整体缩放', 
                          enlarge: '放大嘴唇' 
                        }
                      }}
                    />
                    
                    {/* 鼻子调整 */}
                    <BeautyAdjustmentPanel
                      title="鼻子调整"
                      icon="👃"
                      feature="nose"
                      enabled={beautyParams.nose_enabled}
                      onEnabledChange={(enabled) => updateBeautyParam('nose_enabled', enabled)}
                      intensity={beautyParams.nose_intensity}
                      onIntensityChange={(intensity) => updateBeautyParam('nose_intensity', intensity)}
                      beautyParams={beautyParams}
                      updateBeautyParam={updateBeautyParam}
                      onRealtimeChange={handleRealtimePreview}
                      options={{
                        typeKey: 'nose_type',
                        typeOptions: ['wings', 'tip', 'resize', 'bridge'],
                        typeLabels: { 
                          wings: '鼻翼收缩', 
                          tip: '鼻尖精修', 
                          resize: '整体缩放', 
                          bridge: '鼻梁调整' 
                        }
                      }}
                    />
                    
                    {/* 美白功能 */}
                    <BeautyAdjustmentPanel
                      title="美白功能"
                      icon="✨"
                      feature="whitening"
                      enabled={beautyParams.whitening_enabled}
                      onEnabledChange={(enabled) => updateBeautyParam('whitening_enabled', enabled)}
                      intensity={beautyParams.whitening_intensity}
                      onIntensityChange={(intensity) => updateBeautyParam('whitening_intensity', intensity)}
                      beautyParams={beautyParams}
                      updateBeautyParam={updateBeautyParam}
                      onRealtimeChange={handleRealtimePreview}
                      intensityRange={{ min: 0.1, max: 0.8, step: 0.1 }}
                      options={{
                        regionKey: 'whitening_region',
                        regionOptions: ['both', 'core', 'outer', 'left', 'right'],
                        regionLabels: { 
                          both: '全脸', 
                          core: '核心区域', 
                          outer: '外围区域', 
                          left: '左脸', 
                          right: '右脸' 
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 处理按钮 - 固定在参数面板底部 */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={handleFacialAdjustment}
                    disabled={isProcessing || imageFiles.length === 0}
                    className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  >
                    ✨ 开始美颜处理
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    已启用 {Object.keys(beautyParams).filter(key => key.endsWith('_enabled') && beautyParams[key]).length} 个功能
                    {realTimeEnabled && ' • 实时预览已启用'}
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ===== 新增: 人脸风格化功能 ===== */}
      {activeTab === 'face-stylization' && (
        <>
          {/* 图片上传区域 */}
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🎭 StyleGAN2人脸风格化
              {attributesLoading && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  加载属性中...
                </div>
              )}
            </h3>
            <FileUpload
              accept="image/*"
              icon="👤"
              title="上传人脸图片"
              hint="支持JPG、PNG等格式，建议包含清晰人脸，适合StyleGAN2风格化处理"
              onChange={handleImageFilesChange}
            />
          </div>

          {/* 左右图片对比区域 */}
          {imagePreview && (
            <>
              <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
                <h4 className="text-base font-semibold text-gray-900 mb-4">图片对比</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* 左侧：原图 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">📷 原始图片</label>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <img 
                        src={imagePreview} 
                        alt="原图"
                        className="w-full max-h-[500px] mx-auto rounded-lg shadow-sm object-contain"
                      />
                    </div>
                  </div>

                  {/* 右侧：风格化结果 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">🎭 风格化结果</label>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {result?.imageBase64 ? (
                        <img 
                          src={`data:image/png;base64,${result.imageBase64}`}
                          alt="风格化结果"
                          className="w-full max-h-[500px] mx-auto rounded-lg shadow-sm object-contain"
                        />
                      ) : (
                        <div className="w-full h-[500px] flex items-center justify-center text-gray-400 bg-gray-100 rounded-lg">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🎭</div>
                            <div className="text-sm">
                              配置参数后点击"开始风格化处理"
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* StyleGAN2参数面板 */}
              <StyleGAN2Panel
                params={styleganParams}
                onParamsChange={setStyleganParams}
                onProcess={handleStyleGAN2Processing}
                isProcessing={isProcessing}
                availableAttributes={availableAttributes}
              />
            </>
          )}
        </>
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
            <p><strong>处理类型:</strong> {getCurrentOperationLabel()}</p>
            {(activeTab === 'face-beauty' || activeTab === 'face-stylization') && result?.processingSteps && (
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

export default ImageProcessingPage
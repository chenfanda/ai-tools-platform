// ===== src/components/image/FaceBeauty.jsx =====
import React, { useState, useCallback, useRef } from 'react'
import FileUpload from '@/components/shared/FileUpload'
import ProgressBar from '@/components/shared/ProgressBar'
import ResultPanel from '@/components/shared/ResultPanel'
import ImageAPI from '@/services/api/imageAPI'

// 独立的美颜调整面板组件（使用React.memo避免不必要的重新渲染）
const BeautyAdjustmentPanel = React.memo(({ 
  title, 
  icon, 
  feature,
  enabled, 
  onEnabledChange,
  intensity, 
  onIntensityChange,
  beautyParams,
  updateBeautyParam,
  realTimeEnabled,
  handleRealtimePreview,
  options = {},
  intensityRange = { min: 0.1, max: 0.7, step: 0.1 }
}) => {
  const { 
    typeKey, 
    typeOptions, 
    typeLabels, 
    regionKey, 
    regionOptions, 
    regionLabels, 
    modeKey, 
    modeOptions, 
    modeLabels 
  } = options

  // 处理启用状态变化
  const handleEnabledChange = (checked) => {
    onEnabledChange(checked)
    // 如果启用了功能，触发实时预览
    if (checked && realTimeEnabled) {
      handleRealtimePreview()
    }
  }

  // 处理参数变化（类型、区域、模式）
  const handleParamChange = (key, value) => {
    updateBeautyParam(key, value)
    // 如果功能已启用，触发实时预览
    if (enabled && realTimeEnabled) {
      handleRealtimePreview()
    }
  }

  // 处理强度变化
  const handleIntensityChange = (value) => {
    onIntensityChange(value)
    // 如果功能已启用，触发实时预览
    if (enabled && realTimeEnabled) {
      handleRealtimePreview()
    }
  }

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 ${
      enabled ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-gray-50'
    }`}>
      {/* 功能开关 */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleEnabledChange(e.target.checked)}
          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
        />
        <span className="text-lg">{icon}</span>
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      
      {/* 功能配置（仅在启用时显示） */}
      {enabled && (
        <div className="space-y-3 ml-7">
          {/* 类型选择 */}
          {typeKey && typeOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整类型</label>
              <select
                value={beautyParams[typeKey]}
                onChange={(e) => handleParamChange(typeKey, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-500"
              >
                {typeOptions.map(option => (
                  <option key={option} value={option}>
                    {typeLabels[option] || option}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* 区域选择 */}
          {regionKey && regionOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整区域</label>
              <select
                value={beautyParams[regionKey]}
                onChange={(e) => handleParamChange(regionKey, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-500"
              >
                {regionOptions.map(option => (
                  <option key={option} value={option}>
                    {regionLabels[option] || option}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* 模式选择 */}
          {modeKey && modeOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">处理模式</label>
              <select
                value={beautyParams[modeKey]}
                onChange={(e) => handleParamChange(modeKey, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-500"
              >
                {modeOptions.map(option => (
                  <option key={option} value={option}>
                    {modeLabels[option] || option}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* 强度调节 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              强度: {intensity.toFixed(1)}
            </label>
            <input
              type="range"
              min={intensityRange.min}
              max={intensityRange.max}
              step={intensityRange.step}
              value={intensity}
              onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>轻微</span>
              <span>适中</span>
              <span>强烈</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // 自定义比较函数，确保实时预览相关的状态变化时会重新渲染
  const prevParams = prevProps.beautyParams
  const nextParams = nextProps.beautyParams
  
  // 检查当前面板相关的参数是否变化
  const feature = prevProps.feature
  const enabledKey = `${feature}_enabled`
  const intensityKey = `${feature}_intensity`
  
  // 获取当前面板的类型/区域/模式键
  const { typeKey, regionKey, modeKey } = prevProps.options
  
  // 如果相关参数有变化，需要重新渲染
  if (
    prevParams[enabledKey] !== nextParams[enabledKey] ||
    prevParams[intensityKey] !== nextParams[intensityKey] ||
    (typeKey && prevParams[typeKey] !== nextParams[typeKey]) ||
    (regionKey && prevParams[regionKey] !== nextParams[regionKey]) ||
    (modeKey && prevParams[modeKey] !== nextParams[modeKey]) ||
    prevProps.realTimeEnabled !== nextProps.realTimeEnabled
  ) {
    return false // 需要重新渲染
  }
  
  return true // 不需要重新渲染
})

const FaceBeauty = ({ config, onNotification }) => {
  // 文件状态
  const [imageFiles, setImageFiles] = useState([])
  
  // 图片预览状态
  const [imagePreview, setImagePreview] = useState(null)
  
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
  
  // 状态管理
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingTime, setProcessingTime] = useState(0)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [resultType, setResultType] = useState('success')

  // 滚动容器ref
  const scrollRef = useRef(null)

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

  // 清理预览URL，避免内存泄漏
  const clearPreviews = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
  }

  // 轻美颜参数更新辅助函数（使用useCallback优化）
  const updateBeautyParam = useCallback((key, value) => {
    setBeautyParams(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

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
        const imageAPI = new ImageAPI(config.facialApiUrl)
        const data = await imageAPI.facialAdjustment(imageFiles[0], beautyParams, config.facialApiUrl)

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

    setIsProcessing(true)
    setShowResult(false)
    const startTime = Date.now()

    try {
      const imageAPI = new ImageAPI(config.facialApiUrl)
      const data = await imageAPI.facialAdjustment(imageFiles[0], beautyParams, config.facialApiUrl)
      
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

  // 下载处理结果
  const handleDownload = () => {
    if (!result?.imageBase64) return

    const link = document.createElement('a')
    link.href = `data:image/png;base64,${result.imageBase64}`
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    link.download = `facial_beauty_${timestamp}.png`
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
      onClick: handleFacialAdjustment
    }
  ] : [
    {
      label: '🔄 重试',
      variant: 'primary',
      onClick: handleFacialAdjustment
    }
  ]

  return (
    <div className="face-beauty">
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

          {/* 参数面板 - 滚动容器独立 */}
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

            {/* 参数配置区域 - 滚动容器独立于参数内容 */}
            <div ref={scrollRef} className="h-[400px] overflow-y-auto">
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
                  realTimeEnabled={realTimeEnabled}
                  handleRealtimePreview={handleRealtimePreview}
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
                  realTimeEnabled={realTimeEnabled}
                  handleRealtimePreview={handleRealtimePreview}
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
                  realTimeEnabled={realTimeEnabled}
                  handleRealtimePreview={handleRealtimePreview}
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
                  realTimeEnabled={realTimeEnabled}
                  handleRealtimePreview={handleRealtimePreview}
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
                  realTimeEnabled={realTimeEnabled}
                  handleRealtimePreview={handleRealtimePreview}
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
                  realTimeEnabled={realTimeEnabled}
                  handleRealtimePreview={handleRealtimePreview}
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
                  realTimeEnabled={realTimeEnabled}
                  handleRealtimePreview={handleRealtimePreview}
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
            <p><strong>处理类型:</strong> ✨ 轻美颜</p>
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

export default FaceBeauty
// ===== src/pages/video/index.jsx =====
import React, { useState, useEffect } from 'react'
import FileUpload from '@/components/shared/FileUpload'
import ProgressBar from '@/components/shared/ProgressBar'
import ResultPanel from '@/components/shared/ResultPanel'

const VideoPage = ({ config, onNotification }) => {
  // 文件状态
  const [imageFiles, setImageFiles] = useState([])
  const [audioFiles, setAudioFiles] = useState([])
  const [subtitleFiles, setSubtitleFiles] = useState([])
  const [bgmFiles, setBgmFiles] = useState([])
  
  // 设置参数
  const [performance, setPerformance] = useState('balanced')
  const [workers, setWorkers] = useState('2')
  const [bgmVolume, setBgmVolume] = useState(0.3)
  
  // 状态管理
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressTitle, setProgressTitle] = useState('正在处理视频...')
  const [statusMessage, setStatusMessage] = useState('正在准备任务...')
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [resultType, setResultType] = useState('success')
  const [taskId, setTaskId] = useState(null)

  // 生成视频
  const handleGenerate = async () => {
    if (imageFiles.length === 0 || audioFiles.length === 0) {
      onNotification('请选择图片和音频文件', 'error')
      return
    }

    if (imageFiles.length !== audioFiles.length) {
      onNotification('图片和音频文件数量必须相同', 'error')
      return
    }

    setIsProcessing(true)
    setShowResult(false)
    setProgress(0)
    setProgressTitle('正在处理视频...')
    setStatusMessage('正在准备任务...')

    try {
      const formData = new FormData()

      // 添加文件
      imageFiles.forEach(img => formData.append('images', img))
      audioFiles.forEach(audio => formData.append('audios', audio))
      
      if (subtitleFiles.length > 0) {
        subtitleFiles.forEach(subtitle => formData.append('subtitles', subtitle))
      }
      
      if (bgmFiles.length > 0) {
        formData.append('background_music', bgmFiles[0])
      }

      // 添加配置
      formData.append('performance_mode', performance)
      formData.append('parallel_workers', workers)
      formData.append('enable_parallel', 'true')
      formData.append('background_music_volume', bgmVolume.toString())

      const response = await fetch(config.videoApiUrl + '/api/v1/video/create', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setTaskId(result.task_id)
        monitorTask(result.task_id)
      } else {
        const error = await response.json()
        throw new Error(error.detail || '创建任务失败')
      }
    } catch (error) {
      setResult({ error: error.message })
      setResultType('error')
      setShowResult(true)
      setIsProcessing(false)
      onNotification(`创建任务失败: ${error.message}`, 'error')
    }
  }

  // 监控任务进度
  const monitorTask = async (taskId) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(config.videoApiUrl + `/api/v1/task/${taskId}`)
        
        if (response.ok) {
          const status = await response.json()
          
          // 更新进度
          setProgress(status.progress || 0)
          setStatusMessage(status.message || '正在处理...')
          
          if (status.status === 'completed') {
            setResult(status)
            setResultType('success')
            setShowResult(true)
            setIsProcessing(false)
            onNotification('视频生成成功', 'success')
            return
          } else if (status.status === 'failed') {
            setResult({ error: status.error || '处理失败' })
            setResultType('error')
            setShowResult(true)
            setIsProcessing(false)
            onNotification(`视频生成失败: ${status.error}`, 'error')
            return
          } else {
            // 继续监控
            setTimeout(checkStatus, 2000)
          }
        } else {
          console.error('检查任务状态失败:', response.status)
          setTimeout(checkStatus, 5000) // 延长间隔重试
        }
      } catch (error) {
        console.error('检查任务状态失败:', error)
        setTimeout(checkStatus, 5000) // 出错时延长间隔重试
      }
    }

    checkStatus()
  }

  // 分享视频
  const shareVideo = async (filename) => {
    const videoUrl = `${config.videoApiUrl}/api/v1/download/${filename}`
    
    try {
      await navigator.clipboard.writeText(videoUrl)
      onNotification('视频链接已复制到剪贴板', 'success')
    } catch (error) {
      // 降级方案：显示链接模态框
      showVideoLinkModal(videoUrl)
    }
  }

  // 显示视频链接模态框
  const showVideoLinkModal = (url) => {
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.5); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
    `
    
    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%;">
        <h3 style="margin-bottom: 16px; color: #1f2937;">视频分享链接</h3>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
          <input type="text" value="${url}" readonly 
                 style="width: 100%; border: none; background: transparent; font-size: 14px;"
                 onclick="this.select()">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                  style="padding: 8px 16px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer;">关闭</button>
          <button onclick="navigator.clipboard.writeText('${url}').then(() => alert('链接已复制')); this.parentElement.parentElement.parentElement.remove();" 
                  style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">复制链接</button>
        </div>
      </div>
    `
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove()
    })
    
    document.body.appendChild(modal)
  }

  // 全屏播放视频
  const openVideoFullscreen = (filename) => {
    const videoUrl = `${config.videoApiUrl}/api/v1/download/${filename}`
    
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.9); z-index: 2000;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(5px);
    `
    
    modal.innerHTML = `
      <div style="position: relative; width: 90%; max-width: 1000px;">
        <video controls autoplay style="width: 100%; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
          <source src="${videoUrl}" type="video/mp4">
          您的浏览器不支持视频播放
        </video>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="position: absolute; top: -40px; right: 0; background: rgba(255,255,255,0.2); 
                       border: none; color: white; width: 32px; height: 32px; border-radius: 50%; 
                       cursor: pointer; font-size: 18px; backdrop-filter: blur(10px);">✕</button>
      </div>
    `
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove()
    })
    
    // ESC键关闭
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove()
        document.removeEventListener('keydown', escHandler)
      }
    }
    document.addEventListener('keydown', escHandler)
    
    document.body.appendChild(modal)
  }

  const performanceOptions = [
    { value: 'fast', label: '快速模式 (720p)' },
    { value: 'balanced', label: '平衡模式 (1080p)' },
    { value: 'quality', label: '高质量模式 (1080p+)' }
  ]

  const workerOptions = [
    { value: '1', label: '1个进程' },
    { value: '2', label: '2个进程' },
    { value: '4', label: '4个进程' },
    { value: '8', label: '8个进程' }
  ]

  const resultActions = resultType === 'success' ? [
    {
      label: '📥 下载视频',
      variant: 'primary',
      onClick: () => {
        const link = document.createElement('a')
        link.href = `${config.videoApiUrl}/api/v1/download/${result.output_file}`
        link.download = true
        link.click()
      }
    },
    {
      label: '🔄 重新生成',
      onClick: handleGenerate
    },
    {
      label: '🔗 分享链接',
      onClick: () => shareVideo(result.output_file)
    },
    {
      label: '🖥️ 全屏播放',
      onClick: () => openVideoFullscreen(result.output_file)
    }
  ] : [
    {
      label: '🔄 重试',
      variant: 'primary',
      onClick: handleGenerate
    }
  ]

  return (
    <div className="video-page max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: 'home' }))}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors duration-200"
        >
          ← 返回首页
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
          🎬
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">视频生成</h2>
      </div>

      {/* 素材文件 */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">素材文件</h3>
        
        <div className="space-y-6">
          {/* 图片文件 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              图片文件（按播放顺序）
            </label>
            <FileUpload
              accept="image/*"
              multiple={true}
              icon="🖼️"
              title="拖拽图片文件到这里，或点击选择"
              hint="支持 JPG、PNG 格式，可选择多个文件"
              onChange={setImageFiles}
            />
          </div>

          {/* 音频文件 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              音频文件（与图片对应）
            </label>
            <FileUpload
              accept="audio/*"
              multiple={true}
              icon="🎵"
              title="拖拽音频文件到这里，或点击选择"
              hint="音频数量应与图片数量一致"
              onChange={setAudioFiles}
            />
          </div>

          {/* 字幕文件 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              字幕文件（可选）
            </label>
            <FileUpload
              accept=".txt"
              multiple={true}
              icon="📝"
              title="拖拽字幕文件到这里，或点击选择"
              hint="支持 TXT 格式，可选择多个文件"
              onChange={setSubtitleFiles}
            />
          </div>

          {/* 背景音乐 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              背景音乐（可选）
            </label>
            <FileUpload
              accept="audio/*"
              icon="🎼"
              title="拖拽背景音乐到这里，或点击选择"
              hint="将作为视频的背景音乐"
              onChange={setBgmFiles}
            />
          </div>
        </div>
      </div>

      {/* 生成设置 */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">生成设置</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              性能模式
            </label>
            <select
              value={performance}
              onChange={(e) => setPerformance(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
            >
              {performanceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              并行进程数
            </label>
            <select
              value={workers}
              onChange={(e) => setWorkers(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
            >
              {workerOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              背景音乐音量
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={bgmVolume}
              onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-center text-xs text-gray-600 mt-1">
              当前: {bgmVolume}
            </div>
          </div>
        </div>
      </div>

      {/* 生成按钮 */}
      <div className="text-center mb-8">
        <button
          onClick={handleGenerate}
          disabled={isProcessing || imageFiles.length === 0 || audioFiles.length === 0}
          className="px-8 py-3 bg-primary-500 text-white rounded-lg text-base font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          🎬 生成视频
        </button>
      </div>

      {/* 进度条 */}
      <ProgressBar
        isVisible={isProcessing}
        progress={progress}
        title={progressTitle}
        message={statusMessage}
      />

      {/* 结果展示 */}
      <ResultPanel
        isVisible={showResult}
        type={resultType}
        title={resultType === 'success' ? '视频生成成功' : '视频生成失败'}
        actions={resultActions}
      >
        {resultType === 'success' ? (
          <div>
            <p><strong>任务ID:</strong> {result?.task_id}</p>
            <p><strong>完成时间:</strong> {result?.completed_at ? new Date(result.completed_at).toLocaleString() : '刚刚'}</p>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-medium">🎬 在线预览:</span>
              </div>
              <video 
                controls 
                className="w-full max-w-2xl rounded-lg shadow-md"
                src={`${config.videoApiUrl}/api/v1/download/${result?.output_file}`}
              >
                您的浏览器不支持视频播放
              </video>
            </div>
          </div>
        ) : (
          <p className="text-red-700">错误信息: {result?.error}</p>
        )}
      </ResultPanel>
    </div>
  )
}

export default VideoPage

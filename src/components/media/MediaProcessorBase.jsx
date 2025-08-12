// ===== src/components/media/MediaProcessorBase.jsx =====
import React, { useState } from 'react'
import FileUpload from '@/components/shared/FileUpload'
import ProgressBar from '@/components/shared/ProgressBar'
import ResultPanel from '@/components/shared/ResultPanel'

const MediaProcessorBase = ({
  title,
  description,
  icon = '🎬',
  acceptedFiles = '*/*',
  allowMultiple = false,
  children,
  onProcess,
  config,
  onNotification
}) => {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [result, setResult] = useState(null)

  // 处理文件上传
  const handleFileSelect = (selectedFiles) => {
    setFiles(selectedFiles)
    // 清除之前的结果
    if (result) {
      setResult(null)
    }
  }

  // 处理开始处理
  const handleStartProcess = async () => {
    if (files.length === 0) {
      onNotification('请先选择文件', 'error')
      return
    }

    if (!onProcess) {
      onNotification('处理函数未定义', 'error')
      return
    }

    setProcessing(true)
    setProgress(0)
    setProgressMessage('准备处理...')
    setResult(null)

    try {
      // 模拟进度更新
      setProgress(0.1)
      setProgressMessage('上传文件中...')

      // 调用父组件的处理函数
      const processResult = await onProcess(files)

      setProgress(1)
      setProgressMessage('处理完成')

      if (processResult) {
        setResult({
          type: 'success',
          data: processResult
        })
        onNotification('处理完成', 'success')
      }

    } catch (error) {
      console.error('处理失败:', error)
      setResult({
        type: 'error',
        error: error.message || '处理失败'
      })
      onNotification(`处理失败: ${error.message}`, 'error')
    } finally {
      setProcessing(false)
      setTimeout(() => {
        setProgress(0)
        setProgressMessage('')
      }, 2000)
    }
  }

  // 下载文件
  const handleDownload = (downloadUrl, filename) => {
    if (!downloadUrl) return

    try {
      // 创建下载链接
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename || 'download'
      link.target = '_blank'
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      onNotification('开始下载', 'success')
    } catch (error) {
      onNotification('下载失败', 'error')
    }
  }

  // 渲染成功结果
  const renderSuccessResult = (data) => {
    // 处理不同类型的结果
    if (data.separatedFiles) {
      // 音频分离结果
      return (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            音频分离完成，共生成 {Object.keys(data.separatedFiles).length} 个文件：
          </div>
          {Object.entries(data.separatedFiles).map(([stem, url]) => (
            <div key={stem} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-lg">🎵</span>
                <div>
                  <div className="font-medium text-gray-900">{stem}</div>
                  <div className="text-sm text-gray-500">音频分离结果</div>
                </div>
              </div>
              <button
                onClick={() => handleDownload(url, `${stem}.mp3`)}
                className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors duration-200"
              >
                下载
              </button>
            </div>
          ))}
        </div>
      )
    } else if (data.download_url || data.downloadUrl) {
      // 单文件结果
      const downloadUrl = data.download_url || data.downloadUrl
      const filename = data.output_file || data.filename || 'processed_file'
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="font-medium text-gray-900">处理完成</div>
                <div className="text-sm text-gray-500">
                  {data.duration && `时长: ${data.duration}s`}
                  {data.message && ` • ${data.message}`}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDownload(downloadUrl, filename)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200"
            >
              下载文件
            </button>
          </div>

          {/* 如果有音频/视频预览 */}
          {downloadUrl && (
            <div className="mt-4">
              {filename.includes('.mp3') || filename.includes('.wav') || filename.includes('.m4a') ? (
                <audio controls className="w-full">
                  <source src={downloadUrl} />
                  您的浏览器不支持音频播放
                </audio>
              ) : filename.includes('.mp4') || filename.includes('.avi') ? (
                <video controls className="w-full max-h-64">
                  <source src={downloadUrl} />
                  您的浏览器不支持视频播放
                </video>
              ) : null}
            </div>
          )}
        </div>
      )
    } else {
      // 通用结果显示
      return (
        <div className="text-gray-600">
          {JSON.stringify(data, null, 2)}
        </div>
      )
    }
  }

  return (
    <div className="media-processor-base space-y-6">
      {/* 功能介绍区域 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl">
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>
        </div>

        {/* 文件上传区域 */}
        <FileUpload
          accept={acceptedFiles}
          multiple={allowMultiple}
          onChange={handleFileSelect}
          icon={icon}
          title={allowMultiple ? "选择多个文件或拖拽到这里" : "选择文件或拖拽到这里"}
          hint={`支持 ${acceptedFiles} 格式${allowMultiple ? '，可选择多个文件' : ''}`}
          className="mb-6"
        />

        {/* 参数配置区域 - 由子组件提供 */}
        {children && (
          <div className="parameter-section mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">参数设置</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              {children}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <button
          onClick={handleStartProcess}
          disabled={files.length === 0 || processing}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            files.length === 0 || processing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-md'
          }`}
        >
          {processing ? '处理中...' : `开始${title}`}
        </button>
      </div>

      {/* 进度显示 */}
      <ProgressBar
        isVisible={processing}
        progress={progress}
        title={progressMessage || `正在${title}...`}
        message={files.length > 0 ? `正在处理: ${files[0].name}` : ''}
      />

      {/* 结果显示 */}
      {result && (
        <ResultPanel
          isVisible={true}
          type={result.type}
          title={result.type === 'success' ? '处理成功' : '处理失败'}
        >
          {result.type === 'success' ? 
            renderSuccessResult(result.data) : 
            <div className="text-red-600">{result.error}</div>
          }
        </ResultPanel>
      )}
    </div>
  )
}

export default MediaProcessorBase

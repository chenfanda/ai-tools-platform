// ===== src/pages/asr/index.jsx =====
import React, { useState } from 'react'
import FileUpload from '@/components/shared/FileUpload'
import ProgressBar from '@/components/shared/ProgressBar'
import ResultPanel from '@/components/shared/ResultPanel'

const ASRPage = ({ config, onNotification }) => {
  const [audioFiles, setAudioFiles] = useState([])
  const [language, setLanguage] = useState('zh')
  const [format, setFormat] = useState('txt')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [resultType, setResultType] = useState('success')

  // 开始识别
  const handleTranscribe = async () => {
    if (audioFiles.length === 0) {
      onNotification('请选择音频文件', 'error')
      return
    }

    const audioFile = audioFiles[0]
    setIsProcessing(true)
    setShowResult(false)

    try {
      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('language', language)
      formData.append('format', format)

      const response = await fetch(config.asrApiUrl + '/transcribe', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        let content
        if (format === 'json') {
          content = await response.json()
        } else {
          content = await response.text()
        }

        setResult({
          content,
          format,
          filename: audioFile.name
        })
        setResultType('success')
        setShowResult(true)
        onNotification('语音识别完成', 'success')
      } else {
        const error = await response.json()
        throw new Error(error.detail || '识别失败')
      }
    } catch (error) {
      setResult({ error: error.message })
      setResultType('error')
      setShowResult(true)
      onNotification(`识别失败: ${error.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // 下载结果
  const handleDownload = () => {
    if (!result?.content) return

    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content, null, 2)

    const blob = new Blob([content], { 
      type: result.format === 'json' ? 'application/json' : 'text/plain' 
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename.replace(/\.[^/.]+$/, '') + 
                 (result.format === 'json' ? '_transcription.json' : '_transcription.txt')
    a.click()
    URL.revokeObjectURL(url)
  }

  // 复制到剪贴板
  const handleCopy = async () => {
    if (!result?.content) return

    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content, null, 2)

    try {
      await navigator.clipboard.writeText(content)
      onNotification('内容已复制到剪贴板', 'success')
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      onNotification('内容已复制到剪贴板', 'success')
    }
  }

  const languageOptions = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: '英语' },
    { value: 'ja', label: '日语' },
    { value: 'ko', label: '韩语' },
    { value: 'fr', label: '法语' },
    { value: 'de', label: '德语' },
    { value: 'es', label: '西班牙语' },
    { value: 'ru', label: '俄语' }
  ]

  const formatOptions = [
    { value: 'txt', label: '纯文本格式' },
    { value: 'json', label: '详细JSON格式' }
  ]

  const resultActions = resultType === 'success' ? [
    {
      label: '📥 下载文本',
      variant: 'primary',
      onClick: handleDownload
    },
    {
      label: '📋 复制内容',
      onClick: handleCopy
    }
  ] : [
    {
      label: '🔄 重试',
      variant: 'primary',
      onClick: handleTranscribe
    }
  ]

  return (
    <div className="asr-page max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: 'home' }))}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors duration-200"
        >
          ← 返回首页
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
          📝
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">语音识别</h2>
      </div>

      {/* 音频文件上传 */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">音频文件</h3>
        <FileUpload
          accept="audio/*"
          icon="🎙️"
          title="拖拽音频文件到这里，或点击选择"
          hint="支持 MP3、WAV、M4A、AAC、FLAC、OGG 等格式"
          onChange={setAudioFiles}
        />
      </div>

      {/* 识别设置 */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">识别设置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              识别语言
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              输出格式
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
            >
              {formatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 开始识别按钮 */}
      <div className="text-center mb-8">
        <button
          onClick={handleTranscribe}
          disabled={isProcessing || audioFiles.length === 0}
          className="px-8 py-3 bg-primary-500 text-white rounded-lg text-base font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          🔍 开始识别
        </button>
      </div>

      {/* 进度条 */}
      <ProgressBar
        isVisible={isProcessing}
        progress={0.6}
        title="正在识别语音内容..."
      />

      {/* 结果展示 */}
      <ResultPanel
        isVisible={showResult}
        type={resultType}
        title={resultType === 'success' ? '语音识别完成' : '语音识别失败'}
        actions={resultActions}
      >
        {resultType === 'success' ? (
          <div>
            <div className="bg-gray-50 p-4 rounded-lg mb-3 border border-gray-200">
              <pre className="whitespace-pre-wrap font-inherit text-sm text-gray-800 m-0">
                {typeof result?.content === 'string' 
                  ? result.content 
                  : JSON.stringify(result?.content, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-red-700">错误信息: {result?.error}</p>
        )}
      </ResultPanel>
    </div>
  )
}

export default ASRPage

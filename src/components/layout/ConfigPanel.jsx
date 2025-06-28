// ===== src/components/layout/ConfigPanel.jsx =====
import React, { useState, useEffect } from 'react'

const ConfigPanel = ({ 
  isOpen, 
  config, 
  onConfigSave, 
  onClose, 
  onTestConnections 
}) => {
  const [localConfig, setLocalConfig] = useState(config)
  const [connectionStatus, setConnectionStatus] = useState({
    tts: { status: 'checking', text: '检查中...' },
    video: { status: 'checking', text: '检查中...' },
    asr: { status: 'checking', text: '检查中...' },
    image: { status: 'checking', text: '检查中...' }
  })
  const [saveButtonState, setSaveButtonState] = useState({
    text: '💾 保存配置',
    disabled: false
  })

  // 同步外部配置变化
  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  // 测试单个连接
  const testConnection = async (apiUrl, service) => {
    setConnectionStatus(prev => ({
      ...prev,
      [service]: { status: 'checking', text: '检查中...' }
    }))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(apiUrl + '/health', { 
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        setConnectionStatus(prev => ({
          ...prev,
          [service]: { status: 'online', text: '在线' }
        }))
      } else {
        throw new Error('服务异常')
      }
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        [service]: { 
          status: 'offline', 
          text: error.name === 'AbortError' ? '超时' : '离线' 
        }
      }))
    }
  }

  // 测试所有连接
  const handleTestConnections = async () => {
    await Promise.all([
      testConnection(localConfig.ttsApiUrl, 'tts'),
      testConnection(localConfig.videoApiUrl, 'video'),
      testConnection(localConfig.asrApiUrl, 'asr'),
      testConnection(localConfig.imageApiUrl, 'image')
    ])
  }

  // 保存配置
  const handleSaveConfig = () => {
    onConfigSave(localConfig)
    
    setSaveButtonState({
      text: '✅ 已保存',
      disabled: true
    })
    
    setTimeout(() => {
      setSaveButtonState({
        text: '💾 保存配置',
        disabled: false
      })
    }, 2000)
    
    handleTestConnections()
  }

  // 获取状态指示器样式
  const getStatusDotClass = (status) => {
    const baseClass = "w-1.5 h-1.5 rounded-full"
    switch (status) {
      case 'online':
        return `${baseClass} bg-green-500`
      case 'offline':
        return `${baseClass} bg-red-500`
      case 'checking':
      default:
        return `${baseClass} bg-yellow-500 animate-pulse-slow`
    }
  }

  return (
    <div className={`fixed top-0 right-0 w-96 h-full bg-white shadow-2xl transition-transform duration-300 z-50 overflow-y-auto ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* 头部 */}
      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">API 配置</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
        >
          ✕
        </button>
      </div>

      {/* 内容 */}
      <div className="p-5">
        {/* 服务端点配置 */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <h4 className="text-base font-semibold text-gray-900 mb-4">服务端点配置</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                TTS 服务地址
              </label>
              <input
                type="text"
                value={localConfig.ttsApiUrl}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, ttsApiUrl: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                placeholder="http://localhost:8000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                视频服务地址
              </label>
              <input
                type="text"
                value={localConfig.videoApiUrl}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, videoApiUrl: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                placeholder="http://localhost:8001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ASR 服务地址
              </label>
              <input
                type="text"
                value={localConfig.asrApiUrl}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, asrApiUrl: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                placeholder="http://localhost:8002"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                图像处理服务地址
              </label>
              <input
                type="text"
                value={localConfig.imageApiUrl}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, imageApiUrl: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                placeholder="http://localhost:8003"
              />
            </div>
          </div>
        </div>

        {/* 连接状态 */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <h4 className="text-base font-semibold text-gray-900 mb-4">连接状态</h4>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={getStatusDotClass(connectionStatus.tts.status)} />
              <span className="text-sm text-gray-700">TTS 服务:</span>
              <span className="ml-auto text-sm text-gray-600">
                {connectionStatus.tts.text}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={getStatusDotClass(connectionStatus.video.status)} />
              <span className="text-sm text-gray-700">视频服务:</span>
              <span className="ml-auto text-sm text-gray-600">
                {connectionStatus.video.text}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={getStatusDotClass(connectionStatus.asr.status)} />
              <span className="text-sm text-gray-700">ASR 服务:</span>
              <span className="ml-auto text-sm text-gray-600">
                {connectionStatus.asr.text}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className={getStatusDotClass(connectionStatus.image.status)} />
              <span className="text-sm text-gray-700">图像服务:</span>
              <span className="ml-auto text-sm text-gray-600">
                {connectionStatus.image.text}
              </span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleSaveConfig}
            disabled={saveButtonState.disabled}
            className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            {saveButtonState.text}
          </button>
          
          <button
            onClick={handleTestConnections}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-all duration-200"
          >
            🔗 测试连接
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfigPanel

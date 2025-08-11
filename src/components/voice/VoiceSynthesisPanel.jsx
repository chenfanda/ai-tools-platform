// ===== src/components/voice/VoiceSynthesisPanel.jsx =====
import React, { useState, useEffect } from 'react'
import FileUpload from '@/components/shared/FileUpload'
import ProgressBar from '@/components/shared/ProgressBar'
import ResultPanel from '@/components/shared/ResultPanel'

const VoiceSynthesisPanel = ({ config, onNotification }) => {
  // ===== 语音合成相关状态 =====
  const [currentMode, setCurrentMode] = useState('character') // 'character' | 'custom'
  const [voiceCharacters, setVoiceCharacters] = useState([])
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [charactersError, setCharactersError] = useState(null)
  
  // 表单数据
  const [textContent, setTextContent] = useState('')
  const [promptText, setPromptText] = useState('')
  const [promptAudio, setPromptAudio] = useState([])
  const [gender, setGender] = useState('')
  const [pitch, setPitch] = useState('')
  const [speed, setSpeed] = useState('')
  
  // 状态管理
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [resultType, setResultType] = useState('success')

  // 用户自定义录音相关状态
  const [username, setUsername] = useState('')
  const [voiceName, setVoiceName] = useState('')
  const [voiceDescription, setVoiceDescription] = useState('')
  const [customVoices, setCustomVoices] = useState([])
  const [selectedCustomVoice, setSelectedCustomVoice] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  // 从localStorage加载用户名
  useEffect(() => {
    const savedUsername = localStorage.getItem('tts_username')
    if (savedUsername) {
      setUsername(savedUsername)
    }
  }, [])

  // 当用户名改变时保存到localStorage
  useEffect(() => {
    if (username) {
      localStorage.setItem('tts_username', username)
    }
  }, [username])

  // 当用户名改变或切换到自定义模式时加载历史记录
  useEffect(() => {
    if (currentMode === 'custom' && username) {
      loadCustomVoices()
    }
  }, [username, currentMode])

  // ===== 语音合成功能函数 =====
  
  // 加载语音角色
  const loadVoiceCharacters = async () => {
    setCharactersLoading(true)
    setCharactersError(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(config.ttsApiUrl + '/characters', {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const characters = Array.isArray(data) ? data : []
        setVoiceCharacters(characters)
        
        if (characters.length === 0) {
          setCharactersError('暂无可用的语音角色，请确保已配置角色文件')
        }
      } else {
        throw new Error(`服务器响应错误: ${response.status}`)
      }
    } catch (error) {
      let errorMessage = '加载语音角色失败'
      if (error.name === 'AbortError') {
        errorMessage = '请求超时，请检查服务器是否正常运行'
      } else if (error.message.includes('fetch')) {
        errorMessage = '无法连接到TTS服务，请确保服务已启动'
      } else {
        errorMessage = `加载失败: ${error.message}`
      }
      setCharactersError(errorMessage)
    } finally {
      setCharactersLoading(false)
    }
  }

  // 加载用户自定义录音列表
  const loadCustomVoices = async () => {
    if (!username.trim()) return

    setIsLoadingHistory(true)
    setHistoryError(null)

    try {
      const response = await fetch(`${config.ttsApiUrl}/user_custom_voices/${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (response.ok) {
        const voices = await response.json()
        setCustomVoices(voices)
      } else {
        const error = await response.json()
        throw new Error(error.detail || '加载历史记录失败')
      }
    } catch (error) {
      setHistoryError(error.message)
      onNotification(`加载历史记录失败: ${error.message}`, 'error')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // 保存自定义录音
  const saveCustomVoice = async () => {
    if (!username.trim()) {
      onNotification('请输入用户名', 'error')
      return
    }

    if (!voiceName.trim()) {
      onNotification('请输入录音名称', 'error')
      return
    }

    if (!promptText.trim()) {
      onNotification('请输入提示文本', 'error')
      return
    }

    if (promptAudio.length === 0) {
      onNotification('请上传音频文件', 'error')
      return
    }

    setIsSaving(true)

    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('voice_name', voiceName)
      formData.append('text', promptText)
      if (voiceDescription) {
        formData.append('description', voiceDescription)
      }
      formData.append('audio_file', promptAudio[0])

      const response = await fetch(`${config.ttsApiUrl}/save_custom_voice`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        onNotification('录音保存成功！', 'success')
        
        // 清空表单
        setVoiceName('')
        setVoiceDescription('')
        
        // 重新加载历史记录
        loadCustomVoices()
      } else {
        const error = await response.json()
        throw new Error(error.detail || '保存失败')
      }
    } catch (error) {
      onNotification(`保存失败: ${error.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // 删除自定义录音
  const deleteCustomVoice = async (voiceId, voiceName) => {
    if (!confirm(`确定要删除录音"${voiceName}"吗？`)) {
      return
    }

    try {
      const response = await fetch(`${config.ttsApiUrl}/user_custom_voices/${encodeURIComponent(username)}/${voiceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onNotification('录音删除成功', 'success')
        loadCustomVoices()
        
        // 如果删除的是当前选中的录音，清空选择
        if (selectedCustomVoice === voiceId) {
          setSelectedCustomVoice(null)
        }
      } else {
        const error = await response.json()
        throw new Error(error.detail || '删除失败')
      }
    } catch (error) {
      onNotification(`删除失败: ${error.message}`, 'error')
    }
  }

  // 选择自定义录音
  const selectCustomVoice = (voice) => {
    setSelectedCustomVoice(voice.voice_id)
    onNotification(`已选择录音: ${voice.voice_name}`, 'success')
  }

  // 初始化加载角色
  useEffect(() => {
    if (currentMode === 'character' && voiceCharacters.length === 0) {
      loadVoiceCharacters()
    }
  }, [currentMode, config.ttsApiUrl])

  // 切换模式
  const switchMode = (mode) => {
    setCurrentMode(mode)
    setShowResult(false)
    setSelectedCustomVoice(null)
    
    if (mode === 'character' && voiceCharacters.length === 0) {
      loadVoiceCharacters()
    }
  }

  // 选择角色
  const selectCharacter = (characterId) => {
    setSelectedCharacter(characterId)
    const character = voiceCharacters.find(c => c.character_id === characterId)
    if (character) {
      onNotification(`已选择角色: ${character.name}`, 'success')
    }
  }

  // 生成语音
  const handleGenerate = async () => {
    if (!textContent.trim()) {
      onNotification('请输入要合成的文本', 'error')
      return
    }

    if (currentMode === 'character' && !selectedCharacter) {
      onNotification('请选择一个语音角色', 'error')
      return
    }

    if (currentMode === 'custom') {
      // 检查是使用历史录音还是临时录音
      if (selectedCustomVoice) {
        // 使用历史录音
        if (!username.trim()) {
          onNotification('用户名不能为空', 'error')
          return
        }
      } else {
        // 使用临时录音
        if (promptAudio.length === 0) {
          onNotification('请上传提示音频文件或选择历史录音', 'error')
          return
        }
      }
    }

    setIsGenerating(true)
    setShowResult(false)

    try {
      let response

      if (currentMode === 'character') {
        // 角色模式
        const requestData = {
          text: textContent,
          character_id: selectedCharacter,
          gender: gender || null,
          pitch: pitch || null,
          speed: speed || null
        }

        response = await fetch(config.ttsApiUrl + '/tts_with_character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        })
      } else {
        // 自定义模式
        if (selectedCustomVoice) {
          // 使用历史录音
          const formData = new FormData()
          formData.append('text', textContent)
          formData.append('username', username)
          formData.append('voice_id', selectedCustomVoice)
          if (gender) formData.append('gender', gender)
          if (pitch) formData.append('pitch', pitch)
          if (speed) formData.append('speed', speed)

          response = await fetch(config.ttsApiUrl + '/tts_with_custom_voice', {
            method: 'POST',
            body: formData
          })
        } else {
          // 使用临时录音
          const formData = new FormData()
          formData.append('text', textContent)
          formData.append('prompt_audio', promptAudio[0])

          if (promptText) formData.append('prompt_text', promptText)
          if (gender) formData.append('gender', gender)
          if (pitch) formData.append('pitch', pitch)
          if (speed) formData.append('speed', speed)

          response = await fetch(config.ttsApiUrl + '/tts_with_prompt', {
            method: 'POST',
            body: formData
          })
        }
      }

      if (response.ok) {
        const result = await response.json()
        setResult(result)
        setResultType('success')
        setShowResult(true)
        onNotification('语音生成成功', 'success')
      } else {
        const error = await response.json()
        throw new Error(error.detail || '生成失败')
      }
    } catch (error) {
      setResult({ error: error.message })
      setResultType('error')
      setShowResult(true)
      onNotification(`生成失败: ${error.message}`, 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  // ===== 工具函数 =====
  
  // 获取角色表情符号
  const getCharacterEmoji = (character) => {
    const name = character.name.toLowerCase()
    const id = character.character_id.toLowerCase()
    
    if (name.includes('richard') || id.includes('richard')) return '👨‍💼'
    if (name.includes('andy') || id.includes('andy')) return '🎬'
    if (name.includes('jack') || id.includes('jack')) return '💼'
    if (name.includes('trump')) return '🇺🇸'
    if (name.includes('nezha')) return '🔥'
    if (character.gender === 'female') return '👩'
    if (character.gender === 'male') return '👨'
    return '🎭'
  }

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化时长
  const formatDuration = (seconds) => {
    if (!seconds) return '未知'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // ===== 配置数据 =====
  
  const parameterOptions = {
    gender: [
      { value: '', label: '自动选择' },
      { value: 'male', label: '男性' },
      { value: 'female', label: '女性' }
    ],
    pitch: [
      { value: '', label: '默认' },
      { value: 'very_low', label: '很低' },
      { value: 'low', label: '低' },
      { value: 'moderate', label: '中等' },
      { value: 'high', label: '高' },
      { value: 'very_high', label: '很高' }
    ],
    speed: [
      { value: '', label: '默认' },
      { value: 'very_low', label: '很慢' },
      { value: 'low', label: '慢' },
      { value: 'moderate', label: '中等' },
      { value: 'high', label: '快' },
      { value: 'very_high', label: '很快' }
    ]
  }

  const resultActions = resultType === 'success' ? [
    {
      label: '📥 下载音频',
      variant: 'primary',
      onClick: () => {
        const link = document.createElement('a')
        link.href = `${config.ttsApiUrl}/download/${result.audio_id}`
        link.download = true
        link.click()
      }
    },
    {
      label: '🔄 重新生成',
      onClick: handleGenerate
    }
  ] : [
    {
      label: '🔄 重试',
      variant: 'primary',
      onClick: handleGenerate
    }
  ]

  return (
    <div className="space-y-6">
      {/* 模式切换 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">选择合成模式</h3>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
          <button
            onClick={() => switchMode('character')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              currentMode === 'character'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            🎭 预设角色
          </button>
          <button
            onClick={() => switchMode('custom')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              currentMode === 'custom'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            🎤 自定义录音
          </button>
        </div>
      </div>

      {/* 角色选择模式 */}
      {currentMode === 'character' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">选择预设语音角色</h3>
          
          {charactersLoading && (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
              <div className="text-gray-600">正在加载语音角色...</div>
            </div>
          )}

          {charactersError && (
            <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg border border-red-200">
              <div className="mb-3">❌ {charactersError}</div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={loadVoiceCharacters}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  🔄 重新加载
                </button>
                <button
                  onClick={() => switchMode('custom')}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  🎤 使用自定义录音
                </button>
              </div>
            </div>
          )}

          {!charactersLoading && !charactersError && voiceCharacters.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {voiceCharacters.map(character => (
                <div
                  key={character.character_id}
                  onClick={() => selectCharacter(character.character_id)}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 text-center ${
                    selectedCharacter === character.character_id
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 hover:border-primary-500 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-3">
                    {getCharacterEmoji(character)}
                  </div>
                  <div className="font-medium text-gray-900 mb-1">{character.name}</div>
                  <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {character.description || 
                     (character.prompt_text?.length > 50 
                       ? character.prompt_text.substring(0, 50) + '...'
                       : character.prompt_text) || 
                     '高质量语音角色'}
                  </div>
                  <div className="flex justify-center gap-1 text-xs">
                    {character.gender && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {character.gender === 'male' ? '男性' : '女性'}
                      </span>
                    )}
                    <span className="bg-gray-100 px-2 py-0.5 rounded">
                      ID: {character.character_id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 自定义录音模式 */}
      {currentMode === 'custom' && (
        <div className="space-y-6">
          {/* 用户名输入 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4">用户信息</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名，用于保存和管理您的录音"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
              />
              <div className="text-xs text-gray-500 mt-1">
                只能包含字母、数字和下划线，长度1-50字符
              </div>
            </div>
          </div>

          {/* 历史记录管理 */}
          {username && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">录音知识库</h3>
                <div className="flex gap-2">
                  <button
                    onClick={loadCustomVoices}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                  >
                    🔄 刷新
                  </button>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded text-sm hover:bg-primary-200 transition-colors"
                  >
                    {showHistory ? '📁 收起历史' : '📂 查看历史'}
                  </button>
                </div>
              </div>

              {isLoadingHistory && (
                <div className="text-center py-4">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
                  <div className="text-gray-600 text-sm">加载中...</div>
                </div>
              )}

              {historyError && (
                <div className="text-center py-4 text-red-600 bg-red-50 rounded-lg border border-red-200">
                  ❌ {historyError}
                </div>
              )}

              {showHistory && !isLoadingHistory && (
                <div className="space-y-3">
                  {customVoices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📭</div>
                      <div>暂无保存的录音</div>
                      <div className="text-sm">保存您的第一个录音开始使用知识库</div>
                    </div>
                  ) : (
                    customVoices.map(voice => (
                      <div
                        key={voice.voice_id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedCustomVoice === voice.voice_id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                        onClick={() => selectCustomVoice(voice)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">🎵</span>
                              <span className="font-medium text-gray-900">{voice.voice_name}</span>
                              {selectedCustomVoice === voice.voice_id && (
                                <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded">已选择</span>
                              )}
                            </div>
                            {voice.description && (
                              <div className="text-sm text-gray-600 mb-2">{voice.description}</div>
                            )}
                            <div className="text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded">
                              "{voice.text}"
                            </div>
                            <div className="flex gap-4 text-xs text-gray-500">
                              <span>📅 {new Date(voice.created_time).toLocaleString()}</span>
                              <span>💾 {formatFileSize(voice.file_size)}</span>
                              {voice.duration && <span>⏱️ {formatDuration(voice.duration)}</span>}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteCustomVoice(voice.voice_id, voice.voice_name)
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="删除录音"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* 录音上传和保存 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4">上传新录音</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    录音名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    placeholder="为这个录音起一个名字"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    描述信息
                  </label>
                  <input
                    type="text"
                    value={voiceDescription}
                    onChange={(e) => setVoiceDescription(e.target.value)}
                    placeholder="简单描述这个录音的特点"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  提示文本 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="用于声音克隆的参考文本"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  提示音频 <span className="text-red-500">*</span>
                </label>
                <FileUpload
                  accept="audio/*"
                  icon="🎵"
                  title="拖拽音频文件到这里，或点击选择"
                  hint="支持 MP3、WAV、M4A 等格式，用于声音克隆"
                  onChange={setPromptAudio}
                />
              </div>

              {/* 保存按钮 */}
              {username && voiceName && promptText && promptAudio.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={saveCustomVoice}
                    disabled={isSaving}
                    className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        正在保存...
                      </span>
                    ) : (
                      '💾 保存到知识库'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 生成提示 */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-lg">💡</span>
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">使用说明：</div>
                <ul className="space-y-1 text-blue-700">
                  <li>• 可以直接使用上传的音频临时生成语音</li>
                  <li>• 也可以选择已保存的历史录音进行语音生成</li>
                  <li>• 保存到知识库后，下次可以直接选择使用</li>
                  <li>• 建议录音时长在3-30秒之间，音质清晰</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 文本内容 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">文本内容</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            要合成的文本
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="请输入要转换为语音的文本内容..."
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10 resize-vertical"
          />
        </div>
      </div>

      {/* 语音参数 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">语音参数</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">性别</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
            >
              {parameterOptions.gender.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">音调</label>
            <select
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
            >
              {parameterOptions.pitch.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">语速</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
            >
              {parameterOptions.speed.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 生成按钮 */}
      <div className="text-center">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !textContent.trim()}
          className="px-8 py-3 bg-primary-500 text-white rounded-lg text-base font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          🎵 生成语音
        </button>
        
        {/* 生成状态提示 */}
        {currentMode === 'custom' && (
          <div className="mt-2 text-sm text-gray-600">
            {selectedCustomVoice ? (
              <span className="text-green-600">将使用已选择的历史录音生成</span>
            ) : promptAudio.length > 0 ? (
              <span className="text-blue-600">将使用上传的音频临时生成</span>
            ) : (
              <span className="text-orange-600">请上传音频或选择历史录音</span>
            )}
          </div>
        )}
      </div>

      {/* 进度条 */}
      <ProgressBar
        isVisible={isGenerating}
        progress={0.5}
        title="正在生成语音..."
      />

      {/* 结果展示 */}
      <ResultPanel
        isVisible={showResult}
        type={resultType}
        title={resultType === 'success' ? '语音生成成功' : '生成失败'}
        actions={resultActions}
      >
        {resultType === 'success' ? (
          <div>
            <p><strong>音频ID:</strong> {result?.audio_id}</p>
            {currentMode === 'character' && (
              <p><strong>使用角色:</strong> {result?.character_used || '预设角色'}</p>
            )}
            {currentMode === 'custom' && (
              <p><strong>模式:</strong> {selectedCustomVoice ? '历史录音' : '临时录音'}</p>
            )}
            {result?.character_used && result.character_used.includes(':') && (
              <p><strong>使用录音:</strong> {result.character_used.split(':')[1]}</p>
            )}
            <p><strong>生成时间:</strong> {result?.timestamp ? new Date(result.timestamp).toLocaleString() : '刚刚'}</p>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-medium">🎵 在线播放:</span>
              </div>
              <audio 
                controls 
                className="w-full max-w-md"
                src={`${config.ttsApiUrl}/download/${result?.audio_id}`}
              >
                您的浏览器不支持音频播放
              </audio>
            </div>
          </div>
        ) : (
          <p className="text-red-700">错误信息: {result?.error}</p>
        )}
      </ResultPanel>
    </div>
  )
}

export default VoiceSynthesisPanel

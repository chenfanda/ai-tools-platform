// ===== src/components/voice/MultiCharacterDubbingPanel.jsx =====
import React, { useState, useEffect } from 'react'
import FileUpload from '@/components/shared/FileUpload'
import ProgressBar from '@/components/shared/ProgressBar'
import ResultPanel from '@/components/shared/ResultPanel'
import JSZip from 'jszip'

const MultiCharacterDubbingPanel = ({ config, onNotification }) => {
  // ===== 复用TTS的角色管理状态 =====
  const [currentMode, setCurrentMode] = useState('character') // 'character' | 'custom'
  const [voiceCharacters, setVoiceCharacters] = useState([])
  const [defaultCharacter, setDefaultCharacter] = useState(null) // 改名：默认角色
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [charactersError, setCharactersError] = useState(null)

  // ===== 复用TTS的用户自定义录音状态 =====
  const [username, setUsername] = useState('')
  const [customVoices, setCustomVoices] = useState([])
  const [defaultCustomVoice, setDefaultCustomVoice] = useState(null) // 改名：默认录音
  const [showHistory, setShowHistory] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  // ===== 时间轴对话相关状态 =====
  const [inputMode, setInputMode] = useState('manual') // 'manual' | 'file'
  const [dialogueLines, setDialogueLines] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [resultType, setResultType] = useState('success')

  // ===== 批量下载相关状态 =====
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // ===== 文件上传相关状态 =====
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [parsedDialogues, setParsedDialogues] = useState([])
  const [showFilePreview, setShowFilePreview] = useState(false)

  // ===== 从localStorage加载用户名 =====
  useEffect(() => {
    const savedUsername = localStorage.getItem('tts_username')
    if (savedUsername) {
      setUsername(savedUsername)
    }
  }, [])

  // ===== 当用户名改变时保存到localStorage =====
  useEffect(() => {
    if (username) {
      localStorage.setItem('tts_username', username)
    }
  }, [username])

  // ===== 当用户名改变或切换到自定义模式时加载历史记录 =====
  useEffect(() => {
    if (currentMode === 'custom' && username) {
      loadCustomVoices()
    }
  }, [username, currentMode])

  // ===== 复用TTS的角色管理函数 =====
  
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
    setDefaultCustomVoice(null)
    setDefaultCharacter(null)
    
    if (mode === 'character' && voiceCharacters.length === 0) {
      loadVoiceCharacters()
    }
  }

  // 选择默认角色（预设模式）
  const selectDefaultCharacter = (characterId) => {
    setDefaultCharacter(characterId)
    const character = voiceCharacters.find(c => c.character_id === characterId)
    if (character) {
      onNotification(`已设置默认角色: ${character.name}`, 'success')
    }
  }

  // 选择默认录音（自定义模式）
  const selectDefaultCustomVoice = (voice) => {
    setDefaultCustomVoice(voice.voice_id)
    onNotification(`已设置默认录音: ${voice.voice_name}`, 'success')
  }

  // ===== 时间轴对话管理函数 =====
  
  // 添加对话行（优化：自动使用默认声音）
  const addDialogueLine = () => {
    let defaultVoiceId = ''
    
    if (currentMode === 'character' && defaultCharacter) {
      defaultVoiceId = defaultCharacter
    } else if (currentMode === 'custom' && defaultCustomVoice) {
      defaultVoiceId = `${username}:${defaultCustomVoice}`
    }

    const newLine = {
      id: Date.now(),
      start: "00:00:00",
      end: "00:00:03",
      role: "",
      text: "",
      voice_id: defaultVoiceId,
      speed: 1.0,
      useDefault: true // 新增：标记是否使用默认声音
    }
    setDialogueLines([...dialogueLines, newLine])
  }

  // 更新对话行
  const updateDialogueLine = (id, field, value) => {
    setDialogueLines(prev => prev.map(line => {
      if (line.id === id) {
        const updatedLine = { ...line, [field]: value }
        // 如果修改了voice_id，标记为非默认
        if (field === 'voice_id') {
          updatedLine.useDefault = false
        }
        return updatedLine
      }
      return line
    }))
  }

  // 删除对话行
  const removeDialogueLine = (id) => {
    setDialogueLines(prev => prev.filter(line => line.id !== id))
  }

  // 应用默认声音到所有行
  const applyDefaultVoiceToAll = () => {
    if (!defaultCharacter && !defaultCustomVoice) {
      onNotification('请先设置默认声音', 'error')
      return
    }

    let defaultVoiceId = ''
    if (currentMode === 'character' && defaultCharacter) {
      defaultVoiceId = defaultCharacter
    } else if (currentMode === 'custom' && defaultCustomVoice) {
      defaultVoiceId = `${username}:${defaultCustomVoice}`
    }

    setDialogueLines(prev => prev.map(line => ({
      ...line,
      voice_id: defaultVoiceId,
      useDefault: true
    })))

    onNotification(`已将默认声音应用到所有 ${dialogueLines.length} 行对话`, 'success')
  }

  // 智能匹配角色名（仅自定义模式）
  const smartMatchVoices = () => {
    if (currentMode !== 'custom' || customVoices.length === 0) {
      onNotification('智能匹配仅在自定义录音模式下可用', 'error')
      return
    }

    let matchCount = 0
    setDialogueLines(prev => prev.map(line => {
      if (!line.role.trim()) return line

      // 简单的匹配逻辑：角色名包含录音名称
      const matchedVoice = customVoices.find(voice => 
        voice.voice_name.toLowerCase().includes(line.role.toLowerCase()) ||
        line.role.toLowerCase().includes(voice.voice_name.toLowerCase())
      )

      if (matchedVoice) {
        matchCount++
        return {
          ...line,
          voice_id: `${username}:${matchedVoice.voice_id}`,
          useDefault: false
        }
      }
      return line
    }))

    onNotification(`智能匹配完成，成功匹配 ${matchCount} 个角色`, matchCount > 0 ? 'success' : 'info')
  }

  // 解析时间格式
  const parseTimeToSeconds = (timeStr) => {
    const parts = timeStr.split(':')
    const hours = parseInt(parts[0] || 0)
    const minutes = parseInt(parts[1] || 0)
    const seconds = parseInt(parts[2] || 0)
    return hours * 3600 + minutes * 60 + seconds
  }

  // ===== 文件上传和解析函数 =====
  
  // 解析CSV格式
  const parseCSV = (content) => {
    const lines = content.trim().split('\n')
    const header = lines[0].toLowerCase()
    
    // 简单的CSV解析
    if (!header.includes('start') || !header.includes('end') || !header.includes('role') || !header.includes('text')) {
      throw new Error('CSV文件必须包含 start, end, role, text 列')
    }
    
    const dialogues = []
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      if (parts.length >= 4) {
        dialogues.push({
          id: Date.now() + i,
          start: parts[0].trim(),
          end: parts[1].trim(),
          role: parts[2].trim(),
          text: parts[3].trim(),
          voice_id: '',
          speed: 1.0,
          useDefault: true
        })
      }
    }
    return dialogues
  }

  // 解析JSON格式
  const parseJSON = (content) => {
    const data = JSON.parse(content)
    if (data.dialogue_lines && Array.isArray(data.dialogue_lines)) {
      return data.dialogue_lines.map((line, index) => ({
        id: Date.now() + index,
        start: line.start || "00:00:00",
        end: line.end || "00:00:03",
        role: line.role || "",
        text: line.text || "",
        voice_id: line.voice_id || '',
        speed: line.speed || 1.0,
        useDefault: !line.voice_id
      }))
    } else if (Array.isArray(data)) {
      return data.map((line, index) => ({
        id: Date.now() + index,
        start: line.start || "00:00:00",
        end: line.end || "00:00:03",
        role: line.role || "",
        text: line.text || "",
        voice_id: line.voice_id || '',
        speed: line.speed || 1.0,
        useDefault: !line.voice_id
      }))
    }
    throw new Error('JSON格式不正确')
  }

  // 解析简单文本格式
  const parseText = (content) => {
    const lines = content.trim().split('\n')
    const dialogues = []
    
    lines.forEach((line, index) => {
      // 格式: [时间范围] 角色: 对话内容
      const match = line.match(/\[(\d{2}:\d{2}:\d{2})-(\d{2}:\d{2}:\d{2})\]\s*([^:]+):\s*(.+)/)
      if (match) {
        dialogues.push({
          id: Date.now() + index,
          start: match[1],
          end: match[2],
          role: match[3].trim(),
          text: match[4].trim(),
          voice_id: '',
          speed: 1.0,
          useDefault: true
        })
      }
    })
    return dialogues
  }

  // 处理文件上传
  const handleFileUpload = async (files) => {
    if (files.length === 0) return
    
    const file = files[0]
    const content = await file.text()
    
    try {
      let parsedData = []
      
      if (file.name.endsWith('.csv')) {
        parsedData = parseCSV(content)
      } else if (file.name.endsWith('.json')) {
        parsedData = parseJSON(content)
      } else if (file.name.endsWith('.txt')) {
        parsedData = parseText(content)
      } else {
        throw new Error('不支持的文件格式，请上传 CSV、JSON 或 TXT 文件')
      }
      
      if (parsedData.length === 0) {
        throw new Error('文件中没有找到有效的对话数据')
      }
      
      setParsedDialogues(parsedData)
      setShowFilePreview(true)
      onNotification(`成功解析 ${parsedData.length} 条对话`, 'success')
      
    } catch (error) {
      onNotification(`文件解析失败: ${error.message}`, 'error')
    }
  }

  // 应用解析的对话
  const applyParsedDialogues = () => {
    setDialogueLines(parsedDialogues)
    setShowFilePreview(false)
    setInputMode('manual') // 切换到手动编辑模式进行后续编辑
  }

  // ===== 语音生成函数 =====
  
  // 批量下载所有音频文件为ZIP
  const downloadAllAsZip = async () => {
    if (!result?.audio_files || result.audio_files.length === 0) {
      onNotification('没有可下载的音频文件', 'error')
      return
    }

    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      const zip = new JSZip()
      const audioFiles = result.audio_files
      
      onNotification('开始打包音频文件...', 'info')

      // 逐个下载并添加到ZIP
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i]
        
        try {
          // 构建下载URL
          const audioUrl = `${config.ttsApiUrl}/download/${file.audio_path.split('/').pop().split('.')[0]}`
          
          // 获取音频文件
          const response = await fetch(audioUrl)
          if (!response.ok) {
            throw new Error(`下载失败: ${response.status}`)
          }
          
          const blob = await response.blob()
          
          // 生成文件名：角色名_开始时间-结束时间.mp3
          const fileName = `${file.role}_${file.start_time}s-${file.end_time}s.mp3`
          
          // 添加到ZIP
          zip.file(fileName, blob)
          
          // 更新进度
          const progress = Math.round(((i + 1) / audioFiles.length) * 80) // 80%用于下载文件
          setDownloadProgress(progress)
          
        } catch (error) {
          console.error(`下载文件失败 ${file.role}:`, error)
          onNotification(`下载 ${file.role} 音频失败: ${error.message}`, 'error')
        }
      }

      // 生成ZIP文件
      onNotification('正在生成ZIP文件...', 'info')
      setDownloadProgress(90)
      
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      })

      // 创建下载链接
      const url = window.URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      
      // 生成ZIP文件名：多角色对话_日期时间.zip
      const now = new Date()
      const timestamp = now.getFullYear() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0') + '_' +
                       now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0')
      
      link.download = `多角色对话_${timestamp}.zip`
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 清理URL对象
      window.URL.revokeObjectURL(url)
      
      setDownloadProgress(100)
      onNotification(`成功打包下载 ${audioFiles.length} 个音频文件`, 'success')
      
    } catch (error) {
      console.error('批量下载失败:', error)
      onNotification(`批量下载失败: ${error.message}`, 'error')
    } finally {
      setIsDownloading(false)
      // 延迟重置进度条
      setTimeout(() => setDownloadProgress(0), 2000)
    }
  }
  
  // 生成时间轴对话
  const handleGenerate = async () => {
    if (dialogueLines.length === 0) {
      onNotification('请添加至少一行对话', 'error')
      return
    }

    // 验证每一行对话
    for (const line of dialogueLines) {
      if (!line.role.trim()) {
        onNotification('请为所有对话行设置角色名称', 'error')
        return
      }
      if (!line.text.trim()) {
        onNotification('请为所有对话行输入对话内容', 'error')
        return
      }
      if (!line.voice_id.trim()) {
        onNotification('请为所有对话行选择声音', 'error')
        return
      }
    }

    setIsGenerating(true)
    setShowResult(false)

    try {
      // 准备API请求数据
      const requestData = {
        dialogue_lines: dialogueLines.map(line => ({
          start: line.start,
          end: line.end,
          role: line.role,
          text: line.text,
          voice_id: line.voice_id,
          speed: line.speed
        }))
      }

      const response = await fetch(config.ttsApiUrl + '/tts_timeline_dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const result = await response.json()
        setResult(result)
        setResultType('success')
        setShowResult(true)
        onNotification('多角色对话生成成功', 'success')
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

  // ===== 复用TTS的工具函数 =====
  
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

  // 获取声音显示名称
  const getVoiceDisplayName = (voiceId, isDefault) => {
    if (!voiceId) return '未设置'
    
    if (isDefault) {
      if (currentMode === 'character') {
        const char = voiceCharacters.find(c => c.character_id === voiceId)
        return `默认角色: ${char?.name || voiceId}`
      } else {
        const voice = customVoices.find(v => voiceId.includes(v.voice_id))
        return `默认录音: ${voice?.voice_name || voiceId}`
      }
    }
    
    if (currentMode === 'character') {
      const char = voiceCharacters.find(c => c.character_id === voiceId)
      return char?.name || voiceId
    } else {
      const voice = customVoices.find(v => voiceId.includes(v.voice_id))
      return voice?.voice_name || voiceId
    }
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

  // 时间轴播放控制
  const playTimelineAudio = (audioFiles) => {
    audioFiles.forEach(file => {
      const startTime = parseFloat(file.start_time) * 1000
      setTimeout(() => {
        const audio = new Audio(`${config.ttsApiUrl}/download/${file.audio_path.split('/').pop().split('.')[0]}`)
        audio.play().catch(e => console.log('播放失败:', e))
      }, startTime)
    })
  }

  const resultActions = resultType === 'success' ? [
    {
      label: '🎵 按时间轴播放',
      variant: 'primary',
      onClick: () => playTimelineAudio(result.audio_files)
    },
    {
      label: '📦 打包下载',
      onClick: downloadAllAsZip,
      disabled: isDownloading
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
      {/* 模式选择 - 复用TTS的UI */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">选择声音模式</h3>
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

      {/* 预设角色模式 - 优化为默认角色设置 */}
      {currentMode === 'character' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">设置默认语音角色</h3>
            {defaultCharacter && (
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm">
                ✅ 已设置默认角色
              </div>
            )}
          </div>
          
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
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {voiceCharacters.map(character => (
                  <div
                    key={character.character_id}
                    onClick={() => selectDefaultCharacter(character.character_id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 text-center ${
                      defaultCharacter === character.character_id
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

              {/* 批量操作按钮 - 预设角色模式简化 */}
              {defaultCharacter && dialogueLines.length > 0 && (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={applyDefaultVoiceToAll}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                  >
                    🎯 应用到所有对话行
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 自定义录音模式 - 保持灵活性 */}
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
                placeholder="请输入用户名，用于管理您的录音"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-500/10"
              />
            </div>
          </div>

          {/* 历史记录管理 */}
          {username && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">设置默认录音</h3>
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
                    {showHistory ? '📁 收起录音库' : '📂 查看录音库'}
                  </button>
                  {defaultCustomVoice && (
                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
                      ✅ 已设置默认
                    </div>
                  )}
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
                      <div className="text-sm">请先在语音合成模块中保存录音</div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {customVoices.map(voice => (
                          <div
                            key={voice.voice_id}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                              defaultCustomVoice === voice.voice_id
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-primary-300'
                            }`}
                            onClick={() => selectDefaultCustomVoice(voice)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">🎵</span>
                                  <span className="font-medium text-gray-900">{voice.voice_name}</span>
                                  {defaultCustomVoice === voice.voice_id && (
                                    <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded">默认</span>
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
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 批量操作按钮 - 自定义录音模式保持灵活 */}
                      {defaultCustomVoice && dialogueLines.length > 0 && (
                        <div className="flex gap-2 justify-center bg-gray-50 p-3 rounded-lg">
                          <button
                            onClick={applyDefaultVoiceToAll}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                          >
                            🎯 应用默认录音到所有行
                          </button>
                          <button
                            onClick={smartMatchVoices}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors"
                          >
                            🧠 智能匹配角色名
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 对话输入方式选择 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4">对话输入方式</h3>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5 mb-4">
          <button
            onClick={() => setInputMode('manual')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              inputMode === 'manual'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            📝 手动编辑
          </button>
          <button
            onClick={() => setInputMode('file')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              inputMode === 'file'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            📄 文件上传
          </button>
        </div>

        {/* 手动编辑模式 - 优化后的UI */}
        {inputMode === 'manual' && (
          <div className="space-y-4">
            {/* 对话行列表 */}
            {dialogueLines.length > 0 && (
              <div className="space-y-3">
                {dialogueLines.map((line, index) => (
                  <div key={line.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {/* 角色名 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">角色名称</label>
                        <input
                          type="text"
                          value={line.role}
                          onChange={(e) => updateDialogueLine(line.id, 'role', e.target.value)}
                          placeholder="如：小明、旁白"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      {/* 声音选择 - 优化后的UI */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          使用声音
                          {line.useDefault && (
                            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded">默认</span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          {/* 预设角色模式：简化选择 */}
                          {currentMode === 'character' && (
                            <>
                              {line.useDefault && defaultCharacter ? (
                                <div className="flex-1 px-2 py-1.5 bg-green-50 border border-green-300 rounded text-sm text-green-700">
                                  {getVoiceDisplayName(line.voice_id, true)}
                                </div>
                              ) : (
                                <select
                                  value={line.voice_id}
                                  onChange={(e) => updateDialogueLine(line.id, 'voice_id', e.target.value)}
                                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary-500"
                                >
                                  <option value="">请选择角色</option>
                                  {voiceCharacters.map(char => (
                                    <option key={char.character_id} value={char.character_id}>
                                      {char.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {!line.useDefault && (
                                <button
                                  onClick={() => updateDialogueLine(line.id, 'voice_id', defaultCharacter)}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                                  title="恢复默认"
                                >
                                  🔄
                                </button>
                              )}
                            </>
                          )}

                          {/* 自定义录音模式：保持灵活 */}
                          {currentMode === 'custom' && (
                            <>
                              <select
                                value={line.voice_id}
                                onChange={(e) => updateDialogueLine(line.id, 'voice_id', e.target.value)}
                                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary-500"
                              >
                                <option value="">请选择录音</option>
                                {defaultCustomVoice && (
                                  <option value={`${username}:${defaultCustomVoice}`}>
                                    {getVoiceDisplayName(`${username}:${defaultCustomVoice}`, true)}
                                  </option>
                                )}
                                {customVoices.filter(voice => voice.voice_id !== defaultCustomVoice).map(voice => (
                                  <option key={voice.voice_id} value={`${username}:${voice.voice_id}`}>
                                    {voice.voice_name}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                      {/* 开始时间 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">开始时间</label>
                        <input
                          type="text"
                          value={line.start}
                          onChange={(e) => updateDialogueLine(line.id, 'start', e.target.value)}
                          placeholder="00:00:00"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      {/* 结束时间 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">结束时间</label>
                        <input
                          type="text"
                          value={line.end}
                          onChange={(e) => updateDialogueLine(line.id, 'end', e.target.value)}
                          placeholder="00:00:03"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      {/* 语速 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">语速</label>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={line.speed}
                          onChange={(e) => updateDialogueLine(line.id, 'speed', parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-500 text-center">{line.speed}x</div>
                      </div>
                    </div>

                    {/* 对话内容 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">对话内容</label>
                      <textarea
                        value={line.text}
                        onChange={(e) => updateDialogueLine(line.id, 'text', e.target.value)}
                        placeholder="输入这个角色要说的话..."
                        rows={2}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-primary-500 resize-vertical"
                      />
                    </div>

                    {/* 删除按钮和状态显示 */}
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        对话行 {index + 1} 
                        {line.voice_id && (
                          <span className="ml-2 text-blue-600">
                            • {getVoiceDisplayName(line.voice_id, line.useDefault)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeDialogueLine(line.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm transition-colors"
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 添加对话行按钮 */}
            <button
              onClick={addDialogueLine}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
            >
              ➕ 添加对话行
              {(defaultCharacter || defaultCustomVoice) && (
                <span className="ml-2 text-sm text-green-600">
                  (将使用默认声音)
                </span>
              )}
            </button>

            {dialogueLines.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <div>还没有对话内容</div>
                <div className="text-sm">
                  {(defaultCharacter || defaultCustomVoice) 
                    ? '点击上方按钮开始添加对话，将自动使用已设置的默认声音' 
                    : '请先设置默认声音，然后添加对话'
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* 文件上传模式 */}
        {inputMode === 'file' && (
          <div className="space-y-4">
            <FileUpload
              accept=".csv,.json,.txt"
              icon="📄"
              title="拖拽对话文件到这里，或点击选择"
              hint="支持 CSV、JSON、TXT 格式的对话文件"
              onChange={handleFileUpload}
            />

            {/* 格式说明 */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">📋 支持的文件格式：</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div>
                  <strong>CSV格式：</strong>
                  <pre className="mt-1 bg-blue-100 p-2 rounded text-xs overflow-x-auto">
start,end,role,text{'\n'}00:00:00,00:00:03,小明,你好今天天气真不错{'\n'}00:00:04,00:00:08,小红,是啊我们去公园走走吧
                  </pre>
                </div>
                <div>
                  <strong>JSON格式：</strong>
                  <pre className="mt-1 bg-blue-100 p-2 rounded text-xs overflow-x-auto">
{`{"dialogue_lines":[{"start":"00:00:00","end":"00:00:03","role":"小明","text":"你好","voice_id":"","speed":1.0}]}`}
                  </pre>
                </div>
                <div>
                  <strong>TXT格式：</strong>
                  <pre className="mt-1 bg-blue-100 p-2 rounded text-xs overflow-x-auto">
[00:00:00-00:00:03] 小明: 你好，今天天气真不错！{'\n'}[00:00:04-00:00:08] 小红: 是啊，我们去公园走走吧！
                  </pre>
                </div>
              </div>
            </div>

            {/* 文件解析预览 */}
            {showFilePreview && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">📋 解析结果预览 ({parsedDialogues.length} 条对话)</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={applyParsedDialogues}
                      className="px-3 py-1.5 bg-primary-500 text-white rounded text-sm hover:bg-primary-600"
                    >
                      ✅ 应用数据
                    </button>
                    <button
                      onClick={() => setShowFilePreview(false)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      ❌ 取消
                    </button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {parsedDialogues.map((line, index) => (
                    <div key={index} className="flex gap-2 text-sm p-2 bg-gray-50 rounded">
                      <span className="font-medium text-blue-600 min-w-12">{line.role}</span>
                      <span className="text-gray-500 min-w-20">{line.start}-{line.end}</span>
                      <span className="flex-1 text-gray-800">{line.text}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-orange-600">
                  ⚠️ 注意：应用数据后还需要为每个角色分配对应的声音
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 生成按钮 */}
      <div className="text-center">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || dialogueLines.length === 0}
          className="px-8 py-3 bg-primary-500 text-white rounded-lg text-base font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              正在生成多角色对话...
            </span>
          ) : (
            '🎭 生成多角色对话'
          )}
        </button>
        
        {dialogueLines.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            将生成 {dialogueLines.length} 个音频文件
          </div>
        )}
      </div>

      {/* 进度条 */}
      <ProgressBar
        isVisible={isGenerating}
        progress={0.7}
        title="正在生成多角色对话音频..."
      />

      {/* 批量下载进度条 */}
      <ProgressBar
        isVisible={isDownloading}
        progress={downloadProgress / 100}
        title={`正在打包下载音频文件... ${downloadProgress}%`}
      />

      {/* 结果展示 */}
      <ResultPanel
        isVisible={showResult}
        type={resultType}
        title={resultType === 'success' ? '多角色对话生成成功' : '生成失败'}
        actions={resultActions}
      >
        {resultType === 'success' ? (
          <div>
            <div className="mb-4">
              <p><strong>生成结果:</strong> 成功生成 {result?.audio_files?.length || 0} 个音频文件</p>
              <p><strong>生成时间:</strong> {result?.timestamp ? new Date(result.timestamp).toLocaleString() : '刚刚'}</p>
            </div>
            
            {/* 音频文件列表 */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">🎵 生成的音频文件：</h4>
              {result?.audio_files?.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {file.role} ({file.start_time}s - {file.end_time}s)
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-1">
                      "{file.text}"
                    </div>
                    <div className="text-xs text-gray-500">
                      声音: {file.voice_id}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={() => {
                        const audio = new Audio(`${config.ttsApiUrl}/download/${file.audio_path.split('/').pop().split('.')[0]}`)
                        audio.play().catch(e => console.log('播放失败:', e))
                      }}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                    >
                      ▶️ 播放
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = `${config.ttsApiUrl}/download/${file.audio_path.split('/').pop().split('.')[0]}`
                        link.download = true
                        link.click()
                      }}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                    >
                      📥 下载
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 使用说明 */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <span className="text-blue-500">💡</span>
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">使用说明：</div>
                  <ul className="space-y-1 text-blue-700">
                    <li>• 点击"按时间轴播放"可以按照时间顺序自动播放所有音频</li>
                    <li>• 每个音频文件都可以单独播放和下载</li>
                    <li>• 您可以将这些音频文件导入到视频编辑软件中制作完整视频</li>
                  </ul>
                </div>
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

export default MultiCharacterDubbingPanel
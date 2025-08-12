// ===== src/services/api/mediaAPI.js =====
class MediaAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl
  }

  // 统一请求处理
  async request(endpoint, formData) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API请求失败:', error)
      throw error
    }
  }

  // 视频提取音频
  async extractAudio(videoFile, audioFormat = 'mp3', bitrate = '192k') {
    const formData = new FormData()
    formData.append('video', videoFile)
    formData.append('audio_format', audioFormat)
    formData.append('bitrate', bitrate)
    
    return this.request('/api/video/extract-audio', formData)
  }

  // 音频分离
  async separateAudio(audioFile, model = 'htdemucs_ft') {
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('model', model)
    
    return this.request('/api/audio/separate', formData)
  }

  // 视频配音
  async addAudioToVideo(videoFile, audioFile, audioVolume = 1.0, replaceAudio = true) {
    const formData = new FormData()
    formData.append('video', videoFile)
    formData.append('audio', audioFile)
    formData.append('audio_volume', audioVolume.toString())
    formData.append('replace_audio', replaceAudio.toString())
    
    return this.request('/api/video/add-audio', formData)
  }

  // 添加字幕
  async addSubtitles(videoFile, subtitleData, fontSize = 50, fontColor = 'white', position = 'bottom') {
    const formData = new FormData()
    formData.append('video', videoFile)
    
    if (typeof subtitleData === 'string') {
      formData.append('subtitle_text', subtitleData)
    } else {
      formData.append('subtitles', subtitleData)
    }
    
    formData.append('font_size', fontSize.toString())
    formData.append('font_color', fontColor)
    formData.append('position', position)
    
    return this.request('/api/video/add-subtitles', formData)
  }

  // 视频剪辑
  async trimVideo(videoFile, startTime, endTime) {
    const formData = new FormData()
    formData.append('video', videoFile)
    formData.append('start_time', startTime.toString())
    formData.append('end_time', endTime.toString())
    
    return this.request('/api/video/trim', formData)
  }

  // 音频剪辑
  async trimAudio(audioFile, startTime, endTime) {
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('start_time', startTime.toString())
    formData.append('end_time', endTime.toString())
    
    return this.request('/api/audio/trim', formData)
  }

  // 视频合并
  async mergeVideos(videoFiles, transitionDuration = 0.0) {
    const formData = new FormData()
    videoFiles.forEach(file => {
      formData.append('videos', file)
    })
    formData.append('transition_duration', transitionDuration.toString())
    
    return this.request('/api/video/merge', formData)
  }

  // 音频合并
  async mergeAudios(audioFiles, crossfadeDuration = 0.0) {
    const formData = new FormData()
    audioFiles.forEach(file => {
      formData.append('audios', file)
    })
    formData.append('crossfade_duration', crossfadeDuration.toString())
    
    return this.request('/api/audio/merge', formData)
  }

  // 去除字幕
  async removeSubtitles(videoFile, cropRatio = 0.85) {
    const formData = new FormData()
    formData.append('video', videoFile)
    formData.append('crop_ratio', cropRatio.toString())
    
    return this.request('/api/video/remove-subtitles', formData)
  }

  // 音频字幕对齐
  async generateTTSSubtitles(audioFile, text, sampleRate = 16000) {
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('text', text)
    formData.append('sample_rate', sampleRate.toString())
    
    return this.request('/api/subtitle/generate-tts', formData)
  }
}

// 导出单例
export default MediaAPI

// ===== src/components/media/AudioTextAligner.jsx =====
import React, { useState } from 'react'
import MediaProcessorBase from './MediaProcessorBase'
import MediaAPI from '@/services/api/mediaAPI'

const AudioTextAligner = ({ config, onNotification }) => {
  const [text, setText] = useState('')
  const [sampleRate, setSampleRate] = useState(16000)

  const handleGenerateAlignment = async (files) => {
    if (!text.trim()) {
      throw new Error('请输入对应的文本内容')
    }
    
    const mediaAPI = new MediaAPI(config.mediaApiUrl)
    const result = await mediaAPI.generateTTSSubtitles(files[0], text.trim(), sampleRate)
    
    if (!result.success) {
      throw new Error(result.error || '对齐失败')
    }
    
    return {
      download_url: `${config.mediaApiUrl}${result.download_url}`,
      filename: result.output_file,
      subtitles: result.subtitles,
      message: `生成了 ${result.subtitles?.length || 0} 条字幕`
    }
  }

  return (
    <MediaProcessorBase
      title="音频字幕对齐"
      description="为音频文件生成精确的时间戳字幕"
      icon="⏱️"
      acceptedFiles="audio/*"
      onProcess={handleGenerateAlignment}
      config={config}
      onNotification={onNotification}
    >
      <div className="space-y-4">
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          请提供与音频内容对应的完整文本，系统将自动生成时间戳
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">对应文本内容</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入与音频内容完全对应的文本..."
            rows={6}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            文本内容需要与音频内容完全匹配，以获得最佳对齐效果
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">采样率</label>
          <select
            value={sampleRate}
            onChange={(e) => setSampleRate(parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={16000}>16000 Hz (推荐)</option>
            <option value={22050}>22050 Hz</option>
            <option value={44100}>44100 Hz</option>
          </select>
        </div>
      </div>
    </MediaProcessorBase>
  )
}

export default AudioTextAligner

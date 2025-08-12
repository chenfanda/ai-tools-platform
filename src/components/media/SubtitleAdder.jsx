// ===== src/components/media/SubtitleAdder.jsx =====
import React, { useState } from 'react'
import MediaProcessorBase from './MediaProcessorBase'
import MediaAPI from '@/services/api/mediaAPI'

const SubtitleAdder = ({ config, onNotification }) => {
  const [subtitleText, setSubtitleText] = useState('')
  const [fontSize, setFontSize] = useState(50)
  const [fontColor, setFontColor] = useState('white')
  const [position, setPosition] = useState('bottom')

  const handleAddSubtitles = async (files) => {
    let subtitleData = subtitleText.trim()
    
    // 检查是否有字幕文件
    const subtitleFile = files.find(f => 
      f.name.endsWith('.srt') || f.name.endsWith('.vtt') || f.name.endsWith('.txt')
    )
    
    if (subtitleFile) {
      // 使用文件
      subtitleData = subtitleFile
    } else if (!subtitleData) {
      throw new Error('请输入字幕内容或选择字幕文件')
    }
    
    const videoFile = files.find(f => f.type.startsWith('video/'))
    if (!videoFile) {
      throw new Error('请选择视频文件')
    }
    
    const mediaAPI = new MediaAPI(config.mediaApiUrl)
    const result = await mediaAPI.addSubtitles(videoFile, subtitleData, fontSize, fontColor, position)
    
    if (!result.success) {
      throw new Error(result.error || '添加字幕失败')
    }
    
    return {
      download_url: `${config.mediaApiUrl}${result.download_url}`,
      filename: result.output_file,
      duration: result.duration
    }
  }

  return (
    <MediaProcessorBase
      title="添加字幕"
      description="为视频添加字幕，支持文件上传或直接输入文本"
      icon="📝"
      acceptedFiles="video/*,.srt,.vtt,.txt"
      allowMultiple={true}
      onProcess={handleAddSubtitles}
      config={config}
      onNotification={onNotification}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">字幕内容</label>
          <textarea
            value={subtitleText}
            onChange={(e) => setSubtitleText(e.target.value)}
            placeholder="输入字幕内容，或选择字幕文件(.srt/.vtt/.txt)"
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">字体大小</label>
            <input
              type="number"
              min="20"
              max="100"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">字体颜色</label>
            <select
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="white">白色</option>
              <option value="black">黑色</option>
              <option value="yellow">黄色</option>
              <option value="red">红色</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">字幕位置</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="bottom">底部</option>
              <option value="top">顶部</option>
              <option value="center">中央</option>
            </select>
          </div>
        </div>
      </div>
    </MediaProcessorBase>
  )
}

export default SubtitleAdder

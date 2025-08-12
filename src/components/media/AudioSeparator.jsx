// ===== src/components/media/AudioSeparator.jsx =====
import React, { useState } from 'react'
import MediaProcessorBase from './MediaProcessorBase'
import MediaAPI from '@/services/api/mediaAPI'

const AudioSeparator = ({ config, onNotification }) => {
  const [model, setModel] = useState('htdemucs_ft')

  const handleSeparateAudio = async (files) => {
    const mediaAPI = new MediaAPI(config.mediaApiUrl)
    const result = await mediaAPI.separateAudio(files[0], model)
    
    if (!result.success) {
      throw new Error(result.error || '分离失败')
    }
    
    // 转换为完整URL
    const separatedFiles = {}
    Object.entries(result.separated_files).forEach(([stem, path]) => {
      separatedFiles[stem] = `${config.mediaApiUrl}${path}`
    })
    
    return { separatedFiles }
  }

  return (
    <MediaProcessorBase
      title="音频分离"
      description="使用AI模型分离人声和背景音乐"
      icon="🎼"
      acceptedFiles="audio/*"
      onProcess={handleSeparateAudio}
      config={config}
      onNotification={onNotification}
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">分离模型</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="htdemucs_ft">HTDemucs-FT (推荐)</option>
          <option value="htdemucs">HTDemucs</option>
          <option value="mdx_extra">MDX Extra</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">HTDemucs-FT模型效果最佳，处理时间较长</p>
      </div>
    </MediaProcessorBase>
  )
}

export default AudioSeparator

// ===== src/components/media/AudioMerger.jsx =====
import React, { useState } from 'react'
import MediaProcessorBase from './MediaProcessorBase'
import MediaAPI from '@/services/api/mediaAPI'

const AudioMerger = ({ config, onNotification }) => {
  const [crossfadeDuration, setCrossfadeDuration] = useState(0.0)

  const handleMergeAudios = async (files) => {
    if (files.length < 2) {
      throw new Error('请选择至少2个音频文件')
    }
    
    const mediaAPI = new MediaAPI(config.mediaApiUrl)
    const result = await mediaAPI.mergeAudios(files, crossfadeDuration)
    
    if (!result.success) {
      throw new Error(result.error || '合并失败')
    }
    
    return {
      download_url: `${config.mediaApiUrl}${result.download_url}`,
      filename: result.output_file,
      duration: result.duration
    }
  }

  return (
    <MediaProcessorBase
      title="音频合并"
      description="将多个音频文件合并为一个音频"
      icon="🎵"
      acceptedFiles="audio/*"
      allowMultiple={true}
      onProcess={handleMergeAudios}
      config={config}
      onNotification={onNotification}
    >
      <div className="space-y-4">
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          请选择多个音频文件，将按选择顺序依次合并
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">交叉淡入淡出时长 (秒)</label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={crossfadeDuration}
            onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">0表示无淡入淡出，直接拼接</p>
        </div>
      </div>
    </MediaProcessorBase>
  )
}

export default AudioMerger

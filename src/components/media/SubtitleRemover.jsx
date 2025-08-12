// ===== src/components/media/SubtitleRemover.jsx =====
import React, { useState } from 'react'
import MediaProcessorBase from './MediaProcessorBase'
import MediaAPI from '@/services/api/mediaAPI'

const SubtitleRemover = ({ config, onNotification }) => {
  const [cropRatio, setCropRatio] = useState(0.85)

  const handleRemoveSubtitles = async (files) => {
    const mediaAPI = new MediaAPI(config.mediaApiUrl)
    const result = await mediaAPI.removeSubtitles(files[0], cropRatio)
    
    if (!result.success) {
      throw new Error(result.error || '去除字幕失败')
    }
    
    return {
      download_url: `${config.mediaApiUrl}${result.download_url}`,
      filename: result.output_file,
      duration: result.duration
    }
  }

  return (
    <MediaProcessorBase
      title="去除字幕"
      description="通过裁剪方式移除视频底部的嵌入字幕"
      icon="🚫"
      acceptedFiles="video/*"
      onProcess={handleRemoveSubtitles}
      config={config}
      onNotification={onNotification}
    >
      <div className="space-y-4">
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          ⚠️ 此功能通过裁剪视频底部来移除字幕，会改变视频尺寸
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            保留比例: {(cropRatio * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={cropRatio}
            onChange={(e) => setCropRatio(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>50% (裁剪较多)</span>
            <span>95% (裁剪较少)</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            推荐值85%，可根据字幕位置调整。比例越小，裁剪越多。
          </p>
        </div>
      </div>
    </MediaProcessorBase>
  )
}

export default SubtitleRemover

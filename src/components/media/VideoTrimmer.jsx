// ===== src/components/media/VideoTrimmer.jsx =====
import React, { useState } from 'react'
import MediaProcessorBase from './MediaProcessorBase'
import MediaAPI from '@/services/api/mediaAPI'

const VideoTrimmer = ({ config, onNotification }) => {
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(10)

  const handleTrimVideo = async (files) => {
    if (startTime >= endTime) {
      throw new Error('开始时间必须小于结束时间')
    }
    
    const mediaAPI = new MediaAPI(config.mediaApiUrl)
    const result = await mediaAPI.trimVideo(files[0], startTime, endTime)
    
    if (!result.success) {
      throw new Error(result.error || '剪辑失败')
    }
    
    return {
      download_url: `${config.mediaApiUrl}${result.download_url}`,
      filename: result.output_file,
      duration: result.duration
    }
  }

  return (
    <MediaProcessorBase
      title="视频剪辑"
      description="截取视频的指定时间段"
      icon="✂️"
      acceptedFiles="video/*"
      onProcess={handleTrimVideo}
      config={config}
      onNotification={onNotification}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">开始时间 (秒)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={startTime}
            onChange={(e) => setStartTime(parseFloat(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">结束时间 (秒)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={endTime}
            onChange={(e) => setEndTime(parseFloat(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        剪辑时长: {Math.max(0, endTime - startTime).toFixed(1)} 秒
      </div>
    </MediaProcessorBase>
  )
}

export default VideoTrimmer

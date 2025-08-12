// ===== src/components/media/AudioExtractor.jsx =====
import React, { useState } from 'react'
import MediaProcessorBase from './MediaProcessorBase'
import MediaAPI from '@/services/api/mediaAPI'

const AudioExtractor = ({ config, onNotification }) => {
  const [audioFormat, setAudioFormat] = useState('mp3')
  const [bitrate, setBitrate] = useState('192k')

  const handleExtractAudio = async (files) => {
    const mediaAPI = new MediaAPI(config.mediaApiUrl)
    const result = await mediaAPI.extractAudio(files[0], audioFormat, bitrate)
    
    if (!result.success) {
      throw new Error(result.error || '提取失败')
    }
    
    return {
      download_url: `${config.mediaApiUrl}${result.download_url}`,
      filename: result.output_file,
      duration: result.duration
    }
  }

  return (
    <MediaProcessorBase
      title="音频提取"
      description="从视频文件中提取音频轨道"
      icon="🎵"
      acceptedFiles="video/*"
      onProcess={handleExtractAudio}
      config={config}
      onNotification={onNotification}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">音频格式</label>
          <select
            value={audioFormat}
            onChange={(e) => setAudioFormat(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="m4a">M4A</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">比特率</label>
          <select
            value={bitrate}
            onChange={(e) => setBitrate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="128k">128 kbps</option>
            <option value="192k">192 kbps (推荐)</option>
            <option value="320k">320 kbps</option>
          </select>
        </div>
      </div>
    </MediaProcessorBase>
  )
}

export default AudioExtractor

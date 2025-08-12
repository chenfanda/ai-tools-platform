// ===== src/components/media/VideoDubber.jsx =====
import React, { useState } from 'react'
import MediaProcessorBase from './MediaProcessorBase'
import MediaAPI from '@/services/api/mediaAPI'

const VideoDubber = ({ config, onNotification }) => {
  const [audioVolume, setAudioVolume] = useState(1.0)
  const [replaceAudio, setReplaceAudio] = useState(true)

  const handleAddAudio = async (files) => {
    if (files.length < 2) {
      throw new Error('请选择视频文件和音频文件')
    }
    
    const mediaAPI = new MediaAPI(config.mediaApiUrl)
    const videoFile = files.find(f => f.type.startsWith('video/'))
    const audioFile = files.find(f => f.type.startsWith('audio/'))
    
    if (!videoFile || !audioFile) {
      throw new Error('请选择一个视频文件和一个音频文件')
    }
    
    const result = await mediaAPI.addAudioToVideo(videoFile, audioFile, audioVolume, replaceAudio)
    
    if (!result.success) {
      throw new Error(result.error || '配音失败')
    }
    
    return {
      download_url: `${config.mediaApiUrl}${result.download_url}`,
      filename: result.output_file,
      duration: result.duration
    }
  }

  return (
    <MediaProcessorBase
      title="视频配音"
      description="为视频添加音频配音，支持替换或混合原音频"
      icon="🎤"
      acceptedFiles="video/*,audio/*"
      allowMultiple={true}
      onProcess={handleAddAudio}
      config={config}
      onNotification={onNotification}
    >
      <div className="space-y-4">
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          请选择一个视频文件和一个音频文件
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">音频音量</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={audioVolume}
              onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">当前: {audioVolume}x</div>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={replaceAudio}
                onChange={(e) => setReplaceAudio(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">替换原音频</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              {replaceAudio ? '完全替换原音频' : '与原音频混合'}
            </p>
          </div>
        </div>
      </div>
    </MediaProcessorBase>
  )
}

export default VideoDubber

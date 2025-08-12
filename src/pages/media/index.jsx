// ===== src/pages/media/index.jsx =====
import React from 'react'
import AudioExtractor from '@/components/media/AudioExtractor'
import AudioSeparator from '@/components/media/AudioSeparator'
import VideoDubber from '@/components/media/VideoDubber'
import SubtitleAdder from '@/components/media/SubtitleAdder'
import VideoTrimmer from '@/components/media/VideoTrimmer'
import AudioTrimmer from '@/components/media/AudioTrimmer'
import VideoMerger from '@/components/media/VideoMerger'
import AudioMerger from '@/components/media/AudioMerger'
import SubtitleRemover from '@/components/media/SubtitleRemover'
import AudioTextAligner from '@/components/media/AudioTextAligner'

const MediaPage = ({ config, onNotification, activeSubPage, onSubPageChange }) => {
  const getPageTitle = () => {
    const titles = {
      'extract-audio': '音频提取',
      'audio-separate': '音频分离',
      'video-dubbing': '视频配音',
      'add-subtitles': '添加字幕',
      'video-trim': '视频剪辑',
      'audio-trim': '音频剪辑',
      'video-merge': '视频合并',
      'audio-merge': '音频合并',
      'remove-subtitles': '去除字幕',
      'audio-text-align': '音频字幕对齐'
    }
    return titles[activeSubPage] || '多媒体处理'
  }

  const getPageIcon = () => {
    const icons = {
      'extract-audio': '🎵',
      'audio-separate': '🎼',
      'video-dubbing': '🎤',
      'add-subtitles': '📝',
      'video-trim': '✂️',
      'audio-trim': '🎯',
      'video-merge': '🔗',
      'audio-merge': '🎵',
      'remove-subtitles': '🚫',
      'audio-text-align': '⏱️'
    }
    return icons[activeSubPage] || '🎬'
  }

  return (
    <div className="media-page max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: 'home' }))}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors duration-200"
        >
          ← 返回首页
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
          {getPageIcon()}
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          {getPageTitle()}
        </h2>
      </div>

      {/* 功能组件渲染 */}
      {activeSubPage === 'extract-audio' && (
        <AudioExtractor config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'audio-separate' && (
        <AudioSeparator config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'video-dubbing' && (
        <VideoDubber config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'add-subtitles' && (
        <SubtitleAdder config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'video-trim' && (
        <VideoTrimmer config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'audio-trim' && (
        <AudioTrimmer config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'video-merge' && (
        <VideoMerger config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'audio-merge' && (
        <AudioMerger config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'remove-subtitles' && (
        <SubtitleRemover config={config} onNotification={onNotification} />
      )}
      {activeSubPage === 'audio-text-align' && (
        <AudioTextAligner config={config} onNotification={onNotification} />
      )}
    </div>
  )
}

export default MediaPage
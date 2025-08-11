// ===== src/pages/tts/index.jsx =====
import React from 'react'
import VoiceSynthesisPanel from '@/components/voice/VoiceSynthesisPanel'
import SpeechRecognitionPanel from '@/components/voice/SpeechRecognitionPanel'
import MultiCharacterDubbingPanel from '@/components/voice/MultiCharacterDubbingPanel'

const TTSPage = ({ config, onNotification, activeSubPage, onSubPageChange }) => {
  return (
    <div className="tts-page max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigateToPage', { detail: 'home' }))}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors duration-200"
        >
          ← 返回首页
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
          {activeSubPage === 'voice-synthesis' ? '🎤' : 
           activeSubPage === 'speech-recognition' ? '📝' : 
           activeSubPage === 'multi-character-dubbing' ? '🎭' : '🎤'}
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          {activeSubPage === 'voice-synthesis' ? '语音合成' : 
           activeSubPage === 'speech-recognition' ? '语音识别' :
           activeSubPage === 'multi-character-dubbing' ? '多角色配音' : '语音合成'}
        </h2>
      </div>

      {/* 语音合成功能 */}
      {activeSubPage === 'voice-synthesis' && (
        <VoiceSynthesisPanel 
          config={config}
          onNotification={onNotification}
        />
      )}

      {/* 语音识别功能 */}
      {activeSubPage === 'speech-recognition' && (
        <SpeechRecognitionPanel 
          config={config}
          onNotification={onNotification}
        />
      )}

      {/* 多角色配音功能 */}
      {activeSubPage === 'multi-character-dubbing' && (
        <MultiCharacterDubbingPanel 
          config={config}
          onNotification={onNotification}
        />
      )}
    </div>
  )
}

export default TTSPage
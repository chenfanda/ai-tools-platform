// ===== src/components/layout/PageSidebar.jsx =====
import React from 'react'

const PageSidebar = ({ currentPage, activeSubPage, onSubPageChange }) => {
  // 侧边栏配置 - 可以后续移到独立的配置文件
  const sidebarConfig = {
    tts: {
      title: '语音模块',
      items: [
        { 
          id: 'voice-synthesis', 
          label: '语音合成', 
          icon: '🎤', 
          description: '文字转语音，支持角色配音和自定义声音' 
        },
        { 
          id: 'speech-recognition', 
          label: '语音识别', 
          icon: '📝', 
          description: '音频转文字，支持多种语言识别' 
        },
        {
          id: 'multi-character-dubbing',
          label: '多角色配音', 
          icon: '🎭',
          description: '时间轴多角色对话配音，支持角色库和自定义录音'
        }
      ]
    },
    video: {
      title: '视频生成',
      items: [
        { 
          id: 'standard-video', 
          label: '标准视频', 
          icon: '🎬', 
          description: '图片和音频合成视频' 
        },
        { 
          id: 'ai-video', 
          label: 'AI视频', 
          icon: '🤖', 
          description: 'AI生成视频内容' 
        },
        { 
          id: 'template-video', 
          label: '模板视频', 
          icon: '📋', 
          description: '基于模板快速生成' 
        },
        { 
          id: 'live-video', 
          label: '直播视频', 
          icon: '📺', 
          description: '实时视频生成' 
        }
      ]
    },
   image: {
      title: '图像处理',
      items: [
        { 
          id: 'basic-tools',
          label: '基础图像工具', 
          icon: '🔧', 
          description: '背景处理、分辨率增强等基础功能' 
        },
        { 
          id: 'face-beauty',
          label: '轻美颜', 
          icon: '✨', 
          description: '7种人脸精细调整，自然美化效果' 
        },
        { 
          id: 'face-stylization',
          label: '人脸风格化', 
          icon: '🎨', 
          description: '人脸风格转换' 
        }
      ]
    },
    media: {
      title: '多媒体处理',
      items: [
        { 
          id: 'extract-audio', 
          label: '音频提取', 
          icon: '🎵', 
          description: '从视频中提取音频文件' 
        },
        { 
          id: 'audio-separate', 
          label: '音频分离', 
          icon: '🎼', 
          description: '分离人声和背景音乐' 
        },
        { 
          id: 'video-dubbing', 
          label: '视频配音', 
          icon: '🎤', 
          description: '为视频添加音频配音' 
        },
        { 
          id: 'add-subtitles', 
          label: '添加字幕', 
          icon: '📝', 
          description: '为视频添加字幕文件' 
        },
        { 
          id: 'video-trim', 
          label: '视频剪辑', 
          icon: '✂️', 
          description: '裁剪视频片段' 
        },
        { 
          id: 'audio-trim', 
          label: '音频剪辑', 
          icon: '🎯', 
          description: '裁剪音频片段' 
        },
        { 
          id: 'video-merge', 
          label: '视频合并', 
          icon: '🔗', 
          description: '合并多个视频文件' 
        },
        { 
          id: 'audio-merge', 
          label: '音频合并', 
          icon: '🎵', 
          description: '合并多个音频文件' 
        },
        { 
          id: 'remove-subtitles', 
          label: '去除字幕', 
          icon: '🚫', 
          description: '移除视频中的嵌入字幕' 
        },
        { 
          id: 'audio-text-align', 
          label: '音频字幕对齐', 
          icon: '⏱️', 
          description: '为音频生成精确时间戳字幕' 
        }
      ]
    }
  }

  // 获取当前页面的配置
  const config = sidebarConfig[currentPage]
  
  // 如果没有配置，不显示侧边栏
  if (!config) return null

  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 sticky top-20">
        {/* 侧边栏标题 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">
            {config.title.charAt(0)}
          </div>
          <h3 className="font-semibold text-gray-900">{config.title}</h3>
        </div>
        
        {/* 功能列表 */}
        <div className="space-y-2">
          {config.items.map(item => (
            <button
              key={item.id}
              onClick={() => onSubPageChange(item.id)}
              className={`w-full p-3 rounded-lg text-left transition-all duration-200 group ${
                activeSubPage === item.id
                  ? 'bg-primary-50 border border-primary-200 text-primary-700 shadow-sm'
                  : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* 图标 */}
                <span className={`text-lg mt-0.5 transition-transform duration-200 ${
                  activeSubPage === item.id ? 'scale-110' : 'group-hover:scale-105'
                }`}>
                  {item.icon}
                </span>
                
                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm mb-1 ${
                    activeSubPage === item.id ? 'text-primary-700' : 'text-gray-900'
                  }`}>
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {item.description}
                  </div>
                </div>
                
                {/* 选中指示器 */}
                {activeSubPage === item.id && (
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        {/* 底部提示 */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">
            选择上方功能开始使用
          </div>
        </div>
      </div>
    </div>
  )
}

export default PageSidebar
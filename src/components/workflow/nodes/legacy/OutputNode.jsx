// ===== 简化版 OutputNode.jsx =====
// 移除复杂的 analyzeData 函数，使用标准化的数据格式

import React, { useState, memo, useEffect, useRef } from 'react'
import BaseWorkflowNode from '../BaseWorkflowNode'
// 新增：导入数据流管理器用于数据处理
import { WorkflowData } from '@/services/workflow/ModuleAdapter'

const OutputNode = ({ data, selected, id }) => {
  const [receivedData, setReceivedData] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // 节点位置信息
  const nodeIndex = data.nodeIndex !== undefined ? data.nodeIndex : 0
  const totalNodes = data.totalNodes || 1

  // 监听来自WorkflowExecutor的数据传递
  useEffect(() => {
    const handleData = (event) => {
      console.log('[OutputNode] 接收原始数据:', event.detail)
      
      // ===== 修改点：使用标准化数据处理 =====
      try {
        let workflowData = event.detail;
        
        // 如果不是标准格式，尝试标准化
        if (!workflowData?.getPreview) {
          console.log('[OutputNode] 数据需要标准化')
          workflowData = WorkflowData.normalize(event.detail, 'output', {
            receivedAt: new Date().toISOString(),
            nodeId: id
          });
        }
        
        console.log('[OutputNode] 使用标准化数据:', workflowData.getPreview())
        setReceivedData(workflowData)
        
      } catch (error) {
        console.warn('[OutputNode] 数据标准化失败，使用原始数据:', error)
        // 降级：使用原始数据处理
        setReceivedData(event.detail)
      }
    }
    
    const eventName = `workflow-data-${id}`
    window.addEventListener(eventName, handleData)
    
    return () => window.removeEventListener(eventName, handleData)
  }, [id])

  // ===== 简化：使用标准化的数据预览 =====
  const getDataPreview = (data) => {
    if (!data) {
      return { type: 'empty', preview: null, displayType: 'empty' }
    }

    // 如果是标准化的 WorkflowData
    if (data.getPreview) {
      console.log('[OutputNode] 使用标准化预览')
      return {
        type: data.type,
        preview: data.getPreview(),
        displayType: data.getPreview().displayType,
        standardData: data
      }
    }

    // ===== 降级：兼容原有的数据检测逻辑 =====
    console.log('[OutputNode] 降级到传统数据检测')
    return this.legacyAnalyzeData(data)
  }

  // ===== 保留：传统数据分析逻辑作为降级方案 =====
  const legacyAnalyzeData = (data) => {
    console.log('[OutputNode] 传统数据分析:', data)

    // 音频数据检测
    if (data.content?.audio) {
      console.log('[OutputNode] 检测到音频数据:', data.content.audio)
      return {
        type: 'audio',
        preview: {
          type: '🎵 音频',
          summary: data.content.audio.name || 'audio.wav',
          displayType: 'audio',
          audioData: data.content.audio
        },
        metadata: data.metadata || {}
      }
    }

    // 文本数据检测
    if (typeof data === 'string') {
      return { 
        type: 'text', 
        preview: {
          type: '📝 文本',
          summary: data.length > 50 ? data.substring(0, 50) + '...' : data,
          displayType: 'text'
        }
      }
    }
    if (data.text) {
      return { 
        type: 'text', 
        preview: {
          type: '📝 文本',
          summary: data.text.length > 50 ? data.text.substring(0, 50) + '...' : data.text,
          displayType: 'text'
        }
      }
    }
    if (data.content?.text) {
      return { 
        type: 'text', 
        preview: {
          type: '📝 文本',
          summary: data.content.text.length > 50 ? data.content.text.substring(0, 50) + '...' : data.content.text,
          displayType: 'text'
        }
      }
    }

    // 图片数据检测
    if (data.image_url) {
      return { 
        type: 'image', 
        preview: {
          type: '🖼️ 图片',
          summary: 'Image content',
          displayType: 'image'
        }
      }
    }
    if (data.content?.image?.url) {
      return { 
        type: 'image', 
        preview: {
          type: '🖼️ 图片',
          summary: 'Image content',
          displayType: 'image'
        }
      }
    }

    // 视频数据检测
    if (data.video_url) {
      return { 
        type: 'video', 
        preview: {
          type: '🎬 视频',
          summary: 'Video content',
          displayType: 'video'
        }
      }
    }
    if (data.content?.video?.url) {
      return { 
        type: 'video', 
        preview: {
          type: '🎬 视频',
          summary: 'Video content',
          displayType: 'video'
        }
      }
    }

    // 错误检测
    if (data.error) {
      return { 
        type: 'error', 
        preview: {
          type: '❌ 错误',
          summary: data.error,
          displayType: 'error'
        }
      }
    }

    // 默认为JSON数据
    return { 
      type: 'data', 
      preview: {
        type: '📊 数据',
        summary: 'JSON object',
        displayType: 'data'
      }
    }
  }

  const outputData = getDataPreview(receivedData)

  // 复制功能 - 使用标准化数据
  const handleCopy = async () => {
    let textToCopy = ''
    
    // 如果是标准化数据，使用其内容
    if (outputData.standardData) {
      const standardData = outputData.standardData
      switch (standardData.type) {
        case 'text':
          textToCopy = standardData.content.text
          break
        case 'audio':
          textToCopy = `音频文件: ${standardData.content.audio.name || 'audio.wav'}\nURL: ${standardData.content.audio.url}`
          break
        default:
          textToCopy = JSON.stringify(standardData.content, null, 2)
      }
    } else {
      // 降级到传统复制逻辑
      switch (outputData.type) {
        case 'text':
          textToCopy = receivedData
          break
        case 'audio':
          textToCopy = `音频文件: ${receivedData.content?.audio?.name || 'audio.wav'}\nURL: ${receivedData.content?.audio?.url}`
          break
        default:
          textToCopy = JSON.stringify(receivedData, null, 2)
      }
    }

    try {
      await navigator.clipboard.writeText(textToCopy)
      console.log('[OutputNode] 内容已复制')
    } catch (error) {
      console.error('[OutputNode] 复制失败:', error)
    }
  }

  const showAddButton = data.showAddButton === true && (nodeIndex < (totalNodes - 1) || totalNodes === 1)

  return (
    <BaseWorkflowNode
      nodeId={id}
      nodeType="output"
      theme="blue"
      title="内容预览"
      icon="👁️"
      nodeIndex={nodeIndex}
      status={outputData.type === 'empty' ? 'waiting' : outputData.type === 'error' ? 'error' : 'success'}
      selected={selected}
      showAddButton={showAddButton}
      onAddNode={data.onAddNode}
    >
      <div className="p-2 space-y-2 h-32 overflow-y-auto">
        
        {/* 等待状态 */}
        {outputData.type === 'empty' && (
          <div className="text-center text-gray-500 py-2">
            <div className="text-lg mb-1">👁️</div>
            <div className="text-xs">等待内容</div>
          </div>
        )}

        {/* 有数据状态 */}
        {outputData.type !== 'empty' && (
          <div className="space-y-2">
            
            {/* 工具栏 */}
            <div className="flex justify-between items-center">
              <div className="text-xs font-medium text-gray-700">
                {outputData.preview.type}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleCopy}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                  title="复制内容"
                >
                  📋
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    isExpanded 
                      ? 'bg-blue-200 text-blue-800' 
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                  title={isExpanded ? '收起' : '展开'}
                >
                  {isExpanded ? '🔼' : '🔽'}
                </button>
              </div>
            </div>

            {/* ===== 简化：使用标准化的预览组件 ===== */}
            <PreviewContentEnhanced 
              data={outputData} 
              isExpanded={isExpanded} 
              rawData={receivedData}
            />
          </div>
        )}
      </div>
    </BaseWorkflowNode>
  )
}

// ============ 增强的预览组件 ============

const PreviewContentEnhanced = ({ data, isExpanded, rawData }) => {
  // 如果是标准化数据，使用对应的预览组件
  if (data.standardData) {
    console.log('[PreviewContent] 使用标准化预览组件')
    return <StandardizedPreview data={data.standardData} isExpanded={isExpanded} />
  }

  // 降级到传统预览组件
  console.log('[PreviewContent] 降级到传统预览组件')
  switch (data.type) {
    case 'audio':
      return <AudioPreview audioData={rawData.content?.audio} metadata={rawData.metadata} isExpanded={isExpanded} />
    case 'text':
      return <TextPreview text={rawData} isExpanded={isExpanded} />
    case 'image':
      return <ImagePreview imageUrl={rawData.image_url || rawData.content?.image?.url} isExpanded={isExpanded} />
    case 'video':
      return <VideoPreview videoUrl={rawData.video_url || rawData.content?.video?.url} isExpanded={isExpanded} />
    case 'error':
      return <ErrorPreview error={rawData.error} isExpanded={isExpanded} />
    default:
      return <DataPreview data={rawData} isExpanded={isExpanded} />
  }
}

// ===== 新增：标准化数据预览组件 =====
const StandardizedPreview = ({ data, isExpanded }) => {
  const preview = data.getPreview()
  
  switch (data.type) {
    case 'text':
      return (
        <div className="bg-blue-50 p-2 rounded border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📝</span>
            <div className="text-sm font-medium text-blue-800">标准化文本内容</div>
          </div>
          <div className={`text-sm text-blue-900 whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-3'}`}>
            {data.content.text || '(空文本)'}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {preview.details}
          </div>
        </div>
      )

    case 'audio':
      return (
        <StandardizedAudioPreview 
          audioData={data.content.audio} 
          metadata={data.metadata} 
          isExpanded={isExpanded} 
        />
      )

    case 'error':
      return (
        <div className="bg-red-50 p-2 rounded border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">❌</span>
            <div className="text-sm font-medium text-red-800">标准化错误信息</div>
          </div>
          <div className={`text-sm text-red-700 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {data.content.error}
          </div>
          <div className="text-xs text-red-600 mt-1">
            来源: {data.metadata.source || 'unknown'}
          </div>
        </div>
      )

    default:
      return (
        <div className="bg-gray-50 p-2 rounded border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📊</span>
            <div className="text-sm font-medium text-gray-800">标准化数据内容</div>
          </div>
          <div className="text-xs text-gray-600">
            类型: {data.type} | {preview.details}
          </div>
          <pre className={`text-xs text-gray-700 overflow-auto mt-1 ${isExpanded ? 'max-h-none' : 'max-h-16'}`}>
            {JSON.stringify(data.content, null, 2)}
          </pre>
        </div>
      )
  }
}

// ===== 增强的音频预览组件 =====
const StandardizedAudioPreview = ({ audioData, metadata, isExpanded }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)
  const audioRef = useRef(null)

  // 音频事件处理
  useEffect(() => {
    if (!audioData?.url || !audioRef.current) return

    const audio = audioRef.current
    
    const handleLoadedData = () => {
      setDuration(audio.duration)
      setError(null)
    }
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    
    const handleError = (e) => {
      console.error('[StandardizedAudioPreview] 音频加载错误:', e)
      setError('音频加载失败')
      setIsPlaying(false)
    }

    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    
    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [audioData?.url])

  // 播放控制
  const handlePlayPause = async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('[StandardizedAudioPreview] 播放失败:', error)
      setError('播放失败')
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!audioData?.url) {
    return (
      <div className="bg-red-50 p-2 rounded border border-red-200">
        <div className="text-sm text-red-700">❌ 标准化音频数据无效</div>
        <div className="text-xs text-red-600 mt-1">
          缺少音频URL
        </div>
      </div>
    )
  }

  return (
    <div className="bg-purple-50 p-2 rounded border border-purple-200">
      <div className="space-y-2">
        
        {/* 音频信息 */}
        <div className="flex items-center gap-2">
          <span className="text-lg">🎵</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-purple-800 truncate">
              🔄 {audioData.name || 'audio.wav'} (标准化)
            </div>
            <div className="text-xs text-purple-600">
              {audioData.format?.toUpperCase() || 'AUDIO'} 
              {audioData.size && ` • ${formatFileSize(audioData.size)}`}
            </div>
          </div>
        </div>

        {/* 隐藏的音频元素 */}
        <audio ref={audioRef} src={audioData.url} preload="metadata" style={{ display: 'none' }} />

        {/* 错误显示 */}
        {error && (
          <div className="text-xs text-red-600 bg-red-100 p-1 rounded">
            {error}
          </div>
        )}

        {/* 播放控制 */}
        <div className="space-y-1">
          {/* 控制按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center transition-colors"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            
            <button
              onClick={() => window.open(audioData.url, '_blank')}
              className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors"
            >
              🎧 新窗口
            </button>
          </div>
          
          {/* 时间显示 */}
          <div className="flex justify-between text-xs text-purple-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 原始文本（如果有） */}
        {metadata?.originalText && isExpanded && (
          <div className="mt-2 p-2 bg-purple-100 rounded">
            <div className="text-xs font-medium text-purple-700 mb-1">📝 原始文本 (标准化元数据)</div>
            <div className="text-xs text-purple-800">{metadata.originalText}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 保留：传统预览组件作为降级方案 =====

// 文本预览组件
const TextPreview = ({ text, isExpanded }) => (
  <div className="bg-blue-50 p-2 rounded border border-blue-200">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-lg">📝</span>
      <div className="text-sm font-medium text-blue-800">文本内容 (传统模式)</div>
    </div>
    <div className={`text-sm text-blue-900 whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-3'}`}>
      {text || '(空文本)'}
    </div>
    <div className="text-xs text-blue-600 mt-1">
      {text ? `${text.length} 字符` : '无内容'}
    </div>
  </div>
)

// 音频预览组件 (传统版本，保持原有逻辑)
const AudioPreview = ({ audioData, metadata, isExpanded }) => {
  // ... (保持原有的音频预览组件代码不变)
  return (
    <div className="bg-purple-50 p-2 rounded border border-purple-200">
      <div className="text-sm font-medium text-purple-800">🎵 音频内容 (传统模式)</div>
      {audioData && (
        <div className="text-xs text-purple-600 mt-1">
          文件: {audioData.name || 'audio.wav'}
        </div>
      )}
    </div>
  )
}

// 图片预览组件
const ImagePreview = ({ imageUrl, isExpanded }) => (
  <div className="bg-green-50 p-2 rounded border border-green-200">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">🖼️</span>
      <div className="text-sm font-medium text-green-800">图片预览</div>
    </div>
    {imageUrl ? (
      <img 
        src={imageUrl} 
        alt="预览图片" 
        className={`w-full rounded object-contain ${isExpanded ? 'max-h-none' : 'max-h-20'}`}
      />
    ) : (
      <div className="text-center text-green-600 py-4">
        <div className="text-2xl mb-1">🖼️</div>
        <div className="text-xs">无法加载图片</div>
      </div>
    )}
  </div>
)

// 视频预览组件
const VideoPreview = ({ videoUrl, isExpanded }) => (
  <div className="bg-orange-50 p-2 rounded border border-orange-200">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">🎬</span>
      <div className="text-sm font-medium text-orange-800">视频预览</div>
    </div>
    {videoUrl ? (
      <video 
        controls 
        className={`w-full rounded ${isExpanded ? 'max-h-none' : 'max-h-20'}`}
        src={videoUrl}
      >
        您的浏览器不支持视频播放
      </video>
    ) : (
      <div className="text-center text-orange-600 py-4">
        <div className="text-2xl mb-1">🎬</div>
        <div className="text-xs">无法加载视频</div>
      </div>
    )}
  </div>
)

// 错误预览组件
const ErrorPreview = ({ error, isExpanded }) => (
  <div className="bg-red-50 p-2 rounded border border-red-200">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-lg">❌</span>
      <div className="text-sm font-medium text-red-800">错误信息</div>
    </div>
    <div className={`text-sm text-red-700 ${isExpanded ? '' : 'line-clamp-2'}`}>
      {error}
    </div>
  </div>
)

// 数据预览组件
const DataPreview = ({ data, isExpanded }) => (
  <div className="bg-gray-50 p-2 rounded border border-gray-200">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-lg">📊</span>
      <div className="text-sm font-medium text-gray-800">数据内容</div>
    </div>
    <pre className={`text-xs text-gray-700 overflow-auto ${isExpanded ? 'max-h-none' : 'max-h-16'}`}>
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
)

// ============ 工具函数 ============

const formatFileSize = (bytes) => {
  if (!bytes || typeof bytes !== 'number') return ''
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default memo(OutputNode)

// ===== 简化版 DownloadNode.jsx =====
// 移除复杂的数据类型检测，使用标准化的数据处理

import React, { useState, useEffect } from 'react'
import BaseWorkflowNode from '../BaseWorkflowNode'
// 新增：导入标准化数据处理
import { WorkflowData } from '@/services/workflow/ModuleAdapter'

const DownloadNode = ({ data, selected, id }) => {
  const [receivedData, setReceivedData] = useState(null)
  const [downloadStatus, setDownloadStatus] = useState('waiting')

  // 节点位置信息
  const nodeIndex = data.nodeIndex !== undefined ? data.nodeIndex : 0

  // 下载配置 - 从data中读取配置面板设置
  const downloadConfig = {
    autoDownload: data.autoDownload || false,
    customFileName: data.customFileName || '',
    customPath: data.customPath || '',
    downloadFormat: data.downloadFormat || 'auto',
    showProgress: data.showProgress !== false,
    allowRetry: data.allowRetry !== false
  }

  // 调试：打印节点data和配置
  useEffect(() => {
    console.log('[DownloadNode] 节点data完整信息:', data)
    console.log('[DownloadNode] 解析的配置信息:', downloadConfig)
    console.log('[DownloadNode] customFileName具体值:', `"${data.customFileName}"`)
    console.log('[DownloadNode] data的所有属性:', Object.keys(data))
  }, [data, downloadConfig])

  // 监听数据
  useEffect(() => {
    const handleData = (event) => {
      console.log('[DownloadNode] 接收原始数据:', event.detail)
      
      // ===== 修改点：使用标准化数据处理 =====
      try {
        let workflowData = event.detail;
        
        // 如果不是标准格式，尝试标准化
        if (!workflowData?.getPreview) {
          console.log('[DownloadNode] 数据需要标准化')
          workflowData = WorkflowData.normalize(event.detail, 'download', {
            receivedAt: new Date().toISOString(),
            nodeId: id
          });
        }
        
        console.log('[DownloadNode] 使用标准化数据:', workflowData.getPreview())
        setReceivedData(workflowData)
        setDownloadStatus('ready')
        
        // 检查自动下载
        if (downloadConfig.autoDownload && workflowData.type === 'audio') {
          console.log('[DownloadNode] 触发标准化数据自动下载')
          setTimeout(() => {
            handleAutoDownloadEnhanced(workflowData)
          }, 1000)
        }
        
      } catch (error) {
        console.warn('[DownloadNode] 数据标准化失败，使用传统处理:', error)
        // 降级：使用传统数据处理
        setReceivedData(event.detail)
        setDownloadStatus('ready')
        
        // 传统自动下载检查
        if (downloadConfig.autoDownload && event.detail?.content?.audio) {
          console.log('[DownloadNode] 触发传统自动下载')
          setTimeout(() => {
            handleAutoDownload(event.detail)
          }, 1000)
        }
      }
    }
    
    const eventName = `workflow-data-${id}`
    window.addEventListener(eventName, handleData)
    
    return () => window.removeEventListener(eventName, handleData)
  }, [id, downloadConfig.autoDownload])

  // ===== 新增：标准化数据的自动下载 =====
  const handleAutoDownloadEnhanced = (workflowData) => {
    console.log('[DownloadNode] 标准化自动下载处理:', workflowData.type)
    
    switch (workflowData.type) {
      case 'audio':
        const audioData = workflowData.content.audio
        if (audioData?.url) {
          console.log('[DownloadNode] 标准化音频自动下载')
          handleBlobDownloadEnhanced(audioData, workflowData.metadata)
        }
        break
      case 'text':
        const textContent = workflowData.content.text
        if (textContent) {
          console.log('[DownloadNode] 标准化文本自动下载')
          handleTextDownloadEnhanced(textContent, workflowData.metadata)
        }
        break
      default:
        console.log('[DownloadNode] 标准化数据类型不支持自动下载:', workflowData.type)
    }
  }

  // ===== 保留：传统自动下载函数作为降级 =====
  const handleAutoDownload = (data) => {
    if (!data?.content?.audio) return
    
    console.log('[DownloadNode] 触发传统自动下载（使用Blob方式）')
    handleBlobDownload(data.content.audio)
  }

  // ===== 修改：增强的手动下载函数 =====
  const handleDownload = () => {
    if (!receivedData) {
      console.error('没有数据可下载')
      return
    }

    // 如果是标准化数据
    if (receivedData.getPreview) {
      console.log('[DownloadNode] 标准化手动下载')
      handleStandardizedDownload(receivedData)
    } else {
      // 降级到传统下载
      console.log('[DownloadNode] 传统手动下载')
      if (receivedData?.content?.audio) {
        handleBlobDownload(receivedData.content.audio)
      } else {
        console.error('传统格式下载失败：无音频数据')
      }
    }
  }

  // ===== 新增：标准化数据下载处理 =====
  const handleStandardizedDownload = (workflowData) => {
    console.log('[DownloadNode] 处理标准化下载:', workflowData.type)
    
    switch (workflowData.type) {
      case 'audio':
        const audioData = workflowData.content.audio
        if (audioData?.url) {
          handleBlobDownloadEnhanced(audioData, workflowData.metadata)
        } else {
          console.error('标准化音频数据缺少URL')
        }
        break
        
      case 'text':
        const textContent = workflowData.content.text
        if (textContent) {
          handleTextDownloadEnhanced(textContent, workflowData.metadata)
        } else {
          console.error('标准化文本数据为空')
        }
        break
        
      default:
        console.log('标准化数据类型暂不支持下载:', workflowData.type)
        // 可以在这里添加更多类型的支持
    }
  }

  // ===== 新增：增强的音频下载 =====
  const handleBlobDownloadEnhanced = async (audioData, metadata) => {
    try {
      console.log('[DownloadNode] 开始标准化音频下载')
      setDownloadStatus('downloading')
      
      const fileName = generateFileNameEnhanced(audioData, metadata, 'audio')
      console.log('[DownloadNode] 标准化音频下载文件名:', fileName)
      
      // 通过fetch获取音频数据
      const response = await fetch(audioData.url)
      const blob = await response.blob()
      
      // 创建Blob URL
      const blobUrl = URL.createObjectURL(blob)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 清理Blob URL
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
      }, 1000)
      
      setDownloadStatus('completed')
      console.log('[DownloadNode] 标准化音频下载完成，文件名:', fileName)
      
    } catch (error) {
      console.error('[DownloadNode] 标准化音频下载失败:', error)
      setDownloadStatus('ready')
    }
  }

  // ===== 新增：文本下载处理 =====
  const handleTextDownloadEnhanced = (textContent, metadata) => {
    try {
      console.log('[DownloadNode] 开始标准化文本下载')
      setDownloadStatus('downloading')
      
      const fileName = generateFileNameEnhanced({ content: textContent }, metadata, 'text')
      console.log('[DownloadNode] 标准化文本下载文件名:', fileName)
      
      // 创建文本Blob
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
      const blobUrl = URL.createObjectURL(blob)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 清理Blob URL
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
      }, 1000)
      
      setDownloadStatus('completed')
      console.log('[DownloadNode] 标准化文本下载完成，文件名:', fileName)
      
    } catch (error) {
      console.error('[DownloadNode] 标准化文本下载失败:', error)
      setDownloadStatus('ready')
    }
  }

  // ===== 修改：增强的文件名生成 =====
  const generateFileNameEnhanced = (contentData, metadata, dataType) => {
    console.log('[DownloadNode] 生成增强文件名 - 类型:', dataType, '配置:', downloadConfig)
    
    let fileName = ''
    
    if (downloadConfig.customFileName && downloadConfig.customFileName.trim()) {
      // 使用自定义文件名
      fileName = downloadConfig.customFileName.trim()
      console.log('[DownloadNode] 使用自定义文件名:', fileName)
    } else {
      // 根据数据类型和元数据生成默认名称
      switch (dataType) {
        case 'audio':
          fileName = contentData.name || `tts_audio_${Date.now()}`
          break
        case 'text':
          fileName = `text_content_${Date.now()}`
          break
        default:
          fileName = `download_${Date.now()}`
      }
      console.log('[DownloadNode] 使用生成的文件名:', fileName)
    }
    
    // 移除现有扩展名（如果有）
    fileName = fileName.replace(/\.[^/.]+$/, '')
    
    // 处理文件扩展名
    let extension = ''
    if (downloadConfig.downloadFormat === 'auto') {
      switch (dataType) {
        case 'audio':
          extension = contentData.format || 'wav'
          break
        case 'text':
          extension = 'txt'
          break
        default:
          extension = 'bin'
      }
    } else {
      extension = downloadConfig.downloadFormat
    }
    
    // 添加扩展名
    const finalFileName = `${fileName}.${extension}`
    
    console.log('[DownloadNode] 最终增强文件名:', finalFileName)
    return finalFileName
  }

  // ===== 保留：传统的Blob下载函数 =====
  const handleBlobDownload = async (audioData) => {
    try {
      console.log('[DownloadNode] 开始传统Blob下载')
      setDownloadStatus('downloading')
      
      const fileName = generateFileName(audioData)
      console.log('[DownloadNode] 传统Blob下载文件名:', fileName)
      
      // 通过fetch获取音频数据
      const response = await fetch(audioData.url)
      const blob = await response.blob()
      
      // 创建Blob URL
      const blobUrl = URL.createObjectURL(blob)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 清理Blob URL
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
      }, 1000)
      
      setDownloadStatus('completed')
      console.log('[DownloadNode] 传统Blob下载完成，文件名:', fileName)
      
    } catch (error) {
      console.error('[DownloadNode] 传统Blob下载失败:', error)
      setDownloadStatus('ready')
    }
  }

  // ===== 保留：传统文件名生成函数 =====
  const generateFileName = (audioData) => {
    console.log('[DownloadNode] 传统配置信息:', downloadConfig)
    console.log('[DownloadNode] 传统原始音频数据:', audioData)
    
    let fileName = ''
    
    if (downloadConfig.customFileName && downloadConfig.customFileName.trim()) {
      // 使用自定义文件名
      fileName = downloadConfig.customFileName.trim()
      console.log('[DownloadNode] 使用传统自定义文件名:', fileName)
    } else {
      // 使用原始文件名或生成默认名称
      fileName = audioData.name || `audio_${Date.now()}`
      console.log('[DownloadNode] 使用传统默认文件名:', fileName)
    }
    
    // 移除现有扩展名（如果有）
    fileName = fileName.replace(/\.[^/.]+$/, '')
    
    // 处理文件扩展名
    let extension = ''
    if (downloadConfig.downloadFormat === 'auto') {
      extension = audioData.format || 'wav'
    } else {
      extension = downloadConfig.downloadFormat
    }
    
    // 添加扩展名
    const finalFileName = `${fileName}.${extension}`
    
    console.log('[DownloadNode] 传统最终文件名:', finalFileName)
    return finalFileName
  }

  // ===== 简化：使用标准化数据信息显示 =====
  const getDownloadInfo = () => {
    if (!receivedData) {
      return { type: 'none', summary: '等待数据', canDownload: false }
    }

    // 如果是标准化数据
    if (receivedData.getPreview) {
      const preview = receivedData.getPreview()
      return {
        type: receivedData.type,
        summary: preview.summary,
        details: preview.details,
        canDownload: receivedData.type === 'audio' || receivedData.type === 'text',
        isStandardized: true
      }
    }

    // 降级到传统检测
    if (receivedData?.content?.audio) {
      return {
        type: 'audio',
        summary: receivedData.content.audio.name || 'audio.wav',
        details: `格式: ${receivedData.content.audio.format || 'wav'}`,
        canDownload: true,
        isStandardized: false
      }
    }

    return { type: 'unknown', summary: '未知数据', canDownload: false, isStandardized: false }
  }

  const downloadInfo = getDownloadInfo()

  return (
    <BaseWorkflowNode
      nodeId={id}
      nodeType="download"
      theme="green"
      title="文件下载"
      icon="📥"
      nodeIndex={nodeIndex}
      status={downloadStatus === 'completed' ? 'success' : downloadStatus === 'ready' ? 'configured' : 'waiting'}
      selected={selected}
      showAddButton={false}
    >
      <div className="p-2 space-y-2 h-32 overflow-y-auto">
        
        {/* 等待状态 */}
        {!receivedData && (
          <div className="text-center text-gray-500 py-2">
            <div className="text-lg mb-1">📥</div>
            <div className="text-xs">等待数据</div>
          </div>
        )}

        {/* 有数据状态 */}
        {receivedData && (
          <div className="space-y-2">
            
            {/* ===== 简化：统一的数据检测显示 ===== */}
            <div className={`bg-blue-50 p-2 rounded text-xs border ${
              downloadInfo.isStandardized ? 'border-blue-300' : 'border-blue-200'
            }`}>
              <div className="font-medium text-blue-800 mb-1">
                {downloadInfo.isStandardized ? '🔄 标准化数据检测' : '📋 传统数据检测'}
              </div>
              <div className="text-blue-700 space-y-0.5">
                <div>类型: {downloadInfo.type}</div>
                <div>内容: {downloadInfo.summary}</div>
                {downloadInfo.details && <div>详情: {downloadInfo.details}</div>}
                <div>可下载: {downloadInfo.canDownload ? '✅' : '❌'}</div>
              </div>
            </div>
            
            {/* 下载操作区域 */}
            {downloadInfo.canDownload ? (
              <div className="bg-green-50 p-2 rounded">
                <div className="font-medium text-green-800 text-sm mb-1">
                  {downloadInfo.type === 'audio' ? '🎵 音频就绪' : '📝 文本就绪'}
                </div>
                <div className="text-xs text-green-700 mb-1">
                  {downloadInfo.summary}
                </div>
                <div className="text-xs text-blue-600 mb-2">
                  下载为: {downloadInfo.isStandardized ? 
                    generateFileNameEnhanced(
                      downloadInfo.type === 'audio' ? receivedData.content.audio : { content: receivedData.content.text }, 
                      receivedData.metadata, 
                      downloadInfo.type
                    ) : 
                    (downloadInfo.type === 'audio' ? generateFileName(receivedData.content.audio) : 'text_file.txt')
                  }
                </div>
                
                {/* 下载按钮 */}
                {downloadStatus === 'ready' && (
                  <button
                    onClick={handleDownload}
                    className="w-full px-3 py-1.5 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600"
                  >
                    📥 立即下载
                  </button>
                )}
                
                {downloadStatus === 'downloading' && (
                  <div className="w-full px-3 py-1.5 bg-blue-500 text-white rounded text-sm text-center">
                    ⏳ 下载中...
                  </div>
                )}
                
                {downloadStatus === 'completed' && (
                  <div className="w-full px-3 py-1.5 bg-green-600 text-white rounded text-sm text-center">
                    ✅ 已完成
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 p-2 rounded text-xs">
                <div className="font-medium text-red-800">❌ 数据不支持下载</div>
                <div className="text-red-600 mt-1">
                  当前数据类型: {downloadInfo.type}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseWorkflowNode>
  )
}

export default DownloadNode

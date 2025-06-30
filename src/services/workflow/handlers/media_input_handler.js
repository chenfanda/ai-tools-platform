/**
 * 多媒体输入Handler - 重写版
 * 
 * 功能：
 * - 处理多种媒体输入（音频、视频、图片、文件、文本、URL）
 * - 根据输入类型返回适合下游处理的标准格式
 * - 优先返回File对象以支持ASR等下游节点
 * - 支持WorkflowData标准格式输出
 * 
 * 输入格式：preprocessInput()的输出
 * 输出格式：根据输入类型智能返回最佳格式
 */

export default async function mediaInputHandler(input) {
  console.log(`[mediaInputHandler] 执行多媒体输入处理`)
  
  const { workflowData, userConfig, nodeConfig } = input
  
  console.log(`[mediaInputHandler] 输入分析:`, {
    workflowDataType: typeof workflowData,
    isFile: workflowData instanceof File,
    isBlob: workflowData instanceof Blob,
    userConfigKeys: Object.keys(userConfig),
    inputType: userConfig.inputType
  })

  try {
    // 根据用户配置的输入类型处理
    const inputType = userConfig.inputType || 'file'
    
    switch (inputType) {
      case 'file':
        return await handleFileInput(workflowData, userConfig, nodeConfig)
      
      case 'text':
        return await handleTextInput(workflowData, userConfig, nodeConfig)
      
      case 'url':
        return await handleUrlInput(workflowData, userConfig, nodeConfig)
      
      default:
        return await handleAutoDetection(workflowData, userConfig, nodeConfig)
    }
    
  } catch (error) {
    console.error(`[mediaInputHandler] 处理失败:`, error)
    throw new Error(`多媒体输入处理失败: ${error.message}`)
  }
}

/**
 * 处理文件上传输入
 */
async function handleFileInput(workflowData, userConfig, nodeConfig) {
  console.log(`[mediaInputHandler] 处理文件输入`)
  
  // 🎯 关键：直接返回File对象，便于下游节点（如ASR）直接使用
  if (workflowData instanceof File) {
    const fileInfo = extractFileInfo(workflowData)
    
    console.log(`[mediaInputHandler] 直接返回File对象:`, {
      fileName: workflowData.name,
      fileSize: workflowData.size,
      fileType: workflowData.type,
      mediaType: fileInfo.mediaType
    })
    
    // 🔑 关键决策：直接返回File对象，最大化下游兼容性
    return workflowData
  }
  
  // 处理Blob数据
  if (workflowData instanceof Blob) {
    const fileName = userConfig.customFileName || 'media-file'
    const fileExtension = getFileExtension(workflowData.type)
    const file = new File([workflowData], `${fileName}.${fileExtension}`, {
      type: workflowData.type
    })
    
    console.log(`[mediaInputHandler] Blob转换为File对象:`, file.name)
    return file
  }
  
  // 处理来自用户配置的文件路径或名称
  if (userConfig.mediaFile) {
    console.log(`[mediaInputHandler] 处理用户配置的文件:`, userConfig.mediaFile)
    
    // 如果配置中有文件名但没有实际文件，返回文件信息
    return createMediaResult('file', {
      name: userConfig.mediaFile,
      source: 'user_config',
      type: 'file'
    }, userConfig, nodeConfig)
  }
  
  // 没有有效的文件输入
  throw new Error('没有检测到有效的文件输入，请上传文件或检查配置')
}

/**
 * 处理文本输入
 */
async function handleTextInput(workflowData, userConfig, nodeConfig) {
  console.log(`[mediaInputHandler] 处理文本输入`)
  
  let textContent = ''
  
  // 从工作流数据提取文本
  if (typeof workflowData === 'string') {
    textContent = workflowData
  } else if (workflowData?.content?.text) {
    textContent = workflowData.content.text
  } else if (workflowData?.text) {
    textContent = workflowData.text
  }
  
  // 从用户配置提取文本
  if (!textContent && userConfig.textInput) {
    textContent = userConfig.textInput
  }
  
  if (!textContent || !textContent.trim()) {
    throw new Error('没有检测到有效的文本内容')
  }
  
  console.log(`[mediaInputHandler] 文本内容处理完成:`, {
    textLength: textContent.length,
    preview: textContent.substring(0, 50) + (textContent.length > 50 ? '...' : '')
  })
  
  // 🎯 对于文本，返回标准的WorkflowData格式，便于下游文本处理节点使用
  return createWorkflowDataFormat('text', {
    text: textContent
  }, {
    source: 'media-input',
    inputType: 'text',
    processedAt: new Date().toISOString()
  })
}

/**
 * 处理URL输入
 */
async function handleUrlInput(workflowData, userConfig, nodeConfig) {
  console.log(`[mediaInputHandler] 处理URL输入`)
  
  let urlInput = ''
  
  // 从工作流数据提取URL
  if (typeof workflowData === 'string' && isValidUrl(workflowData)) {
    urlInput = workflowData
  }
  
  // 从用户配置提取URL
  if (!urlInput && userConfig.urlInput) {
    urlInput = userConfig.urlInput
  }
  
  if (!urlInput || !isValidUrl(urlInput)) {
    throw new Error('没有检测到有效的URL地址')
  }
  
  try {
    // 🎯 尝试下载URL内容并转换为File对象
    console.log(`[mediaInputHandler] 下载URL内容:`, urlInput)
    
    const response = await fetch(urlInput)
    if (!response.ok) {
      throw new Error(`URL下载失败: ${response.status} ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const fileName = extractFileNameFromUrl(urlInput) || 'downloaded-media'
    const fileExtension = getFileExtension(blob.type)
    
    const file = new File([blob], `${fileName}.${fileExtension}`, {
      type: blob.type
    })
    
    console.log(`[mediaInputHandler] URL内容下载完成:`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      originalUrl: urlInput
    })
    
    // 🔑 关键：返回File对象，便于下游处理
    return file
    
  } catch (error) {
    console.error(`[mediaInputHandler] URL处理失败:`, error)
    
    // 降级：返回URL信息
    return createMediaResult('url', {
      url: urlInput,
      error: error.message,
      accessible: false
    }, userConfig, nodeConfig)
  }
}

/**
 * 自动检测输入类型
 */
async function handleAutoDetection(workflowData, userConfig, nodeConfig) {
  console.log(`[mediaInputHandler] 自动检测输入类型`)
  
  // 检测File对象
  if (workflowData instanceof File) {
    return await handleFileInput(workflowData, userConfig, nodeConfig)
  }
  
  // 检测Blob对象
  if (workflowData instanceof Blob) {
    return await handleFileInput(workflowData, userConfig, nodeConfig)
  }
  
  // 检测URL字符串
  if (typeof workflowData === 'string' && isValidUrl(workflowData)) {
    return await handleUrlInput(workflowData, userConfig, nodeConfig)
  }
  
  // 检测文本字符串
  if (typeof workflowData === 'string') {
    return await handleTextInput(workflowData, userConfig, nodeConfig)
  }
  
  // 检测WorkflowData格式
  if (workflowData?.content) {
    if (workflowData.content.audio) {
      return await handleWorkflowDataAudio(workflowData, userConfig, nodeConfig)
    }
    if (workflowData.content.text) {
      return await handleTextInput(workflowData, userConfig, nodeConfig)
    }
  }
  
  // 无法识别的格式
  console.warn(`[mediaInputHandler] 无法识别的输入格式:`, {
    type: typeof workflowData,
    constructor: workflowData?.constructor?.name,
    keys: workflowData && typeof workflowData === 'object' ? Object.keys(workflowData) : []
  })
  
  // 返回原始数据信息
  return createMediaResult('unknown', {
    originalData: workflowData,
    detectedType: typeof workflowData,
    error: '无法识别的输入格式'
  }, userConfig, nodeConfig)
}

/**
 * 处理WorkflowData格式的音频
 */
async function handleWorkflowDataAudio(workflowData, userConfig, nodeConfig) {
  console.log(`[mediaInputHandler] 处理WorkflowData音频格式`)
  
  const audioData = workflowData.content.audio
  
  if (audioData.url) {
    try {
      const response = await fetch(audioData.url)
      const audioBlob = await response.blob()
      const audioFile = new File([audioBlob], audioData.name || 'audio.wav', {
        type: audioData.type || 'audio/wav'
      })
      
      console.log(`[mediaInputHandler] WorkflowData音频转换完成:`, audioFile.name)
      return audioFile
      
    } catch (error) {
      console.error(`[mediaInputHandler] WorkflowData音频处理失败:`, error)
      throw new Error(`音频数据处理失败: ${error.message}`)
    }
  }
  
  throw new Error('WorkflowData音频数据缺少URL')
}

// ===== 工具函数 =====

/**
 * 提取文件信息
 */
function extractFileInfo(file) {
  const mediaType = detectMediaType(file.type)
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    mediaType: mediaType,
    isAudio: mediaType === 'audio',
    isVideo: mediaType === 'video',
    isImage: mediaType === 'image'
  }
}

/**
 * 检测媒体类型
 */
function detectMediaType(mimeType) {
  if (!mimeType) return 'file'
  
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('text/')) return 'text'
  
  return 'file'
}

/**
 * 获取文件扩展名
 */
function getFileExtension(mimeType) {
  const mimeToExt = {
    'audio/wav': 'wav',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'text/plain': 'txt',
    'application/json': 'json'
  }
  
  return mimeToExt[mimeType] || 'bin'
}

/**
 * 验证URL格式
 */
function isValidUrl(string) {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:'
  } catch {
    return false
  }
}

/**
 * 从URL提取文件名
 */
function extractFileNameFromUrl(url) {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const fileName = pathname.split('/').pop()
    return fileName && fileName.includes('.') ? fileName.split('.')[0] : null
  } catch {
    return null
  }
}

/**
 * 创建标准的WorkflowData格式
 */
function createWorkflowDataFormat(type, content, metadata = {}) {
  return {
    type: type,
    content: content,
    metadata: {
      timestamp: Date.now(),
      source: 'media-input',
      ...metadata
    }
  }
}

/**
 * 创建媒体结果对象（降级格式）
 */
function createMediaResult(mediaType, data, userConfig, nodeConfig) {
  return {
    type: 'media',
    mediaType: mediaType,
    data: data,
    config: userConfig,
    metadata: {
      processedAt: new Date().toISOString(),
      nodeType: nodeConfig?.nodeType || 'media-input',
      source: 'media-input-handler'
    }
  }
}
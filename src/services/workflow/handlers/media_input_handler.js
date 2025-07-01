/**
 * 多媒体输入Handler - 简化版本，标准格式直接返回File对象
 */

export default async function mediaInputHandler(input) {
  console.log(`[mediaInputHandler] === 开始执行多媒体输入处理 ===`)
  
  const { workflowData, userConfig, nodeConfig } = input
  
  // 🔧 正确提取用户配置
  const actualUserConfig = userConfig?.userConfig || userConfig?.configResult?.config || userConfig || {}
  const inputType = actualUserConfig.inputType || 'file'
  const outputFormat = actualUserConfig.outputFormat || 'standard'
  
  console.log('[DEBUG] 多媒体节点配置:', {
    inputType,
    outputFormat,
    hasWorkflowData: !!workflowData,
    userConfigKeys: Object.keys(actualUserConfig)
  })

  try {
    // 1. 根据输入类型获取音频文件
    let audioFile = null
    
    switch (inputType) {
      case 'file':
        audioFile = await handleFileInput(actualUserConfig)
        break
      case 'url':
        audioFile = await handleUrlInput(actualUserConfig)
        break
      default:
        throw new Error(`不支持的输入类型: ${inputType}`)
    }
    
    if (!audioFile) {
      throw new Error('未获取到有效的音频文件')
    }
    
    // 2. 验证是否为音频文件
    if (!isAudioFile(audioFile)) {
      console.warn('[DEBUG] 警告：文件可能不是音频格式:', audioFile.type)
    }
    
    // 3. 根据outputFormat格式化输出
    const result = await formatAudioOutput(audioFile, outputFormat)
    
    console.log(`[mediaInputHandler] ✅ 处理完成:`, {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      outputFormat,
      resultType: typeof result
    })
    
    return result
    
  } catch (error) {
    console.error(`[mediaInputHandler] ❌ 处理失败:`, error)
    throw new Error(`多媒体输入处理失败: ${error.message}`)
  }
}

/**
 * 处理文件上传输入
 */
async function handleFileInput(userConfig) {
  console.log(`[handleFileInput] 处理文件上传`)
  
  // 1. 用户直接上传的文件
  if (userConfig?.mediaFile instanceof File) {
    console.log('[DEBUG] ✅ 找到用户上传的文件:', userConfig.mediaFile.name)
    return userConfig.mediaFile
  }
  
  // 2. 检查是否有文件路径或其他文件引用
  if (userConfig?.mediaFile && typeof userConfig.mediaFile === 'string') {
    console.log('[DEBUG] 尝试处理文件路径:', userConfig.mediaFile)
    
    // 创建文件引用
    const file = new File([''], userConfig.mediaFile, { 
      type: getAudioMimeType(userConfig.mediaFile)
    })
    file.path = userConfig.mediaFile
    file.isLocalFile = true
    return file
  }
  
  throw new Error('没有检测到上传的音频文件，请选择文件')
}

/**
 * 处理URL输入
 */
async function handleUrlInput(userConfig) {
  console.log(`[handleUrlInput] 处理URL下载`)
  
  const urlInput = userConfig?.urlInput
  
  if (!urlInput || !isValidUrl(urlInput)) {
    throw new Error('请输入有效的音频文件URL地址')
  }
  
  try {
    console.log(`[DEBUG] 下载远程音频文件:`, urlInput)
    
    const response = await fetch(urlInput)
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const fileName = extractFileNameFromUrl(urlInput) || 'downloaded-audio.wav'
    const audioFile = new File([blob], fileName, { 
      type: blob.type || getAudioMimeType(fileName)
    })
    
    console.log(`[DEBUG] ✅ 远程音频下载完成:`, {
      fileName: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })
    
    return audioFile
    
  } catch (error) {
    throw new Error(`URL处理失败: ${error.message}`)
  }
}

/**
 * 🎯 简化的输出格式化 - 标准格式直接返回File对象
 */
async function formatAudioOutput(audioFile, outputFormat) {
  console.log(`[formatAudioOutput] 格式化输出: ${outputFormat}`)
  
  switch (outputFormat) {
    case 'standard':
      // 🎯 标准格式：直接返回File对象，最简单！
      console.log('[DEBUG] ✅ 直接输出File对象')
      return audioFile  // 直接返回，不包装
    
    case 'base64':
      // Base64格式 - 用于特殊需求
      console.log('[DEBUG] 转换为Base64格式')
      const base64Data = await fileToBase64(audioFile)
      return {
        content: base64Data,
        metadata: {
          processedAt: new Date().toISOString(),
          source: 'media-input',
          outputFormat: 'base64',
          fileInfo: {
            name: audioFile.name,
            size: audioFile.size,
            type: audioFile.type
          }
        }
      }
    
    case 'url':
      // Blob URL格式 - 用于预览
      console.log('[DEBUG] 创建Blob URL')
      const blobUrl = URL.createObjectURL(audioFile)
      return {
        content: blobUrl,
        metadata: {
          processedAt: new Date().toISOString(),
          source: 'media-input',
          outputFormat: 'url',
          fileInfo: {
            name: audioFile.name,
            size: audioFile.size,
            type: audioFile.type,
            url: blobUrl,
            isTemporary: true
          }
        }
      }
    
    default:
      // 默认使用标准格式
      console.log('[DEBUG] 使用默认标准格式')
      return audioFile  // 直接返回File对象
  }
}

// ===== 工具函数 =====

/**
 * 验证是否为音频文件
 */
function isAudioFile(file) {
  if (file.type && file.type.startsWith('audio/')) {
    return true
  }
  
  const audioExtensions = ['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.wma']
  const fileName = file.name.toLowerCase()
  return audioExtensions.some(ext => fileName.endsWith(ext))
}

/**
 * 根据文件名获取音频MIME类型
 */
function getAudioMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  const audioMimeTypes = {
    'wav': 'audio/wav',
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'ogg': 'audio/ogg',
    'wma': 'audio/x-ms-wma'
  }
  return audioMimeTypes[ext] || 'audio/wav'
}

/**
 * File转Base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 验证URL格式
 */
function isValidUrl(string) {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
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
    return fileName && fileName.includes('.') ? fileName : null
  } catch {
    return null
  }
}
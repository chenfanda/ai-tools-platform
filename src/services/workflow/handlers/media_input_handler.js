/**
 * 多媒体输入Handler - 修复本地文件读取版本
 */

export default async function mediaInputHandler(input) {
  console.log(`[mediaInputHandler] === 开始执行多媒体输入处理 ===`)
  
  // 🔧 新增：优先使用标准化数据
  let actualUserConfig = {}
  
  if (input.data) {
    // 使用新的标准化输入
    console.log('[DEBUG] 使用标准化输入数据:', input.data)
    actualUserConfig = input.userConfig || {}
  } else {
    // 保持向后兼容：使用原有逻辑
    console.log('[DEBUG] 使用传统输入格式')
    const { workflowData, userConfig, nodeConfig } = input
    
    // 🔧 正确提取用户配置
    actualUserConfig = userConfig?.userConfig || userConfig?.configResult?.config || userConfig || {}
  }
  
  const inputType = actualUserConfig.inputType || 'file'
  const outputFormat = actualUserConfig.outputFormat || 'standard'
  
  console.log('[DEBUG] 多媒体节点配置:', {
    inputType,
    outputFormat,
    hasMediaFile: !!actualUserConfig.mediaFile,
    mediaFileType: typeof actualUserConfig.mediaFile,
    isFileObject: actualUserConfig.mediaFile instanceof File,
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
      resultType: typeof result,
      isLocalFile: audioFile.isLocalFile || false
    })
    
    return result
    
  } catch (error) {
    console.error(`[mediaInputHandler] ❌ 处理失败:`, error)
    throw new Error(`多媒体输入处理失败: ${error.message}`)
  }
}

/**
 * 🔧 修复：处理文件上传输入
 */
async function handleFileInput(userConfig) {
  console.log(`[handleFileInput] 处理文件上传`)
  console.log(`[DEBUG] userConfig.mediaFile:`, {
    type: typeof userConfig.mediaFile,
    isFile: userConfig.mediaFile instanceof File,
    value: userConfig.mediaFile
  })
  
  // 1. 用户直接上传的文件
  if (userConfig?.mediaFile instanceof File) {
    console.log('[DEBUG] ✅ 找到用户上传的文件:', {
      name: userConfig.mediaFile.name,
      size: userConfig.mediaFile.size,
      type: userConfig.mediaFile.type
    })
    return userConfig.mediaFile
  }
  
  // 2. 🔧 关键修复：处理文件路径的情况 - 提供更好的错误信息
  if (userConfig?.mediaFile && typeof userConfig.mediaFile === 'string') {
    console.log('[DEBUG] 检测到文件路径字符串:', userConfig.mediaFile)
    
    if (userConfig.mediaFile.trim().length > 0) {
      const filePath = userConfig.mediaFile.trim()
      
      // 🔧 关键修复：直接提示用户正确的使用方式
      throw new Error(`
检测到文件路径字符串："${filePath}"

⚠️ 工作流节点不支持文件路径，请使用以下方式：

1. 🔧 在多媒体节点配置中，使用文件上传功能直接选择文件
2. 📁 不要输入文件路径，而是点击"选择文件"按钮上传文件
3. 🌐 或者使用URL输入模式，输入网络文件地址

💡 提示：工作流中的文件处理需要用户直接上传File对象，不能通过文件路径读取。
      `.trim())
    }
  }
  
  // 3. 检查是否有文件对象但不是File实例（可能是文件描述符）
  if (userConfig?.mediaFile && typeof userConfig.mediaFile === 'object') {
    console.log('[DEBUG] 检测到文件对象（非File实例）:', userConfig.mediaFile)
    
    // 尝试从对象中提取文件信息
    const fileInfo = userConfig.mediaFile
    if (fileInfo.name || fileInfo.path) {
      const fileName = fileInfo.name || fileInfo.path
      const fileSize = fileInfo.size || 0
      const fileType = fileInfo.type || getAudioMimeType(fileName)
      
      // 🔧 修复：如果有路径信息，尝试读取文件
      if (fileInfo.path) {
        try {
          return await readLocalFile(fileInfo.path)
        } catch (error) {
          console.error('[DEBUG] 从文件描述符读取失败:', error.message)
        }
      }
      
      // 降级：创建文件对象
      const fileObj = new File(['file-descriptor-placeholder'], fileName, { 
        type: fileType
      })
      
      // 复制所有属性
      Object.assign(fileObj, fileInfo)
      
      console.log('[DEBUG] ⚠️ 从文件描述符创建File对象（可能无内容）:', {
        name: fileObj.name,
        size: fileObj.size,
        type: fileObj.type
      })
      
      return fileObj
    }
  }
  
  throw new Error(`
❌ 多媒体节点配置错误

请检查以下配置：

1. 📁 文件上传模式：
   - 使用"选择文件"按钮直接上传音频文件
   - 不要输入文件路径字符串

2. 🌐 URL模式：
   - 切换到URL输入模式
   - 输入完整的网络文件地址 (http/https)

3. 🔧 配置检查：
   - 确保选择了正确的输入类型
   - 确保文件已成功上传

💡 工作流节点需要真实的File对象，不支持文件路径处理。
  `.trim())
}

/**
 * 🆕 读取本地文件内容
 */
async function readLocalFile(filePath) {
  console.log('[DEBUG] 尝试读取本地文件:', filePath)
  
  try {
    // 🔧 方案1：使用 File System Access API（现代浏览器）
    if ('showOpenFilePicker' in window) {
      console.log('[DEBUG] 尝试使用 File System Access API')
      
      // 注意：这需要用户交互，无法直接通过路径读取
      // 这里只是示例，实际需要其他方案
      throw new Error('File System Access API 需要用户交互')
    }
    
    // 🔧 方案2：使用 window.fs API（如果可用）
    if (window.fs && window.fs.readFile) {
      console.log('[DEBUG] 使用 window.fs API 读取文件')
      
      try {
        const fileData = await window.fs.readFile(filePath)
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'audio.wav'
        const mimeType = getAudioMimeType(fileName)
        
        // 创建真实的 File 对象
        const audioFile = new File([fileData], fileName, { type: mimeType })
        audioFile.path = filePath
        audioFile.isLocalFile = true
        audioFile.originalPath = filePath
        
        console.log('[DEBUG] ✅ window.fs 读取成功:', {
          name: audioFile.name,
          size: audioFile.size,
          type: audioFile.type,
          path: audioFile.path
        })
        
        return audioFile
        
      } catch (fsError) {
        console.error('[DEBUG] window.fs 读取失败:', fsError)
        throw new Error(`文件系统读取失败: ${fsError.message}`)
      }
    }
    
    // 🔧 方案3：使用 fetch 读取文件（如果是可访问的URL）
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('file://')) {
      console.log('[DEBUG] 尝试通过 fetch 读取文件')
      
      try {
        const response = await fetch(filePath)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const blob = await response.blob()
        const fileName = filePath.split('/').pop() || 'audio.wav'
        
        const audioFile = new File([blob], fileName, { 
          type: blob.type || getAudioMimeType(fileName)
        })
        audioFile.path = filePath
        audioFile.isLocalFile = filePath.startsWith('file://')
        audioFile.originalPath = filePath
        
        console.log('[DEBUG] ✅ fetch 读取成功:', {
          name: audioFile.name,
          size: audioFile.size,
          type: audioFile.type
        })
        
        return audioFile
        
      } catch (fetchError) {
        console.error('[DEBUG] fetch 读取失败:', fetchError)
        throw new Error(`URL 读取失败: ${fetchError.message}`)
      }
    }
    
    // 🔧 最后的降级方案：返回错误信息
    throw new Error('浏览器环境不支持直接读取本地文件路径。请使用文件上传功能。')
    
  } catch (error) {
    console.error('[DEBUG] 本地文件读取完全失败:', error)
    throw new Error(`无法读取本地文件: ${error.message}`)
  }
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
      
      // 🔧 修复：如果是本地文件引用，不能转换为base64
      if (audioFile.isLocalFile && audioFile.size <= 100) {
        throw new Error('本地文件引用不支持Base64格式输出，请使用标准格式')
      }
      
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
      
      // 🔧 修复：如果是本地文件引用，返回文件路径
      if (audioFile.isLocalFile && audioFile.size <= 100) {
        return {
          content: audioFile.path,
          metadata: {
            processedAt: new Date().toISOString(),
            source: 'media-input',
            outputFormat: 'local-path',
            fileInfo: {
              name: audioFile.name,
              path: audioFile.path,
              type: audioFile.type,
              isLocalFile: true
            }
          }
        }
      }
      
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
  const ext = getFileExtension(filename)
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
 * 获取文件扩展名
 */
function getFileExtension(filename) {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() : 'wav'
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
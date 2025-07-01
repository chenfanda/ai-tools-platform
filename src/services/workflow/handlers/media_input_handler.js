/**
 * 多媒体输入Handler - 完整版本
 * 
 * 功能：
 * - 支持文件上传、文本输入、URL下载
 * - 根据outputFormat输出不同格式
 * - 支持本地文件和远程URL
 * - 为下游节点提供标准化输出
 */

export default async function mediaInputHandler(input) {
  console.log(`[mediaInputHandler] 执行多媒体输入处理`)
  
  const { workflowData, userConfig, nodeConfig } = input
  
  // 正确读取嵌套的用户配置
  const actualUserConfig = userConfig.userConfig || userConfig.configResult?.config || userConfig
  const inputType = actualUserConfig.inputType || nodeConfig.data?.defaultData?.inputType || 'file'
  const outputFormat = actualUserConfig.outputFormat || nodeConfig.data?.defaultData?.outputFormat || 'standard'
  
  console.log('[DEBUG] 多媒体节点配置:', {
    inputType,
    outputFormat,
    hasWorkflowData: !!workflowData,
    userConfigKeys: Object.keys(actualUserConfig)
  })

  try {
    // 1. 根据输入类型获取原始内容
    let rawContent = null
    
    switch (inputType) {
      case 'file':
        rawContent = await handleFileInput(workflowData, actualUserConfig, nodeConfig)
        break
      case 'text':
        rawContent = await handleTextInput(workflowData, actualUserConfig, nodeConfig)
        break
      case 'url':
        rawContent = await handleUrlInput(workflowData, actualUserConfig, nodeConfig)
        break
      default:
        rawContent = await handleAutoDetection(workflowData, actualUserConfig, nodeConfig)
    }
    
    // 2. 根据outputFormat格式化输出
    const result = await formatOutput(rawContent, outputFormat, actualUserConfig)
    
    console.log(`[mediaInputHandler] 处理完成:`, {
      inputType,
      outputFormat,
      contentType: typeof result.content,
      hasMetadata: !!result.metadata
    })
    
    return result
    
  } catch (error) {
    console.error(`[mediaInputHandler] 处理失败:`, error)
    throw new Error(`多媒体输入处理失败: ${error.message}`)
  }
}

/**
 * 处理文件输入
 */
async function handleFileInput(workflowData, userConfig, nodeConfig) {
  console.log(`[handleFileInput] 处理文件输入`)
  
  // 1. 直接的File对象
  if (workflowData instanceof File) {
    console.log('[DEBUG] 使用workflowData中的File对象:', workflowData.name)
    return workflowData
  }
  
  // 2. 用户上传的文件
  if (userConfig?.mediaFile instanceof File) {
    console.log('[DEBUG] 使用用户上传的文件:', userConfig.mediaFile.name)
    return userConfig.mediaFile
  }
  
  // 3. 本地文件路径（从nodeConfig.defaultData或其他地方）
  const localFilePath = nodeConfig?.data?.defaultData?.mediaFile || 
                        userConfig?.mediaFile
  
  if (localFilePath && typeof localFilePath === 'string') {
    console.log('[DEBUG] 处理本地文件路径:', localFilePath)
    
    // 尝试通过本地文件API访问
    try {
      const response = await fetch(`/api/files/${localFilePath}`)
      if (response.ok) {
        const blob = await response.blob()
        return new File([blob], localFilePath, { 
          type: blob.type || getFileTypeFromExtension(localFilePath)
        })
      }
    } catch (error) {
      console.warn('[DEBUG] 无法通过API访问本地文件:', error.message)
    }
    
    // 创建文件引用（包含路径信息）
    const file = new File([''], localFilePath, { 
      type: getFileTypeFromExtension(localFilePath)
    })
    file.path = localFilePath
    file.isLocalFile = true
    console.log('[DEBUG] 创建本地文件引用:', localFilePath)
    return file
  }
  
  // 4. Blob数据
  if (workflowData instanceof Blob) {
    const fileName = userConfig?.customFileName || 'media-file'
    const file = new File([workflowData], fileName, { type: workflowData.type })
    console.log('[DEBUG] 从Blob创建文件:', fileName)
    return file
  }
  
  throw new Error('没有检测到有效的文件输入，请上传文件或检查配置')
}

/**
 * 处理文本输入
 */
async function handleTextInput(workflowData, userConfig, nodeConfig) {
  console.log(`[handleTextInput] 处理文本输入`)
  
  let textContent = ''
  
  // 从多个来源尝试获取文本
  if (typeof workflowData === 'string') {
    textContent = workflowData
  } else if (userConfig?.textInput) {
    textContent = userConfig.textInput
  } else if (nodeConfig?.data?.defaultData?.textInput) {
    textContent = nodeConfig.data.defaultData.textInput
  }
  
  if (!textContent || !textContent.trim()) {
    throw new Error('没有检测到有效的文本内容')
  }
  
  console.log(`[DEBUG] 文本内容长度: ${textContent.length}`)
  return textContent
}

/**
 * 处理URL输入
 */
async function handleUrlInput(workflowData, userConfig, nodeConfig) {
  console.log(`[handleUrlInput] 处理URL输入`)
  
  let urlInput = ''
  
  // 从多个来源尝试获取URL
  if (typeof workflowData === 'string' && isValidUrl(workflowData)) {
    urlInput = workflowData
  } else if (userConfig?.urlInput) {
    urlInput = userConfig.urlInput
  } else if (nodeConfig?.data?.defaultData?.urlInput) {
    urlInput = nodeConfig.data.defaultData.urlInput
  }
  
  if (!urlInput || !isValidUrl(urlInput)) {
    throw new Error('没有检测到有效的URL地址')
  }
  
  try {
    console.log(`[DEBUG] 下载远程文件:`, urlInput)
    const response = await fetch(urlInput)
    if (!response.ok) {
      throw new Error(`URL下载失败: ${response.status} ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const fileName = extractFileNameFromUrl(urlInput) || 'downloaded-file'
    const file = new File([blob], fileName, { type: blob.type })
    
    console.log(`[DEBUG] 远程文件下载完成:`, fileName)
    return file
    
  } catch (error) {
    throw new Error(`URL处理失败: ${error.message}`)
  }
}

/**
 * 自动检测输入类型
 */
async function handleAutoDetection(workflowData, userConfig, nodeConfig) {
  console.log(`[handleAutoDetection] 自动检测输入类型`)
  
  if (workflowData instanceof File || workflowData instanceof Blob) {
    return await handleFileInput(workflowData, userConfig, nodeConfig)
  }
  
  if (typeof workflowData === 'string' && isValidUrl(workflowData)) {
    return await handleUrlInput(workflowData, userConfig, nodeConfig)
  }
  
  if (typeof workflowData === 'string') {
    return await handleTextInput(workflowData, userConfig, nodeConfig)
  }
  
  // 检查配置中是否有有效输入
  if (userConfig?.mediaFile || nodeConfig?.data?.defaultData?.mediaFile) {
    return await handleFileInput(workflowData, userConfig, nodeConfig)
  }
  
  if (userConfig?.textInput) {
    return await handleTextInput(workflowData, userConfig, nodeConfig)
  }
  
  if (userConfig?.urlInput) {
    return await handleUrlInput(workflowData, userConfig, nodeConfig)
  }
  
  throw new Error('无法识别的输入格式，请选择正确的输入类型')
}

/**
 * 根据outputFormat格式化输出
 */
async function formatOutput(rawContent, outputFormat, userConfig) {
  console.log(`[formatOutput] 格式化输出: ${outputFormat}`)
  
  const metadata = {
    processedAt: new Date().toISOString(),
    source: 'media-input',
    outputFormat: outputFormat,
    inputType: userConfig.inputType || 'auto'
  }
  
  switch (outputFormat) {
    case 'standard':
      // 标准格式：直接返回原始内容
      if (rawContent instanceof File) {
        metadata.fileInfo = {
          name: rawContent.name,
          size: rawContent.size,
          type: rawContent.type,
          lastModified: rawContent.lastModified,
          isLocalFile: rawContent.isLocalFile || false,
          path: rawContent.path || null
        }
      } else if (typeof rawContent === 'string') {
        metadata.textInfo = {
          length: rawContent.length,
          type: 'text'
        }
      }
      
      return {
        content: rawContent,
        metadata: metadata
      }
    
    case 'base64':
      // Base64编码格式
      if (rawContent instanceof File || rawContent instanceof Blob) {
        console.log('[DEBUG] 转换为Base64格式')
        const base64Data = await blobToBase64(rawContent)
        
        metadata.fileInfo = {
          name: rawContent.name || 'file',
          size: rawContent.size,
          type: rawContent.type,
          encoding: 'base64'
        }
        
        return {
          content: base64Data,
          metadata: metadata
        }
      } else if (typeof rawContent === 'string') {
        const base64Text = btoa(unescape(encodeURIComponent(rawContent)))
        return {
          content: `data:text/plain;base64,${base64Text}`,
          metadata: metadata
        }
      }
      break
    
    case 'url':
      // URL引用格式
      if (rawContent instanceof File || rawContent instanceof Blob) {
        console.log('[DEBUG] 创建Blob URL')
        const blobUrl = URL.createObjectURL(rawContent)
        
        metadata.fileInfo = {
          name: rawContent.name || 'file',
          size: rawContent.size,
          type: rawContent.type,
          url: blobUrl,
          isTemporary: true
        }
        
        return {
          content: blobUrl,
          metadata: metadata
        }
      } else if (typeof rawContent === 'string' && isValidUrl(rawContent)) {
        return {
          content: rawContent,
          metadata: metadata
        }
      }
      break
    
    case 'metadata':
      // 仅元数据格式
      if (rawContent instanceof File) {
        metadata.fileInfo = {
          name: rawContent.name,
          size: rawContent.size,
          type: rawContent.type,
          lastModified: rawContent.lastModified,
          isLocalFile: rawContent.isLocalFile || false,
          path: rawContent.path || null
        }
      } else if (typeof rawContent === 'string') {
        metadata.textInfo = {
          length: rawContent.length,
          preview: rawContent.substring(0, 100)
        }
      }
      
      return {
        content: null,
        metadata: metadata
      }
    
    default:
      throw new Error(`不支持的输出格式: ${outputFormat}`)
  }
  
  // 默认返回标准格式
  return {
    content: rawContent,
    metadata: metadata
  }
}

// ===== 工具函数 =====

/**
 * Blob转Base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
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
    return fileName && fileName.includes('.') ? fileName : 'downloaded-file'
  } catch {
    return 'downloaded-file'
  }
}

/**
 * 根据文件扩展名获取MIME类型
 */
function getFileTypeFromExtension(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes = {
    'wav': 'audio/wav',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'avi': 'video/avi',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
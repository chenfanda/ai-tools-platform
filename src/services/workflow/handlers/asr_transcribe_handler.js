/**
 * ASR语音识别Handler - 专门对接本地ASR API
 * 
 * API规格：
 * - 端点：POST http://localhost:8002/transcribe
 * - 输入：FormData {file: File, language: string, format: string}
 * - 输出：string (txt格式) 或 {text: string, confidence: number} (json格式)
 */

export default async function asrTranscribeHandler(input) {
  console.log(`[asrTranscribeHandler] === 开始执行ASR识别 ===`)
  
  const { workflowData, userConfig } = input
  
  // 🔧 正确提取用户配置
  const actualUserConfig = userConfig?.userConfig || userConfig?.configResult?.config || userConfig || {}
  const language = actualUserConfig.language || 'zh'
  const format = actualUserConfig.format || 'txt'
  const defaultEndpoint = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://asr-api.181901.xyz/transcribe'
    : 'http://localhost:8002/transcribe';
  const apiEndpoint = actualUserConfig.apiEndpoint || defaultEndpoint
  
  console.log('[DEBUG] ASR配置:', { language, format, apiEndpoint })
  console.log('[DEBUG] 输入数据:', {
    workflowDataType: typeof workflowData,
    hasContent: !!workflowData?.content,
    hasMetadata: !!workflowData?.metadata,
    dataType: workflowData?.type
  })

  try {
    // 🎯 关键：从多媒体节点输出中提取音频文件（现在支持异步）
    const audioFile = await extractAudioFile(workflowData)
    
    if (!audioFile) {
      throw new Error('没有接收到有效的音频文件，请确保上游连接了多媒体输入节点')
    }
    
    console.log('[DEBUG] ✅ 成功提取音频文件:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      isLocalFile: audioFile.isLocalFile || false
    })
    
    // 🚀 调用ASR API
    const transcriptionResult = await callASRAPI(audioFile, language, format, apiEndpoint)
    
    console.log('[DEBUG] ✅ ASR识别成功')
    
    // 🎯 返回标准化结果
    return formatASRResult(transcriptionResult, format, {
      language,
      format,
      audioFileName: audioFile.name,
      audioSize: audioFile.size
    })
    
  } catch (error) {
    console.error(`[asrTranscribeHandler] ❌ 识别失败:`, error)
    throw new Error(`语音识别失败: ${error.message}`)
  }
}

/**
 * 🔑 从多媒体节点输出中提取音频文件（简化版本）
 */
async function extractAudioFile(workflowData) {
  console.log('[DEBUG] 提取音频文件，数据结构:', {
    type: typeof workflowData,
    isFile: workflowData instanceof File,
    hasContent: !!workflowData?.content,
    contentType: typeof workflowData?.content,
    fileName: workflowData instanceof File ? workflowData.name : 'N/A'
  })
  
  // 🎯 优先：多媒体节点直接输出的File对象（标准格式）
  if (workflowData instanceof File) {
    console.log('[DEBUG] ✅ 直接使用多媒体节点的File对象:', {
      name: workflowData.name,
      size: workflowData.size,
      type: workflowData.type
    })
    return workflowData
  }
  
  // 兼容：包装格式 {content: File}
  if (workflowData?.content instanceof File) {
    console.log('[DEBUG] ✅ 从包装格式提取File对象:', {
      name: workflowData.content.name,
      size: workflowData.content.size,
      type: workflowData.content.type
    })
    return workflowData.content
  }
  
  // 2. 直接的File对象（向后兼容）
  if (workflowData instanceof File) {
    console.log('[DEBUG] ✅ 直接File对象')
    return workflowData
  }
  
  // 3. Base64格式（如果多媒体节点输出base64）
  if (typeof workflowData?.content === 'string' && workflowData.content.startsWith('data:')) {
    console.log('[DEBUG] ✅ Base64格式，转换为File对象')
    return base64ToFile(workflowData.content, 'audio.wav')
  }
  
  // 4. URL格式（如果多媒体节点输出blob URL）
  if (typeof workflowData?.content === 'string' && workflowData.content.startsWith('blob:')) {
    console.log('[DEBUG] ✅ Blob URL格式，转换为File对象')
    try {
      const response = await fetch(workflowData.content)
      const blob = await response.blob()
      return new File([blob], 'audio.wav', { type: blob.type || 'audio/wav' })
    } catch (error) {
      throw new Error('Blob URL 转换失败')
    }
  }
  
  // 5. 本地文件路径（处理isLocalFile的情况）
  if (workflowData?.content?.isLocalFile && workflowData.content.path) {
    console.log('[DEBUG] ⚠️ 本地文件路径格式')
    return workflowData.content
  }
  
  console.error('[DEBUG] ❌ 无法识别的音频数据格式')
  console.error('[DEBUG] workflowData详情:', workflowData)
  return null
}

/**
 * 🚀 调用ASR API
 */
async function callASRAPI(audioFile, language, format, apiEndpoint) {
  console.log('[DEBUG] 调用ASR API:', {
    endpoint: apiEndpoint,
    language,
    format,
    fileName: audioFile.name
  })
  
  try {
    // 构建FormData
    const formData = new FormData()
    formData.append('file', audioFile)
    
    // 构建URL参数
    const url = new URL(apiEndpoint)
    url.searchParams.set('language', language)
    url.searchParams.set('format', format)
    
    console.log('[DEBUG] 发送请求到:', url.toString())
    
    // 发送请求
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
      // 不设置Content-Type，让浏览器自动设置multipart/form-data
    })
    
    if (!response.ok) {
      let errorMessage = `ASR API请求失败: ${response.status} ${response.statusText}`
      
      try {
        const errorData = await response.text()
        if (errorData) {
          errorMessage += ` - ${errorData}`
        }
      } catch (e) {
        // 忽略错误解析失败
      }
      
      throw new Error(errorMessage)
    }
    
    // 解析响应
    const result = format === 'json' ? await response.json() : await response.text()
    
    console.log('[DEBUG] API响应成功:', {
      format,
      resultType: typeof result,
      resultLength: typeof result === 'string' ? result.length : 'N/A'
    })
    
    return result
    
  } catch (error) {
    console.error('[DEBUG] API调用失败:', error)
    throw new Error(`ASR API调用失败: ${error.message}`)
  }
}

/**
 * 🎯 格式化ASR结果
 */
function formatASRResult(apiResult, format, metadata) {
  console.log('[DEBUG] 格式化ASR结果:', { format, resultType: typeof apiResult })
  
  if (format === 'json' && typeof apiResult === 'object') {
    // JSON格式：{text: "识别结果", confidence: 0.95}
    return {
      transcription: apiResult.text || apiResult.transcription || String(apiResult),
      confidence: apiResult.confidence || null,
      metadata: {
        ...metadata,
        apiFormat: 'json',
        processedAt: new Date().toISOString()
      }
    }
  } else {
    // 文本格式：直接字符串
    const text = typeof apiResult === 'string' ? apiResult : String(apiResult)
    return {
      transcription: text,
      confidence: null,
      metadata: {
        ...metadata,
        apiFormat: 'txt',
        textLength: text.length,
        processedAt: new Date().toISOString()
      }
    }
  }
}

// ===== 工具函数 =====

/**
 * Base64转File对象
 */
function base64ToFile(base64String, fileName) {
  try {
    const [metadata, base64Data] = base64String.split(',')
    const mimeType = metadata.match(/:(.*?);/)?.[1] || 'audio/wav'
    
    // 将base64转换为Uint8Array
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    
    // 创建File对象
    return new File([byteArray], fileName, { type: mimeType })
  } catch (error) {
    throw new Error(`Base64转换失败: ${error.message}`)
  }
}
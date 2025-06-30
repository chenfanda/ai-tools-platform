/**
 * ASR语音识别Handler - 从DynamicAdapter提取
 * 
 * 功能：
 * - 处理音频文件上传
 * - 调用ASR API进行语音识别
 * - 支持多种语言和输出格式
 * 
 * 输入格式：preprocessInput()的输出
 * 输出格式：识别结果文本或JSON（与原executeASRRequest一致）
 */

export default async function asrTranscribeHandler(input) {
  console.log(`[asrTranscribeHandler] 执行ASR语音识别请求`)
  
  const { workflowData, userConfig, nodeConfig } = input
  
  try {
    // 构建FormData请求，复制原有逻辑
    const formData = new FormData()
    
    // 提取音频文件 - 复用原有的extractAudioFile逻辑
    const audioFile = await extractAudioFile(workflowData)
    formData.append('file', audioFile)
    
    // 添加用户配置参数 - 复制原有逻辑
    formData.append('language', userConfig.language || 'zh')
    formData.append('format', userConfig.format || 'txt')
    
    console.log(`[asrTranscribeHandler] ASR请求参数:`, {
      language: userConfig.language || 'zh',
      format: userConfig.format || 'txt',
      hasAudioFile: !!audioFile,
      audioFileName: audioFile?.name,
      audioFileSize: audioFile?.size
    })
    
    // 🆕 增强：从nodeConfig获取API端点配置
    const apiEndpoint = nodeConfig?.execution?.endpoint || 'http://localhost:8002/transcribe'
    const requestTimeout = (nodeConfig?.execution?.timeout || 30) * 1000 // 转换为毫秒
    
    console.log(`[asrTranscribeHandler] 使用API端点: ${apiEndpoint}`)
    
    // 发送HTTP请求 - 复制原有逻辑，增加超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), requestTimeout)
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      let errorMessage = `ASR请求失败: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
      } catch (e) {
        // 解析失败，使用默认消息
      }
      throw new Error(errorMessage)
    }
    
    // 处理响应 - 复制原有逻辑
    const result = userConfig.format === 'json' ? 
      await response.json() : await response.text()
    
    console.log(`[asrTranscribeHandler] ASR请求成功:`, {
      resultType: typeof result,
      resultLength: typeof result === 'string' ? result.length : 'N/A',
      format: userConfig.format || 'txt'
    })
    
    // 🆕 增强：为JSON格式添加额外的元数据
    if (userConfig.format === 'json' && typeof result === 'object') {
      result.metadata = {
        ...result.metadata,
        processedAt: new Date().toISOString(),
        language: userConfig.language || 'zh',
        audioFile: {
          name: audioFile?.name,
          size: audioFile?.size,
          type: audioFile?.type
        }
      }
    }
    
    return result
    
  } catch (error) {
    console.error(`[asrTranscribeHandler] ASR请求失败:`, error)
    
    // 🆕 增强：提供更详细的错误信息
    if (error.name === 'AbortError') {
      throw new Error('ASR请求超时，请检查网络连接或增加超时时间')
    }
    
    if (error.message.includes('Failed to fetch')) {
      throw new Error('无法连接到ASR服务，请检查服务是否启动')
    }
    
    throw error
  }
}

/**
 * 从输入数据中提取音频文件
 * 复用DynamicAdapter的extractAudioFile逻辑
 */
async function extractAudioFile(workflowData) {
  console.log(`[asrTranscribeHandler] 提取音频文件:`, workflowData)
  
  // WorkflowData格式的音频数据
  if (workflowData?.content?.audio?.url) {
    const audioData = workflowData.content.audio
    console.log(`[asrTranscribeHandler] 找到音频URL:`, audioData.url)
    
    try {
      // 从URL获取音频文件
      const response = await fetch(audioData.url)
      if (!response.ok) {
        throw new Error(`音频下载失败: ${response.status}`)
      }
      
      const audioBlob = await response.blob()
      const audioFile = new File([audioBlob], audioData.name || 'audio.wav', {
        type: audioData.type || 'audio/wav'
      })
      console.log(`[asrTranscribeHandler] 成功转换为File对象:`, audioFile.name)
      return audioFile
    } catch (error) {
      console.error(`[asrTranscribeHandler] 音频文件下载失败:`, error)
      throw new Error(`无法下载音频文件: ${error.message}`)
    }
  }
  
  // 直接的File对象
  if (workflowData instanceof File) {
    console.log(`[asrTranscribeHandler] 直接文件对象:`, workflowData.name)
    
    // 验证是否为音频文件
    if (!workflowData.type || !workflowData.type.startsWith('audio/')) {
      console.warn(`[asrTranscribeHandler] 文件类型可能不是音频: ${workflowData.type}`)
    }
    
    return workflowData
  }
  
  // Blob数据
  if (workflowData instanceof Blob) {
    console.log(`[asrTranscribeHandler] Blob数据:`, workflowData.type)
    const audioFile = new File([workflowData], 'audio.wav', { 
      type: workflowData.type || 'audio/wav' 
    })
    return audioFile
  }
  
  // 🆕 增强：支持Base64音频数据
  if (typeof workflowData === 'string' && workflowData.startsWith('data:audio/')) {
    console.log(`[asrTranscribeHandler] Base64音频数据`)
    try {
      const response = await fetch(workflowData)
      const audioBlob = await response.blob()
      const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' })
      return audioFile
    } catch (error) {
      throw new Error(`Base64音频数据解析失败: ${error.message}`)
    }
  }
  
  // 🆕 增强：支持音频URL
  if (typeof workflowData === 'string' && (workflowData.startsWith('http') || workflowData.startsWith('blob:'))) {
    console.log(`[asrTranscribeHandler] 音频URL:`, workflowData)
    try {
      const response = await fetch(workflowData)
      if (!response.ok) {
        throw new Error(`音频下载失败: ${response.status}`)
      }
      
      const audioBlob = await response.blob()
      const fileName = workflowData.split('/').pop() || 'audio.wav'
      const audioFile = new File([audioBlob], fileName, { 
        type: audioBlob.type || 'audio/wav' 
      })
      return audioFile
    } catch (error) {
      throw new Error(`音频URL下载失败: ${error.message}`)
    }
  }
  
  // 其他格式的处理
  console.error(`[asrTranscribeHandler] 无法识别的音频数据格式:`, workflowData)
  throw new Error('ASR节点需要音频文件输入，支持的格式：File对象、Blob、音频URL、Base64音频数据')
}

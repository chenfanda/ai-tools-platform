/**
 * 简化的ASR Handler - 只处理文件，不管其他复杂格式
 */

export default async function asrTranscribeHandler(input) {
  console.log(`[asrTranscribeHandler] === 开始执行 ===`)
  
  // 立即打印所有输入信息
  console.log('[DEBUG] 完整的input对象:', input)
  console.log('[DEBUG] input的类型:', typeof input)
  console.log('[DEBUG] input的键:', Object.keys(input || {}))
  
  const { workflowData, userConfig } = input
  
  console.log('[DEBUG] workflowData:', workflowData)
  console.log('[DEBUG] workflowData类型:', typeof workflowData)
  console.log('[DEBUG] userConfig:', userConfig)
  
  // 如果workflowData有内容，详细分析
  if (workflowData) {
    console.log('[DEBUG] workflowData详细分析:')
    console.log('- typeof:', typeof workflowData)
    console.log('- constructor:', workflowData.constructor?.name)
    console.log('- instanceof File:', workflowData instanceof File)
    console.log('- instanceof Blob:', workflowData instanceof Blob)
    if (typeof workflowData === 'object') {
      console.log('- keys:', Object.keys(workflowData))
      console.log('- 完整对象:', workflowData)
    }
  }
  
  try {
    // 获取用户配置
    const actualUserConfig = userConfig.userConfig || userConfig.configResult?.config || userConfig
    const language = actualUserConfig.language || 'zh'
    const format = actualUserConfig.format || 'txt'
    
    console.log('[DEBUG] ASR配置:', { language, format })
    console.log('[DEBUG] 接收到的数据:', {
      workflowDataType: typeof workflowData,
      hasContent: !!workflowData?.content,
      contentType: typeof workflowData?.content
    })
    
    // 找到音频文件
    let audioFile = null
    
    // 🎯 关键修复：多媒体节点输出格式是 {content: File, metadata: {...}}
    if (workflowData?.content) {
      console.log('[DEBUG] 从多媒体节点输出的content字段提取音频')
      audioFile = await extractAudioFile(workflowData.content)  // 添加 await
    } 
    // 向后兼容：直接处理workflowData
    else if (workflowData) {
      console.log('[DEBUG] 直接从workflowData提取音频')
      audioFile = await extractAudioFile(workflowData)  // 添加 await
    }
    else {
      throw new Error('没有接收到音频数据')
    }
    
    if (!audioFile) {
      throw new Error('无法提取音频文件')
    }
    
    console.log('[DEBUG] 音频文件:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })
    
    // 发送到ASR API
    const formData = new FormData()
    formData.append('file', audioFile)
    
    const url = new URL('http://localhost:8002/transcribe')
    url.searchParams.set('language', language)
    url.searchParams.set('format', format)
    
    console.log('[DEBUG] 发送API请求:', url.toString())
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`ASR API失败: ${response.status}`)
    }
    
    // 处理响应
    const result = format === 'json' ? await response.json() : await response.text()
    
    console.log('[DEBUG] ASR识别成功')
    
    // 返回标准格式
    return {
      transcription: typeof result === 'string' ? result : (result.text || JSON.stringify(result)),
      confidence: typeof result === 'object' ? result.confidence : null
    }
    
  } catch (error) {
    console.error(`[asrTranscribeHandler] 失败:`, error)
    throw new Error(`语音识别失败: ${error.message}`)
  }
}

/**
 * 简化的音频提取 - 专门处理多媒体节点的输出
 */
async function extractAudioFile(data) {
  console.log('[DEBUG] 提取音频文件:', {
    type: typeof data,
    isFile: data instanceof File,
    isBlob: data instanceof Blob,
    constructor: data?.constructor?.name,
    hasPath: !!data?.path,
    isLocalFile: !!data?.isLocalFile
  })
  
  // 1. 直接是File对象 - 多媒体节点standard格式输出
  if (data instanceof File) {
    console.log('[DEBUG] ✅ 找到File对象:', data.name)
    return data
  }
  
  // 2. 直接是Blob对象
  if (data instanceof Blob) {
    console.log('[DEBUG] ✅ 找到Blob对象，转换为File')
    return new File([data], 'audio.wav', { type: data.type || 'audio/wav' })
  }
  
  // 3. Base64格式 - 多媒体节点base64格式输出
  if (typeof data === 'string' && data.startsWith('data:')) {
    console.log('[DEBUG] ✅ 找到Base64数据，转换为File')
    const response = await fetch(data)
    const blob = await response.blob()
    return new File([blob], 'audio.wav', { type: 'audio/wav' })
  }
  
  // 4. URL格式 - 多媒体节点url格式输出  
  if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('blob:'))) {
    console.log('[DEBUG] ✅ 找到URL，下载转换为File')
    const response = await fetch(data)
    const blob = await response.blob()
    return new File([blob], 'audio.wav', { type: blob.type || 'audio/wav' })
  }
  
  // 5. 本地文件路径字符串
  if (typeof data === 'string' && data.match(/\.(wav|mp3|m4a|aac|flac|ogg)$/i)) {
    console.log('[DEBUG] ⚠️ 本地文件路径，创建空File对象:', data)
    const file = new File([''], data, { type: 'audio/wav' })
    file.path = data
    file.isLocalFile = true
    return file
  }
  
  console.error('[DEBUG] ❌ 无法识别的音频数据格式')
  console.error('[DEBUG] 数据详情:', data)
  return null
}
// ===== 📌 DEPRECATED: 此文件功能已被统一接口层替代，仅保留兼容性 =====
// 
// ⚠️ 警告：此文件将在未来版本中移除，新功能请使用：
// - UnifiedNodeManager (统一节点管理)
// - ConfigurationResolver (配置解析) 
// - NodeStatusCalculator (状态计算)
// - DynamicNodeRegistry (动态节点注册)

import { ModuleAdapter } from './ModuleAdapter'

/**
 * 动态节点适配器 - 基于JSON配置执行节点
 * 继承现有ModuleAdapter模式，保持架构一致性
 * 
 * 🔄 重构说明：
 * - 添加动态handler加载机制
 * - 保留原有降级逻辑作为安全网
 * - 接口和行为完全向后兼容
 */
export class DynamicAdapter extends ModuleAdapter {
  constructor(config) {
    super(config)
    this.nodeConfig = config.nodeConfig // JSON配置信息
    this.executorConfig = this.nodeConfig?.execution || {} 
    
    // 🆕 新增：handler缓存，提高性能
    this.handlerCache = new Map()
    
    console.log(`[DynamicAdapter] 初始化动态适配器:`, {
      nodeType: this.nodeConfig?.nodeType,
      handler: this.executorConfig?.handler,
      cacheEnabled: true
    })
  }

  /**
   * 🆕 新增：动态加载handler
   * 优先尝试从handlers目录加载，失败时降级到内置方法
   */
  async loadHandler(handlerName) {
    // 检查缓存
    if (this.handlerCache.has(handlerName)) {
      console.log(`[DynamicAdapter] 从缓存获取handler: ${handlerName}`)
      return this.handlerCache.get(handlerName)
    }
    
    try {
      // 尝试动态导入handler
      const handlerPath = `./handlers/${handlerName}.js`
      console.log(`[DynamicAdapter] 尝试加载动态handler: ${handlerPath}`)
      
      const HandlerModule = await import(handlerPath)
      const handler = HandlerModule.default || HandlerModule[handlerName]
      
      if (typeof handler !== 'function') {
        throw new Error(`Handler不是有效的函数: ${handlerName}`)
      }
      
      // 缓存handler
      this.handlerCache.set(handlerName, handler)
      console.log(`[DynamicAdapter] 动态handler加载成功: ${handlerName}`)
      
      return handler
      
    } catch (error) {
      console.warn(`[DynamicAdapter] 动态handler加载失败: ${handlerName}`, error.message)
      console.log(`[DynamicAdapter] 将降级到内置handler`)
      
      // 返回null，表示需要降级到内置方法
      return null
    }
  }

  async preprocessInput(workflowData) {
    console.log(`[DynamicAdapter] 预处理输入数据:`, workflowData)
    
    // 构建处理所需的完整输入数据 - 保持原有格式
    const processedInput = {
      workflowData: workflowData,
      nodeConfig: this.nodeConfig,
      userConfig: this.config, // 用户在DynamicConfigPanel中设置的参数
      nodeType: this.nodeConfig?.nodeType || 'dynamic'
    }
    
    console.log(`[DynamicAdapter] 预处理完成:`, {
      hasWorkflowData: !!workflowData,
      userConfigKeys: Object.keys(this.config),
      handler: this.executorConfig?.handler
    })
    
    return processedInput
  }

  async execute(input) {
    const handler = this.executorConfig?.handler
    
    if (!handler) {
      throw new Error('缺少执行处理器配置')
    }
    
    console.log(`[DynamicAdapter] 执行处理器: ${handler}`)
    
    // 🆕 新增：尝试动态加载handler
    const dynamicHandler = await this.loadHandler(handler)
    if (dynamicHandler) {
      console.log(`[DynamicAdapter] 使用动态handler: ${handler}`)
      try {
        return await dynamicHandler(input)
      } catch (error) {
        console.error(`[DynamicAdapter] 动态handler执行失败: ${handler}`, error)
        throw error
      }
    }
    
    // 🔄 保留：原有的降级逻辑，确保向后兼容
    console.log(`[DynamicAdapter] 降级到内置handler: ${handler}`)
    switch (handler) {
      case 'asr_transcribe_handler':
        return await this.executeASRRequest(input)
      
      case 'media_input_handler':
        return await this.executeMediaInput(input)
      
      case 'text_process_handler':
        return await this.executeTextProcess(input)
      
      default:
        throw new Error(`未知处理器: ${handler}`)
    }
  }

  async postprocessOutput(result) {
    console.log(`[DynamicAdapter] 后处理输出:`, result)
    
    // 📌 修复：动态导入WorkflowData，避免循环依赖
    const { WorkflowData } = await import('./ModuleAdapter')
    
    const nodeType = this.nodeConfig?.nodeType || 'dynamic'
    
    const workflowData = WorkflowData.normalize(result, nodeType, {
      source: 'dynamic-adapter',
      nodeConfig: this.nodeConfig?.metadata,
      executedAt: new Date().toISOString()
    })
    
    console.log(`[DynamicAdapter] 输出标准化完成:`, workflowData.getPreview())
    return workflowData
  }

  // ===== 以下保持原有的内置handler方法不变，作为降级方案 =====

  /**
   * ASR语音识别处理器
   * 复用TTSAdapter的HTTP请求模式
   */
 async executeASRRequest(input) {
  console.log(`[DynamicAdapter] 执行ASR请求`)
  
  try {
    // 构建FormData请求，模仿TTSAdapter的模式
    const formData = new FormData()
    
    // 提取音频文件
    const audioFile = await this.extractAudioFile(input.workflowData)
    formData.append('file', audioFile)
    
    // 添加用户配置参数
    formData.append('language', input.userConfig.language || 'zh')
    formData.append('format', input.userConfig.format || 'txt')
    
    console.log(`[DynamicAdapter] ASR请求参数:`, {
      language: input.userConfig.language || 'zh',
      format: input.userConfig.format || 'txt',
      hasAudioFile: !!audioFile
    })
    
    // 发送HTTP请求
    const response = await fetch('http://localhost:8002/transcribe', {
      method: 'POST',
      body: formData
    })
    
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
    
    // 处理响应
    const result = input.userConfig.format === 'json' ? 
      await response.json() : await response.text()
    
    console.log(`[DynamicAdapter] ASR请求成功:`, {
      resultType: typeof result,
      resultLength: typeof result === 'string' ? result.length : 'N/A'
    })
    
    return result
    
  } catch (error) {
    console.error(`[DynamicAdapter] ASR请求失败:`, error)
    throw error
  }
}

  /**
   * 多媒体输入处理器
   */
  async executeMediaInput(input) {
    console.log(`[DynamicAdapter] 执行多媒体输入处理`)
    
    // 简单处理：返回输入的文件信息
    const result = {
      type: 'media',
      files: input.workflowData,
      config: input.userConfig,
      metadata: {
        processedAt: new Date().toISOString(),
        fileType: input.userConfig.fileType || 'unknown'
      }
    }
    
    console.log(`[DynamicAdapter] 多媒体输入处理完成`)
    return result
  }

  /**
   * 文本处理器 - 保留作为降级方案
   */
  async executeTextProcess(input) {
    console.log(`[DynamicAdapter] 执行文本处理 (内置降级方案)`)
    
    // 提取文本内容
    let text = ''
    
    if (typeof input.workflowData === 'string') {
      text = input.workflowData
    } else if (input.workflowData?.content?.text) {
      text = input.workflowData.content.text
    } else if (input.workflowData?.text) {
      text = input.workflowData.text
    }
    
    // 根据用户配置处理文本
    const config = input.userConfig
    
    if (config.removeEmptyLines) {
      text = text.replace(/^\s*\n/gm, '')
    }
    
    if (config.trimWhitespace) {
      text = text.trim()
    }
    
    if (config.maxLength && text.length > config.maxLength) {
      text = text.substring(0, config.maxLength)
    }
    
    console.log(`[DynamicAdapter] 文本处理完成 (内置):`, {
      originalLength: input.workflowData?.length || 'unknown',
      processedLength: text.length
    })
    
    return text
  }

  /**
   * 从输入数据中提取音频文件
   * 复用TTSAdapter的文件处理逻辑
   */
  async extractAudioFile(workflowData) {
    console.log(`[DynamicAdapter] 提取音频文件:`, workflowData)
    
    // WorkflowData格式的音频数据
    if (workflowData?.content?.audio?.url) {
      const audioData = workflowData.content.audio
      console.log(`[DynamicAdapter] 找到音频URL:`, audioData.url)
      
      try {
        // 从URL获取音频文件
        const response = await fetch(audioData.url)
        const audioBlob = await response.blob()
        const audioFile = new File([audioBlob], audioData.name || 'audio.wav', {
          type: audioData.type || 'audio/wav'
        })
        console.log(`[DynamicAdapter] 成功转换为File对象:`, audioFile.name)
        return audioFile
      } catch (error) {
        console.error(`[DynamicAdapter] 音频文件下载失败:`, error)
        throw new Error('无法下载音频文件')
      }
    }
    
    // 直接的File对象
    if (workflowData instanceof File) {
      console.log(`[DynamicAdapter] 直接文件对象:`, workflowData.name)
      return workflowData
    }
    
    // Blob数据
    if (workflowData instanceof Blob) {
      console.log(`[DynamicAdapter] Blob数据:`, workflowData.type)
      const audioFile = new File([workflowData], 'audio.wav', { type: 'audio/wav' })
      return audioFile
    }
    
    // 其他格式的处理
    console.warn(`[DynamicAdapter] 无法识别的音频数据格式:`, workflowData)
    throw new Error('ASR节点需要音频文件输入，但接收到的不是音频数据')
  }

  /**
   * 处理工作流数据的主方法（复制自ModuleAdapter）
   */
  async process(workflowData) {
    const startTime = Date.now();
    
    try {
      const moduleInput = await this.preprocessInput(workflowData);
      const moduleResult = await this.execute(moduleInput);
      const workflowOutput = await this.postprocessOutput(moduleResult);
      
      return {
        success: true,
        data: workflowOutput,
        execution_time: Date.now() - startTime
      };
    } catch (error) {
      // 📌 修复：动态导入 WorkflowData 避免循环依赖
      const { WorkflowData } = await import('./ModuleAdapter')
      
      return {
        success: false,
        error: error.message,
        data: WorkflowData.createError(error.message),
        execution_time: Date.now() - startTime
      };
    }
  }

  /**
   * 🆕 新增：获取handler缓存状态（调试用）
   */
  getHandlerCacheStatus() {
    return {
      cacheSize: this.handlerCache.size,
      cachedHandlers: Array.from(this.handlerCache.keys())
    }
  }

  /**
   * 🆕 新增：清除handler缓存（调试用）
   */
  clearHandlerCache() {
    this.handlerCache.clear()
    console.log(`[DynamicAdapter] Handler缓存已清除`)
  }
}

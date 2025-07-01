// ===== 📌 DEPRECATED: 此文件功能已被统一接口层替代，仅保留兼容性 =====

import { ModuleAdapter, WorkflowData } from './ModuleAdapter'

/**
 * 动态节点适配器 - 基于JSON配置执行节点
 */
export class DynamicAdapter extends ModuleAdapter {
  constructor(config) {
    super(config)
    this.nodeConfig = config.nodeConfig
    // 🔧 修复：优先使用 DynamicExecutor 传递的 executorConfig
    this.executorConfig = config.executorConfig || this.nodeConfig?.execution || {}
    this.handlerCache = new Map()
    
    console.log(`[DynamicAdapter] 初始化动态适配器:`, {
      nodeType: this.nodeConfig?.nodeType || config.nodeType,
      handler: this.executorConfig?.handler,
      cacheEnabled: true,
      executorConfigSource: config.executorConfig ? 'DynamicExecutor' : 'nodeConfig.execution',
      hasExecutorConfig: !!this.executorConfig,
      executorConfigKeys: Object.keys(this.executorConfig)
    })
  }

  /**
   * 🆕 动态节点专用的数据标准化方法
   * 主要修复：正确识别File对象为音频类型
   */
  static normalizeDynamicData(data, sourceNodeType = 'unknown', metadata = {}) {
    console.log(`[DynamicAdapter] 标准化动态节点数据 - 来源: ${sourceNodeType}`, data);
    
    // 如果已经是 WorkflowData 格式，直接返回
    if (data && data.type && data.content && data.metadata) {
      console.log(`[DynamicAdapter] 已是标准格式，直接返回`);
      return data;
    }

    try {
      // 🎯 关键修复：优先检测 File 对象（多媒体节点的输出）
      if (data?.content instanceof File) {
        console.log(`[DynamicAdapter] ✅ 识别为文件对象类型`);
        
        const file = data.content;
        
        // 检测是否为音频文件
        if (this.isAudioFile(file)) {
          const audioInfo = {
            id: `file_${Date.now()}`,
            url: URL.createObjectURL(file),
            name: file.name,
            type: file.type,
            size: file.size,
            format: this.getFileExtension(file.name),
            isLocalFile: file.isLocalFile || false,
            path: file.path || null
          };
          
          console.log(`[DynamicAdapter] ✅ 创建音频 WorkflowData:`, audioInfo);
          
          return WorkflowData.createAudio(audioInfo, {
            source: sourceNodeType,
            originalFormat: 'file_object',
            fileInfo: {
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            },
            ...metadata
          });
        }
      }

      // 其他情况使用原有的 WorkflowData.normalize()
      return WorkflowData.normalize(data, sourceNodeType, metadata);

    } catch (error) {
      console.error('[DynamicAdapter] 标准化失败，创建错误数据:', error);
      return WorkflowData.createError(`数据标准化失败: ${error.message}`, { 
        source: sourceNodeType,
        originalData: data,
        ...metadata 
      });
    }
  }

  /**
   * 检测是否为音频文件
   */
  static isAudioFile(file) {
    if (file.type && file.type.startsWith('audio/')) {
      return true;
    }
    
    const audioExtensions = ['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.wma'];
    const fileName = file.name.toLowerCase();
    return audioExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * 获取文件扩展名
   */
  static getFileExtension(fileName) {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : 'bin';
  }

  async loadHandler(handlerName) {
    if (this.handlerCache.has(handlerName)) {
      console.log(`[DynamicAdapter] 从缓存获取handler: ${handlerName}`)
      return this.handlerCache.get(handlerName)
    }
    
    try {
      const handlerPath = `./handlers/${handlerName}.js`
      console.log(`[DynamicAdapter] 尝试加载动态handler: ${handlerPath}`)
      
      const HandlerModule = await import(handlerPath)
      const handler = HandlerModule.default || HandlerModule[handlerName]
      
      if (typeof handler !== 'function') {
        throw new Error(`Handler不是有效的函数: ${handlerName}`)
      }
      
      this.handlerCache.set(handlerName, handler)
      console.log(`[DynamicAdapter] 动态handler加载成功: ${handlerName}`)
      
      return handler
      
    } catch (error) {
      console.warn(`[DynamicAdapter] 动态handler加载失败: ${handlerName}`, error.message)
      return null
    }
  }

  async preprocessInput(workflowData) {
    console.log(`[DynamicAdapter] 预处理输入数据:`, workflowData)
    
    const processedInput = {
      workflowData: workflowData,
      nodeConfig: this.nodeConfig,
      userConfig: this.config,
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
    
    // 尝试动态加载handler
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
    
    throw new Error(`未找到处理器: ${handler}`)
  }

  async postprocessOutput(result) {
    console.log(`[DynamicAdapter] 后处理输出:`, result)
    
    const nodeType = this.nodeConfig?.nodeType || 'dynamic'
    
    // 🔧 修复：使用专门的数据标准化方法
    const workflowData = DynamicAdapter.normalizeDynamicData(result, nodeType, {
      source: 'dynamic-adapter',
      nodeConfig: this.nodeConfig?.metadata,
      executedAt: new Date().toISOString()
    })
    
    console.log(`[DynamicAdapter] 输出标准化完成:`, workflowData.getPreview())
    return workflowData
  }

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
      return {
        success: false,
        error: error.message,
        data: WorkflowData.createError(error.message),
        execution_time: Date.now() - startTime
      };
    }
  }

  getHandlerCacheStatus() {
    return {
      cacheSize: this.handlerCache.size,
      cachedHandlers: Array.from(this.handlerCache.keys())
    }
  }

  clearHandlerCache() {
    this.handlerCache.clear()
    console.log(`[DynamicAdapter] Handler缓存已清除`)
  }
}
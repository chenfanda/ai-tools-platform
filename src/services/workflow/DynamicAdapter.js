// ===== 📌 最小修复版本：保持原始逻辑，只修复输出转换问题 =====

import { ModuleAdapter, WorkflowData } from './ModuleAdapter'

/**
 * 动态节点适配器 - 最小修复版本
 * 🔧 修复：不强制转换 File 对象，保持原始传递逻辑
 */
export class DynamicAdapter extends ModuleAdapter {
  constructor(config) {
    super(config)
    this.nodeConfig = config.nodeConfig
    // 🔧 修复：优先使用 DynamicExecutor 传递的 executorConfig
    this.executorConfig = config.executorConfig || this.nodeConfig?.execution || {}
    this.handlerCache = new Map()
    
    console.log(`[DynamicAdapter] 初始化动态适配器:`, {
      nodeType: this.nodeConfig?.meta?.nodeId || this.nodeConfig?.node?.type || this.nodeConfig?.nodeType || config.nodeType,
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
      // 🔧 新增：直接的 File 对象处理
      if (data instanceof File) {
        console.log(`[DynamicAdapter] ✅ 直接File对象，检测文件类型`);
        
        // 检测是否为音频文件
        if (this.isAudioFile(data)) {
          const audioInfo = {
            id: `file_${Date.now()}`,
            url: URL.createObjectURL(data),
            name: data.name,
            type: data.type,
            size: data.size,
            format: this.getFileExtension(data.name),
            isLocalFile: data.isLocalFile || false,
            path: data.path || null
          };
          
          console.log(`[DynamicAdapter] ✅ 创建音频 WorkflowData:`, audioInfo);
          
          return WorkflowData.createAudio(audioInfo, {
            source: sourceNodeType,
            originalFormat: 'direct_file',
            fileInfo: {
              name: data.name,
              size: data.size,
              type: data.type,
              lastModified: data.lastModified
            },
            ...metadata
          });
        }
        
        // 检测是否为图片文件
        if (this.isImageFile(data)) {
          console.log(`[DynamicAdapter] ✅ 识别为图片文件`);
          // 这里可以扩展图片处理逻辑
          return WorkflowData.createError('图片文件处理暂未实现', {
            source: sourceNodeType,
            fileType: 'image',
            fileName: data.name
          });
        }
        
        // 检测是否为视频文件
        if (this.isVideoFile(data)) {
          console.log(`[DynamicAdapter] ✅ 识别为视频文件`);
          // 这里可以扩展视频处理逻辑
          return WorkflowData.createError('视频文件处理暂未实现', {
            source: sourceNodeType,
            fileType: 'video',
            fileName: data.name
          });
        }
        
        // 检测是否为文本文件
        if (this.isTextFile(data)) {
          console.log(`[DynamicAdapter] ✅ 识别为文本文件`);
          // 这里可以扩展文本文件处理逻辑
          return WorkflowData.createError('文本文件处理暂未实现', {
            source: sourceNodeType,
            fileType: 'text',
            fileName: data.name
          });
        }
        
        // 未知文件类型
        console.log(`[DynamicAdapter] ⚠️ 未知文件类型: ${data.type}`);
        return WorkflowData.createError(`不支持的文件类型: ${data.type}`, {
          source: sourceNodeType,
          fileName: data.name,
          fileType: data.type
        });
      }

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
   * 检测是否为文本文件
   */
  static isTextFile(file) {
    if (file.type && (file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/xml')) {
      return true;
    }
    
    const textExtensions = ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.yaml', '.yml', '.ini', '.conf', '.cfg'];
    const fileName = file.name.toLowerCase();
    return textExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * 检测是否为图片文件
   */
  static isImageFile(file) {
    if (file.type && file.type.startsWith('image/')) {
      return true;
    }
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'];
    const fileName = file.name.toLowerCase();
    return imageExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * 检测是否为视频文件
   */
  static isVideoFile(file) {
    if (file.type && file.type.startsWith('video/')) {
      return true;
    }
    
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.mpg', '.mpeg'];
    const fileName = file.name.toLowerCase();
    return videoExtensions.some(ext => fileName.endsWith(ext));
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
    console.log(`[DynamicAdapter] 动态handler加载成功: ${handlerName} (${typeof handler})`)
    
    return handler
    
  } catch (error) {
    console.warn(`[DynamicAdapter] 动态handler加载失败: ${handlerName}`, error.message)
    return null
  }
}

  /**
   * 提取实际用户配置（处理嵌套结构）
   */
  extractActualUserConfig(rawUserConfig) {
    try {
      // 处理复杂的嵌套配置结构
      if (rawUserConfig?.userConfig) {
        return rawUserConfig.userConfig
      }
      if (rawUserConfig?.configResult?.config) {
        return rawUserConfig.configResult.config
      }
      return rawUserConfig || {}
    } catch (error) {
      console.warn(`[DynamicAdapter] 配置提取失败:`, error.message)
      return {}
    }
  }

  /**
   * 输入标准化转换（保持原始逻辑）
   */
  standardizeInput(workflowData, userConfig, nodeConfig) {
    try {
      const isFirstNode = (workflowData === null || workflowData === undefined)
      const inputSchema = nodeConfig?.inputSchema || {}
      
      console.log(`[DynamicAdapter] 输入标准化:`, {
        isFirstNode,
        hasInputSchema: Object.keys(inputSchema).length > 0,
        inputSchemaKeys: Object.keys(inputSchema),
        userConfigKeys: Object.keys(userConfig)
      })

      if (isFirstNode) {
        // 第一个节点：尝试从 userConfig 按 inputSchema 提取数据
        const standardizedInput = {}
        
        // 简单遍历 inputSchema，尝试从 userConfig 中找对应数据
        for (const [schemaKey, schemaSpec] of Object.entries(inputSchema)) {
          // 优先查找同名字段
          if (userConfig[schemaKey] !== undefined) {
            standardizedInput[schemaKey] = userConfig[schemaKey]
          } else {
            // 尝试从 fields 配置中猜测映射
            const fields = nodeConfig?.fields || []
            const firstField = fields[0]
            if (firstField && userConfig[firstField.name] !== undefined) {
              standardizedInput[schemaKey] = userConfig[firstField.name]
            }
          }
        }
        
        // 如果 inputSchema 为空，直接返回第一个配置字段的值
        if (Object.keys(inputSchema).length === 0) {
          const fields = nodeConfig?.fields || []
          if (fields.length > 0) {
            const firstFieldValue = userConfig[fields[0].name]
            console.log(`[DynamicAdapter] 无inputSchema，使用第一个字段值:`, firstFieldValue)
            return firstFieldValue
          }
        }
        
        console.log(`[DynamicAdapter] 第一个节点标准化结果:`, standardizedInput)
        return standardizedInput
      } else {
        // 非第一个节点：直接使用上游数据，userConfig 作为补充
        if (Object.keys(inputSchema).length === 0) {
          console.log(`[DynamicAdapter] 无inputSchema，直接使用上游数据`)
          return workflowData
        }
        
        // 如果有 inputSchema，尝试将 workflowData 和 userConfig 合并
        const standardizedInput = {}
        
        for (const [schemaKey, schemaSpec] of Object.entries(inputSchema)) {
          // 优先使用 userConfig（配置参数）
          if (userConfig[schemaKey] !== undefined) {
            standardizedInput[schemaKey] = userConfig[schemaKey]
          } else {
            // 🔧 关键修复：不转换，直接传递原始数据给 handler
            standardizedInput[schemaKey] = workflowData
          }
        }
        
        console.log(`[DynamicAdapter] 非第一个节点标准化结果:`, standardizedInput)
        return standardizedInput
      }
    } catch (error) {
      console.warn(`[DynamicAdapter] 输入标准化失败:`, error.message)
      // 降级：返回原始数据
      return workflowData || userConfig
    }
  }

  /**
   * 🔧 关键修复：输出标准化 - 不强制转换
   */
  standardizeOutput(handlerResult, outputSchema) {
    try {
      console.log(`[DynamicAdapter] 输出标准化前:`, {
        resultType: typeof handlerResult,
        isFile: handlerResult instanceof File,
        hasOutputSchema: !!(outputSchema && Object.keys(outputSchema).length > 0)
      })

      // 🔧 关键修复：如果 handler 返回的是 File 对象，不要转换它
      if (handlerResult instanceof File) {
        console.log(`[DynamicAdapter] ✅ Handler 返回 File 对象，保持原样`)
        return handlerResult  // 直接返回 File 对象，不转换
      }

      // 🔧 关键修复：如果 handler 已经返回 WorkflowData，直接使用
      if (handlerResult && handlerResult.type && handlerResult.content && handlerResult.metadata) {
        console.log(`[DynamicAdapter] ✅ Handler 已返回 WorkflowData，保持原样`)
        return handlerResult
      }

      // 如果没有 outputSchema，直接包装
      if (!outputSchema || Object.keys(outputSchema).length === 0) {
        console.log(`[DynamicAdapter] 无outputSchema，包装结果`)
        return this.wrapAsWorkflowData(handlerResult)
      }
      
      // 简单的类型检查
      try {
        const firstOutputKey = Object.keys(outputSchema)[0]
        const expectedType = outputSchema[firstOutputKey]?.type
        
        if (expectedType === 'string' && typeof handlerResult !== 'string') {
          console.warn(`[DynamicAdapter] 输出类型不匹配: 期望 ${expectedType}, 实际 ${typeof handlerResult}`)
        }
      } catch (error) {
        console.warn(`[DynamicAdapter] 输出类型检查失败:`, error.message)
      }
      
      // 包装为 WorkflowData
      return this.wrapAsWorkflowData(handlerResult)
    } catch (error) {
      console.warn(`[DynamicAdapter] 输出标准化失败:`, error.message)
      return this.wrapAsWorkflowData(handlerResult)
    }
  }

  /**
   * 包装为 WorkflowData（保持原始逻辑）
   */
  wrapAsWorkflowData(result) {
    try {
      const nodeType = this.nodeConfig?.meta?.nodeId || this.nodeConfig?.node?.type || this.nodeConfig?.nodeType || 'dynamic'
      
      // 简单的 WorkflowData 包装逻辑
      if (typeof result === 'string') {
        return DynamicAdapter.normalizeDynamicData(result, nodeType, {
          source: 'dynamic-adapter'
        })
      } else if (result instanceof File) {
        return DynamicAdapter.normalizeDynamicData(result, nodeType, {
          source: 'dynamic-adapter'
        })
      } else {
        return DynamicAdapter.normalizeDynamicData(result, nodeType, {
          source: 'dynamic-adapter'
        })
      }
    } catch (error) {
      console.error(`[DynamicAdapter] WorkflowData包装失败:`, error.message)
      return WorkflowData.createError(`数据包装失败: ${error.message}`)
    }
  }

  async preprocessInput(workflowData) {
    console.log(`[DynamicAdapter] 预处理输入数据:`, workflowData)
    
    try {
      // 提取实际配置
      const actualUserConfig = this.extractActualUserConfig(this.config)
      
      // 输入标准化
      const standardizedInput = this.standardizeInput(workflowData, actualUserConfig, this.nodeConfig)
      
      console.log(`[DynamicAdapter] 输入标准化完成:`, {
        isFirstNode: workflowData === null,
        configKeys: Object.keys(actualUserConfig),
        standardizedType: typeof standardizedInput
      })
      
      const processedInput = {
        // 新增：标准化输入数据
        data: standardizedInput,
        
        // 保持向后兼容
        workflowData: workflowData,
        nodeConfig: this.nodeConfig,
        userConfig: actualUserConfig,
        nodeType: this.nodeConfig?.meta?.nodeId || this.nodeConfig?.node?.type || this.nodeConfig?.nodeType || 'dynamic'
      }
      
      console.log(`[DynamicAdapter] 预处理完成:`, {
        hasStandardizedData: !!processedInput.data,
        hasWorkflowData: !!workflowData,
        userConfigKeys: Object.keys(actualUserConfig),
        handler: this.executorConfig?.handler
      })
      
      return processedInput
    } catch (error) {
      console.error(`[DynamicAdapter] 预处理失败:`, error.message)
      // 降级处理
      return {
        workflowData: workflowData,
        nodeConfig: this.nodeConfig,
        userConfig: this.config,
        nodeType: this.nodeConfig?.meta?.nodeId || this.nodeConfig?.node?.type || this.nodeConfig?.nodeType || 'dynamic'
      }
    }
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
    
    try {
      const nodeType = this.nodeConfig?.meta?.nodeId || this.nodeConfig?.node?.type || this.nodeConfig?.nodeType || 'dynamic'
      const outputSchema = this.nodeConfig?.outputSchema || {}
      
      // 🔧 关键修复：使用修复后的输出标准化方法
      const workflowData = this.standardizeOutput(result, outputSchema)
      
      console.log(`[DynamicAdapter] 输出标准化完成:`, {
        outputType: typeof workflowData,
        isWorkflowData: workflowData?.type && workflowData?.content && workflowData?.metadata,
        isFile: workflowData instanceof File
      })
      
      return workflowData
    } catch (error) {
      console.error(`[DynamicAdapter] 后处理失败:`, error.message)
      // 降级处理
      const nodeType = this.nodeConfig?.meta?.nodeId || this.nodeConfig?.node?.type || this.nodeConfig?.nodeType || 'dynamic'
      return DynamicAdapter.normalizeDynamicData(result, nodeType, {
        source: 'dynamic-adapter',
        executedAt: new Date().toISOString()
      })
    }
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
// ===== 📌 DEPRECATED: 此文件功能已被统一接口层替代，仅保留兼容性 =====
// 增强版 ModuleAdapter.js
// 基于现有代码，只增加新方法，不修改现有功能
// 
// ⚠️ 警告：此文件将在未来版本中移除，新功能请使用：
// - UnifiedNodeManager (统一节点管理)
// - ConfigurationResolver (配置解析) 
// - NodeStatusCalculator (状态计算)

export class WorkflowData {
  constructor(type, content, metadata = {}) {
    this.type = type;
    this.content = content;
    this.metadata = {
      timestamp: Date.now(),
      nodeId: null,
      ...metadata
    };
  }

  // ===== 现有方法保持不变 =====
  static createText(text, metadata = {}) {
    return new WorkflowData('text', { text }, metadata);
  }

  static createAudio(audioInfo, metadata = {}) {
    return new WorkflowData('audio', { audio: audioInfo }, metadata);
  }

  static createError(error, metadata = {}) {
    return new WorkflowData('error', { error }, metadata);
  }

  static createDownload(downloadInfo, metadata = {}) {
    return new WorkflowData('download', { download: downloadInfo }, metadata);
  }

  // ===== 新增：标准化方法 (不影响现有功能) =====
  
  /**
   * 智能标准化：从任意格式转换为 WorkflowData
   * 向后兼容所有现有数据格式
   */
  static normalize(data, sourceNodeType = 'unknown', metadata = {}) {
    console.log(`[WorkflowData] 标准化数据 - 来源: ${sourceNodeType}`, data);
    
    // 如果已经是 WorkflowData 格式，直接返回
    if (data && data.type && data.content && data.metadata) {
      console.log(`[WorkflowData] 已是标准格式，直接返回`);
      return data;
    }

    try {
      // 根据数据特征智能识别类型
      
      // 1. 字符串类型 (TextInputNode 的输出)
      if (typeof data === 'string') {
        console.log(`[WorkflowData] 识别为字符串类型`);
        return WorkflowData.createText(data, { 
          source: sourceNodeType, 
          originalFormat: 'string',
          ...metadata 
        });
      }

      // 2. 音频数据检测 (TTSNode 的输出)
      if (data?.content?.audio || data?.audio_id || data?.audio_url) {
        console.log(`[WorkflowData] 识别为音频类型`);
        
        let audioInfo;
        if (data.content?.audio) {
          // 已经是标准格式的音频
          audioInfo = data.content.audio;
        } else {
          // 兼容旧格式
          audioInfo = {
            id: data.audio_id,
            url: data.audio_url || data.url,
            name: data.name || `audio_${Date.now()}.wav`,
            size: data.file_size || data.size,
            format: data.format || 'wav'
          };
        }
        
        return WorkflowData.createAudio(audioInfo, { 
          source: sourceNodeType,
          originalFormat: 'legacy_audio',
          originalText: data.metadata?.originalText || data.originalText,
          ...metadata 
        });
      }

      // 3. 错误数据检测
      if (data?.error || data instanceof Error) {
        console.log(`[WorkflowData] 识别为错误类型`);
        return WorkflowData.createError(data.error || data.message, { 
          source: sourceNodeType,
          originalFormat: 'error',
          ...metadata 
        });
      }

      // 4. 对象类型的文本数据 (某些节点可能返回 {text: "..."})
      if (data?.text || data?.content?.text) {
        console.log(`[WorkflowData] 识别为对象包装的文本`);
        const text = data.text || data.content.text;
        return WorkflowData.createText(text, { 
          source: sourceNodeType,
          originalFormat: 'object_text',
          ...metadata 
        });
      }

      // 5. 默认作为数据对象处理
      console.log(`[WorkflowData] 作为通用数据对象处理`);
      return new WorkflowData('data', data, { 
        source: sourceNodeType,
        originalFormat: 'object',
        ...metadata 
      });

    } catch (error) {
      console.error('[WorkflowData] 标准化失败，创建错误数据:', error);
      return WorkflowData.createError(`数据标准化失败: ${error.message}`, { 
        source: sourceNodeType,
        originalData: data,
        ...metadata 
      });
    }
  }

  /**
   * 为目标节点准备兼容格式的数据
   * 确保现有节点收到期望的数据格式
   */
  toCompatibleFormat(targetNodeType) {
    console.log(`[WorkflowData] 为 ${targetNodeType} 准备兼容数据`, this.type);
    
    switch (targetNodeType) {
      case 'text-input':
        // TextInputNode 期望接收字符串
        if (this.type === 'text') {
          return this.content.text;
        }
        return String(this.content);
      
      case 'tts':
        // TTSNode 可以接收字符串或 WorkflowData
        if (this.type === 'text') {
          return this.content.text; // 返回纯文本字符串
        }
        if (this.metadata?.originalText) {
          return this.metadata.originalText; // 从元数据获取原始文本
        }
        return String(this.content); // 降级到字符串
      
      case 'download':
      case 'output':
        // 这两个节点应该接收完整的 WorkflowData
        return this;
      
      default:
        // 未知节点类型，返回完整的 WorkflowData
        console.log(`[WorkflowData] 未知节点类型 ${targetNodeType}，返回完整数据`);
        return this;
    }
  }

  /**
   * 获取数据预览信息 (替代各节点的重复检测逻辑)
   */
  getPreview() {
    switch (this.type) {
      case 'text':
        const text = this.content.text || '';
        return {
          type: '📝 文本',
          summary: text.length > 50 ? text.substring(0, 50) + '...' : text,
          details: `${text.length} 字符`,
          displayType: 'text'
        };
      
      case 'audio':
        const audio = this.content.audio || {};
        return {
          type: '🎵 音频',
          summary: audio.name || 'audio.wav',
          details: `格式: ${audio.format || 'wav'}, 大小: ${this.formatSize(audio.size)}`,
          displayType: 'audio',
          audioData: audio
        };
      
      case 'error':
        return {
          type: '❌ 错误',
          summary: this.content.error || 'Unknown error',
          details: `来源: ${this.metadata.source || 'unknown'}`,
          displayType: 'error'
        };
      
      case 'data':
        return {
          type: '📊 数据',
          summary: 'Data object',
          details: `${Object.keys(this.content).length} 个属性`,
          displayType: 'data'
        };
      
      default:
        return {
          type: `📄 ${this.type}`,
          summary: 'Unknown content',
          details: `类型: ${this.type}`,
          displayType: 'unknown'
        };
    }
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    if (!bytes || typeof bytes !== 'number') return 'unknown';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * 验证数据完整性
   */
  validate() {
    const errors = [];

    if (!this.type) errors.push('缺少数据类型');
    if (this.content === undefined || this.content === null) errors.push('缺少数据内容');

    // 类型特定验证
    switch (this.type) {
      case 'text':
        if (!this.content.text && this.content.text !== '') {
          errors.push('文本数据缺少 text 字段');
        }
        break;
      case 'audio':
        if (!this.content.audio) {
          errors.push('音频数据缺少 audio 字段');
        } else if (!this.content.audio.url) {
          errors.push('音频数据缺少 URL');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 克隆数据
   */
  clone() {
    return new WorkflowData(
      this.type,
      JSON.parse(JSON.stringify(this.content)),
      { ...this.metadata }
    );
  }
}

// ===== 新增：数据流管理器 =====

export class DataFlowManager {
  /**
   * 在节点输出时自动标准化数据
   */
  static normalizeNodeOutput(nodeType, nodeOutput, nodeId) {
    console.log(`[DataFlow] 标准化 ${nodeType} 节点输出:`, nodeOutput);
    
    const normalized = WorkflowData.normalize(nodeOutput, nodeType, { 
      nodeId,
      processedAt: new Date().toISOString()
    });

    const preview = normalized.getPreview();
    console.log(`[DataFlow] ${nodeType} 标准化完成:`, preview);

    return normalized;
  }

  /**
   * 为目标节点准备输入数据
   */
  static prepareNodeInput(sourceData, targetNodeType) {
    if (!sourceData) {
      console.log(`[DataFlow] 没有源数据传递给 ${targetNodeType}`);
      return null;
    }

    console.log(`[DataFlow] 为 ${targetNodeType} 准备输入数据:`, sourceData);

    // 确保数据是标准格式
    const workflowData = WorkflowData.normalize(sourceData);
    
    // 转换为目标节点期望的格式
    const compatibleInput = workflowData.toCompatibleFormat(targetNodeType);

    console.log(`[DataFlow] ${targetNodeType} 输入准备完成:`, {
      originalType: workflowData.type,
      compatibleFormat: typeof compatibleInput
    });

    return compatibleInput;
  }
}

// ===== 现有的适配器类保持不变 =====

export class ModuleAdapter {
  constructor(config) {
    this.config = config;
  }

  async preprocessInput(workflowData) {
    throw new Error('子类必须实现 preprocessInput 方法');
  }

  async execute(input) {
    throw new Error('子类必须实现 execute 方法');
  }

  async postprocessOutput(moduleResult) {
    throw new Error('子类必须实现 postprocessOutput 方法');
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
}

// ===== TTSAdapter 保持不变 =====
export class TTSAdapter extends ModuleAdapter {
  constructor(config) {
    super(config);
    this.apiUrl = config.ttsApiUrl || config.config?.ttsApiUrl;
  }

  async preprocessInput(workflowData) {
    let inputText = '';
    
    if (!workflowData) {
      throw new Error('TTS节点没有接收到输入数据');
    }
    
    if (typeof workflowData === 'string') {
      inputText = workflowData;
    } else if (workflowData.type === 'text') {
      inputText = workflowData.content?.text || '';
    } else if (workflowData.content?.text) {
      inputText = workflowData.content.text;
    } else if (workflowData.text) {
      inputText = workflowData.text;
    } else {
      throw new Error('TTS节点无法处理输入数据格式');
    }
    
    if (!inputText || !inputText.trim()) {
      throw new Error('TTS节点需要非空的文本输入');
    }

    const ttsInput = {
      text: inputText.trim(),
      mode: this.config.mode || 'character',
      gender: this.config.gender || null,
      pitch: this.config.pitch || null,
      speed: this.config.speed || null
    };

    if (ttsInput.mode === 'character') {
      ttsInput.character_id = this.config.selectedCharacter || this.config.character || '';
      if (!ttsInput.character_id) {
        throw new Error('角色模式下必须选择语音角色');
      }
    } else if (ttsInput.mode === 'custom') {
      ttsInput.username = this.config.username || 'workflow_user';
      ttsInput.voice_id = this.config.voice_id || null;
      if (!ttsInput.voice_id) {
        throw new Error('自定义声音模式需要提供语音ID');
      }
    }

    return ttsInput;
  }

  async execute(input) {
    if (!this.apiUrl) {
      throw new Error('TTS API地址未配置');
    }

    if (input.mode === 'character') {
      const apiUrl = this.apiUrl + '/tts_with_character';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input.text,
          character_id: input.character_id,
          gender: input.gender,
          pitch: input.pitch,
          speed: input.speed
        })
      });

      if (!response.ok) {
        let errorMessage = 'API调用失败: ' + response.status;
        try {
          const error = await response.json();
          errorMessage = error.detail || error.message || errorMessage;
        } catch (e) {
          // 解析失败使用默认消息
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } else if (input.mode === 'custom') {
      const apiUrl = this.apiUrl + '/tts_with_custom_voice';
      
      const formData = new FormData();
      formData.append('text', input.text);
      formData.append('username', input.username || 'workflow_user');
      formData.append('voice_id', input.voice_id);
      
      if (input.gender) formData.append('gender', input.gender);
      if (input.pitch) formData.append('pitch', input.pitch);
      if (input.speed) formData.append('speed', input.speed);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errorMessage = '自定义声音API调用失败: ' + response.status;
        try {
          const error = await response.json();
          errorMessage = error.detail || error.message || errorMessage;
        } catch (e) {
          // 解析失败使用默认消息
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } else {
      throw new Error('不支持的TTS模式: ' + input.mode);
    }
  }

  async postprocessOutput(ttsResult) {
    console.log('[调试] TTS API 原始返回数据:', ttsResult)
    
    const audioInfo = {
      id: ttsResult.audio_id,
      url: ttsResult.audio_url || (this.apiUrl + '/download/' + ttsResult.audio_id),
      name: 'tts_' + ttsResult.audio_id + '.wav',
      type: 'audio/wav',
      format: 'wav',
      size: ttsResult.file_size || null
    };

    console.log('[调试] 构建的 audioInfo:', audioInfo)

    const workflowData = WorkflowData.createAudio(audioInfo, {
      source: 'tts',
      character: this.config.selectedCharacter || this.config.character,
      originalText: ttsResult.text || '未知文本',
      dataSize: ttsResult.file_size || null,
      parameters: {
        gender: this.config.gender,
        pitch: this.config.pitch,
        speed: this.config.speed
      }
    });

    console.log('[调试] 最终生成的 WorkflowData:', workflowData)
    return workflowData;
  }
}

// ===== DownloadAdapter 保持不变 =====
export class DownloadAdapter extends ModuleAdapter {
  constructor(config) {
    super(config);
  }

  async preprocessInput(workflowData) {
    console.log('[DownloadAdapter] 预处理输入数据:', workflowData);
    
    if (!workflowData) {
      throw new Error('下载节点没有接收到输入数据');
    }

    // 分析输入数据类型和内容
    const downloadInput = {
      source: workflowData,
      dataType: this.detectDataType(workflowData),
      config: {
        autoDownload: this.config.autoDownload || false,
        customFileName: this.config.customFileName || '',
        downloadFormat: this.config.downloadFormat || 'auto',
        showProgress: this.config.showProgress !== false,
        allowRetry: this.config.allowRetry !== false
      }
    };

    console.log('[DownloadAdapter] 预处理结果:', downloadInput);
    return downloadInput;
  }

  detectDataType(data) {
    // 音频数据检测
    if (data?.type === 'audio' || data?.content?.audio || data?.audio_id) {
      return 'audio';
    }
    
    // 文本数据检测
    if (typeof data === 'string' || data?.type === 'text' || data?.content?.text) {
      return 'text';
    }
    
    // 图片数据检测
    if (data?.image_url || data?.content?.image) {
      return 'image';
    }
    
    // 视频数据检测
    if (data?.video_url || data?.content?.video) {
      return 'video';
    }
    
    // 默认为数据类型
    return 'data';
  }

  async execute(input) {
    console.log('[DownloadAdapter] 开始执行下载处理:', input);
    
    const { source, dataType, config } = input;
    
    // 生成下载信息
    const downloadInfo = await this.generateDownloadInfo(source, dataType, config);
    
    // 如果启用自动下载，触发下载
    if (config.autoDownload) {
      await this.triggerAutoDownload(downloadInfo, config);
    }
    
    console.log('[DownloadAdapter] 下载处理完成:', downloadInfo);
    return downloadInfo;
  }

  async generateDownloadInfo(source, dataType, config) {
    const timestamp = Date.now();
    const baseFileName = config.customFileName || `download_${timestamp}`;
    
    let downloadInfo = {
      type: dataType,
      fileName: baseFileName,
      format: config.downloadFormat === 'auto' ? this.getDefaultFormat(dataType) : config.downloadFormat,
      size: null,
      url: null,
      canDownload: false,
      metadata: {
        timestamp,
        source: dataType,
        config: config
      }
    };

    switch (dataType) {
      case 'audio':
        downloadInfo = await this.processAudioDownload(source, downloadInfo);
        break;
      case 'text':
        downloadInfo = await this.processTextDownload(source, downloadInfo);
        break;
      case 'image':
        downloadInfo = await this.processImageDownload(source, downloadInfo);
        break;
      case 'video':
        downloadInfo = await this.processVideoDownload(source, downloadInfo);
        break;
      default:
        downloadInfo = await this.processDataDownload(source, downloadInfo);
    }

    // 添加文件扩展名
    if (!downloadInfo.fileName.includes('.')) {
      downloadInfo.fileName += '.' + downloadInfo.format;
    }

    return downloadInfo;
  }

  async processAudioDownload(source, downloadInfo) {
    let audioData = null;
    
    // 解析音频数据
    if (source.content?.audio) {
      audioData = source.content.audio;
    } else if (source.workflowData?.content?.audio) {
      audioData = source.workflowData.content.audio;
    } else if (source.audio_id) {
      audioData = {
        id: source.audio_id,
        url: source.audio_url,
        size: source.file_size
      };
    }

    if (audioData) {
      downloadInfo.url = audioData.url;
      downloadInfo.size = audioData.size;
      downloadInfo.canDownload = !!audioData.url;
      downloadInfo.metadata.audioId = audioData.id;
      downloadInfo.metadata.originalText = source.metadata?.originalText || source.originalText;
    }

    return downloadInfo;
  }

  async processTextDownload(source, downloadInfo) {
    let textContent = '';
    
    if (typeof source === 'string') {
      textContent = source;
    } else if (source.content?.text) {
      textContent = source.content.text;
    } else if (source.text) {
      textContent = source.text;
    }

    if (textContent) {
      // 创建Blob URL
      const blob = new Blob([textContent], { type: 'text/plain' });
      downloadInfo.url = URL.createObjectURL(blob);
      downloadInfo.size = blob.size;
      downloadInfo.canDownload = true;
      downloadInfo.metadata.length = textContent.length;
      downloadInfo.metadata.lines = textContent.split('\n').length;
    }

    return downloadInfo;
  }

  async processImageDownload(source, downloadInfo) {
    let imageUrl = source.image_url || source.content?.image?.url;
    
    if (imageUrl) {
      downloadInfo.url = imageUrl;
      downloadInfo.canDownload = true;
      downloadInfo.metadata.imageUrl = imageUrl;
    }

    return downloadInfo;
  }

  async processVideoDownload(source, downloadInfo) {
    let videoUrl = source.video_url || source.content?.video?.url;
    
    if (videoUrl) {
      downloadInfo.url = videoUrl;
      downloadInfo.canDownload = true;
      downloadInfo.metadata.videoUrl = videoUrl;
    }

    return downloadInfo;
  }

  async processDataDownload(source, downloadInfo) {
    // JSON数据下载
    const jsonContent = JSON.stringify(source, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    downloadInfo.url = URL.createObjectURL(blModuleAdapter.jsob);
    downloadInfo.size = blob.size;
    downloadInfo.canDownload = true;
    downloadInfo.format = 'json';
    downloadInfo.metadata.keys = typeof source === 'object' ? Object.keys(source).length : 0;

    return downloadInfo;
  }

  async triggerAutoDownload(downloadInfo, config) {
    if (!downloadInfo.canDownload || !downloadInfo.url) {
      console.warn('[DownloadAdapter] 自动下载失败: 无可下载内容');
      return;
    }

    console.log('[DownloadAdapter] 触发自动下载:', downloadInfo.fileName);
    
    // 这里在浏览器环境中实际上无法直接触发下载
    // 需要通过UI层的交互来实现
    // 我们只是标记为准备自动下载
    downloadInfo.metadata.autoDownloadTriggered = true;
    downloadInfo.metadata.autoDownloadTime = Date.now();
  }

  getDefaultFormat(dataType) {
    const formatMap = {
      audio: 'wav',
      text: 'txt',
      image: 'png',
      video: 'mp4',
      data: 'json'
    };
    return formatMap[dataType] || 'bin';
  }

  async postprocessOutput(downloadResult) {
    console.log('[DownloadAdapter] 后处理下载结果:', downloadResult);
    
    const workflowData = WorkflowData.createDownload(downloadResult, {
      source: 'download',
      dataType: downloadResult.type,
      fileName: downloadResult.fileName,
      downloadUrl: downloadResult.url,
      canDownload: downloadResult.canDownload
    });

    console.log('[DownloadAdapter] 最终生成的 WorkflowData:', workflowData);
    return workflowData;
  }
}

// ===== AdapterFactory 和 WorkflowExecutor - 修复版 =====

export class AdapterFactory {
  static async createAdapter(nodeType, config) {
    switch (nodeType) {
      case 'tts':
        return new TTSAdapter(config);
      case 'download':
        return new DownloadAdapter(config);
      case 'asr-node':
      case 'media-input':
        // 使用通用的SimpleMediaAdapter，不是MediaInputAdapter
        return new SimpleMediaAdapter(config);
      default:
        throw new Error('不支持的节点类型: ' + nodeType);
    }
  }
}

export class WorkflowExecutor {
  constructor(config) {
    this.config = config;
    this.adapters = new Map();
  }

  async createAdapterForNode(node) {
    const adapterId = node.type + '_' + node.id;
    
    if (!this.adapters.has(adapterId)) {
      // 获取节点的JSON配置信息
      const nodeConfig = await this.getNodeConfig(node.type);
      
      const adapterConfig = {
        ...this.config,
        ...node.data,
        config: this.config,
        nodeConfig: nodeConfig // 传递JSON配置给适配器
      };
      
      const adapter = await AdapterFactory.createAdapter(node.type, adapterConfig);
      this.adapters.set(adapterId, adapter);
    }
    
    return this.adapters.get(adapterId);
  }

  async executeNode(node, inputData) {
    if (node.type === 'text-input') {
      const workflowData = WorkflowData.createText(node.data.text || '', {
        nodeId: node.id,
        source: 'text-input'
      });
      
      return {
        success: true,
        data: workflowData,
        execution_time: 0
      };
    }

    if (node.type === 'output') {
      return {
        success: true,
        data: inputData || WorkflowData.createText('没有输入数据'),
        execution_time: 0
      };
    }

    // 使用适配器处理 TTS 和 Download 节点
    const adapter = await this.createAdapterForNode(node);
    
    if (!inputData) {
      throw new Error('节点 ' + node.id + ' (' + node.type + ') 没有接收到输入数据');
    }
    
    return await adapter.process(inputData);
  }

  /**
   * 📌 修复：获取节点的JSON配置信息
   */
  async getNodeConfig(nodeType) {
    try {
      // 📌 修复导入路径：使用新的动态注册表路径
      const { default: dynamicNodeRegistry } = await import('./dynamic/DynamicNodeRegistry');
      
      // 获取完整的节点配置
      const fullConfig = dynamicNodeRegistry.getFullNodeConfig(nodeType);
      
      if (fullConfig) {
        console.log(`[WorkflowExecutor] 获取到节点配置: ${nodeType}`, fullConfig);
        return fullConfig;
      }
      
      console.log(`[WorkflowExecutor] 未找到节点配置: ${nodeType}`);
      return null;
      
    } catch (error) {
      console.error(`[WorkflowExecutor] 获取节点配置失败: ${nodeType}`, error);
      
      // 📌 降级：尝试从统一管理器获取
      try {
        const { default: unifiedNodeManager } = await import('./UnifiedNodeManager');
        const config = unifiedNodeManager.getNodeTypeConfig(nodeType);
        
        if (config) {
          console.log(`[WorkflowExecutor] 从统一管理器获取配置: ${nodeType}`);
          return config;
        }
      } catch (fallbackError) {
        console.error(`[WorkflowExecutor] 降级获取配置也失败: ${fallbackError.message}`);
      }
      
      return null;
    }
  }

  cleanup() {
    this.adapters.clear();
  }
}

// 简单的媒体适配器，避免循环依赖
export class SimpleMediaAdapter extends ModuleAdapter {
  constructor(config) {
    super(config);
    this.nodeConfig = config.nodeConfig;
    this.executorConfig = this.nodeConfig?.executorConfig || {};
  }

  async preprocessInput(workflowData) {
    return {
      workflowData: workflowData,
      nodeConfig: this.nodeConfig,
      userConfig: this.config,
      nodeType: this.nodeConfig?.node?.type || 'unknown'
    };
  }

  async execute(input) {
    const handler = this.executorConfig?.handler;
    
    if (handler === 'media_input_handler') {
      // 多媒体输入：创建模拟音频数据
      return {
        type: 'audio',
        content: {
          audio: {
            url: input.userConfig.fileUrl,
            name: input.userConfig.fileName,
            type: 'audio/wav'
          }
        }
      };
    } else if (handler === 'asr_transcribe_handler') {
      // ASR识别：返回模拟文本结果
      return "这是模拟的ASR识别结果：你好，这是一段测试音频的转录文本。";
    }
    
    throw new Error(`未知处理器: ${handler}`);
  }

  async postprocessOutput(result) {
    return WorkflowData.normalize(result, this.nodeConfig?.node?.type || 'unknown', {
      source: 'simple-media-adapter',
      executedAt: new Date().toISOString()
    });
  }
}

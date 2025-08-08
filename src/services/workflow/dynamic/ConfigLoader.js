// ===== src/extensions/workflow/utils/ConfigLoader.js - 完整配置传递版本 =====

/**
 * 配置文件加载器 - 确保传递完整的JSON配置信息
 * 
 * 核心改进：
 * 1. 返回完整的配置对象，包含所有Schema字段
 * 2. 增强配置验证，覆盖所有必需和可选字段
 * 3. 提供详细的配置摘要信息
 */

class ConfigLoader {
  constructor() {
    this.configCache = new Map()
    this.configDirectory = '/src/extensions/workflow/configs/dynamic'
    this.debugMode = false
    // this.debugMode = process.env.NODE_ENV === 'development'
    
    // 唯一的硬编码：已知配置文件名列表
    this.knownConfigFiles = [
      'media-input.json',
       'simple-test.json',
       'asr-node.json'
      // 新增节点文件名在此添加
    ]
    
    this.log('[ConfigLoader] 完整配置传递加载器已初始化')
  }

  /**
   * 调试日志
   */
  log(message, type = 'info') {
    if (!this.debugMode) return
    
    const timestamp = new Date().toLocaleTimeString()
    const prefix = `[ConfigLoader ${timestamp}]`
    
    switch (type) {
      case 'error':
        console.error(`${prefix} ❌`, message)
        break
      case 'warn':
        console.warn(`${prefix} ⚠️`, message)
        break
      case 'success':
        console.log(`${prefix} ✅`, message)
        break
      default:
        console.log(`${prefix} ℹ️`, message)
    }
  }

  /**
   * 发现配置文件（基于已知文件列表）
   */
  async discoverConfigFiles() {
    try {
      const configFiles = []
      
      // 遍历已知文件列表
      for (const fileName of this.knownConfigFiles) {
        const configFileInfo = this._createConfigFileInfo(fileName)
        configFiles.push(configFileInfo)
      }
      
      this.log(`发现 ${configFiles.length} 个配置文件`, 'success')
      return configFiles
      
    } catch (error) {
      this.log(`配置文件发现失败: ${error.message}`, 'error')
      return []
    }
  }

  /**
   * 创建配置文件信息对象
   */
  _createConfigFileInfo(fileName) {
    const fileId = fileName.replace('.json', '')
    
    return {
      id: fileId,
      name: fileId, // 临时名称，稍后从JSON读取真实显示名称
      fileName: fileName,
      path: `./${fileName}`,
      fullPath: `${this.configDirectory}/${fileName}`,
      type: 'template'
    }
  }

  /**
   * 加载单个配置文件 - 返回完整配置对象
   */
  async loadConfigFile(configFile) {
    const cacheKey = configFile.fullPath
    
    // 检查缓存
    if (this.configCache.has(cacheKey)) {
      this.log(`从缓存加载配置: ${configFile.fileName}`)
      return this.configCache.get(cacheKey)
    }
    
    try {
      // 读取真实的JSON配置文件
      const config = await this._loadJSONFile(configFile)
      
      if (!config) {
        throw new Error('配置文件为空')
      }
      
      // 更新配置文件信息的显示名称（从JSON读取）
      configFile.name = this._getDisplayNameFromConfig(config, configFile.id)
      
      // 验证配置格式（完整验证）
      const validatedConfig = this._validateCompleteConfig(config, configFile.fileName)
      
      // 🔧 关键改进：构建完整的配置对象
      const completeConfig = this._buildCompleteConfig(validatedConfig, configFile)
      
      // 缓存完整配置
      this.configCache.set(cacheKey, completeConfig)
      
      this.log(`成功加载完整配置: ${configFile.fileName} (${configFile.name})`, 'success')
      this._logConfigSummary(completeConfig)
      
      return completeConfig
      
    } catch (error) {
      this.log(`加载配置失败 ${configFile.fileName}: ${error.message}`, 'error')
      throw new Error(`配置文件加载失败: ${configFile.fileName} - ${error.message}`)
    }
  }

/**
   * 🆕 构建完整的配置对象 - 确保所有字段都被包含
   * 🔧 最小修复：添加 nodeConfig 字段，解决 ConfigurationResolver 的期望
   */
  _buildCompleteConfig(config, configFile) {
    const completeConfig = {
      // 📄 文件信息
      _fileInfo: {
        id: configFile.id,
        fileName: configFile.fileName,
        fullPath: configFile.fullPath,
        loadedAt: new Date().toISOString()
      },
      
      // 📋 核心配置字段（完整传递）
      meta: config.meta,
      node: config.node,
      
      // 🔧 数据流配置（关键字段）
      inputSchema: config.inputSchema || {},
      outputSchema: config.outputSchema || {},
      
      // 🎛️ UI配置字段
      fields: config.fields || [],
      nodeUI: config.nodeUI || {},
      
      // ⚙️ 执行配置
      execution: config.execution || {},
      
      // 🧩 组件和数据配置
      components: config.components,
      data: config.data,
      
      // 📦 依赖配置
      dependencies: config.dependencies || {},
      
      // 🔧 最小修复：添加 nodeConfig 字段（ConfigurationResolver 期望的格式）
      nodeConfig: {
        type: config.node.type,
        label: config.node.label,
        icon: config.node.icon,
        description: config.node.description,
        category: config.node.category,
        theme: config.node.theme,
        fields: config.fields || [],
        validation: config.data?.validation || {},
        defaultData: config.data?.defaultData || {},
        execution: config.execution || {},
        inputSchema: config.inputSchema || {},
        outputSchema: config.outputSchema || {},
        nodeUI: config.nodeUI || {},
        meta: config.meta
      },
      
      // 📊 配置摘要（便于调试）
      _summary: this._generateConfigSummary(config)
    }
    
    return completeConfig
  }

  /**
   * 🆕 生成配置摘要信息
   */
  _generateConfigSummary(config) {
    return {
      nodeType: config.meta?.nodeId || 'unknown',
      displayName: config.meta?.displayName || 'Unknown Node',
      category: config.node?.category || 'unknown',
      executionType: config.execution?.type || 'none',
      
      // 数据流信息
      hasInputSchema: !!(config.inputSchema && Object.keys(config.inputSchema).length > 0),
      hasOutputSchema: !!(config.outputSchema && Object.keys(config.outputSchema).length > 0),
      inputFieldCount: config.inputSchema ? Object.keys(config.inputSchema).length : 0,
      outputFieldCount: config.outputSchema ? Object.keys(config.outputSchema).length : 0,
      
      // UI配置信息
      configFieldCount: config.fields ? config.fields.length : 0,
      hasNodeUI: !!(config.nodeUI && Object.keys(config.nodeUI).length > 0),
      
      // 依赖信息
      hasDependencies: !!(config.dependencies && Object.keys(config.dependencies).length > 0),
      
      // 组件信息
      mainComponentType: config.components?.main?.type || 'unknown',
      configComponentType: config.components?.config?.type || 'none'
    }
  }

  /**
   * 🆕 输出配置摘要日志
   */
  _logConfigSummary(completeConfig) {
    if (!this.debugMode) return
    
    const summary = completeConfig._summary
    this.log(`配置摘要 [${summary.nodeType}]:`, 'info')
    console.log(`  ├─ 显示名称: ${summary.displayName}`)
    console.log(`  ├─ 分类: ${summary.category}`)
    console.log(`  ├─ 执行类型: ${summary.executionType}`)
    console.log(`  ├─ 输入Schema: ${summary.hasInputSchema ? `✅ (${summary.inputFieldCount}字段)` : '❌'}`)
    console.log(`  ├─ 输出Schema: ${summary.hasOutputSchema ? `✅ (${summary.outputFieldCount}字段)` : '❌'}`)
    console.log(`  ├─ 配置字段: ${summary.configFieldCount}个`)
    console.log(`  ├─ UI配置: ${summary.hasNodeUI ? '✅' : '❌'}`)
    console.log(`  └─ 依赖配置: ${summary.hasDependencies ? '✅' : '❌'}`)
  }

  /**
   * 读取真实的JSON配置文件
   */
  async _loadJSONFile(configFile) {
    try {
      this.log(`读取配置文件: ${configFile.fullPath}`)
      
      const response = await fetch(configFile.fullPath)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const config = await response.json()
      
      this.log(`JSON文件解析成功: ${configFile.fileName}`, 'success')
      return config
      
    } catch (error) {
      if (error.name === 'SyntaxError') {
        throw new Error(`JSON格式错误: ${error.message}`)
      }
      throw new Error(`文件读取失败: ${error.message}`)
    }
  }

  /**
   * 从配置JSON中获取显示名称
   */
  _getDisplayNameFromConfig(config, fileId) {
    if (config && config.meta && config.meta.displayName) {
      return config.meta.displayName
    }
    
    return fileId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * 🔧 增强的完整配置验证
   */
  _validateCompleteConfig(config, fileName) {
    try {
      const errors = []
      
      // ✅ 验证必需的顶级字段
      const requiredFields = ['meta', 'node', 'components', 'data']
      requiredFields.forEach(field => {
        if (!config[field]) {
          errors.push(`缺少必需字段: ${field}`)
        }
      })
      
      // ✅ 验证 meta 字段
      if (config.meta) {
        if (!config.meta.configVersion) errors.push('meta.configVersion 是必需的')
        if (!config.meta.nodeId) errors.push('meta.nodeId 是必需的')
        if (!config.meta.displayName) errors.push('meta.displayName 是必需的')
      }
      
      // ✅ 验证 node 字段
      if (config.node) {
        const nodeRequiredFields = ['type', 'label', 'icon', 'description', 'category', 'theme']
        nodeRequiredFields.forEach(field => {
          if (!config.node[field]) {
            errors.push(`node.${field} 是必需的`)
          }
        })
      }
      
      // 🆕 验证 inputSchema 字段
      if (config.inputSchema) {
        this._validateSchema(config.inputSchema, 'inputSchema', errors)
      }
      
      // 🆕 验证 outputSchema 字段
      if (config.outputSchema) {
        this._validateSchema(config.outputSchema, 'outputSchema', errors)
      }
      
      // 🆕 验证 fields 字段
      if (config.fields) {
        if (!Array.isArray(config.fields)) {
          errors.push('fields 必须是数组')
        } else {
          this._validateFieldsArray(config.fields, errors)
        }
      }
      
      // 🆕 验证 nodeUI 字段
      if (config.nodeUI) {
        this._validateNodeUI(config.nodeUI, errors)
      }
      
      // 🔧 增强的 execution 验证
      if (config.execution) {
        this._validateExecution(config.execution, errors)
      }
      
      // 🆕 验证 dependencies 字段
      if (config.dependencies) {
        this._validateDependencies(config.dependencies, errors)
      }
      
      if (errors.length > 0) {
        const errorMessage = `配置验证失败 (${fileName}):\n${errors.join('\n')}`
        this.log(errorMessage, 'error')
        throw new Error(errorMessage)
      }
      
      this.log(`完整配置验证通过: ${fileName}`, 'success')
      return config
      
    } catch (error) {
      throw new Error(`配置验证失败: ${error.message}`)
    }
  }

  /**
   * 🆕 验证 Schema 字段（inputSchema/outputSchema）
   */
  _validateSchema(schema, schemaName, errors) {
    if (typeof schema !== 'object') {
      errors.push(`${schemaName} 必须是对象`)
      return
    }
    
    Object.entries(schema).forEach(([fieldName, fieldDef]) => {
      if (!fieldDef.type) {
        errors.push(`${schemaName}.${fieldName} 缺少 type 字段`)
      }
    })
  }

  /**
   * 🆕 验证 fields 数组
   */
  _validateFieldsArray(fields, errors) {
    fields.forEach((field, index) => {
      if (!field.name) errors.push(`fields[${index}] 缺少 name 字段`)
      if (!field.type) errors.push(`fields[${index}] 缺少 type 字段`)
      if (!field.label) errors.push(`fields[${index}] 缺少 label 字段`)
    })
  }

  /**
   * 🆕 验证 nodeUI 配置
   */
  _validateNodeUI(nodeUI, errors) {
    if (nodeUI.actions && !Array.isArray(nodeUI.actions)) {
      errors.push('nodeUI.actions 必须是数组')
    }
  }

  /**
   * 🔧 增强的 execution 验证
   */
  _validateExecution(execution, errors) {
    if (!execution.type) {
      errors.push('execution.type 是必需的')
    }
    
    if (execution.type === 'api' && !execution.endpoint) {
      errors.push('API执行类型需要 execution.endpoint')
    }
    
    if (execution.type === 'local' && !execution.handler) {
      errors.push('本地执行类型需要 execution.handler')
    }
    
    // 验证数值字段
    if (execution.timeout && (typeof execution.timeout !== 'number' || execution.timeout < 1)) {
      errors.push('execution.timeout 必须是大于0的数字')
    }
    
    if (execution.retry && (typeof execution.retry !== 'number' || execution.retry < 0)) {
      errors.push('execution.retry 必须是非负数字')
    }
  }

  /**
   * 🆕 验证 dependencies 配置
   */
  _validateDependencies(dependencies, errors) {
    if (dependencies.apis && !Array.isArray(dependencies.apis)) {
      errors.push('dependencies.apis 必须是数组')
    }
    
    if (dependencies.libraries && !Array.isArray(dependencies.libraries)) {
      errors.push('dependencies.libraries 必须是数组')
    }
    
    if (dependencies.permissions && !Array.isArray(dependencies.permissions)) {
      errors.push('dependencies.permissions 必须是数组')
    }
  }

  /**
   * 加载所有配置文件 - 返回完整配置对象
   */
  async loadAllConfigs() {
    const results = {
      configs: [],
      errors: [],
      summary: {
        total: 0,
        success: 0,
        failed: 0
      }
    }
    
    try {
      const configFiles = await this.discoverConfigFiles()
      results.summary.total = configFiles.length
      
      if (configFiles.length === 0) {
        this.log('没有发现配置文件', 'warn')
        return results
      }
      
      this.log(`开始加载 ${configFiles.length} 个完整配置文件...`)
      
      for (const configFile of configFiles) {
        try {
          const completeConfig = await this.loadConfigFile(configFile)
          
          // 🔧 关键改进：传递完整配置对象
          results.configs.push({
            source: configFile,
            config: completeConfig,  // 这里是完整的配置对象，包含所有字段
            nodeType: completeConfig.meta.nodeId,
            displayName: completeConfig.meta.displayName,
            summary: completeConfig._summary
          })
          results.summary.success++
          
        } catch (error) {
          results.errors.push({
            source: configFile,
            error: error.message
          })
          results.summary.failed++
        }
      }
      
      this.log(
        `完整配置加载完成: ${results.summary.success} 成功, ${results.summary.failed} 失败`, 
        'success'
      )
      
      return results
      
    } catch (error) {
      this.log(`批量配置加载失败: ${error.message}`, 'error')
      results.errors.push({
        source: 'batch_load',
        error: error.message
      })
      return results
    }
  }

  /**
   * 🆕 获取指定节点的完整配置
   */
  async getNodeConfig(nodeId) {
    const fileName = `${nodeId}.json`
    
    if (!this.knownConfigFiles.includes(fileName)) {
      throw new Error(`未知的节点配置: ${nodeId}`)
    }
    
    const configFile = this._createConfigFileInfo(fileName)
    return await this.loadConfigFile(configFile)
  }

  /**
   * 动态添加新配置文件
   */
  addConfigFile(fileName) {
    if (!this.knownConfigFiles.includes(fileName)) {
      this.knownConfigFiles.push(fileName)
      this.log(`添加新配置文件: ${fileName}`, 'success')
      return true
    }
    return false
  }

  /**
   * 获取已知配置文件列表
   */
  getKnownConfigFiles() {
    return [...this.knownConfigFiles]
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.configCache.clear()
    this.log('配置缓存已清除', 'info')
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    return {
      cacheSize: this.configCache.size,
      cachedConfigs: Array.from(this.configCache.keys()),
      knownFilesCount: this.knownConfigFiles.length
    }
  }

  /**
   * 获取调试信息
   */
  getDebugInfo() {
    return {
      configDirectory: this.configDirectory,
      knownConfigFiles: this.knownConfigFiles,
      cacheStatus: this.getCacheStatus(),
      debugMode: this.debugMode
    }
  }
}

export default ConfigLoader
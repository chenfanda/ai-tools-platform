// ===== src/extensions/workflow/utils/ConfigLoader.js - 最小硬编码版本 =====

/**
 * 配置文件加载器 - 最小硬编码，真正配置驱动
 * 
 * 核心原则：
 * 1. 只维护文件名列表，不硬编码任何配置内容
 * 2. 显示名称从JSON文件的 meta.displayName 读取
 * 3. 新增节点：添加JSON文件 + 添加文件名到列表
 * 4. 完全读取真实的JSON配置文件
 */

class ConfigLoader {
  constructor() {
    this.configCache = new Map()
    this.configDirectory = '/src/extensions/workflow/configs/dynamic'
    this.debugMode = process.env.NODE_ENV === 'development'
    
    // 唯一的硬编码：已知配置文件名列表
    // 新增节点时只需在此添加文件名
    this.knownConfigFiles = [
      'media-input.json',
       'simple-test.json',
       'asr-node.json'
      // 新增节点文件名在此添加
    ]
    
    this.log('[ConfigLoader] 最小硬编码配置加载器已初始化')
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
   * 加载单个配置文件
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
      
      // 验证配置格式
      const validatedConfig = this._validateConfig(config, configFile.fileName)
      
      // 缓存配置
      this.configCache.set(cacheKey, validatedConfig)
      
      this.log(`成功加载配置: ${configFile.fileName} (${configFile.name})`, 'success')
      return validatedConfig
      
    } catch (error) {
      this.log(`加载配置失败 ${configFile.fileName}: ${error.message}`, 'error')
      throw new Error(`配置文件加载失败: ${configFile.fileName} - ${error.message}`)
    }
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
   * 从配置JSON中获取显示名称（避免硬编码）
   */
  _getDisplayNameFromConfig(config, fileId) {
    // 优先使用JSON中的显示名称
    if (config && config.meta && config.meta.displayName) {
      return config.meta.displayName
    }
    
    // 降级：根据文件ID生成显示名称
    return fileId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * 验证配置文件格式
   */
  _validateConfig(config, fileName) {
    try {
      const errors = []
      
      // 验证必需的顶级字段
      const requiredFields = ['meta', 'node', 'components', 'data']
      requiredFields.forEach(field => {
        if (!config[field]) {
          errors.push(`缺少必需字段: ${field}`)
        }
      })
      
      // 验证 meta 字段
      if (config.meta) {
        if (!config.meta.configVersion) errors.push('meta.configVersion 是必需的')
        if (!config.meta.nodeId) errors.push('meta.nodeId 是必需的')
        if (!config.meta.displayName) errors.push('meta.displayName 是必需的')
      }
      
      // 验证 node 字段
      if (config.node) {
        const nodeRequiredFields = ['type', 'label', 'icon', 'description', 'category', 'theme']
        nodeRequiredFields.forEach(field => {
          if (!config.node[field]) {
            errors.push(`node.${field} 是必需的`)
          }
        })
      }
      
      // 验证 fields 字段（如果存在）
      if (config.fields && !Array.isArray(config.fields)) {
        errors.push('fields 必须是数组')
      }
      
      // 验证 execution 字段（如果存在）
      if (config.execution) {
        if (!config.execution.type) {
          errors.push('execution.type 是必需的')
        }
        
        if (config.execution.type === 'api' && !config.execution.endpoint) {
          errors.push('API执行类型需要 execution.endpoint')
        }
        
        if (config.execution.type === 'local' && !config.execution.handler) {
          errors.push('本地执行类型需要 execution.handler')
        }
      }
      
      if (errors.length > 0) {
        const errorMessage = `配置验证失败 (${fileName}):\n${errors.join('\n')}`
        this.log(errorMessage, 'error')
        throw new Error(errorMessage)
      }
      
      this.log(`配置验证通过: ${fileName}`, 'success')
      return config
      
    } catch (error) {
      throw new Error(`配置验证失败: ${error.message}`)
    }
  }

  /**
   * 加载所有配置文件
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
      // 发现配置文件
      const configFiles = await this.discoverConfigFiles()
      results.summary.total = configFiles.length
      
      if (configFiles.length === 0) {
        this.log('没有发现配置文件', 'warn')
        return results
      }
      
      this.log(`开始加载 ${configFiles.length} 个配置文件...`)
      
      // 逐个加载配置文件
      for (const configFile of configFiles) {
        try {
          const config = await this.loadConfigFile(configFile)
          results.configs.push({
            source: configFile,
            config: config
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
        `配置加载完成: ${results.summary.success} 成功, ${results.summary.failed} 失败`, 
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
   * 动态添加新配置文件 (扩展接口)
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

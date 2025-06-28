// ===== src/extensions/workflow/node-configs/index.js - 配置系统入口 (修复版) =====

/**
 * 节点配置系统入口文件
 * 
 * 职责：
 * 1. 导出配置加载器
 * 2. 提供配置文件的统一访问接口
 * 3. 管理配置文件的索引和元数据
 * 4. 提供配置系统的版本信息
 */

import ConfigLoader from '../utils/ConfigLoader.js'

// 配置系统版本
export const CONFIG_SYSTEM_VERSION = '1.0.0'

// 支持的配置文件版本
export const SUPPORTED_CONFIG_VERSIONS = ['1.0']

// 配置目录结构
export const CONFIG_DIRECTORIES = {
  CUSTOM: 'custom',
  TEMPLATES: 'templates',
  SCHEMAS: '../schemas'
}

// 创建配置加载器实例
const configLoader = new ConfigLoader()

/**
 * 加载所有配置文件的主要接口
 */
export async function loadAllNodeConfigs() {
  try {
    console.log('[NodeConfigs] 开始加载JSON配置文件...')
    
    const results = await configLoader.loadAllConfigs()
    
    console.log(`[NodeConfigs] 配置加载完成:`, {
      total: results.summary.total,
      success: results.summary.success,
      failed: results.summary.failed
    })
    
    if (results.errors.length > 0) {
      console.warn('[NodeConfigs] 配置加载错误:', results.errors)
    }
    
    return results
    
  } catch (error) {
    console.error('[NodeConfigs] 配置系统初始化失败:', error)
    
    // 返回空结果，确保系统继续运行
    return {
      configs: [],
      errors: [{
        source: 'system',
        error: error.message
      }],
      summary: {
        total: 0,
        success: 0,
        failed: 1
      }
    }
  }
}

/**
 * 重新加载配置 (开发环境使用)
 */
export async function reloadConfigs() {
  if (process.env.NODE_ENV === 'development') {
    console.log('[NodeConfigs] 重新加载配置文件...')
    configLoader.clearCache()
    return await loadAllNodeConfigs()
  } else {
    console.warn('[NodeConfigs] 配置重载仅在开发环境可用')
    return null
  }
}

/**
 * 获取配置系统状态
 */
export function getConfigSystemStatus() {
  return {
    version: CONFIG_SYSTEM_VERSION,
    supportedVersions: SUPPORTED_CONFIG_VERSIONS,
    directories: CONFIG_DIRECTORIES,
    loaderStatus: configLoader.getDebugInfo()
  }
}

/**
 * 验证配置系统是否可用
 */
export function isConfigSystemAvailable() {
  try {
    // 检查必要的API是否可用
    const hasRequiredAPIs = typeof Promise !== 'undefined'
    
    // 检查是否在支持的环境中
    const isSupportedEnvironment = typeof window !== 'undefined' || typeof global !== 'undefined'
    
    return hasRequiredAPIs && isSupportedEnvironment
  } catch (error) {
    console.warn('[NodeConfigs] 配置系统可用性检查失败:', error)
    return false
  }
}

/**
 * 获取已知的配置文件列表
 */
export function getKnownConfigs() {
  return [
    {
      id: 'sample-custom-node',
      name: '示例自定义节点',
      path: 'templates/sample-node.json',
      type: 'template',
      description: '演示JSON配置系统的示例节点'
    }
    // 在这里可以手动添加更多已知配置
  ]
}

/**
 * 开发环境调试接口
 */
if (process.env.NODE_ENV === 'development') {
  // 暴露到全局供调试使用
  if (typeof window !== 'undefined') {
    window.__nodeConfigSystem = {
      loadAllConfigs: loadAllNodeConfigs,
      reloadConfigs: reloadConfigs,
      getStatus: getConfigSystemStatus,
      isAvailable: isConfigSystemAvailable,
      getKnownConfigs: getKnownConfigs,
      configLoader: configLoader,
      version: CONFIG_SYSTEM_VERSION
    }
  }
}

// 默认导出
export default {
  loadAllNodeConfigs,
  reloadConfigs,
  getConfigSystemStatus,
  isConfigSystemAvailable,
  getKnownConfigs,
  CONFIG_SYSTEM_VERSION,
  SUPPORTED_CONFIG_VERSIONS
}

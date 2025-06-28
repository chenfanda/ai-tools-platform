// ===== src/services/api/imageAPI.js =====

/**
 * 图像处理API服务
 * 封装所有图像处理相关的API调用
 */
class ImageAPIService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl
  }

  /**
   * 通用API调用方法
   * @param {string} endpoint - API端点
   * @param {FormData} formData - 表单数据
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} API响应
   */
  async callAPI(endpoint, formData, options = {}) {
    const {
      timeout = 30000,
      onProgress = null
    } = options

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        ...options.fetchOptions
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接或稍后重试')
      }
      throw error
    }
  }

  /**
   * 健康检查
   * @returns {Promise<Object>} 服务状态
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        return await response.json()
      } else {
        throw new Error('服务不可用')
      }
    } catch (error) {
      throw new Error(error.name === 'TimeoutError' ? '连接超时' : '服务离线')
    }
  }

  /**
   * 获取系统状态
   * @returns {Promise<Object>} 系统信息
   */
  async getSystemStatus() {
    const response = await fetch(`${this.baseUrl}/system-status`)
    if (!response.ok) {
      throw new Error('获取系统状态失败')
    }
    return await response.json()
  }

  /**
   * 背景移除
   * @param {File} imageFile - 图片文件
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 处理结果
   */
  async removeBackground(imageFile, options = {}) {
    if (!imageFile) {
      throw new Error('请提供图片文件')
    }

    if (!imageFile.type.startsWith('image/')) {
      throw new Error('文件必须是图片格式')
    }

    const formData = new FormData()
    formData.append('file', imageFile)

    return await this.callAPI('/remove-background', formData, {
      timeout: 60000, // 背景移除可能需要更长时间
      ...options
    })
  }

  /**
   * 人脸增强
   * @param {File} imageFile - 人脸图片文件
   * @param {number} upscaleFactor - 增强倍数 (1-4)
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 处理结果
   */
  async enhanceFace(imageFile, upscaleFactor = 2, options = {}) {
    if (!imageFile) {
      throw new Error('请提供人脸图片文件')
    }

    if (!imageFile.type.startsWith('image/')) {
      throw new Error('文件必须是图片格式')
    }

    if (![1, 2, 3, 4].includes(upscaleFactor)) {
      throw new Error('增强倍数必须在1-4之间')
    }

    const formData = new FormData()
    formData.append('file', imageFile)
    formData.append('upscale_factor', upscaleFactor.toString())

    return await this.callAPI('/face-enhancement', formData, {
      timeout: 60000,
      ...options
    })
  }

  /**
   * 超分辨率处理
   * @param {File} imageFile - 低分辨率图片文件
   * @param {number} scale - 放大倍数 (2 或 4)
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 处理结果
   */
  async superResolution(imageFile, scale = 4, options = {}) {
    if (!imageFile) {
      throw new Error('请提供图片文件')
    }

    if (!imageFile.type.startsWith('image/')) {
      throw new Error('文件必须是图片格式')
    }

    if (![2, 4].includes(scale)) {
      throw new Error('放大倍数只支持2或4')
    }

    const formData = new FormData()
    formData.append('file', imageFile)
    formData.append('scale', scale.toString())

    return await this.callAPI('/super-resolution', formData, {
      timeout: 90000, // 超分辨率处理时间较长
      ...options
    })
  }

  /**
   * 智能换背景
   * @param {File} foregroundFile - 前景图片文件
   * @param {File} backgroundFile - 背景图片文件
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 处理结果
   */
  async changeBackground(foregroundFile, backgroundFile, options = {}) {
    if (!foregroundFile || !backgroundFile) {
      throw new Error('请提供前景和背景图片文件')
    }

    if (!foregroundFile.type.startsWith('image/') || !backgroundFile.type.startsWith('image/')) {
      throw new Error('文件必须是图片格式')
    }

    const formData = new FormData()
    formData.append('foreground', foregroundFile)
    formData.append('background', backgroundFile)

    return await this.callAPI('/change-background', formData, {
      timeout: 90000,
      ...options
    })
  }

  /**
   * 卸载模型释放内存
   * @param {string} modelName - 模型名称
   * @returns {Promise<Object>} 操作结果
   */
  async unloadModel(modelName) {
    const formData = new FormData()
    formData.append('model_name', modelName)

    return await this.callAPI('/unload-model', formData, {
      timeout: 10000
    })
  }

  /**
   * 批量处理图片（扩展功能）
   * @param {Array<File>} imageFiles - 图片文件数组
   * @param {string} processType - 处理类型
   * @param {Object} params - 处理参数
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Array>} 处理结果数组
   */
  async batchProcess(imageFiles, processType, params = {}, onProgress = null) {
    if (!Array.isArray(imageFiles) || imageFiles.length === 0) {
      throw new Error('请提供图片文件数组')
    }

    const results = []
    const total = imageFiles.length

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      
      try {
        let result
        switch (processType) {
          case 'remove-background':
            result = await this.removeBackground(file)
            break
          case 'face-enhancement':
            result = await this.enhanceFace(file, params.upscaleFactor)
            break
          case 'super-resolution':
            result = await this.superResolution(file, params.scale)
            break
          default:
            throw new Error(`不支持的处理类型: ${processType}`)
        }

        results.push({
          index: i,
          filename: file.name,
          success: true,
          result
        })

      } catch (error) {
        results.push({
          index: i,
          filename: file.name,
          success: false,
          error: error.message
        })
      }

      // 调用进度回调
      if (onProgress) {
        onProgress({
          completed: i + 1,
          total,
          progress: (i + 1) / total,
          currentFile: file.name
        })
      }
    }

    return results
  }

  /**
   * 图片格式转换辅助方法
   * @param {string} base64String - base64字符串
   * @param {string} format - 输出格式 ('png', 'jpg', 'webp')
   * @returns {string} 转换后的base64字符串
   */
  convertImageFormat(base64String, format = 'png') {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        const mimeType = `image/${format}`
        const quality = format === 'jpg' ? 0.9 : undefined
        
        try {
          const convertedBase64 = canvas.toDataURL(mimeType, quality)
          resolve(convertedBase64.split(',')[1]) // 移除data:image/xxx;base64,前缀
        } catch (error) {
          reject(new Error(`格式转换失败: ${error.message}`))
        }
      }
      
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = `data:image/png;base64,${base64String}`
    })
  }

  /**
   * 下载处理结果
   * @param {string} base64String - base64图片字符串
   * @param {string} filename - 文件名
   * @param {string} format - 图片格式
   */
  downloadResult(base64String, filename, format = 'png') {
    try {
      const link = document.createElement('a')
      link.href = `data:image/${format};base64,${base64String}`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      throw new Error(`下载失败: ${error.message}`)
    }
  }
}

// 导出API服务类
export default ImageAPIService

// 导出便捷的创建函数
export const createImageAPI = (baseUrl) => {
  return new ImageAPIService(baseUrl)
}

// ===== src/services/api/apiService.js =====
// 统一的API服务入口，集成所有服务

import ImageAPIService from './imageAPI.js'

/**
 * 创建所有API服务实例
 * @param {Object} config - API配置
 * @returns {Object} API服务实例集合
 */
export const createAPIServices = (config) => {
  return {
    image: new ImageAPIService(config.imageApiUrl),
    // 可以在这里添加其他API服务
    // tts: new TTSAPIService(config.ttsApiUrl),
    // video: new VideoAPIService(config.videoApiUrl),
    // asr: new ASRAPIService(config.asrApiUrl),
  }
}

/**
 * API响应标准化处理
 * @param {Function} apiCall - API调用函数
 * @returns {Promise} 标准化的响应
 */
export const standardizeResponse = async (apiCall) => {
  try {
    const result = await apiCall()
    return {
      success: true,
      data: result,
      error: null
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message
    }
  }
}

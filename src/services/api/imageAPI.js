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
      onProgress = null,
      baseUrl = this.baseUrl  // 新增：支持自定义baseUrl
    } = options

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(`${baseUrl}${endpoint}`, {  // 修改：使用可配置的baseUrl
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
   * StyleGAN2人脸风格化处理 - 新增功能
   * @param {File} imageFile - 人脸图片文件
   * @param {Object} styleganParams - StyleGAN2参数
   * @param {string} styleganApiUrl - StyleGAN2服务API地址
   * @returns {Promise<Object>} 处理结果
   */
  async styleGAN2Edit(imageFile, styleganParams = {}, styleganApiUrl) {
    if (!imageFile) {
      throw new Error('请提供人脸图片文件')
    }

    if (!imageFile.type.startsWith('image/')) {
      throw new Error('文件必须是图片格式')
    }

    if (!styleganApiUrl) {
      throw new Error('StyleGAN2服务地址未配置')
    }

    // 构建FormData参数
    const formData = new FormData()
    formData.append('file', imageFile)
    
    // 生成器参数
    if (styleganParams.selectedGenerator) {
      formData.append('generator_name', styleganParams.selectedGenerator)
    }
    
    // 方向向量目录
    if (styleganParams.directionsDir) {
      formData.append('directions_dir', styleganParams.directionsDir)
    }
    
    // 编码器配置（JSON字符串）
    if (styleganParams.encoderConfig) {
      formData.append('encoder_config', JSON.stringify(styleganParams.encoderConfig))
    }
    
    // 编辑属性（JSON字符串）
    if (styleganParams.editAttributes) {
      formData.append('edit_attributes', JSON.stringify(styleganParams.editAttributes))
    }

    // 可选参数：是否保存临时文件
    if (styleganParams.saveTemp !== undefined) {
      formData.append('save_temp', styleganParams.saveTemp.toString())
    }

    // 调用StyleGAN2 API
    return await this.callAPI('/edit', formData, {
      timeout: 120000,  // StyleGAN2处理时间较长，设置2分钟超时
      baseUrl: styleganApiUrl
    })
  }

  /**
   * StyleGAN2服务健康检查 - 新增功能
   * @param {string} styleganApiUrl - StyleGAN2服务API地址
   * @returns {Promise<Object>} 服务状态
   */
  async styleGAN2HealthCheck(styleganApiUrl) {
    try {
      const response = await fetch(`${styleganApiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        return await response.json()
      } else {
        throw new Error('StyleGAN2服务不可用')
      }
    } catch (error) {
      throw new Error(error.name === 'TimeoutError' ? 'StyleGAN2服务连接超时' : 'StyleGAN2服务离线')
    }
  }

  /**
   * 获取StyleGAN2系统状态 - 新增功能
   * @param {string} styleganApiUrl - StyleGAN2服务API地址
   * @returns {Promise<Object>} 系统状态
   */
  async getStyleGAN2SystemStatus(styleganApiUrl) {
    try {
      const response = await fetch(`${styleganApiUrl}/system-status`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        throw new Error('获取StyleGAN2系统状态失败')
      }
      
      return await response.json()
    } catch (error) {
      throw new Error(error.name === 'TimeoutError' ? 'StyleGAN2系统状态获取超时' : error.message)
    }
  }

  /**
   * 获取StyleGAN2可用属性列表 - 新增功能
   * @param {string} styleganApiUrl - StyleGAN2服务API地址
   * @returns {Promise<Object>} 可用属性列表
   */
  async getStyleGAN2Attributes(styleganApiUrl) {
    try {
      const response = await fetch(`${styleganApiUrl}/attributes`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        throw new Error('获取StyleGAN2属性列表失败')
      }
      
      return await response.json()
    } catch (error) {
      throw new Error(error.name === 'TimeoutError' ? 'StyleGAN2属性列表获取超时' : error.message)
    }
  }

  /**
   * 清理StyleGAN2缓存 - 新增功能
   * @param {string} styleganApiUrl - StyleGAN2服务API地址
   * @param {string} cacheType - 缓存类型 ('all' | 'latent')
   * @returns {Promise<Object>} 操作结果
   */
  async cleanupStyleGAN2Cache(styleganApiUrl, cacheType = 'all') {
    try {
      const endpoint = cacheType === 'latent' ? '/cleanup-latent' : '/cleanup'
      const response = await fetch(`${styleganApiUrl}${endpoint}`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000)
      })
      
      if (!response.ok) {
        throw new Error('StyleGAN2缓存清理失败')
      }
      
      return await response.json()
    } catch (error) {
      throw new Error(error.name === 'TimeoutError' ? 'StyleGAN2缓存清理超时' : error.message)
    }
  }

  /**
   * 轻美颜处理 - 现有功能
   * @param {File} imageFile - 人脸图片文件
   * @param {Object} adjustmentParams - 调整参数
   * @param {string} facialApiUrl - 轻美颜服务API地址
   * @returns {Promise<Object>} 处理结果
   */
  async facialAdjustment(imageFile, adjustmentParams = {}, facialApiUrl) {
    if (!imageFile) {
      throw new Error('请提供人脸图片文件')
    }

    if (!imageFile.type.startsWith('image/')) {
      throw new Error('文件必须是图片格式')
    }

    if (!facialApiUrl) {
      throw new Error('轻美颜服务地址未配置')
    }

    // 构建FormData参数
    const formData = new FormData()
    formData.append('file', imageFile)
    
    // 7种功能的参数映射
    const features = ['chin', 'eye_adjust', 'face_slim', 'forehead', 'mouth', 'nose', 'whitening']
    
    features.forEach(feature => {
      const enabled = adjustmentParams[`${feature}_enabled`] || false
      const intensity = adjustmentParams[`${feature}_intensity`] || 0.3
      
      formData.append(`${feature}_enabled`, enabled.toString())
      formData.append(`${feature}_intensity`, intensity.toString())
      
      // 特殊参数处理
      if (feature === 'chin' && adjustmentParams.chin_type) {
        formData.append('chin_type', adjustmentParams.chin_type)
      } else if (feature === 'eye_adjust' && adjustmentParams.eye_adjust_mode) {
        formData.append('eye_adjust_mode', adjustmentParams.eye_adjust_mode)
      } else if (feature === 'face_slim' && adjustmentParams.face_slim_region) {
        formData.append('face_slim_region', adjustmentParams.face_slim_region)
      } else if (feature === 'forehead' && adjustmentParams.forehead_type) {
        formData.append('forehead_type', adjustmentParams.forehead_type)
      } else if (feature === 'mouth' && adjustmentParams.mouth_type) {
        formData.append('mouth_type', adjustmentParams.mouth_type)
      } else if (feature === 'nose' && adjustmentParams.nose_type) {
        formData.append('nose_type', adjustmentParams.nose_type)
      } else if (feature === 'whitening' && adjustmentParams.whitening_region) {
        formData.append('whitening_region', adjustmentParams.whitening_region)
      }
    })

    // 调用轻美颜API
    return await this.callAPI('/process', formData, {
      timeout: 60000,
      baseUrl: facialApiUrl  // 使用轻美颜服务的API地址
    })
  }

  /**
   * 轻美颜服务健康检查 - 现有功能
   * @param {string} facialApiUrl - 轻美颜服务API地址
   * @returns {Promise<Object>} 服务状态
   */
  async facialHealthCheck(facialApiUrl) {
    try {
      const response = await fetch(`${facialApiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        return await response.json()
      } else {
        throw new Error('轻美颜服务不可用')
      }
    } catch (error) {
      throw new Error(error.name === 'TimeoutError' ? '轻美颜服务连接超时' : '轻美颜服务离线')
    }
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
          case 'facial-adjustment':  // 轻美颜批量处理
            result = await this.facialAdjustment(file, params.adjustmentParams, params.facialApiUrl)
            break
          case 'stylegan2-edit':  // 新增：StyleGAN2批量处理
            result = await this.styleGAN2Edit(file, params.styleganParams, params.styleganApiUrl)
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

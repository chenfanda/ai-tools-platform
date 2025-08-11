// ===== src/components/image/StyleGAN2Panel.jsx =====
import React, { useState, useEffect } from 'react'

const StyleGAN2Panel = ({ 
  params, 
  onParamsChange, 
  onProcess,
  isProcessing = false,
  availableAttributes = []
}) => {
  // 本地状态管理（用于属性添加）
  const [selectedAttribute, setSelectedAttribute] = useState('选择属性...')
  
  // 属性中文描述映射（与后端保持一致）
  const ATTRIBUTE_DESCRIPTIONS = {
    "age": "年龄",
    "angle_horizontal": "水平角度", 
    "angle_pitch": "俯仰角度",
    "beauty": "颜值",
    "emotion_angry": "愤怒情绪",
    "emotion_disgust": "厌恶情绪",
    "emotion_easy": "平静情绪",
    "emotion_fear": "恐惧情绪",
    "emotion_happy": "快乐情绪",
    "emotion_sad": "悲伤情绪",
    "emotion_surprise": "惊讶情绪",
    "eyes_open": "眼睛睁开",
    "face_shape": "脸型",
    "gender": "性别",
    "glasses": "眼镜",
    "height": "脸部高度",
    "race_black": "黑人特征",
    "race_white": "白人特征",
    "race_yellow": "亚洲人特征",
    "smile": "微笑",
    "width": "脸部宽度"
  }

  // 生成器选项配置
  const GENERATOR_OPTIONS = [
    { value: '官方FFHQ模型', label: '官方FFHQ模型', description: '通用人脸模型，适合大多数场景' },
    { value: '婴儿风格模型', label: '婴儿风格模型', description: '适合婴幼儿人脸风格化' },
    { value: '模特风格模型', label: '模特风格模型', description: '专业模特风格，适合时尚场景' },
    { value: '明星风格模型', label: '明星风格模型', description: '明星级别的精致风格' },
    { value: '网红风格模型', label: '网红风格模型', description: '网红级别的美化效果' },
    { value: '亚洲人脸模型', label: '亚洲人脸模型', description: '专门针对亚洲人脸优化' }
  ]

  // 编码器配置默认值
  const DEFAULT_ENCODER_CONFIG = {
    n_iters: 5,
    refinement_steps: 200,
    use_lpips: true,
    use_face_align: true
  }

  // 获取属性显示名称
  const getAttributeDisplayName = (attrName) => {
    const chineseName = ATTRIBUTE_DESCRIPTIONS[attrName] || attrName
    return `${chineseName} (${attrName})`
  }

  // 获取可添加的属性列表
  const getAvailableAttributesForAdd = () => {
    return availableAttributes.filter(attr => 
      !params.editAttributes || !(attr in params.editAttributes)
    )
  }

  // 编码器配置更新
  const updateEncoderConfig = (key, value) => {
    const newEncoderConfig = {
      ...params.encoderConfig,
      [key]: value
    }
    
    onParamsChange({
      ...params,
      encoderConfig: newEncoderConfig
    })
  }

  // 生成器选择更新
  const updateSelectedGenerator = (generator) => {
    onParamsChange({
      ...params,
      selectedGenerator: generator
    })
  }

  // 添加编辑属性
  const addEditAttribute = () => {
    if (selectedAttribute === '选择属性...') return
    
    const newEditAttributes = {
      ...params.editAttributes,
      [selectedAttribute]: 0.0
    }
    
    onParamsChange({
      ...params,
      editAttributes: newEditAttributes
    })
    
    // 重置选择
    setSelectedAttribute('选择属性...')
  }

  // 更新属性值
  const updateAttributeValue = (attrName, value) => {
    const newEditAttributes = {
      ...params.editAttributes,
      [attrName]: parseFloat(value)
    }
    
    onParamsChange({
      ...params,
      editAttributes: newEditAttributes
    })
  }

  // 删除属性
  const removeAttribute = (attrName) => {
    const newEditAttributes = { ...params.editAttributes }
    delete newEditAttributes[attrName]
    
    onParamsChange({
      ...params,
      editAttributes: newEditAttributes
    })
  }

  // 清空所有属性
  const clearAllAttributes = () => {
    onParamsChange({
      ...params,
      editAttributes: {}
    })
  }

  // 重置所有参数
  const resetAllParams = () => {
    onParamsChange({
      selectedGenerator: '官方FFHQ模型',
      directionsDir: 'default',
      encoderConfig: { ...DEFAULT_ENCODER_CONFIG },
      editAttributes: {}
    })
  }

  // 统计已启用的编辑属性数量
  const enabledAttributesCount = Object.keys(params.editAttributes || {}).length

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* 参数配置区域 - 固定高度，内部滚动 */}
      <div className="h-[400px] overflow-y-auto">
        <div className="p-6 space-y-6">
          
          {/* 面板标题和重置按钮 */}
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🎭 StyleGAN2风格化配置
            </h4>
            <button
              onClick={resetAllParams}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              🔄 重置参数
            </button>
          </div>

          {/* 1. 编码器参数配置 */}
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              🔧 编码器配置
            </h5>
            
            <div className="space-y-3">
              {/* 迭代次数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  迭代次数: {params.encoderConfig?.n_iters || 5}
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={params.encoderConfig?.n_iters || 5}
                  onChange={(e) => updateEncoderConfig('n_iters', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>快速(1)</span>
                  <span>标准(5)</span>
                  <span>精细(20)</span>
                </div>
              </div>

              {/* 细化步数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  细化步数: {params.encoderConfig?.refinement_steps || 200}
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={params.encoderConfig?.refinement_steps || 200}
                  onChange={(e) => updateEncoderConfig('refinement_steps', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>快速(50)</span>
                  <span>标准(200)</span>
                  <span>精细(1000)</span>
                </div>
              </div>

              {/* 高级选项 */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={params.encoderConfig?.use_lpips ?? true}
                    onChange={(e) => updateEncoderConfig('use_lpips', e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">使用LPIPS损失</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={params.encoderConfig?.use_face_align ?? true}
                    onChange={(e) => updateEncoderConfig('use_face_align', e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">使用人脸对齐</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. 生成器选择 */}
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              🎨 生成器选择
            </h5>
            
            <select
              value={params.selectedGenerator || '官方FFHQ模型'}
              onChange={(e) => updateSelectedGenerator(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-500"
            >
              {GENERATOR_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {/* 显示当前选择的描述 */}
            <div className="mt-2 text-xs text-gray-600">
              {GENERATOR_OPTIONS.find(opt => opt.value === params.selectedGenerator)?.description || '通用人脸模型，适合大多数场景'}
            </div>
          </div>

          {/* 3. 属性编辑区域 */}
          <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              ✏️ 属性编辑
              <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                {enabledAttributesCount} 个属性
              </span>
            </h5>

            {/* 添加属性控件 */}
            <div className="flex gap-2 mb-4">
              <select
                value={selectedAttribute}
                onChange={(e) => setSelectedAttribute(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="选择属性...">选择属性...</option>
                {getAvailableAttributesForAdd().map(attr => (
                  <option key={attr} value={attr}>
                    {getAttributeDisplayName(attr)}
                  </option>
                ))}
              </select>
              <button
                onClick={addEditAttribute}
                disabled={selectedAttribute === '选择属性...'}
                className="px-4 py-2 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200"
              >
                添加
              </button>
            </div>

            {/* 当前编辑属性列表 */}
            {enabledAttributesCount > 0 ? (
              <div className="space-y-3">
                {Object.entries(params.editAttributes || {}).map(([attrName, value]) => (
                  <div key={attrName} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900">
                        {getAttributeDisplayName(attrName)}
                      </span>
                      <button
                        onClick={() => removeAttribute(attrName)}
                        className="w-6 h-6 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200 flex items-center justify-center text-sm"
                        title="删除此属性"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>强度: {value.toFixed(1)}</span>
                        <span>{value < 0 ? '减弱' : value > 0 ? '增强' : '无变化'}</span>
                      </div>
                      <input
                        type="range"
                        min="-5.0"
                        max="5.0"
                        step="0.1"
                        value={value}
                        onChange={(e) => updateAttributeValue(attrName, e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>-5.0</span>
                        <span>0</span>
                        <span>+5.0</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 清空所有属性按钮 */}
                <button
                  onClick={clearAllAttributes}
                  className="w-full px-3 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors duration-200"
                >
                  🗑️ 清空所有属性
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                <div className="text-2xl mb-2">🎯</div>
                <div>暂未添加编辑属性</div>
                <div className="text-xs mt-1">未添加属性时将执行纯编码-解码重建</div>
              </div>
            )}
          </div>

          {/* 高级配置提示 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-600">
              <div className="font-medium mb-1">💡 参数说明:</div>
              <ul className="space-y-1">
                <li>• <strong>迭代次数</strong>: 影响编码精度，值越大质量越高但耗时更长</li>
                <li>• <strong>细化步数</strong>: 影响细节处理，标准值200适合大多数场景</li>
                <li>• <strong>生成器</strong>: 不同模型适合不同风格，FFHQ模型通用性最好</li>
                <li>• <strong>属性强度</strong>: 负值减弱特征，正值增强特征，建议范围-3到+3</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 处理按钮 - 固定在底部 */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onProcess}
          disabled={isProcessing}
          className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              正在风格化处理...
            </div>
          ) : (
            '🎭 开始风格化处理'
          )}
        </button>
        
        <div className="text-xs text-gray-500 mt-2 text-center">
          已配置: {params.selectedGenerator || '官方FFHQ模型'} • {enabledAttributesCount} 个编辑属性
          {enabledAttributesCount === 0 && ' • 将执行纯重建'}
        </div>
      </div>
    </div>
  )
}

export default StyleGAN2Panel

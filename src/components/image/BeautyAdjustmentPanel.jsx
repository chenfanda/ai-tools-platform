// ===== src/components/image/BeautyAdjustmentPanel.jsx =====
import React from 'react'

const BeautyAdjustmentPanel = ({ 
  title, 
  icon, 
  feature,
  enabled, 
  onEnabledChange,
  intensity, 
  onIntensityChange,
  beautyParams,
  updateBeautyParam,
  options = {},
  intensityRange = { min: 0.1, max: 0.7, step: 0.1 },
  onRealtimeChange // 新增：实时预览回调函数（可选）
}) => {
  const { 
    typeKey, 
    typeOptions, 
    typeLabels, 
    regionKey, 
    regionOptions, 
    regionLabels, 
    modeKey, 
    modeOptions, 
    modeLabels 
  } = options

  // 处理启用状态变化
  const handleEnabledChange = (checked) => {
    onEnabledChange(checked)
    // 如果提供了实时回调且启用了功能，触发实时预览
    if (onRealtimeChange && checked) {
      onRealtimeChange()
    }
  }

  // 处理参数变化（类型、区域、模式）
  const handleParamChange = (key, value) => {
    updateBeautyParam(key, value)
    // 如果功能已启用且提供了实时回调，触发实时预览
    if (enabled && onRealtimeChange) {
      onRealtimeChange()
    }
  }

  // 处理强度变化
  const handleIntensityChange = (value) => {
    onIntensityChange(value)
    // 如果功能已启用且提供了实时回调，触发实时预览
    if (enabled && onRealtimeChange) {
      onRealtimeChange()
    }
  }

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 ${
      enabled ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-gray-50'
    }`}>
      {/* 功能开关 */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleEnabledChange(e.target.checked)}
          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
        />
        <span className="text-lg">{icon}</span>
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      
      {/* 功能配置（仅在启用时显示） */}
      {enabled && (
        <div className="space-y-3 ml-7">
          {/* 类型选择 */}
          {typeKey && typeOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整类型</label>
              <select
                value={beautyParams[typeKey]}
                onChange={(e) => handleParamChange(typeKey, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-500"
              >
                {typeOptions.map(option => (
                  <option key={option} value={option}>
                    {typeLabels[option] || option}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* 区域选择 */}
          {regionKey && regionOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整区域</label>
              <select
                value={beautyParams[regionKey]}
                onChange={(e) => handleParamChange(regionKey, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-500"
              >
                {regionOptions.map(option => (
                  <option key={option} value={option}>
                    {regionLabels[option] || option}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* 模式选择 */}
          {modeKey && modeOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">处理模式</label>
              <select
                value={beautyParams[modeKey]}
                onChange={(e) => handleParamChange(modeKey, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-500"
              >
                {modeOptions.map(option => (
                  <option key={option} value={option}>
                    {modeLabels[option] || option}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* 强度调节 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              强度: {intensity.toFixed(1)}
            </label>
            <input
              type="range"
              min={intensityRange.min}
              max={intensityRange.max}
              step={intensityRange.step}
              value={intensity}
              onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>轻微</span>
              <span>适中</span>
              <span>强烈</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BeautyAdjustmentPanel
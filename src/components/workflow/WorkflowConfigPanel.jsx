// ===== src/components/workflow/WorkflowConfigPanel.jsx - 简化重构版 =====

import React, { useState, useEffect, useRef, useMemo } from 'react'

/**
 * 工作流节点配置面板组件 - 智能路由版
 * 
 * 核心改造：只添加 NodeRegistry 支持，保持原有功能 100% 不变
 * 三级路由：NodeRegistry → DynamicConfigPanel → 传统配置
 */
const WorkflowConfigPanel = ({ node, onConfigSave }) => {
  const [dynamicComponent, setDynamicComponent] = useState(null)
  const [routingError, setRoutingError] = useState(null)
  
  // 🔧 关键修复：缓存路由结果，避免重复路由
  const [routingCache, setRoutingCache] = useState(new Map())
  const routingInProgress = useRef(false)
  
  // 🔧 方案1：添加路由状态追踪
  const lastRoutedNodeId = useRef(null)
  const lastRoutedNodeType = useRef(null)

  // 🔧 修复：稳定化 nodeConfig，避免频繁重新计算
  const stableNodeConfig = useMemo(() => {
    if (!node) return null
    
    // 创建稳定的配置对象标识
    const configKey = `${node.type}-${node.id}`
    const configData = node.data?.nodeConfig || node.data?.jsonConfig
    
    return {
      key: configKey,
      type: node.type,
      id: node.id,
      config: configData
    }
  }, [node?.type, node?.id, JSON.stringify(node?.data?.nodeConfig), JSON.stringify(node?.data?.jsonConfig)])

  // ===== 智能路由逻辑 =====
  useEffect(() => {
    console.log('[调试] useEffect 触发原因:', {
      nodeId: node?.id,
      nodeType: node?.type,
      lastRoutedNodeId: lastRoutedNodeId.current,
      lastRoutedNodeType: lastRoutedNodeType.current,
      hasComponent: !!dynamicComponent,
      cacheSize: routingCache.size,
      inProgress: routingInProgress.current
    })
    
    // 🔧 方案1核心逻辑：只在节点真正切换时才重新路由
    if (!node?.id) {
      console.log('[调试] 节点为空，清除组件')
      setDynamicComponent(null)
      lastRoutedNodeId.current = null
      lastRoutedNodeType.current = null
      return
    }

    // 🔧 关键：如果是同一个节点，且已有组件，直接返回
    if (lastRoutedNodeId.current === node.id && 
        lastRoutedNodeType.current === node.type && 
        dynamicComponent) {
      console.log('[调试] 同一节点且已有组件，跳过路由')
      return
    }

    // 🔧 防止并发路由
    if (routingInProgress.current) {
      console.log('[调试] 路由正在进行中，跳过重复请求')
      return
    }

    console.log('[调试] 开始新的路由:', node.id, node.type)

    const tryDynamicRouting = async () => {
      routingInProgress.current = true
      
      try {
        
        console.log('[调试] 开始动态路由, onConfigSave:', typeof onConfigSave)
        
        // 1. 尝试 NodeRegistry 路由
        const registryModule = await import("../../services/workflow/dynamic/DynamicNodeRegistry").catch(() => null);
        const nodeRegistry = registryModule?.default || registryModule

        if (nodeRegistry?.routeConfigComponent) {
          const routeResult = nodeRegistry.routeConfigComponent(node.type, { node, onConfigSave })
          if (routeResult) {
            if (routeResult.type === 'DynamicConfigPanel') {
              const dynamicModule2 = await import("./nodes/dynamic/DynamicConfigPanel").catch(() => null);
              const DynamicConfigPanel = dynamicModule?.default
              
              if (DynamicConfigPanel) {
                console.log('[调试] 创建DynamicConfigPanel, 传递onConfigSave:', typeof onConfigSave)
                
                // 🔧 关键修复：创建稳定的组件实例，使用 React.memo 包装
                const StableDynamicConfigPanel = React.memo(DynamicConfigPanel)
                
                const componentInstance = (
                  <StableDynamicConfigPanel
                    key={`${node.type}-${node.id}`} // 稳定的 key
                    nodeConfig={routeResult.nodeConfig}
                    node={node}
                    onConfigSave={onConfigSave}
                  />
                )
                
                // 🔧 记录路由状态
                lastRoutedNodeId.current = node.id
                lastRoutedNodeType.current = node.type
                
                setDynamicComponent(componentInstance)
                setRoutingError(null)
                console.log('[调试] DynamicConfigPanel 路由完成')
                return
              }
            } else {
              // 🔧 非 DynamicConfigPanel 组件也进行缓存
              setRoutingCache(prev => new Map(prev.set(cacheKey, routeResult)))
              setDynamicComponent(routeResult)
              setRoutingError(null)
              return
            }
          }
        }

        // 2. 尝试 DynamicConfigPanel 路由 (JSON配置支持)
        const dynamicModule = await import('./nodes/dynamic/DynamicConfigPanel').catch(() => null)
        const DynamicConfigPanel = dynamicModule?.default

        if (DynamicConfigPanel) {
          let nodeConfig = null

          // 检查配置获取逻辑
          if (node.data?.nodeConfig) {
            nodeConfig = node.data.nodeConfig
          } else if (node.data?.jsonConfig || node.data?.sourceType === 'json' || node.type === 'sample-custom-node') {
            // JSON配置转换逻辑
            try {
              const converterModule = await import('../../extensions/workflow/utils/ConfigConverter').catch(() => null)
              const configConverter = converterModule?.default

              if (configConverter) {
                const jsonConfigToConvert = node.data?.jsonConfig || {
                  node: {
                    type: node.type,
                    label: node.data?.label || '自定义节点',
                    icon: '⭐',
                    theme: 'purple',
                    description: 'JSON配置驱动节点'
                  },
                  data: {
                    defaultData: {
                      customMessage: node.data?.customMessage || 'Hello from JSON Config!',
                      isEnabled: node.data?.isEnabled !== undefined ? node.data.isEnabled : true,
                      priority: node.data?.priority !== undefined ? node.data.priority : 1,
                      selectedOption: node.data?.selectedOption || 'option1',
                      backgroundImage: node.data?.backgroundImage || '',
                      soundEffect: node.data?.soundEffect || '',
                      demoVideo: node.data?.demoVideo || '',
                      attachmentFile: node.data?.attachmentFile || ''
                    },
                    validation: { required: ['customMessage'] }
                  },
                  meta: { sourceType: 'json' }
                }

                nodeConfig = configConverter.convertJsonConfigToFields(jsonConfigToConvert)
                console.log('[WorkflowConfigPanel] JSON配置转换成功:', nodeConfig)
              }
            } catch (conversionError) {
              console.warn('[WorkflowConfigPanel] JSON配置转换失败:', conversionError)
            }
          }

          // 如果获得了配置，使用DynamicConfigPanel
          if (nodeConfig) {
            console.log('[调试] 创建DynamicConfigPanel (JSON配置), 传递onConfigSave:', typeof onConfigSave)
            
            // 🔧 关键修复：创建稳定的组件实例
            const StableDynamicConfigPanel = React.memo(DynamicConfigPanel)
            
            const componentInstance = (
              <StableDynamicConfigPanel
                key={`${node.type}-${node.id}`}
                nodeConfig={nodeConfig}
                node={node}
                onConfigSave={onConfigSave}
              />
            )
            
            // 🔧 记录路由状态
            lastRoutedNodeId.current = node.id
            lastRoutedNodeType.current = node.type
            
            setDynamicComponent(componentInstance)
            setRoutingError(null)
            console.log('[调试] DynamicConfigPanel 路由完成 (JSON配置)')
            return
          }
        }

        // 3. 降级到传统路由
        console.log('[调试] 降级到传统路由')
        lastRoutedNodeId.current = node.id
        lastRoutedNodeType.current = node.type
        setDynamicComponent(null)
        setRoutingError(null)

      } catch (error) {
        console.warn('[WorkflowConfigPanel] 动态路由失败:', error)
        lastRoutedNodeId.current = node.id
        lastRoutedNodeType.current = node.type
        setDynamicComponent(null)
        setRoutingError(error.message)
      } finally {
        routingInProgress.current = false
      }
    }
    
    tryDynamicRouting()
  }, [node?.id, node?.type]) // 🔧 方案1核心：只依赖节点ID和类型，不依赖配置变化

  // 🔧 新增：清理缓存机制，防止内存泄漏
  useEffect(() => {
    return () => {
      // 组件卸载时清理状态
      lastRoutedNodeId.current = null
      lastRoutedNodeType.current = null
    }
  }, [])

  // ===== 主渲染 =====
  if (!node) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="text-3xl mb-3">⚙️</div>
        <div className="text-lg font-medium mb-1">节点配置</div>
        <div className="text-sm">请选择一个节点进行配置</div>
      </div>
    )
  }

  // 渲染动态组件
  if (dynamicComponent) {
    return (
      <div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            ✅ 动态配置已启用 - {node.type} (缓存: {routingCache.size})
          </div>
        )}
        {dynamicComponent}
      </div>
    )
  }

  // 传统路由（保持原有逻辑完全不变）
  return (
    <div>
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          🏛️ 传统配置路由 {routingError && `(错误: ${routingError})`}
        </div>
      )}
      
      {node.type === 'text-input' && <TextInputConfig node={node} onConfigSave={onConfigSave} />}
      {node.type === 'tts' && <TTSConfigEnhanced node={node} onConfigSave={onConfigSave} />}
      {node.type === 'output' && <OutputConfig node={node} onConfigSave={onConfigSave} />}
      {node.type === 'download' && <DownloadConfig node={node} onConfigSave={onConfigSave} />}
      {!['text-input', 'tts', 'output', 'download'].includes(node.type) && (
        <DefaultConfig node={node} onConfigSave={onConfigSave} />
      )}
    </div>
  )
}

// 字段类型判断函数
const getFieldType = (key, defaultValue, validation) => {
  // 显式类型声明（优先级最高）
  if (validation?.fieldType) {
    return validation.fieldType
  }
  
  // 根据字段名推断
  if (key.toLowerCase().includes('image') || key.toLowerCase().includes('picture')) {
    return 'image'
  }
  if (key.toLowerCase().includes('audio') || key.toLowerCase().includes('sound')) {
    return 'audio'
  }
  if (key.toLowerCase().includes('video')) {
    return 'video'
  }
  if (key.toLowerCase().includes('file')) {
    return 'file'
  }
  
  // 根据默认值类型推断
  if (typeof defaultValue === 'boolean') return 'boolean'
  if (typeof defaultValue === 'number') return 'number'
  if (Array.isArray(defaultValue)) return 'select'
  if (typeof defaultValue === 'string' && defaultValue.length > 50) return 'textarea'
  
  return 'text'
}

// 格式化字段标签
const formatFieldLabel = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1 $2')
}

// 媒体字段组件
const ImageField = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const file = e.target.files[0]
        if (file) onChange(URL.createObjectURL(file))
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
    {value && (
      <img src={value} alt="预览" className="mt-2 max-w-32 max-h-32 object-cover rounded border" />
    )}
  </div>
)

const AudioField = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type="file"
      accept="audio/*"
      onChange={(e) => {
        const file = e.target.files[0]
        if (file) onChange(URL.createObjectURL(file))
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
    {value && (
      <audio controls className="mt-2 w-full">
        <source src={value} />
      </audio>
    )}
  </div>
)

const VideoField = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type="file"
      accept="video/*"
      onChange={(e) => {
        const file = e.target.files[0]
        if (file) onChange(URL.createObjectURL(file))
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
    {value && (
      <video controls className="mt-2 max-w-64 max-h-32">
        <source src={value} />
      </video>
    )}
  </div>
)

const FileField = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files[0]
        if (file) onChange(file.name)
      }}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
    {value && (
      <div className="mt-2 text-sm text-gray-600">📎 {value}</div>
    )}
  </div>
)

// ============ 新增：JSON 节点自动配置组件 ============

const JsonNodeAutoConfig = ({ node, onConfigSave }) => {
  // 从示例节点的默认数据生成配置界面
  const defaultData = {
  customMessage: 'Hello from JSON Config!',
  isEnabled: true,
  priority: 1,
  selectedOption: 'option1',
  backgroundImage: '',
  soundEffect: '',
  demoVideo: '',
  attachmentFile: ''
}
  
  const [configData, setConfigData] = useState({ ...defaultData, ...node.data })

  // 同步节点数据变化
  useEffect(() => {
    setConfigData({ ...defaultData, ...node.data })
  }, [node.id])

  const handleSave = () => {
    onConfigSave(node.id, { ...configData, id: node.id })
  }

  const updateField = (key, value) => {
    setConfigData(prev => ({ ...prev, [key]: value }))
  }

  // 检测是否有变化
  const originalData = { ...defaultData, ...node.data }
  const hasChanges = JSON.stringify(configData) !== JSON.stringify(originalData)

  return (
    <div className="space-y-4">
      {/* 节点信息头部 */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-purple-800 mb-2">⭐ 示例自定义节点</h4>
        <p className="text-xs text-purple-600">
          这是一个通过 JSON 配置创建的自定义节点
        </p>
      </div>

     {/* 配置字段 */}
      <div className="space-y-3">
        {Object.entries(defaultData).map(([key, defaultValue]) => {
          const fieldType = getFieldType(key, defaultValue, null)
          const fieldLabel = formatFieldLabel(key)
          
          return (
            <div key={key}>
              {fieldType === 'image' && (
                <ImageField
                  label={fieldLabel}
                  value={configData[key]}
                  onChange={(value) => updateField(key, value)}
                />
              )}
              {fieldType === 'audio' && (
                <AudioField
                  label={fieldLabel}
                  value={configData[key]}
                  onChange={(value) => updateField(key, value)}
                />
              )}
              {fieldType === 'video' && (
                <VideoField
                  label={fieldLabel}
                  value={configData[key]}
                  onChange={(value) => updateField(key, value)}
                />
              )}
              {fieldType === 'file' && (
                <FileField
                  label={fieldLabel}
                  value={configData[key]}
                  onChange={(value) => updateField(key, value)}
                />
              )}
              {fieldType === 'boolean' && (
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!configData[key]}
                      onChange={(e) => updateField(key, e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{fieldLabel}</span>
                  </label>
                </div>
              )}
              {fieldType === 'number' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {fieldLabel}: {configData[key] || defaultValue}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={configData[key] || defaultValue}
                    onChange={(e) => updateField(key, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>低 (0)</span>
                    <span>高 (10)</span>
                  </div>
                </div>
              )}
              {fieldType === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{fieldLabel}</label>
                  <select
                    value={configData[key] || (Array.isArray(defaultValue) ? defaultValue[0] : defaultValue)}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.isArray(defaultValue) ? defaultValue.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    )) : (
                      <option value={defaultValue}>{defaultValue}</option>
                    )}
                  </select>
                </div>
              )}
              {fieldType === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{fieldLabel}</label>
                  <input
                    type="text"
                    value={configData[key] || ''}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`输入${fieldLabel}...`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 保存按钮 */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          💾 保存配置
        </button>
      </div>

      {/* 调试信息 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h5 className="text-xs font-medium text-gray-700 mb-2">调试信息</h5>
        <div className="text-xs text-gray-600 space-y-1">
          <div>节点ID: {node.id}</div>
          <div>节点类型: {node.type}</div>
          <div>配置来源: JSON 配置文件</div>
          <div>数据源: {node.data?.sourceType || '自动检测'}</div>
        </div>
      </div>

      {hasChanges && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          ⚠️ 有未保存的更改
        </div>
      )}
    </div>
  )
}

// ============ 原有配置组件（保持不变） ============

const TextInputConfig = ({ node, onConfigSave }) => {
  const [tempText, setTempText] = useState(node.data.text || '')
  const [hasChanges, setHasChanges] = useState(false)
  
  useEffect(() => {
    const currentText = node.data.text || ''
    setTempText(currentText)
    setHasChanges(false)
  }, [node.id, node.data.text])
  
  const handleChange = (newText) => {
    setTempText(newText)
    setHasChanges(newText !== (node.data.text || ''))
  }
  
  const handleSave = () => {
    onConfigSave(node.id, { text: tempText })
    setHasChanges(false)
  }
  
  const handleCancel = () => {
    const originalText = node.data.text || ''
    setTempText(originalText)
    setHasChanges(false)
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-lg">📝</div>
        <div>
          <h4 className="font-semibold text-gray-900">文本输入配置</h4>
          <div className="text-xs text-gray-500">第 {(node.data.nodeIndex || 0) + 1} 步</div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">输入文本内容</label>
        <textarea 
          value={tempText} 
          onChange={(e) => handleChange(e.target.value)} 
          placeholder="请输入要处理的文本内容..." 
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
        />
        <div className="mt-1 text-xs text-gray-500 flex justify-between">
          <span>字符数: {tempText.length}</span>
          {tempText.length > 500 && (
            <span className="text-orange-600">⚠️ 文本较长，可能影响处理速度</span>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button 
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          💾 保存配置
        </button>
        <button 
          onClick={handleCancel}
          disabled={!hasChanges}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          取消
        </button>
      </div>
      
      {tempText && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-xs font-medium text-purple-700 mb-1">内容预览</div>
          <div className="text-sm text-purple-800">
            "{tempText.length > 100 ? tempText.substring(0, 100) + '...' : tempText}"
          </div>
        </div>
      )}
      
      {hasChanges && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          ⚠️ 有未保存的更改
        </div>
      )}
    </div>
  )
}

const TTSConfigEnhanced = ({ node, onConfigSave }) => {
  const [mode, setMode] = useState(node.data.mode || 'character')
  const [selectedCharacter, setSelectedCharacter] = useState(node.data.selectedCharacter || '')
  const [gender, setGender] = useState(node.data.gender || '')
  const [pitch, setPitch] = useState(node.data.pitch || '')
  const [speed, setSpeed] = useState(node.data.speed || '')
  const [username, setUsername] = useState(node.data.username || 'workflow_user')
  const [voiceId, setVoiceId] = useState(node.data.voice_id || '')
  const [characters, setCharacters] = useState([])
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [charactersError, setCharactersError] = useState(null)
  const [userVoices, setUserVoices] = useState([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const parameterOptions = {
    gender: [
      { value: '', label: '自动' },
      { value: 'male', label: '男性' },
      { value: 'female', label: '女性' }
    ],
    pitch: [
      { value: '', label: '默认' },
      { value: 'very_low', label: '很低' },
      { value: 'low', label: '低' },
      { value: 'moderate', label: '中等' },
      { value: 'high', label: '高' },
      { value: 'very_high', label: '很高' }
    ],
    speed: [
      { value: '', label: '默认' },
      { value: 'very_low', label: '很慢' },
      { value: 'low', label: '慢' },
      { value: 'moderate', label: '中等' },
      { value: 'high', label: '快' },
      { value: 'very_high', label: '很快' }
    ]
  }

  useEffect(() => {
    setMode(node.data.mode || 'character')
    setSelectedCharacter(node.data.selectedCharacter || '')
    setGender(node.data.gender || '')
    setPitch(node.data.pitch || '')
    setSpeed(node.data.speed || '')
    setUsername(node.data.username || 'workflow_user')
    setVoiceId(node.data.voice_id || '')
    setHasChanges(false)
  }, [node.id])

  useEffect(() => {
    const hasChanged = 
      mode !== (node.data.mode || 'character') ||
      selectedCharacter !== (node.data.selectedCharacter || '') ||
      gender !== (node.data.gender || '') ||
      pitch !== (node.data.pitch || '') ||
      speed !== (node.data.speed || '') ||
      username !== (node.data.username || 'workflow_user') ||
      voiceId !== (node.data.voice_id || '')
    setHasChanges(hasChanged)
  }, [mode, selectedCharacter, gender, pitch, speed, username, voiceId, node.data])

  // 加载语音角色
  const loadVoiceCharacters = async () => {
    if (!node.data.config?.ttsApiUrl) {
      setCharactersError('TTS API 地址未配置')
      return
    }

    setCharactersLoading(true)
    setCharactersError(null)

    try {
      const response = await fetch(node.data.config.ttsApiUrl + '/characters', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (response.ok) {
        const charactersData = await response.json()
        const charactersList = Array.isArray(charactersData) ? charactersData : []
        setCharacters(charactersList)
        
        if (charactersList.length === 0) {
          setCharactersError('暂无可用的语音角色')
        }
      } else {
        throw new Error(`服务器响应错误: ${response.status}`)
      }
    } catch (error) {
      setCharactersError(`加载失败: ${error.message}`)
      // 提供默认角色
      setCharacters([
        { character_id: 'richard', name: 'Richard', gender: 'male' },
        { character_id: 'andy', name: 'Andy', gender: 'male' },
        { character_id: 'jack', name: 'Jack', gender: 'male' }
      ])
    } finally {
      setCharactersLoading(false)
    }
  }

  // 加载用户自定义语音
  const loadUserVoices = async () => {
    if (!node.data.config?.ttsApiUrl || !username.trim()) {
      setUserVoices([])
      return
    }

    setVoicesLoading(true)
    try {
      const response = await fetch(`${node.data.config.ttsApiUrl}/user_custom_voices/${username.trim()}`)
      if (response.ok) {
        const voicesData = await response.json()
        setUserVoices(Array.isArray(voicesData) ? voicesData : [])
      } else {
        setUserVoices([])
      }
    } catch (error) {
      setUserVoices([])
    } finally {
      setVoicesLoading(false)
    }
  }

  // 当模式改为角色模式时，加载角色
  useEffect(() => {
    if (mode === 'character' && characters.length === 0 && !charactersLoading) {
      loadVoiceCharacters()
    }
  }, [mode])

  // 当用户名改变时，加载用户语音
  useEffect(() => {
    if (mode === 'custom' && username.trim()) {
      const timer = setTimeout(() => loadUserVoices(), 500)
      return () => clearTimeout(timer)
    }
  }, [mode, username])

  const handleSave = () => {
    onConfigSave(node.id, {
      mode, selectedCharacter, character: selectedCharacter,
      gender, pitch, speed, username, voice_id: voiceId
    })
    setHasChanges(false)
  }

  const handleCancel = () => {
    setMode(node.data.mode || 'character')
    setSelectedCharacter(node.data.selectedCharacter || '')
    setGender(node.data.gender || '')
    setPitch(node.data.pitch || '')
    setSpeed(node.data.speed || '')
    setUsername(node.data.username || 'workflow_user')
    setVoiceId(node.data.voice_id || '')
    setHasChanges(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-lg">🎤</div>
        <div>
          <h4 className="font-semibold text-gray-900">语音合成配置</h4>
          <div className="text-xs text-gray-500">第 {(node.data.nodeIndex || 0) + 1} 步</div>
        </div>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">合成模式</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="character">预设角色</option>
            <option value="custom">自定义声音</option>
          </select>
        </div>

        {mode === 'character' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              语音角色
              {charactersLoading && (
                <span className="ml-2 text-blue-600">
                  <div className="inline-block w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                </span>
              )}
            </label>

            {charactersError ? (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded border">
                <div className="mb-2">❌ {charactersError}</div>
                <button
                  onClick={loadVoiceCharacters}
                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  重新加载
                </button>
              </div>
            ) : (
              <select 
                value={selectedCharacter} 
                onChange={(e) => setSelectedCharacter(e.target.value)}
                disabled={charactersLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              >
                <option value="">{charactersLoading ? '加载中...' : '请选择角色'}</option>
                {characters.map(char => (
                  <option key={char.character_id} value={char.character_id}>
                    {char.name} {char.gender && `(${char.gender === 'male' ? '男' : '女'})`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {mode === 'custom' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择语音
                {voicesLoading && (
                  <span className="ml-2 text-blue-600">
                    <div className="inline-block w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
              </label>
              <select 
                value={voiceId} 
                onChange={(e) => setVoiceId(e.target.value)}
                disabled={voicesLoading || !username.trim()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              >
                <option value="">
                  {!username.trim() ? '请先输入用户名' :
                   voicesLoading ? '加载中...' : 
                   userVoices.length === 0 ? '该用户暂无自定义语音' :
                   '请选择已有语音'}
                </option>
                {userVoices.map(voice => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    🎵 {voice.voice_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">语音参数</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">性别</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm">
                {parameterOptions.gender.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">音调</label>
              <select value={pitch} onChange={(e) => setPitch(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm">
                {parameterOptions.pitch.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">语速</label>
              <select value={speed} onChange={(e) => setSpeed(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm">
                {parameterOptions.speed.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button onClick={handleSave} disabled={!hasChanges}
          className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm font-medium">
          💾 保存配置
        </button>
        <button onClick={handleCancel} disabled={!hasChanges}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm">
          取消
        </button>
      </div>

      {hasChanges && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          ⚠️ 有未保存的更改
        </div>
      )}
    </div>
  )
}

const OutputConfig = ({ node, onConfigSave }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-lg">📤</div>
        <div>
          <h4 className="font-semibold text-gray-900">输出节点配置</h4>
          <div className="text-xs text-gray-500">第 {(node.data.nodeIndex || 0) + 1} 步</div>
        </div>
      </div>
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-1">节点信息</div>
        <div className="text-xs text-gray-600">
          <div>节点类型: {node.type}</div>
          <div>节点ID: {node.id}</div>
          <div>状态: {node.data.result ? '已有输出' : '等待执行'}</div>
        </div>
      </div>
      <div className="text-sm text-gray-500">输出节点会自动显示工作流的最终结果</div>
    </div>
  )
}

const DownloadConfig = ({ node, onConfigSave }) => {
  const [autoDownload, setAutoDownload] = useState(node.data.autoDownload || false)
  const [customFileName, setCustomFileName] = useState(node.data.customFileName || '')
  const [customPath, setCustomPath] = useState(node.data.customPath || '')
  const [downloadFormat, setDownloadFormat] = useState(node.data.downloadFormat || 'auto')
  const [showProgress, setShowProgress] = useState(node.data.showProgress !== false)
  const [allowRetry, setAllowRetry] = useState(node.data.allowRetry !== false)
  const [hasChanges, setHasChanges] = useState(false)

  // 同步节点数据到本地状态
  useEffect(() => {
    setAutoDownload(node.data.autoDownload || false)
    setCustomFileName(node.data.customFileName || '')
    setCustomPath(node.data.customPath || '')
    setDownloadFormat(node.data.downloadFormat || 'auto')
    setShowProgress(node.data.showProgress !== false)
    setAllowRetry(node.data.allowRetry !== false)
    setHasChanges(false)
  }, [node.id])

  // 检测配置变化
  useEffect(() => {
    const hasChanged = 
      autoDownload !== (node.data.autoDownload || false) ||
      customFileName !== (node.data.customFileName || '') ||
      customPath !== (node.data.customPath || '') ||
      downloadFormat !== (node.data.downloadFormat || 'auto') ||
      showProgress !== (node.data.showProgress !== false) ||
      allowRetry !== (node.data.allowRetry !== false)
    
    setHasChanges(hasChanged)
  }, [autoDownload, customFileName, customPath, downloadFormat, showProgress, allowRetry, node.data])

  // 保存配置
// 在 WorkflowConfigPanel.jsx 的 DownloadConfig 组件中修改 handleSave 方法

const handleSave = async () => {
  const configData = {
    autoDownload,
    customFileName,
    customPath,
    downloadFormat,
    showProgress,
    allowRetry
  }
  
  console.log('[DownloadConfig] 保存配置:', configData)
  
  // 🔑 关键修复：保存配置同时触发状态刷新
  await onConfigSave(node.id, {
    ...configData,
    _statusUpdateKey: Date.now() // 添加时间戳强制状态更新
  })
  
  setHasChanges(false)
  
  // 🔑 额外的状态刷新逻辑
  setTimeout(async () => {
    try {
      const { default: nodeStatusCalculator } = await import('../../services/workflow/NodeStatusCalculator')
      nodeStatusCalculator.clearCache()
      console.log('[DownloadConfig] 配置保存后已清除状态缓存')
      
      // 🔧 新增：通知父组件刷新节点状态
      const refreshEvent = new CustomEvent('nodeStatusRefresh', { 
        detail: { 
          nodeId: node.id, 
          nodeType: node.type,
          timestamp: Date.now()
        } 
      })
      window.dispatchEvent(refreshEvent)
      
    } catch (error) {
      console.warn('[DownloadConfig] 状态刷新失败:', error)
    }
  }, 50) // 更短的延迟确保立即生效
}

  // 取消更改
  const handleCancel = () => {
    setAutoDownload(node.data.autoDownload || false)
    setCustomFileName(node.data.customFileName || '')
    setCustomPath(node.data.customPath || '')
    setDownloadFormat(node.data.downloadFormat || 'auto')
    setShowProgress(node.data.showProgress !== false)
    setAllowRetry(node.data.allowRetry !== false)
    setHasChanges(false)
  }

  // 检测下载状态
  const getDownloadStatus = () => {
    if (node.data.downloadStatus === 'completed') return 'completed'
    if (node.data.downloadStatus === 'downloading') return 'downloading'
    if (node.data.downloadStatus === 'ready') return 'ready'
    if (node.data.downloadStatus === 'error') return 'error'
    return 'waiting'
  }

  const downloadStatus = getDownloadStatus()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-lg">📥</div>
        <div>
          <h4 className="font-semibold text-gray-900">下载节点配置</h4>
          <div className="text-xs text-gray-500">第 {(node.data.nodeIndex || 0) + 1} 步</div>
        </div>
      </div>

      {/* 下载状态显示 */}
      <div className={`p-3 rounded-lg border ${
        downloadStatus === 'completed' ? 'bg-green-50 border-green-200' :
        downloadStatus === 'downloading' ? 'bg-blue-50 border-blue-200' :
        downloadStatus === 'ready' ? 'bg-yellow-50 border-yellow-200' :
        downloadStatus === 'error' ? 'bg-red-50 border-red-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${
            downloadStatus === 'completed' ? 'bg-green-500' :
            downloadStatus === 'downloading' ? 'bg-blue-500' :
            downloadStatus === 'ready' ? 'bg-yellow-500' :
            downloadStatus === 'error' ? 'bg-red-500' :
            'bg-gray-300'
          }`} />
          <div className={`text-sm font-medium ${
            downloadStatus === 'completed' ? 'text-green-700' :
            downloadStatus === 'downloading' ? 'text-blue-700' :
            downloadStatus === 'ready' ? 'text-yellow-700' :
            downloadStatus === 'error' ? 'text-red-700' :
            'text-gray-700'
          }`}>
            {downloadStatus === 'completed' ? '下载已完成' :
             downloadStatus === 'downloading' ? '正在下载中' :
             downloadStatus === 'ready' ? '准备下载' :
             downloadStatus === 'error' ? '下载出错' :
             '等待数据输入'}
          </div>
        </div>
        
        {node.data.downloadInfo && (
          <div className="text-xs text-gray-600">
            <div>文件类型: {node.data.downloadInfo.type?.toUpperCase() || 'unknown'}</div>
            <div>文件名: {node.data.downloadInfo.fileName || 'unknown'}</div>
          </div>
        )}
      </div>

      {/* 基础设置 */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-gray-800 border-b border-gray-200 pb-1">基础设置</h5>
        
        {/* 自定义文件名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            自定义文件名
          </label>
          <input
            type="text"
            value={customFileName}
            onChange={(e) => setCustomFileName(e.target.value)}
            placeholder="留空则自动生成文件名"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            不包含扩展名，系统会根据格式自动添加
          </div>
        </div>

        {/* 下载格式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            下载格式
          </label>
          <select
            value={downloadFormat}
            onChange={(e) => setDownloadFormat(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="auto">自动检测 (推荐)</option>
            <option value="wav">WAV 音频</option>
            <option value="mp3">MP3 音频</option>
            <option value="txt">TXT 文本</option>
            <option value="json">JSON 数据</option>
            <option value="png">PNG 图片</option>
            <option value="jpg">JPG 图片</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">
            自动检测会根据数据类型选择最合适的格式
          </div>
        </div>

        {/* 自定义路径 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            自定义保存路径 (可选)
          </label>
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="例如: Downloads/AI创作/"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            部分浏览器可能不支持自定义路径
          </div>
        </div>
      </div>

      {/* 功能开关 */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-gray-800 border-b border-gray-200 pb-1">功能设置</h5>
        
        <div className="space-y-2">
          {/* 自动下载 */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoDownload}
              onChange={(e) => setAutoDownload(e.target.checked)}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">自动下载</span>
            <span className="text-xs text-gray-500">(接收到数据后自动开始下载)</span>
          </label>
          
          {/* 显示下载进度 */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showProgress}
              onChange={(e) => setShowProgress(e.target.checked)}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">显示下载进度</span>
          </label>
          
          {/* 允许重试下载 */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowRetry}
              onChange={(e) => setAllowRetry(e.target.checked)}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">允许重试下载</span>
          </label>
        </div>
      </div>

      {/* 配置预览 */}
      {hasChanges && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm font-medium text-green-700 mb-1">配置预览</div>
          <div className="text-xs text-green-600 space-y-1">
            <div>自动下载: {autoDownload ? '启用' : '禁用'}</div>
            <div>文件名: {customFileName || '自动生成'}</div>
            <div>格式: {downloadFormat === 'auto' ? '自动检测' : downloadFormat.toUpperCase()}</div>
            <div>路径: {customPath || '默认下载文件夹'}</div>
            <div>显示进度: {showProgress ? '是' : '否'}</div>
            <div>允许重试: {allowRetry ? '是' : '否'}</div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button 
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          💾 保存配置
        </button>
        <button 
          onClick={handleCancel}
          disabled={!hasChanges}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          取消
        </button>
      </div>
      
      {hasChanges && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          ⚠️ 有未保存的更改
        </div>
      )}

      {/* 使用提示 */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm font-medium text-blue-700 mb-1">💡 使用提示</div>
        <div className="text-xs text-blue-600 space-y-1">
          <div>• 下载节点会自动检测上游数据类型并生成对应格式的文件</div>
          <div>• 支持音频、文本、图片、JSON等多种数据格式</div>
          <div>• 自动下载功能可在接收到数据后立即开始下载</div>
          <div>• 可通过配置自定义文件名和保存路径</div>
        </div>
      </div>
    </div>
  )
}

const DefaultConfig = ({ node, onConfigSave }) => {
  // 检查是否是 JSON 配置节点
  const isJsonNode = node.data?.sourceType === 'json' || 
                     node.type === 'sample-custom-node' ||
                     (node.data?.jsonConfig !== undefined)

  if (isJsonNode) {
    return <JsonNodeAutoConfig node={node} onConfigSave={onConfigSave} />
  }

  // 原有的默认配置组件
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center text-white text-lg">⚙️</div>
        <div>
          <h4 className="font-semibold text-gray-900">节点配置</h4>
          <div className="text-xs text-gray-500">第 {(node.data.nodeIndex || 0) + 1} 步</div>
        </div>
      </div>
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-1">节点信息</div>
        <div className="text-xs text-gray-600">
          <div>节点类型: {node.type}</div>
          <div>节点ID: {node.id}</div>
        </div>
      </div>
      <div className="text-sm text-gray-500">此节点类型暂无可配置参数</div>
    </div>
  )
}

export default WorkflowConfigPanel

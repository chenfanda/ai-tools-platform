// ===== src/components/workflow/nodes/TTSNode.jsx - 简化版本（使用BaseWorkflowNode） =====
import React, { useState, memo, useEffect } from 'react'
import { AdapterFactory, WorkflowData } from '@/services/workflow/ModuleAdapter'
import BaseWorkflowNode from '../BaseWorkflowNode'

const TTSNode = ({ data, selected, id }) => {
  // 基础状态
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(data.result || null)
  
  // 配置状态 - 只读取，不修改
  const mode = data.mode || 'character'
  const selectedCharacter = data.selectedCharacter || data.character || ''
  const username = data.username || 'workflow_user'
  const voiceId = data.voice_id || ''
  const gender = data.gender || ''
  const pitch = data.pitch || ''
  const speed = data.speed || ''

  // 节点位置信息
  const nodeIndex = data.nodeIndex !== undefined ? data.nodeIndex : 0
  const totalNodes = data.totalNodes || 1

  // 获取配置状态
  const getConfigStatus = () => {
    if (mode === 'character') {
      return selectedCharacter ? 'configured' : 'waiting'
    } else if (mode === 'custom') {
      return (username.trim() && voiceId) ? 'configured' : 'waiting'
    }
    return 'waiting'
  }

  // 获取节点状态
  const getNodeStatus = () => {
    if (isProcessing) return 'processing'
    if (result?.success) return 'success'
    if (result?.error) return 'error'
    return getConfigStatus()
  }

  // 处理TTS执行
  const handleProcess = async (inputData) => {
    setIsProcessing(true)
    
    try {
      console.log('[TTSNode] 开始处理:', inputData)
      
      // 验证配置
      if (mode === 'character' && !selectedCharacter) {
        throw new Error('请选择语音角色')
      }
      if (mode === 'custom' && !voiceId) {
        throw new Error('自定义模式需要选择语音')
      }
      if (!data.config?.ttsApiUrl) {
        throw new Error('TTS API 地址未配置')
      }

      // 创建TTS适配器
      const adapter = AdapterFactory.createAdapter('tts', {
        ...data.config,
        mode,
        selectedCharacter,
        character: selectedCharacter,
        gender,
        pitch,
        speed,
        username,
        voice_id: voiceId
      })
      
      // 准备工作流数据
      let workflowData = inputData
      
      // 如果输入不是标准格式，转换为WorkflowData
      if (!workflowData || !workflowData.type) {
        const textToProcess = inputData || ''
        if (!textToProcess) {
          throw new Error('没有输入文本')
        }
        workflowData = WorkflowData.createText(textToProcess, { nodeId: id })
      }
      
      // 使用适配器处理
      const executionResult = await adapter.process(workflowData)
      
      if (executionResult.success) {
        const audioData = executionResult.data
        const compatResult = {
          success: true,
          audio_id: audioData.content.audio.id,
          audio_url: audioData.content.audio.url,
          originalText: audioData.metadata.originalText,
          character: audioData.metadata.character,
          workflowData: audioData
        }
        
        setResult(compatResult)
        
        // 更新节点数据
        if (data.onDataChange) {
          data.onDataChange({ result: compatResult })
        }
        
        return compatResult.workflowData
      } else {
        throw new Error(executionResult.error)
      }
    } catch (error) {
      console.error('[TTSNode] 处理失败:', error)
      const errorResult = { error: error.message, success: false }
      setResult(errorResult)
      
      // 更新节点数据
      if (data.onDataChange) {
        data.onDataChange({ result: errorResult })
      }
      
      return errorResult
    } finally {
      setIsProcessing(false)
    }
  }

  // 注册处理器
  useEffect(() => {
    if (data.onSetProcessor) {
      data.onSetProcessor(handleProcess)
    }
  }, [data.onSetProcessor])

  // 获取配置描述
  const getConfigDescription = () => {
    if (mode === 'character' && selectedCharacter) {
      return `角色: ${selectedCharacter}`
    } else if (mode === 'custom' && voiceId) {
      return `自定义: ${voiceId}`
    }
    return '未配置'
  }

  // 获取参数描述
  const getParametersDescription = () => {
    const params = []
    if (gender) params.push(`性别: ${gender}`)
    if (pitch) params.push(`音调: ${pitch}`)
    if (speed) params.push(`语速: ${speed}`)
    return params.length > 0 ? params.join(', ') : '默认参数'
  }

  const showAddButton = data.showAddButton === true && (nodeIndex < (totalNodes - 1) || totalNodes === 1)

  return (
    <BaseWorkflowNode
      nodeId={id}
      nodeType="tts"
      theme="purple"
      title="语音合成"
      icon="🎤"
      nodeIndex={nodeIndex}
      status={getNodeStatus()}
      selected={selected}
      showAddButton={showAddButton}
      onAddNode={data.onAddNode}
    >
      <div className="flex-1 space-y-3">
        {/* 配置状态显示 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">
              语音配置
            </label>
            {selected && (
              <div className="text-xs text-purple-600 bg-purple-100/80 px-2 py-0.5 rounded-full">
                ⚙️ 右侧配置
              </div>
            )}
          </div>
          
          <div className="p-2 bg-purple-50/70 rounded-lg border border-purple-200">
            <div className="text-sm font-medium text-purple-800">
              {getConfigDescription()}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              {getParametersDescription()}
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">
            {mode === 'character' ? '角色模式' : '自定义模式'}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            getConfigStatus() === 'configured'
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {getConfigStatus() === 'configured' ? '✓ 已配置' : '⚠ 待配置'}
          </span>
        </div>
      </div>

      {/* 配置提示 */}
      {getConfigStatus() === 'waiting' && selected && (
        <div className="mt-2 p-2 bg-purple-50/70 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700">
            💡 请在右侧配置面板中设置语音参数
          </div>
        </div>
      )}
    </BaseWorkflowNode>
  )
}

export default memo(TTSNode)

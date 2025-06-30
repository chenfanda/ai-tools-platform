/**
 * 文本处理Handler - 从DynamicAdapter提取
 * 
 * 功能：
 * - 提取文本内容
 * - 根据用户配置处理文本（清理空行、修剪空白、长度限制）
 * - 返回处理后的文本
 * 
 * 输入格式：preprocessInput()的输出
 * 输出格式：处理后的文本字符串（与原executeTextProcess一致）
 */

export default async function textProcessHandler(input) {
  console.log(`[textProcessHandler] 执行文本处理`)
  
  // 提取文本内容 - 复制原有逻辑
  let text = ''
  
  if (typeof input.workflowData === 'string') {
    text = input.workflowData
  } else if (input.workflowData?.content?.text) {
    text = input.workflowData.content.text
  } else if (input.workflowData?.text) {
    text = input.workflowData.text
  }
  
  // 根据用户配置处理文本 - 复制原有逻辑
  const config = input.userConfig
  
  if (config.removeEmptyLines) {
    text = text.replace(/^\s*\n/gm, '')
  }
  
  if (config.trimWhitespace) {
    text = text.trim()
  }
  
  if (config.maxLength && text.length > config.maxLength) {
    text = text.substring(0, config.maxLength)
  }
  
  console.log(`[textProcessHandler] 文本处理完成:`, {
    originalLength: input.workflowData?.length || 'unknown',
    processedLength: text.length,
    configApplied: {
      removeEmptyLines: !!config.removeEmptyLines,
      trimWhitespace: !!config.trimWhitespace,
      maxLength: config.maxLength || 'none'
    }
  })
  
  // 返回处理后的文本 - 保持与原executeTextProcess相同的输出格式
  return text
}

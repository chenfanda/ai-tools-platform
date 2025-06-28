/**
 * 工作流数据类型定义系统
 * 统一管理所有节点的输入输出数据类型
 * 支持数据验证、转换和兼容性检查
 */

// 基础数据类型枚举
export const DATA_TYPES = {
  // 文本类型
  TEXT: 'text',
  MARKDOWN: 'markdown',
  HTML: 'html',
  JSON: 'json',
  XML: 'xml',
  
  // 数字类型
  NUMBER: 'number',
  INTEGER: 'integer',
  FLOAT: 'float',
  
  // 布尔类型
  BOOLEAN: 'boolean',
  
  // 媒体类型
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  FILE: 'file',
  
  // 复合类型
  ARRAY: 'array',
  OBJECT: 'object',
  
  // 特殊类型
  URL: 'url',
  EMAIL: 'email',
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',
  
  // 工作流特殊类型
  WORKFLOW_CONTEXT: 'workflow_context',
  NODE_OUTPUT: 'node_output',
  
  // 通用类型
  ANY: 'any',
  UNKNOWN: 'unknown'
};

// 数据类型元信息定义
export const DATA_TYPE_METADATA = {
  [DATA_TYPES.TEXT]: {
    name: '文本',
    description: '普通文本字符串',
    icon: '📝',
    validation: {
      type: 'string',
      maxLength: 10000
    },
    conversion: {
      from: [DATA_TYPES.MARKDOWN, DATA_TYPES.HTML, DATA_TYPES.JSON],
      to: [DATA_TYPES.MARKDOWN, DATA_TYPES.HTML]
    }
  },
  
  [DATA_TYPES.MARKDOWN]: {
    name: 'Markdown',
    description: 'Markdown格式文本',
    icon: '📋',
    validation: {
      type: 'string',
      format: 'markdown'
    },
    conversion: {
      from: [DATA_TYPES.TEXT, DATA_TYPES.HTML],
      to: [DATA_TYPES.TEXT, DATA_TYPES.HTML]
    }
  },
  
  [DATA_TYPES.HTML]: {
    name: 'HTML',
    description: 'HTML格式文本',
    icon: '🌐',
    validation: {
      type: 'string',
      format: 'html'
    },
    conversion: {
      from: [DATA_TYPES.TEXT, DATA_TYPES.MARKDOWN],
      to: [DATA_TYPES.TEXT, DATA_TYPES.MARKDOWN]
    }
  },
  
  [DATA_TYPES.JSON]: {
    name: 'JSON',
    description: 'JSON格式数据',
    icon: '🔧',
    validation: {
      type: 'string',
      format: 'json'
    },
    conversion: {
      from: [DATA_TYPES.OBJECT, DATA_TYPES.ARRAY],
      to: [DATA_TYPES.OBJECT, DATA_TYPES.ARRAY, DATA_TYPES.TEXT]
    }
  },
  
  [DATA_TYPES.NUMBER]: {
    name: '数字',
    description: '数值类型',
    icon: '🔢',
    validation: {
      type: 'number'
    },
    conversion: {
      from: [DATA_TYPES.TEXT, DATA_TYPES.INTEGER, DATA_TYPES.FLOAT],
      to: [DATA_TYPES.TEXT, DATA_TYPES.INTEGER, DATA_TYPES.FLOAT]
    }
  },
  
  [DATA_TYPES.INTEGER]: {
    name: '整数',
    description: '整数类型',
    icon: '🔢',
    validation: {
      type: 'integer'
    },
    conversion: {
      from: [DATA_TYPES.NUMBER, DATA_TYPES.FLOAT, DATA_TYPES.TEXT],
      to: [DATA_TYPES.NUMBER, DATA_TYPES.FLOAT, DATA_TYPES.TEXT]
    }
  },
  
  [DATA_TYPES.FLOAT]: {
    name: '浮点数',
    description: '浮点数类型',
    icon: '🔢',
    validation: {
      type: 'number',
      format: 'float'
    },
    conversion: {
      from: [DATA_TYPES.NUMBER, DATA_TYPES.INTEGER, DATA_TYPES.TEXT],
      to: [DATA_TYPES.NUMBER, DATA_TYPES.INTEGER, DATA_TYPES.TEXT]
    }
  },
  
  [DATA_TYPES.BOOLEAN]: {
    name: '布尔值',
    description: 'true/false布尔值',
    icon: '✅',
    validation: {
      type: 'boolean'
    },
    conversion: {
      from: [DATA_TYPES.TEXT, DATA_TYPES.NUMBER],
      to: [DATA_TYPES.TEXT, DATA_TYPES.NUMBER]
    }
  },
  
  [DATA_TYPES.IMAGE]: {
    name: '图片',
    description: '图片文件',
    icon: '🖼️',
    validation: {
      type: 'file',
      accept: 'image/*',
      maxSize: 10 * 1024 * 1024 // 10MB
    },
    conversion: {
      from: [DATA_TYPES.FILE, DATA_TYPES.URL],
      to: [DATA_TYPES.FILE, DATA_TYPES.URL]
    }
  },
  
  [DATA_TYPES.AUDIO]: {
    name: '音频',
    description: '音频文件',
    icon: '🎵',
    validation: {
      type: 'file',
      accept: 'audio/*',
      maxSize: 50 * 1024 * 1024 // 50MB
    },
    conversion: {
      from: [DATA_TYPES.FILE, DATA_TYPES.URL],
      to: [DATA_TYPES.FILE, DATA_TYPES.URL]
    }
  },
  
  [DATA_TYPES.VIDEO]: {
    name: '视频',
    description: '视频文件',
    icon: '🎬',
    validation: {
      type: 'file',
      accept: 'video/*',
      maxSize: 100 * 1024 * 1024 // 100MB
    },
    conversion: {
      from: [DATA_TYPES.FILE, DATA_TYPES.URL],
      to: [DATA_TYPES.FILE, DATA_TYPES.URL]
    }
  },
  
  [DATA_TYPES.FILE]: {
    name: '文件',
    description: '通用文件',
    icon: '📎',
    validation: {
      type: 'file',
      maxSize: 50 * 1024 * 1024 // 50MB
    },
    conversion: {
      from: [DATA_TYPES.IMAGE, DATA_TYPES.AUDIO, DATA_TYPES.VIDEO],
      to: [DATA_TYPES.URL]
    }
  },
  
  [DATA_TYPES.ARRAY]: {
    name: '数组',
    description: '数组类型数据',
    icon: '📊',
    validation: {
      type: 'array'
    },
    conversion: {
      from: [DATA_TYPES.JSON, DATA_TYPES.TEXT],
      to: [DATA_TYPES.JSON, DATA_TYPES.TEXT]
    }
  },
  
  [DATA_TYPES.OBJECT]: {
    name: '对象',
    description: '对象类型数据',
    icon: '🗂️',
    validation: {
      type: 'object'
    },
    conversion: {
      from: [DATA_TYPES.JSON, DATA_TYPES.TEXT],
      to: [DATA_TYPES.JSON, DATA_TYPES.TEXT]
    }
  },
  
  [DATA_TYPES.URL]: {
    name: 'URL',
    description: '网址链接',
    icon: '🔗',
    validation: {
      type: 'string',
      format: 'url'
    },
    conversion: {
      from: [DATA_TYPES.TEXT],
      to: [DATA_TYPES.TEXT]
    }
  },
  
  [DATA_TYPES.EMAIL]: {
    name: '邮箱',
    description: '邮箱地址',
    icon: '📧',
    validation: {
      type: 'string',
      format: 'email'
    },
    conversion: {
      from: [DATA_TYPES.TEXT],
      to: [DATA_TYPES.TEXT]
    }
  },
  
  [DATA_TYPES.DATE]: {
    name: '日期',
    description: '日期类型',
    icon: '📅',
    validation: {
      type: 'string',
      format: 'date'
    },
    conversion: {
      from: [DATA_TYPES.TEXT, DATA_TYPES.DATETIME],
      to: [DATA_TYPES.TEXT, DATA_TYPES.DATETIME]
    }
  },
  
  [DATA_TYPES.TIME]: {
    name: '时间',
    description: '时间类型',
    icon: '⏰',
    validation: {
      type: 'string',
      format: 'time'
    },
    conversion: {
      from: [DATA_TYPES.TEXT, DATA_TYPES.DATETIME],
      to: [DATA_TYPES.TEXT, DATA_TYPES.DATETIME]
    }
  },
  
  [DATA_TYPES.DATETIME]: {
    name: '日期时间',
    description: '日期时间类型',
    icon: '📅',
    validation: {
      type: 'string',
      format: 'datetime'
    },
    conversion: {
      from: [DATA_TYPES.TEXT, DATA_TYPES.DATE, DATA_TYPES.TIME],
      to: [DATA_TYPES.TEXT, DATA_TYPES.DATE, DATA_TYPES.TIME]
    }
  },
  
  [DATA_TYPES.WORKFLOW_CONTEXT]: {
    name: '工作流上下文',
    description: '工作流执行上下文数据',
    icon: '⚙️',
    validation: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        executionId: { type: 'string' },
        timestamp: { type: 'number' }
      }
    },
    conversion: {
      from: [DATA_TYPES.OBJECT, DATA_TYPES.JSON],
      to: [DATA_TYPES.OBJECT, DATA_TYPES.JSON]
    }
  },
  
  [DATA_TYPES.NODE_OUTPUT]: {
    name: '节点输出',
    description: '节点执行输出数据',
    icon: '📤',
    validation: {
      type: 'object',
      properties: {
        data: {},
        type: { type: 'string' },
        nodeId: { type: 'string' }
      }
    },
    conversion: {
      from: [DATA_TYPES.ANY],
      to: [DATA_TYPES.ANY]
    }
  },
  
  [DATA_TYPES.ANY]: {
    name: '任意类型',
    description: '接受任意类型数据',
    icon: '🎭',
    validation: {},
    conversion: {
      from: Object.values(DATA_TYPES),
      to: Object.values(DATA_TYPES)
    }
  },
  
  [DATA_TYPES.UNKNOWN]: {
    name: '未知类型',
    description: '未知或不确定的数据类型',
    icon: '❓',
    validation: {},
    conversion: {
      from: [],
      to: []
    }
  }
};

// 数据类型分组
export const DATA_TYPE_GROUPS = {
  TEXT: {
    name: '文本类型',
    types: [DATA_TYPES.TEXT, DATA_TYPES.MARKDOWN, DATA_TYPES.HTML, DATA_TYPES.JSON, DATA_TYPES.XML]
  },
  NUMERIC: {
    name: '数值类型',
    types: [DATA_TYPES.NUMBER, DATA_TYPES.INTEGER, DATA_TYPES.FLOAT]
  },
  MEDIA: {
    name: '媒体类型',
    types: [DATA_TYPES.IMAGE, DATA_TYPES.AUDIO, DATA_TYPES.VIDEO, DATA_TYPES.FILE]
  },
  STRUCTURED: {
    name: '结构化类型',
    types: [DATA_TYPES.ARRAY, DATA_TYPES.OBJECT, DATA_TYPES.JSON]
  },
  SPECIAL: {
    name: '特殊类型',
    types: [DATA_TYPES.URL, DATA_TYPES.EMAIL, DATA_TYPES.DATE, DATA_TYPES.TIME, DATA_TYPES.DATETIME]
  },
  WORKFLOW: {
    name: '工作流类型',
    types: [DATA_TYPES.WORKFLOW_CONTEXT, DATA_TYPES.NODE_OUTPUT]
  },
  GENERIC: {
    name: '通用类型',
    types: [DATA_TYPES.BOOLEAN, DATA_TYPES.ANY, DATA_TYPES.UNKNOWN]
  }
};

// 工具函数

/**
 * 获取数据类型元信息
 * @param {string} dataType - 数据类型
 * @returns {Object} 元信息对象
 */
export function getDataTypeMetadata(dataType) {
  return DATA_TYPE_METADATA[dataType] || DATA_TYPE_METADATA[DATA_TYPES.UNKNOWN];
}

/**
 * 检查数据类型是否有效
 * @param {string} dataType - 数据类型
 * @returns {boolean} 是否有效
 */
export function isValidDataType(dataType) {
  return Object.values(DATA_TYPES).includes(dataType);
}

/**
 * 检查两个数据类型是否兼容
 * @param {string} fromType - 源数据类型
 * @param {string} toType - 目标数据类型
 * @returns {boolean} 是否兼容
 */
export function isDataTypeCompatible(fromType, toType) {
  if (fromType === toType) return true;
  if (toType === DATA_TYPES.ANY) return true;
  if (fromType === DATA_TYPES.ANY) return true;
  
  const metadata = getDataTypeMetadata(fromType);
  return metadata.conversion.to.includes(toType);
}

/**
 * 获取数据类型的转换路径
 * @param {string} fromType - 源数据类型
 * @param {string} toType - 目标数据类型
 * @returns {Array} 转换路径数组
 */
export function getConversionPath(fromType, toType) {
  if (fromType === toType) return [fromType];
  if (isDataTypeCompatible(fromType, toType)) {
    return [fromType, toType];
  }
  
  // 简单路径查找（可以后续扩展为更复杂的图搜索）
  const visited = new Set();
  const queue = [[fromType]];
  
  while (queue.length > 0) {
    const path = queue.shift();
    const currentType = path[path.length - 1];
    
    if (currentType === toType) {
      return path;
    }
    
    if (visited.has(currentType)) continue;
    visited.add(currentType);
    
    const metadata = getDataTypeMetadata(currentType);
    for (const nextType of metadata.conversion.to) {
      if (!visited.has(nextType)) {
        queue.push([...path, nextType]);
      }
    }
  }
  
  return null; // 无法转换
}

/**
 * 根据数据推断数据类型
 * @param {*} data - 数据
 * @returns {string} 推断的数据类型
 */
export function inferDataType(data) {
  if (data === null || data === undefined) {
    return DATA_TYPES.UNKNOWN;
  }
  
  if (typeof data === 'string') {
    // URL检查
    try {
      new URL(data);
      return DATA_TYPES.URL;
    } catch (e) {}
    
    // Email检查
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      return DATA_TYPES.EMAIL;
    }
    
    // Date检查
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return DATA_TYPES.DATE;
    }
    
    // Time检查
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(data)) {
      return DATA_TYPES.TIME;
    }
    
    // DateTime检查
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(data)) {
      return DATA_TYPES.DATETIME;
    }
    
    // JSON检查
    try {
      JSON.parse(data);
      return DATA_TYPES.JSON;
    } catch (e) {}
    
    return DATA_TYPES.TEXT;
  }
  
  if (typeof data === 'number') {
    return Number.isInteger(data) ? DATA_TYPES.INTEGER : DATA_TYPES.FLOAT;
  }
  
  if (typeof data === 'boolean') {
    return DATA_TYPES.BOOLEAN;
  }
  
  if (Array.isArray(data)) {
    return DATA_TYPES.ARRAY;
  }
  
  if (typeof data === 'object') {
    // 检查是否是文件对象
    if (data instanceof File) {
      if (data.type.startsWith('image/')) return DATA_TYPES.IMAGE;
      if (data.type.startsWith('audio/')) return DATA_TYPES.AUDIO;
      if (data.type.startsWith('video/')) return DATA_TYPES.VIDEO;
      return DATA_TYPES.FILE;
    }
    
    // 检查工作流特殊对象
    if (data.nodeId && data.executionId) {
      return DATA_TYPES.WORKFLOW_CONTEXT;
    }
    
    if (data.data !== undefined && data.type && data.nodeId) {
      return DATA_TYPES.NODE_OUTPUT;
    }
    
    return DATA_TYPES.OBJECT;
  }
  
  return DATA_TYPES.UNKNOWN;
}

/**
 * 获取数据类型的默认值
 * @param {string} dataType - 数据类型
 * @returns {*} 默认值
 */
export function getDefaultValue(dataType) {
  switch (dataType) {
    case DATA_TYPES.TEXT:
    case DATA_TYPES.MARKDOWN:
    case DATA_TYPES.HTML:
    case DATA_TYPES.JSON:
    case DATA_TYPES.XML:
    case DATA_TYPES.URL:
    case DATA_TYPES.EMAIL:
    case DATA_TYPES.DATE:
    case DATA_TYPES.TIME:
    case DATA_TYPES.DATETIME:
      return '';
    
    case DATA_TYPES.NUMBER:
    case DATA_TYPES.INTEGER:
    case DATA_TYPES.FLOAT:
      return 0;
    
    case DATA_TYPES.BOOLEAN:
      return false;
    
    case DATA_TYPES.ARRAY:
      return [];
    
    case DATA_TYPES.OBJECT:
    case DATA_TYPES.WORKFLOW_CONTEXT:
    case DATA_TYPES.NODE_OUTPUT:
      return {};
    
    case DATA_TYPES.IMAGE:
    case DATA_TYPES.AUDIO:
    case DATA_TYPES.VIDEO:
    case DATA_TYPES.FILE:
      return null;
    
    default:
      return null;
  }
}

export default {
  DATA_TYPES,
  DATA_TYPE_METADATA,
  DATA_TYPE_GROUPS,
  getDataTypeMetadata,
  isValidDataType,
  isDataTypeCompatible,
  getConversionPath,
  inferDataType,
  getDefaultValue
};

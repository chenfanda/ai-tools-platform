#!/bin/bash
# 组件生成脚本
# 使用方法: ./scripts/create-component.sh ComponentName [path]

if [ -z "$1" ]; then
    echo "错误: 请提供组件名称"
    echo "使用方法: ./scripts/create-component.sh ComponentName [path]"
    exit 1
fi

COMPONENT_NAME=$1
COMPONENT_PATH=${2:-"src/components/shared"}

mkdir -p "$COMPONENT_PATH"

cat > "$COMPONENT_PATH/$COMPONENT_NAME.jsx" << EOL
import React from 'react';

const $COMPONENT_NAME = () => {
  return (
    <div className="$COMPONENT_NAME">
      <h2>$COMPONENT_NAME 组件</h2>
    </div>
  );
};

export default $COMPONENT_NAME;
EOL

echo "✅ 组件 $COMPONENT_NAME 已创建在 $COMPONENT_PATH/"

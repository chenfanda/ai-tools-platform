#!/bin/bash
# 页面生成脚本
# 使用方法: ./scripts/create-page.sh PageName

if [ -z "$1" ]; then
    echo "错误: 请提供页面名称"
    echo "使用方法: ./scripts/create-page.sh PageName"
    exit 1
fi

PAGE_NAME=$1
PAGE_DIR="src/pages/$(echo $PAGE_NAME | tr '[:upper:]' '[:lower:]')"

mkdir -p "$PAGE_DIR"

cat > "$PAGE_DIR/index.jsx" << EOL
import React from 'react';

const ${PAGE_NAME}Page = () => {
  return (
    <div className="${PAGE_NAME,,}-page">
      <h1>$PAGE_NAME 页面</h1>
    </div>
  );
};

export default ${PAGE_NAME}Page;
EOL

echo "✅ 页面 $PAGE_NAME 已创建在 $PAGE_DIR/"


// ===== src/components/layout/Layout.jsx =====
import React from 'react'

// 简单的布局包装组件，目前暂不使用
// 保留此文件以备将来扩展需要
const Layout = ({ children }) => {
  return (
    <div className="layout">
      {children}
    </div>
  )
}

export default Layout

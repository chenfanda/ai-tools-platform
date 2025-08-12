// ===== src/App.jsx =====
import React, { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import MainContent from '@/components/layout/MainContent'
import ConfigPanel from '@/components/layout/ConfigPanel'
import NotificationSystem from '@/components/layout/NotificationSystem'

function App() {
  // 全局状态
  const [currentPage, setCurrentPage] = useState('home')
  const [configPanelOpen, setConfigPanelOpen] = useState(false)
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const [config, setConfig] = useState({
    ttsApiUrl: isProduction ? 'https://tts-api.181901.xyz' : 'http://localhost:8000',
    videoApiUrl: isProduction ? 'https://videos-api.181901.xyz' : 'http://localhost:8001',
    asrApiUrl: isProduction ? 'https://asr-api.181901.xyz' : 'http://localhost:8002',
    imageApiUrl: isProduction ? 'https://images-api.181901.xyz' : 'http://localhost:8003',
    facialApiUrl: isProduction ? 'https://facial-api.181901.xyz' : 'http://localhost:8004',
    styleganApiUrl: isProduction ? 'https://stylegan-api.181901.xyz' : 'http://localhost:8005',
    mediaApiUrl: isProduction ? 'https://media-api.181901.xyz' : 'http://localhost:8006'
  })
  // const [config, setConfig] = useState({
  //   ttsApiUrl: 'http://localhost:8000',
  //   videoApiUrl: 'http://localhost:8001',
  //   asrApiUrl: 'http://localhost:8002',
  //   imageApiUrl: 'http://localhost:8003'
  // })
  const [notifications, setNotifications] = useState([])

  // 初始化配置
  useEffect(() => {
    loadConfig()
    testAllConnections()
  }, [])

  const loadConfig = () => {
    try {
      const saved = localStorage.getItem('aiToolsConfig')
      if (saved) {
        setConfig(prev => ({ ...prev, ...JSON.parse(saved) }))
      }
    } catch (e) {
      console.log('使用默认配置')
    }
  }

  const saveConfig = (newConfig) => {
    setConfig(newConfig)
    try {
      localStorage.setItem('aiToolsConfig', JSON.stringify(newConfig))
    } catch (e) {
      console.log('配置已保存到内存中')
    }
  }

  const testAllConnections = async () => {
    // 连接测试逻辑，稍后在对应组件中实现
    // 包含图像处理服务的连接测试
  }

  const showNotification = (message, type = 'info') => {
    const id = Date.now()
    const notification = { id, message, type }
    setNotifications(prev => [...prev, notification])
    
    // 3秒后自动移除
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3000)
  }

  const toggleConfigPanel = () => {
    setConfigPanelOpen(prev => !prev)
  }

  // 键盘快捷键和页面导航事件
  useEffect(() => {
    const handleKeyDown = (event) => {
      // ESC关闭配置面板
      if (event.key === 'Escape' && configPanelOpen) {
        setConfigPanelOpen(false)
      }
      
      // Ctrl/Cmd + 数字键切换页面
      if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '5') {
        event.preventDefault()
        const pages = ['home', 'tts', 'video', 'asr', 'image','media']
        const pageIndex = parseInt(event.key) - 1
        if (pages[pageIndex]) {
          setCurrentPage(pages[pageIndex])
        }
      }
    }

    // 处理HomePage的页面导航事件
    const handleNavigateToPage = (event) => {
      setCurrentPage(event.detail)
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('navigateToPage', handleNavigateToPage)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('navigateToPage', handleNavigateToPage)
    }
  }, [configPanelOpen])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <Header 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onConfigToggle={toggleConfigPanel}
        onTestConnections={testAllConnections}
      />
      
      <MainContent 
        currentPage={currentPage}
        config={config}
        onNotification={showNotification}
      />
      
      <ConfigPanel 
        isOpen={configPanelOpen}
        config={config}
        onConfigSave={saveConfig}
        onClose={toggleConfigPanel}
        onTestConnections={testAllConnections}
      />
      
      <NotificationSystem 
        notifications={notifications}
      />
      
      {/* 配置面板遮罩 */}
      {configPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleConfigPanel}
        />
      )}
    </div>
  )
}

export default App

// ===== src/components/layout/MainContent.jsx =====
import React, { useState } from 'react'
import HomePage from '@/pages/home'
import TTSPage from '@/pages/tts'
import VideoPage from '@/pages/video'
import ImagePage from '@/pages/image'
import PageSidebar from './PageSidebar'
import MediaPage from '@/pages/media' 

const MainContent = ({ currentPage, config, onNotification }) => {
  // 子页面状态管理
  const [subPages, setSubPages] = useState({
    tts: 'voice-synthesis',     // TTS默认显示语音合成
    video: 'standard-video',    // Video默认显示标准视频
    image: 'basic-tools',       // ✅ 修改：basic-tools
    media: 'extract-audio' 
  })

  // 需要侧边栏的页面
  const pagesWithSidebar = ['tts', 'video', 'image','media']
  const hasSidebar = pagesWithSidebar.includes(currentPage)

  // 子页面切换处理
  const handleSubPageChange = (subPageId) => {
    setSubPages(prev => ({
      ...prev,
      [currentPage]: subPageId
    }))
  }

  // 页面组件的props
  const pageProps = {
    config,
    onNotification,
    activeSubPage: subPages[currentPage],
    onSubPageChange: handleSubPageChange
  }

  return (
    <div className="max-w-7xl mx-auto px-5 py-6">
      <div className={hasSidebar ? "flex gap-6" : ""}>
        {/* 左侧边栏（仅在特定页面显示） */}
        {hasSidebar && (
          <PageSidebar 
            currentPage={currentPage}
            activeSubPage={subPages[currentPage]}
            onSubPageChange={handleSubPageChange}
          />
        )}
        
        {/* 主内容区 */}
        <div className={hasSidebar ? "flex-1 min-w-0" : ""}>
          {/* 首页 - 无侧边栏 */}
          <div 
            style={{ display: currentPage === 'home' ? 'block' : 'none' }}
            className="animate-fade-in"
          >
            <HomePage config={config} onNotification={onNotification} />
          </div>

          {/* TTS页面 - 有侧边栏 */}
          <div 
            style={{ display: currentPage === 'tts' ? 'block' : 'none' }}
            className="animate-fade-in"
          >
            <TTSPage {...pageProps} />
          </div>

          {/* 视频页面 - 有侧边栏 */}
          <div 
            style={{ display: currentPage === 'video' ? 'block' : 'none' }}
            className="animate-fade-in"
          >
            <VideoPage {...pageProps} />
          </div>

          {/* 图像处理页面 - 有侧边栏 */}
          <div 
            style={{ display: currentPage === 'image' ? 'block' : 'none' }}
            className="animate-fade-in"
          >
            <ImagePage {...pageProps} />
          </div>
        
          {/* 多媒体处理页面 - 有侧边栏 */}
            <div 
              style={{ display: currentPage === 'media' ? 'block' : 'none' }}
              className="animate-fade-in"
            >
              <MediaPage {...pageProps} />
            </div>
        </div>
      </div>
    </div>
  )
}

export default MainContent
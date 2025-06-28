// ===== src/pages/home/index.jsx =====
import React from 'react'
import WorkflowEditor from '../../components/workflow/WorkflowEditor'

const HomePage = ({ config, onNotification }) => {
  return (
    <WorkflowEditor 
      config={config} 
      onNotification={onNotification} 
    />
  )
}

export default HomePage

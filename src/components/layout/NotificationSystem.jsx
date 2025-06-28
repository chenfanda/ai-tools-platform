// ===== src/components/layout/NotificationSystem.jsx =====
import React from 'react'

const NotificationSystem = ({ notifications }) => {
  const getNotificationStyles = (type) => {
    const baseStyles = "fixed top-5 right-5 max-w-xs w-full text-white px-5 py-3 rounded-lg shadow-lg z-50 text-sm animate-slide-in"
    
    switch (type) {
      case 'error':
        return `${baseStyles} bg-red-500`
      case 'success':
        return `${baseStyles} bg-green-500`
      case 'info':
      default:
        return `${baseStyles} bg-primary-500`
    }
  }

  return (
    <div className="notification-container">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={getNotificationStyles(notification.type)}
          style={{
            top: `${20 + index * 70}px`
          }}
        >
          {notification.message}
        </div>
      ))}
    </div>
  )
}

export default NotificationSystem

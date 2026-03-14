'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: type === 'success' ? '#10B981' : '#EF4444',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        fontFamily: 'Outfit, sans-serif',
        fontSize: '15px',
        fontWeight: '600',
        zIndex: 9999,
        maxWidth: '400px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>{type === 'success' ? '✓' : '✗'}</span>
        <span>{message}</span>
        <button
          onClick={onClose}
          style={{
            marginLeft: '8px',
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            lineHeight: '1',
          }}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

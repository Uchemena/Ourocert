// src/components/ErrorMessage.tsx

type ErrorTier = 'user' | 'system' | 'critical'

export interface RichError {
  tier: ErrorTier
  title: string
  message: string
  action?: { label: string; onClick: () => void }
  showSupport?: boolean
}

interface ErrorMessageProps extends RichError {}

export default function ErrorMessage({ tier, title, message, action, showSupport }: ErrorMessageProps) {
  const colors = {
    user:     { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: '⚠️' },
    system:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-900',    icon: '✗' },
    critical: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-900',    icon: '✗' },
  }
  const c = colors[tier]
  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{c.icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${c.text} mb-1`}>{title}</p>
          <p className={`text-sm ${c.text} opacity-80`}>{message}</p>
          {action && (
            <button onClick={action.onClick} className="mt-3 text-sm font-semibold text-primary hover:underline">
              {action.label} →
            </button>
          )}
          {showSupport && (
            <p className="mt-2 text-xs text-gray-500">
              If this keeps happening,{' '}
              <a href="mailto:support@ourocert.com" className="text-primary hover:underline font-medium">contact support</a>
              {' '}and we'll fix it within 24 hours.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { forwardRef } from 'react'
import type { CSSProperties } from 'react'
import type { CertificateField, FieldSize } from '@/lib/certificate-types'

// ─── Style configs ────────────────────────────────────────────────────────────

export type StyleId =
  | 'classic-blue'
  | 'elegant-gold'
  | 'clean-minimal'
  | 'forest-green'
  | 'royal-purple'
  | 'rose'

export interface StyleConfig {
  id: StyleId
  label: string
  // Style picker card colours
  cardBg: string
  cardBorder: string
  // Certificate colours
  bg: string
  frame: string     // border / corner ornaments
  accent: string    // top/bottom bars, labels, ornament diamond
  title: string     // "of Completion" heading
  body: string      // body text
  muted: string     // subtext, signature labels
  line: string      // divider lines
}

export const STYLE_CONFIGS: StyleConfig[] = [
  {
    id: 'classic-blue', label: 'Classic Blue',
    cardBg: '#EEF2FF', cardBorder: '#3B5BDB',
    bg: '#EEF2FF', frame: '#3B5BDB', accent: '#3B5BDB',
    title: '#1E3A8A', body: '#1E40AF', muted: '#6B7280', line: '#BFDBFE',
  },
  {
    id: 'elegant-gold', label: 'Elegant Gold',
    cardBg: '#FFFBEB', cardBorder: '#D97706',
    bg: '#FFFBEB', frame: '#D97706', accent: '#D97706',
    title: '#92400E', body: '#78350F', muted: '#9CA3AF', line: '#FDE68A',
  },
  {
    id: 'clean-minimal', label: 'Clean Minimal',
    cardBg: '#F8FAFF', cardBorder: '#E8ECF4',
    bg: '#FFFFFF', frame: '#CBD5E1', accent: '#3B5BDB',
    title: '#111827', body: '#374151', muted: '#9CA3AF', line: '#E8ECF4',
  },
  {
    id: 'forest-green', label: 'Forest Green',
    cardBg: '#ECFDF5', cardBorder: '#059669',
    bg: '#ECFDF5', frame: '#059669', accent: '#059669',
    title: '#064E3B', body: '#065F46', muted: '#6B7280', line: '#A7F3D0',
  },
  {
    id: 'royal-purple', label: 'Royal Purple',
    cardBg: '#F5F3FF', cardBorder: '#9333EA',
    bg: '#F5F3FF', frame: '#9333EA', accent: '#9333EA',
    title: '#4C1D95', body: '#5B21B6', muted: '#6B7280', line: '#DDD6FE',
  },
  {
    id: 'rose', label: 'Rose',
    cardBg: '#FFF1F2', cardBorder: '#E11D48',
    bg: '#FFF1F2', frame: '#E11D48', accent: '#E11D48',
    title: '#881337', body: '#9F1239', muted: '#6B7280', line: '#FECDD3',
  },
]

// ─── Position & size maps ─────────────────────────────────────────────────────

const FIELD_FONT_SIZES: Record<FieldSize, string> = {
  'Small':       '8px',
  'Medium':      '10px',
  'Large':       '13px',
  'Extra Large': '18px',
}

const FIELD_FONT_WEIGHTS: Record<FieldSize, number> = {
  'Small':       400,
  'Medium':      400,
  'Large':       500,
  'Extra Large': 600,
}

// These positions are laid out relative to the designed certificate structure.
const CERT_POSITION_STYLES: Record<string, CSSProperties> = {
  'Top Center':    { top: '10%',  left: '50%', transform: 'translateX(-50%)' },
  'Upper Middle':  { top: '23%',  left: '50%', transform: 'translateX(-50%)' },
  'Center Large':  { top: '58%',  left: '50%', transform: 'translate(-50%, -50%)' },
  'Center Medium': { top: '66%',  left: '50%', transform: 'translateX(-50%)' },
  'Lower Middle':  { top: '74%',  left: '50%', transform: 'translateX(-50%)' },
  'Bottom Left':   { bottom: '14%', left: '10%' },
  'Bottom Center': { bottom: '14%', left: '50%', transform: 'translateX(-50%)' },
  'Bottom Right':  { bottom: '14%', right: '10%' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface CertificateConfig {
  style: StyleConfig
  orgName: string
  logoText: string
  fields: CertificateField[]
}

const CertificatePreview = forwardRef<HTMLDivElement, { config: CertificateConfig }>(
  ({ config }, ref) => {
    const { style: s, orgName, logoText, fields } = config

    return (
      <div
        ref={ref}
        style={{
          position: 'relative',
          backgroundColor: s.bg,
          width: '100%',
          aspectRatio: '4 / 3',
          overflow: 'hidden',
          fontFamily: '"Outfit", "DM Sans", sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', backgroundColor: s.accent }} />

        {/* Outer border frame */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px', right: '8px', bottom: '8px',
          border: `2px solid ${s.frame}`, borderRadius: '5px', pointerEvents: 'none',
        }} />

        {/* Inner border line */}
        <div style={{
          position: 'absolute', top: '13px', left: '13px', right: '13px', bottom: '13px',
          border: `1px solid ${s.frame}`, opacity: 0.25, borderRadius: '3px', pointerEvents: 'none',
        }} />

        {/* Corner diamonds */}
        {([
          { top: '9px',    left: '9px'    },
          { top: '9px',    right: '9px'   },
          { bottom: '9px', left: '9px'    },
          { bottom: '9px', right: '9px'   },
        ] as CSSProperties[]).map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', width: '9px', height: '9px',
            backgroundColor: s.frame, transform: 'rotate(45deg)',
            ...pos,
          }} />
        ))}

        {/* ── Fixed certificate text ── */}

        {/* Org name */}
        <div style={{ position: 'absolute', top: '13%', left: 0, right: 0, textAlign: 'center' }}>
          <p style={{
            margin: 0, fontSize: '7px', fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase', color: s.muted,
          }}>
            {orgName || 'Your Organisation'}
          </p>
          {logoText && (
            <p style={{ margin: '2px 0 0', fontSize: '6px', color: s.muted }}>{logoText}</p>
          )}
        </div>

        {/* "CERTIFICATE" */}
        <div style={{ position: 'absolute', top: '24%', left: 0, right: 0, textAlign: 'center' }}>
          <p style={{
            margin: 0, fontSize: '7px', fontWeight: 700,
            letterSpacing: '0.25em', textTransform: 'uppercase', color: s.accent,
          }}>
            CERTIFICATE
          </p>
        </div>

        {/* "of Completion" in Playfair Display */}
        <div style={{ position: 'absolute', top: '30%', left: 0, right: 0, textAlign: 'center' }}>
          <p style={{
            margin: 0,
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '16px', fontWeight: 600, color: s.title,
          }}>
            of Completion
          </p>
        </div>

        {/* Ornament divider */}
        <div style={{
          position: 'absolute', top: '44%',
          left: '20%', right: '20%',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: s.line }} />
          <div style={{ width: '6px', height: '6px', backgroundColor: s.accent, transform: 'rotate(45deg)' }} />
          <div style={{ flex: 1, height: '1px', backgroundColor: s.line }} />
        </div>

        {/* "This is to certify that" */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '8px', color: s.muted }}>This is to certify that</p>
        </div>

        {/* Signature area */}
        <div style={{
          position: 'absolute', bottom: '6%', left: '10%', right: '10%',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '72px', height: '1px', backgroundColor: s.line, marginBottom: '3px' }} />
            <p style={{ margin: 0, fontSize: '6.5px', color: s.muted }}>Authorised by</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '1px', backgroundColor: s.line, marginBottom: '3px' }} />
            <p style={{ margin: 0, fontSize: '6.5px', color: s.muted }}>Date</p>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '5px', backgroundColor: s.accent }} />

        {/* ── Dynamic field text overlays ── */}
        {fields.map((field) => {
          const posStyle = CERT_POSITION_STYLES[field.position] ?? {}
          return (
            <div
              key={field.id}
              style={{
                position: 'absolute',
                zIndex: 10,
                ...posStyle,
                fontFamily: field.font === 'Playfair Display'
                  ? '"Playfair Display", Georgia, serif'
                  : '"Outfit", "DM Sans", sans-serif',
                fontSize: FIELD_FONT_SIZES[field.size] ?? '10px',
                fontWeight: FIELD_FONT_WEIGHTS[field.size] ?? 400,
                color: field.color,
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              {field.name || '—'}
            </div>
          )
        })}
      </div>
    )
  }
)

CertificatePreview.displayName = 'CertificatePreview'
export default CertificatePreview

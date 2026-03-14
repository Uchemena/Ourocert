'use client'

import { useEffect, useRef } from 'react'

export type StarterTemplateId =
  | 'course-completion'
  | 'employee-of-month'
  | 'volunteer-appreciation'
  | 'academic-achievement'
  | 'event-participation'
  | 'general-achievement'

interface Template {
  id: StarterTemplateId
  label: string
  industry: string
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

// ─── helpers ───────────────────────────────────────────────────────────────

function hex(color: string) { return color }

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

function centredText(ctx: CanvasRenderingContext2D, text: string, y: number, font: string, color: string, maxW?: number) {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  if (maxW) {
    ctx.fillText(text, 200, y, maxW)
  } else {
    ctx.fillText(text, 200, y)
  }
}

function hline(ctx: CanvasRenderingContext2D, y: number, color: string, alpha = 1) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, y)
  ctx.lineTo(360, y)
  ctx.stroke()
  ctx.restore()
}

// ─── six designs ───────────────────────────────────────────────────────────

const TEMPLATES: Template[] = [
  {
    id: 'course-completion',
    label: 'Course Completion',
    industry: 'Tutor / Course Creator',
    draw(ctx, w, h) {
      // Background: navy
      ctx.fillStyle = '#1B2A4A'
      ctx.fillRect(0, 0, w, h)

      // Gold border frame
      ctx.strokeStyle = '#C9A84C'
      ctx.lineWidth = 4
      ctx.strokeRect(12, 12, w - 24, h - 24)
      ctx.lineWidth = 1.5
      ctx.strokeRect(18, 18, w - 36, h - 36)

      // Gold star badge
      ctx.save()
      ctx.translate(w / 2, 58)
      ctx.fillStyle = '#C9A84C'
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const outer = Math.PI / 2 + (i * 4 * Math.PI) / 5
        const inner = outer + (2 * Math.PI) / 10
        if (i === 0) ctx.moveTo(Math.cos(outer) * 16, -Math.sin(outer) * 16)
        else ctx.lineTo(Math.cos(outer) * 16, -Math.sin(outer) * 16)
        ctx.lineTo(Math.cos(inner) * 7, -Math.sin(inner) * 7)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      centredText(ctx, 'CERTIFICATE', 100, '700 9px "Outfit", sans-serif', '#C9A84C')
      centredText(ctx, 'of Completion', 122, '600 19px "Playfair Display", serif', '#FFFFFF')
      hline(ctx, 136, '#C9A84C', 0.4)

      centredText(ctx, 'This certifies that', 158, '400 9px "Outfit", sans-serif', '#94A3B8')
      centredText(ctx, 'Jane Smith', 180, '600 18px "Playfair Display", serif', '#FFFFFF')
      centredText(ctx, 'has successfully completed', 199, '400 9px "Outfit", sans-serif', '#94A3B8')
      centredText(ctx, 'Introduction to Web Design', 218, '600 12px "Outfit", sans-serif', '#C9A84C', 280)

      hline(ctx, 234, '#C9A84C', 0.4)

      // Signatures row
      ctx.fillStyle = '#64748B'
      ctx.font = '400 8px "Outfit", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('Instructor', 70, 258)
      ctx.textAlign = 'right'
      ctx.fillText('Date', 330, 258)

      ctx.strokeStyle = '#C9A84C'
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 0.8
      ctx.beginPath(); ctx.moveTo(55, 252); ctx.lineTo(155, 252); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(245, 252); ctx.lineTo(345, 252); ctx.stroke()
      ctx.globalAlpha = 1
    },
  },

  {
    id: 'employee-of-month',
    label: 'Employee of the Month',
    industry: 'Small Business',
    draw(ctx, w, h) {
      // Dark background
      ctx.fillStyle = '#0F172A'
      ctx.fillRect(0, 0, w, h)

      // Amber accent bar at top
      rect(ctx, 0, 0, w, 10, 0, '#F59E0B')

      // Amber circle icon
      ctx.beginPath()
      ctx.arc(w / 2, 62, 28, 0, Math.PI * 2)
      ctx.fillStyle = '#F59E0B'
      ctx.fill()

      // Person silhouette
      ctx.fillStyle = '#0F172A'
      ctx.beginPath()
      ctx.arc(w / 2, 52, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(w / 2, 80, 18, Math.PI, 0, false)
      ctx.fill()

      centredText(ctx, 'EMPLOYEE OF THE MONTH', 108, '700 8.5px "Outfit", sans-serif', '#F59E0B')
      hline(ctx, 118, '#F59E0B', 0.25)

      centredText(ctx, 'Awarded to', 138, '400 9px "Outfit", sans-serif', '#94A3B8')
      centredText(ctx, 'Jane Smith', 162, '600 20px "Playfair Display", serif', '#FFFFFF')

      centredText(ctx, 'Sales Department · February 2026', 182, '400 8px "Outfit", sans-serif', '#64748B')

      hline(ctx, 198, '#F59E0B', 0.25)

      centredText(ctx, 'In recognition of outstanding performance', 218, '400 8.5px "Outfit", sans-serif', '#94A3B8')
      centredText(ctx, 'and dedication to excellence.', 232, '400 8.5px "Outfit", sans-serif', '#94A3B8')

      // Bottom bar
      rect(ctx, 0, h - 10, w, 10, 0, '#F59E0B')
    },
  },

  {
    id: 'volunteer-appreciation',
    label: 'Volunteer Appreciation',
    industry: 'Non-Profit',
    draw(ctx, w, h) {
      // White background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, w, h)

      // Red accent top band
      rect(ctx, 0, 0, w, 8, 0, '#DC2626')

      // Light red top section
      rect(ctx, 0, 8, w, 80, 0, '#FEF2F2')

      // Heart icon
      ctx.save()
      ctx.translate(w / 2, 44)
      ctx.fillStyle = '#DC2626'
      ctx.beginPath()
      ctx.moveTo(0, 6)
      ctx.bezierCurveTo(0, 2, -4, -10, -14, -10)
      ctx.bezierCurveTo(-24, -10, -24, 2, -24, 2)
      ctx.bezierCurveTo(-24, 8, -16, 18, 0, 26)
      ctx.bezierCurveTo(16, 18, 24, 8, 24, 2)
      ctx.bezierCurveTo(24, 2, 24, -10, 14, -10)
      ctx.bezierCurveTo(4, -10, 0, 2, 0, 6)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      centredText(ctx, 'CERTIFICATE OF APPRECIATION', 102, '700 8px "Outfit", sans-serif', '#DC2626')
      centredText(ctx, 'Volunteer Recognition', 122, '600 17px "Playfair Display", serif', '#111827')

      hline(ctx, 134, '#DC2626', 0.2)

      centredText(ctx, 'Proudly presented to', 152, '400 9px "Outfit", sans-serif', '#6B7280')
      centredText(ctx, 'Jane Smith', 175, '600 19px "Playfair Display", serif', '#111827')

      centredText(ctx, 'for exceptional volunteer service', 195, '400 8.5px "Outfit", sans-serif', '#6B7280')
      centredText(ctx, 'and dedication to our community.', 209, '400 8.5px "Outfit", sans-serif', '#6B7280')

      hline(ctx, 226, '#DC2626', 0.2)

      centredText(ctx, '120 volunteer hours · Community Outreach Program', 244, '400 7.5px "Outfit", sans-serif', '#DC2626')

      // Bottom red band
      rect(ctx, 0, h - 8, w, 8, 0, '#DC2626')
    },
  },

  {
    id: 'academic-achievement',
    label: 'Academic Achievement',
    industry: 'School / University',
    draw(ctx, w, h) {
      // Cream/ivory background
      ctx.fillStyle = '#FAFAF7'
      ctx.fillRect(0, 0, w, h)

      // Forest green border
      ctx.strokeStyle = '#166534'
      ctx.lineWidth = 5
      ctx.strokeRect(10, 10, w - 20, h - 20)
      ctx.lineWidth = 1
      ctx.strokeRect(16, 16, w - 32, h - 32)

      // Corner ornaments
      const corners = [[22, 22], [w - 22, 22], [22, h - 22], [w - 22, h - 22]]
      ctx.fillStyle = '#166534'
      for (const [cx, cy] of corners) {
        ctx.beginPath()
        ctx.arc(cx, cy, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Diploma scroll icon
      rect(ctx, w / 2 - 18, 32, 36, 28, 3, '#166534')
      ctx.fillStyle = '#FAFAF7'
      ctx.font = '700 14px "Playfair Display", serif'
      ctx.textAlign = 'center'
      ctx.fillText('A', w / 2, 52)

      centredText(ctx, 'CERTIFICATE OF', 80, '700 8px "Outfit", sans-serif', '#166534')
      centredText(ctx, 'Academic Achievement', 100, '700 17px "Playfair Display", serif', '#166534')
      hline(ctx, 112, '#166534', 0.3)

      centredText(ctx, 'This certificate is awarded to', 130, '400 9px "Outfit", sans-serif', '#6B7280')
      centredText(ctx, 'Jane Smith', 155, '600 20px "Playfair Display", serif', '#111827')
      centredText(ctx, 'Grade 12 · Valedictorian · GPA 4.0', 173, '400 8px "Outfit", sans-serif', '#166534')

      hline(ctx, 186, '#166534', 0.3)

      centredText(ctx, 'In recognition of outstanding scholastic', 203, '400 8.5px "Outfit", sans-serif', '#6B7280')
      centredText(ctx, 'achievement and academic excellence.', 217, '400 8.5px "Outfit", sans-serif', '#6B7280')

      // Gold seal
      ctx.beginPath()
      ctx.arc(w / 2, 248, 18, 0, Math.PI * 2)
      ctx.fillStyle = '#CA8A04'
      ctx.fill()
      ctx.strokeStyle = '#FAFAF7'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(w / 2, 248, 13, 0, Math.PI * 2)
      ctx.stroke()
    },
  },

  {
    id: 'event-participation',
    label: 'Event Participation',
    industry: 'Event Organizer',
    draw(ctx, w, h) {
      // Deep purple background
      ctx.fillStyle = '#2E1065'
      ctx.fillRect(0, 0, w, h)

      // Gradient-like layered circles (decorative)
      ctx.save()
      ctx.globalAlpha = 0.12
      ctx.fillStyle = '#A855F7'
      ctx.beginPath(); ctx.arc(-20, -20, 120, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(w + 20, h + 20, 140, 0, Math.PI * 2); ctx.fill()
      ctx.restore()

      // Light purple accent line
      rect(ctx, 0, 0, w, 6, 0, '#A855F7')

      // Badge / ribbon icon
      ctx.save()
      ctx.translate(w / 2, 55)
      // Ribbon tails
      ctx.fillStyle = '#7C3AED'
      ctx.beginPath()
      ctx.moveTo(-12, 10)
      ctx.lineTo(0, 26)
      ctx.lineTo(12, 10)
      ctx.closePath()
      ctx.fill()
      // Circle
      ctx.beginPath()
      ctx.arc(0, 0, 22, 0, Math.PI * 2)
      ctx.fillStyle = '#A855F7'
      ctx.fill()
      // Star inside
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '700 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('★', 0, 6)
      ctx.restore()

      centredText(ctx, 'CERTIFICATE OF', 98, '700 8px "Outfit", sans-serif', '#C4B5FD')
      centredText(ctx, 'Participation', 120, '700 20px "Playfair Display", serif', '#FFFFFF')
      hline(ctx, 133, '#A855F7', 0.4)

      centredText(ctx, 'This is to certify that', 152, '400 9px "Outfit", sans-serif', '#C4B5FD')
      centredText(ctx, 'Jane Smith', 175, '600 19px "Playfair Display", serif', '#FFFFFF')
      centredText(ctx, 'participated in', 193, '400 9px "Outfit", sans-serif', '#C4B5FD')
      centredText(ctx, 'TechConf 2026 Hackathon', 212, '600 11px "Outfit", sans-serif', '#A855F7', 260)

      hline(ctx, 228, '#A855F7', 0.4)
      centredText(ctx, 'February 2026 · Malta', 245, '400 8px "Outfit", sans-serif', '#94A3B8')

      // Bottom accent
      rect(ctx, 0, h - 6, w, 6, 0, '#A855F7')
    },
  },

  {
    id: 'general-achievement',
    label: 'General Achievement',
    industry: 'All Purposes',
    draw(ctx, w, h) {
      // White background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, w, h)

      // Primary blue top bar
      rect(ctx, 0, 0, w, 56, 0, '#3B5BDB')

      // White star on blue
      ctx.save()
      ctx.translate(w / 2, 28)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.beginPath()
      ctx.arc(0, 0, 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '700 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('★', 0, 7)
      ctx.restore()

      centredText(ctx, 'CERTIFICATE OF ACHIEVEMENT', 84, '700 8px "Outfit", sans-serif', '#3B5BDB')

      hline(ctx, 96, '#3B5BDB', 0.15)

      centredText(ctx, 'Presented to', 116, '400 9px "Outfit", sans-serif', '#9CA3AF')
      centredText(ctx, 'Jane Smith', 142, '600 21px "Playfair Display", serif', '#111827')

      centredText(ctx, 'In recognition of outstanding achievement', 164, '400 8.5px "Outfit", sans-serif', '#6B7280')
      centredText(ctx, 'and exceptional contribution.', 178, '400 8.5px "Outfit", sans-serif', '#6B7280')

      hline(ctx, 195, '#3B5BDB', 0.15)

      // Signature lines
      ctx.strokeStyle = '#E5E7EB'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(55, 228); ctx.lineTo(160, 228); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(240, 228); ctx.lineTo(345, 228); ctx.stroke()

      ctx.fillStyle = '#9CA3AF'
      ctx.font = '400 7.5px "Outfit", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('Authorised Signature', 55, 240)
      ctx.textAlign = 'right'
      ctx.fillText('Date', 345, 240)

      // Blue bottom stripe
      rect(ctx, 0, h - 10, w, 10, 0, '#3B5BDB')
    },
  },
]

// ─── map for quick lookup ───────────────────────────────────────────────────

export const STARTER_TEMPLATES = TEMPLATES

// ─── component ─────────────────────────────────────────────────────────────

interface Props {
  templateId: StarterTemplateId
  width?: number
  height?: number
  className?: string
}

export default function StarterTemplateCanvas({ templateId, width = 400, height = 280, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      template!.draw(ctx, width, height)
    }

    // Ensure fonts are loaded before drawing
    Promise.all([
      document.fonts.load('600 16px "Playfair Display"'),
      document.fonts.load('700 12px "Outfit"'),
    ])
      .then(draw)
      .catch(draw)
  }, [templateId, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  )
}

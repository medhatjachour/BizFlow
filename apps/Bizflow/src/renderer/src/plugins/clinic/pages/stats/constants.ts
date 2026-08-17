export const VISIT_TYPE_COLORS: Record<string, string> = {
  first_visit: '#3b82f6',
  follow_up:   '#0d9488',
  routine:     '#8b5cf6',
  emergency:   '#ef4444'
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid:    '#10b981',
  partial: '#f59e0b',
  unpaid:  '#ef4444',
  waived:  '#94a3b8'
}

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#0f172a',
    color: '#ffffff',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)'
  },
  labelStyle: { color: '#94a3b8', marginBottom: '4px', fontWeight: '700' },
  itemStyle: { padding: '2px 0' }
}

export const AXIS_TICK_STYLE = {
  fontSize: 10,
  fill: '#94a3b8',
  fontWeight: 500
}
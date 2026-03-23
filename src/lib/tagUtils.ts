const COLORS = [
  { bg: '#1e3a5f', text: '#60a5fa' }, // blue
  { bg: '#3b1f5e', text: '#c084fc' }, // purple
  { bg: '#14532d', text: '#4ade80' }, // green
  { bg: '#431407', text: '#fb923c' }, // orange
  { bg: '#500724', text: '#f472b6' }, // pink
  { bg: '#164e63', text: '#22d3ee' }, // cyan
  { bg: '#713f12', text: '#facc15' }, // yellow
  { bg: '#450a0a', text: '#f87171' }, // red
]

function hashTag(tag: string): number {
  let h = 0
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) >>> 0
  }
  return h
}

export function getTagStyle(tag: string): { backgroundColor: string; color: string } {
  const c = COLORS[hashTag(tag) % COLORS.length]
  return { backgroundColor: c.bg, color: c.text }
}

export function formatTag(tag: string): string {
  return tag.toUpperCase()
}

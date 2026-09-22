// 时间显示：今年不显示年份，非今年才带年份
const p = (n) => String(n).padStart(2, '0')

function isThisYear(d) {
  return d.getFullYear() === new Date().getFullYear()
}

// ISO 时间 → 今年: "09-21 16:10" / 非今年: "2025-09-21 16:10"
export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = isThisYear(d)
    ? `${p(d.getMonth() + 1)}-${p(d.getDate())}`
    : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return `${date} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 日期字符串 "YYYY-MM-DD" → 今年: "09-21" / 非今年: "2025-09-21"
export function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr))
  if (!m) return String(dateStr)
  const [, y, mo, da] = m
  return Number(y) === new Date().getFullYear() ? `${mo}-${da}` : String(dateStr)
}

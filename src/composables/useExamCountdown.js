import { computed, onBeforeUnmount, ref } from 'vue'

// 考试时间：2026-10-24 周六 08:30 开考，16:30 结束
export const EXAM_START = new Date('2026-10-24T08:30:00')
export const EXAM_END = new Date('2026-10-24T16:30:00')

// 秒级倒计时，可在多个组件复用
export function useExamCountdown() {
  const now = ref(new Date())
  const timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
  onBeforeUnmount(() => clearInterval(timer))

  const countdown = computed(() => {
    if (now.value >= EXAM_END) return { phase: 'over' }
    if (now.value >= EXAM_START) return { phase: 'ongoing' }
    const ms = EXAM_START - now.value
    return {
      phase: 'before',
      days: Math.floor(ms / 86400000),
      hours: Math.floor((ms % 86400000) / 3600000),
      minutes: Math.floor((ms % 3600000) / 60000),
      seconds: Math.floor((ms % 60000) / 1000)
    }
  })

  const pad = (n) => String(n).padStart(2, '0')
  return { countdown, pad }
}

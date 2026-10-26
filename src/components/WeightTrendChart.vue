<template>
  <div class="wb-chart-card">
    <div class="wb-chart-head">
      <span class="title">体重变化趋势</span>
      <span class="hint">单位：斤 · 共 {{ points.length }} 次称重</span>
    </div>
    <div ref="chartRef" class="wb-chart-body"></div>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // [{ date: 'YYYY-MM-DD', weight: 斤 }]
  points: { type: Array, default: () => [] }
})

const chartRef = ref(null)
let chart = null
let resizeHandler = null

function render() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  if (!props.points.length) {
    chart.clear()
    return
  }
  chart.setOption(
    {
      animation: true,
      grid: { left: 46, right: 20, top: 26, bottom: 30 },
      tooltip: {
        trigger: 'axis',
        formatter: (ps) => {
          const p = ps[0]
          return `${p.axisValue}<br/>体重：<b>${p.data} 斤</b>`
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: props.points.map((p) => p.date.slice(5)), // MM-DD（今年不带年份）
        axisLine: { lineStyle: { color: '#d9d9d9' } },
        axisTick: { show: false },
        axisLabel: { color: '#888' }
      },
      yAxis: {
        type: 'value',
        scale: true, // 不从 0 起，聚焦波动区间
        axisLabel: { color: '#888' },
        splitLine: { lineStyle: { color: '#eef1f8' } }
      },
      series: [
        {
          type: 'line',
          data: props.points.map((p) => p.weight),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: '#0052d9' },
          itemStyle: { color: '#0052d9', borderColor: '#fff', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0,82,217,0.16)' },
                { offset: 1, color: 'rgba(0,82,217,0.02)' }
              ]
            }
          }
        }
      ]
    },
    true // notMerge：整体替换配置
  )
}

function resize() {
  chart?.resize()
}

watch(() => props.points, render, { deep: true })

onMounted(() => {
  render()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})
</script>

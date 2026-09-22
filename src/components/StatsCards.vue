<template>
  <div class="wb-stats">
    <div
      v-for="card in cards"
      :key="card.key"
      class="wb-stat-card"
      :class="{ active: card.key === active }"
      @click="$emit('select', card.key)"
    >
      <div class="wb-stat-label">
        <component :is="card.icon" />
        {{ card.label }}
      </div>
      <div class="wb-stat-value" :class="card.color">{{ card.value }}</div>
    </div>
  </div>
</template>

<script setup>
// 通用统计卡片：TodoPage / JournalPage 复用
defineProps({
  cards: { type: Array, default: () => [] },
  active: { type: String, default: '' }
})
defineEmits(['select'])
</script>

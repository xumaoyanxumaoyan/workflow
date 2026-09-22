<template>
  <t-dialog
    v-model:visible="model"
    :header="isEdit ? '编辑日志' : '写日志'"
    width="620px"
    :confirm-btn="{ content: '保存', theme: 'primary' }"
    @confirm="submit"
  >
    <t-form ref="formRef" :data="form" :rules="rules" label-width="76px" @submit.prevent>
      <t-form-item label="日期" name="date">
        <t-date-picker v-model="form.date" mode="date" style="width: 200px" clearable />
      </t-form-item>
      <t-form-item label="标题" name="title">
        <t-input v-model="form.title" placeholder="今天的关键词（可选）" :maxlength="60" />
      </t-form-item>
      <t-form-item label="心情" name="mood">
        <t-radio-group v-model="form.mood" variant="default-filled">
          <t-radio-button value="great">😊 美好</t-radio-button>
          <t-radio-button value="ok">😐 一般</t-radio-button>
          <t-radio-button value="anxious">😰 焦虑</t-radio-button>
          <t-radio-button value="bad">😞 低落</t-radio-button>
        </t-radio-group>
      </t-form-item>
      <t-form-item label="内容" name="content">
        <t-textarea
          v-model="form.content"
          placeholder="记录今天的进展、想法和反思…"
          :autosize="{ minRows: 5, maxRows: 10 }"
        />
      </t-form-item>
      <t-form-item label="标签" name="tags">
        <t-tag-input
          v-model="form.tags"
          clearable
          placeholder="输入后回车添加"
          @blur="onTagBlur"
        />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import * as api from '../api'

const props = defineProps({
  visible: { type: Boolean, default: false },
  journal: { type: Object, default: null }
})
const emit = defineEmits(['update:visible', 'saved'])

const model = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})
const isEdit = computed(() => !!props.journal)

const todayStr = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const emptyForm = () => ({
  date: todayStr(),
  title: '',
  mood: 'ok',
  content: '',
  tags: []
})
const form = reactive(emptyForm())
const rules = {
  date: [{ required: true, message: '请选择日期', type: 'error', trigger: 'change' }],
  content: [{ required: true, message: '内容不能为空', type: 'error', trigger: 'blur' }]
}
const formRef = ref(null)

// 未按回车就失焦（如直接点保存）时，从 blur 事件的 ctx.inputValue 里
// 把没提交的文字收进标签（TDesign 会在 blur 前先清空输入框，文字只能从这里拿）
function onTagBlur(_val, ctx) {
  const t = String(ctx?.inputValue || '').trim()
  if (!t) return
  if (!form.tags.includes(t)) form.tags.push(t)
}

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    const j = props.journal
    Object.assign(
      form,
      emptyForm(),
      j
        ? {
            date: j.date,
            title: j.title,
            mood: j.mood,
            content: j.content,
            tags: [...(j.tags || [])]
          }
        : {}
    )
  }
)

async function submit() {
  // TDesign：校验通过返回 true，失败返回错误对象（真值），必须严格判断 !== true
  const valid = (await formRef.value?.validate().catch(() => false)) === true
  if (!valid) return
  const payload = {
    date: form.date,
    title: form.title.trim(),
    mood: form.mood,
    content: form.content,
    tags: form.tags || []
  }
  try {
    if (isEdit.value) {
      await api.updateJournal(props.journal.id, payload)
      MessagePlugin.success('日志已更新')
    } else {
      await api.createJournal(payload)
      MessagePlugin.success('日志已保存 📝')
    }
    model.value = false
    emit('saved')
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}
</script>

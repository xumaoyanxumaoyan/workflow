<template>
  <t-dialog
    v-model:visible="model"
    :header="isEdit ? '编辑任务' : '新建任务'"
    width="560px"
    :confirm-btn="{ content: '保存', theme: 'primary' }"
    @confirm="submit"
  >
    <t-form ref="formRef" :data="form" :rules="rules" label-width="76px" @submit.prevent>
      <t-form-item label="标题" name="title">
        <t-input v-model="form.title" placeholder="请输入任务标题" :maxlength="60" />
      </t-form-item>
      <t-form-item label="描述" name="desc">
        <t-textarea v-model="form.desc" placeholder="补充说明（可选）" :autosize="{ minRows: 2, maxRows: 4 }" />
      </t-form-item>
      <t-form-item label="状态" name="status">
        <t-radio-group v-model="form.status" variant="default-filled">
          <t-radio-button value="todo">待办</t-radio-button>
          <t-radio-button value="doing">进行中</t-radio-button>
          <t-radio-button value="done">已完成</t-radio-button>
        </t-radio-group>
      </t-form-item>
      <t-form-item label="优先级" name="priority">
        <t-select v-model="form.priority" style="width: 160px">
          <t-option value="high" label="高" />
          <t-option value="medium" label="中" />
          <t-option value="low" label="低" />
        </t-select>
      </t-form-item>
      <t-form-item label="截止日期" name="dueDate">
        <t-date-picker v-model="form.dueDate" mode="date" style="width: 200px" clearable />
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
  todo: { type: Object, default: null },
  domain: { type: String, default: 'work' }
})
const emit = defineEmits(['update:visible', 'saved'])

const model = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})
const isEdit = computed(() => !!props.todo)

const emptyForm = () => ({
  title: '',
  desc: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  tags: []
})
const form = reactive(emptyForm())
const rules = {
  title: [{ required: true, message: '标题不能为空', type: 'error', trigger: 'blur' }]
}
const formRef = ref(null)

// 未按回车就失焦（如直接点保存）时，从 blur 事件的 ctx.inputValue 里
// 把没提交的文字收进标签（TDesign 会在 blur 前先清空输入框，文字只能从这里拿）
function onTagBlur(_val, ctx) {
  const t = String(ctx?.inputValue || '').trim()
  if (!t) return
  if (!form.tags.includes(t)) form.tags.push(t)
}

// 每次打开时，根据传入 todo 回填表单
watch(
  () => props.visible,
  (v) => {
    if (!v) return
    const t = props.todo
    Object.assign(
      form,
      emptyForm(),
      t
        ? {
            title: t.title,
            desc: t.desc,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate || '',
            tags: [...(t.tags || [])]
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
    title: form.title.trim(),
    desc: form.desc,
    status: form.status,
    priority: form.priority,
    dueDate: form.dueDate || '',
    tags: form.tags || []
  }
  try {
    if (isEdit.value) {
      await api.updateTodo(props.todo.id, props.domain, payload)
      MessagePlugin.success('任务已更新')
    } else {
      await api.createTodo(props.domain, payload)
      MessagePlugin.success('任务已创建')
    }
    model.value = false
    emit('saved')
  } catch (e) {
    MessagePlugin.error(e.message)
  }
}
</script>

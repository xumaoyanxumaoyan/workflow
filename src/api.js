async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.code !== 0) {
    throw new Error(body.message || `请求失败 (${res.status})`)
  }
  return body.data
}

/* ---------- 待办（domain: 'work' | 'life'） ---------- */
export const listTodos = (domain) => request(`/api/todos?domain=${domain || 'work'}`)

export const createTodo = (domain, payload) =>
  request('/api/todos', { method: 'POST', body: JSON.stringify({ domain, ...payload }) })

export const updateTodo = (id, domain, payload) =>
  request(`/api/todos/${id}`, { method: 'PUT', body: JSON.stringify({ domain, ...payload }) })

export const deleteTodo = (id, domain) =>
  request(`/api/todos/${id}?domain=${domain || ''}`, { method: 'DELETE' })

export const batchDelete = (ids, domain) =>
  request('/api/todos/batch-delete', { method: 'POST', body: JSON.stringify({ ids, domain }) })

export const clearCompleted = (domain) =>
  request('/api/todos/clear-completed', { method: 'POST', body: JSON.stringify({ domain }) })

export const importTodos = (todos) =>
  request('/api/import', { method: 'POST', body: JSON.stringify({ todos }) })

/* ---------- 日志 ---------- */
export const listJournals = () => request('/api/journals')

export const createJournal = (payload) =>
  request('/api/journals', { method: 'POST', body: JSON.stringify(payload) })

export const updateJournal = (id, payload) =>
  request(`/api/journals/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const deleteJournal = (id) => request(`/api/journals/${id}`, { method: 'DELETE' })

/* ---------- 文章 ---------- */
export const listArticles = () => request('/api/articles')

export const createArticle = (payload) =>
  request('/api/articles', { method: 'POST', body: JSON.stringify(payload) })

export const updateArticle = (id, payload) =>
  request(`/api/articles/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const deleteArticle = (id) => request(`/api/articles/${id}`, { method: 'DELETE' })

/* ---------- 备忘录 ---------- */
export const listMemos = () => request('/api/memos')

export const createMemoFolder = (name) =>
  request('/api/memos/folders', { method: 'POST', body: JSON.stringify({ name }) })

export const renameMemoFolder = (id, name) =>
  request(`/api/memos/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })

export const deleteMemoFolder = (id) => request(`/api/memos/folders/${id}`, { method: 'DELETE' })

export const createMemoItem = (payload) =>
  request('/api/memos/items', { method: 'POST', body: JSON.stringify(payload) })

export const updateMemoItem = (id, payload) =>
  request(`/api/memos/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const deleteMemoItem = (id) => request(`/api/memos/items/${id}`, { method: 'DELETE' })

/* ---------- 减肥管理 ---------- */
export const listFitness = () => request('/api/fitness')

// 同一日期保存会自动覆盖当天记录（服务端按日期 upsert）
export const saveFitness = (payload) =>
  request('/api/fitness', { method: 'POST', body: JSON.stringify(payload) })

export const deleteFitness = (id) => request(`/api/fitness/${id}`, { method: 'DELETE' })

export const listFreqFoods = () => request('/api/freq-foods')

export const deleteFreqFood = (id) => request(`/api/freq-foods/${id}`, { method: 'DELETE' })

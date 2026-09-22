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

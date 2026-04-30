/**
 * In-memory per-page state cache.
 *
 * Used to keep form inputs, view mode, and similar transient UI state alive
 * across React Router navigations. Cleared automatically on full page reload.
 *
 * Usage:
 *   const cached = getPageState('employee.audio')
 *   const [form, setForm] = useState(() => cached?.form ?? defaultForm)
 *   useEffect(() => { setPageState('employee.audio', { form, view, ... }) },
 *            [form, view, ...])
 */
const store = new Map()

export function getPageState(key) {
  return store.get(key)
}

export function setPageState(key, value) {
  store.set(key, value)
}

export function clearPageState(key) {
  store.delete(key)
}

export function clearAllPageState() {
  store.clear()
}

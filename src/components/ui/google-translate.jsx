import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Languages, Loader2 } from 'lucide-react'

const SCRIPT_ID = 'google-translate-element-script'
const CONTAINER_ID = 'google_translate_element'
const DEFAULT_LANGUAGE_CODE = 'ckb'

const LANGUAGE_OPTIONS = [
  { code: 'ckb', label: 'Kurdish (Sorani)', dir: 'rtl' },
  { code: 'ar', label: 'Arabic', dir: 'rtl' },
  { code: 'fa', label: 'Persian', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'tr', label: 'Turkish', dir: 'ltr' },
  { code: 'de', label: 'German', dir: 'ltr' },
  { code: 'fr', label: 'French', dir: 'ltr' },
  { code: 'es', label: 'Spanish', dir: 'ltr' },
]

function getLanguageOption(code) {
  return LANGUAGE_OPTIONS.find((option) => option.code === code) || LANGUAGE_OPTIONS[0]
}

function initializeGoogleTranslate() {
  const container = document.getElementById(CONTAINER_ID)
  const TranslateElement = window.google?.translate?.TranslateElement

  if (container?.dataset.initialized === 'true') return true
  if (!container || !TranslateElement) return false

  container.dataset.initialized = 'true'
  // ckb is the language used by the public archive. Google can still detect
  // mixed English/Sorani admin pages while translating the full document.
  new TranslateElement(
    {
      pageLanguage: 'ckb',
      includedLanguages: 'ar,ckb,de,en,es,fa,fr,ku,tr',
      autoDisplay: false,
      layout: TranslateElement.InlineLayout.SIMPLE,
    },
    CONTAINER_ID,
  )
  return true
}

function syncGoogleTranslateSelection(code) {
  const container = document.getElementById(CONTAINER_ID)
  const select = container?.querySelector('.goog-te-combo')
  if (!select) return false
  if (select.value !== code) {
    select.value = code
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }
  return true
}

function GoogleTranslateWidget({
  value = DEFAULT_LANGUAGE_CODE,
  onChange,
  selectLabel = 'Choose language',
  helperText = 'Use the dropdown to switch the translation language and page direction.',
  loadingLabel = 'Loading Google Translate…',
  errorLabel = 'Google Translate could not load in this browser.',
  errorLinkLabel = 'Open Google Translate',
}) {
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const retryRef = useRef(null)
  const selectRef = useRef(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false

    const initialize = () => {
      if (cancelled) return
      if (initializeGoogleTranslate()) {
        setReady(true)
        setUnavailable(false)
        return
      }

      retryRef.current = window.setTimeout(() => {
        if (cancelled) return
        if (initializeGoogleTranslate()) setReady(true)
        else setUnavailable(true)
      }, 8000)
    }

    window.googleTranslateElementInit = initialize

    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      initialize()
    } else {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src =
        'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      script.onerror = () => {
        if (!cancelled) setUnavailable(true)
      }
      document.head.append(script)
    }

    return () => {
      cancelled = true
      if (retryRef.current) window.clearTimeout(retryRef.current)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    syncGoogleTranslateSelection(value)
  }, [ready, value])

  useEffect(() => {
    if (!ready) return undefined

    const container = document.getElementById(CONTAINER_ID)
    if (!container) return undefined

    const handleSelectChange = () => {
      const next = selectRef.current?.value || DEFAULT_LANGUAGE_CODE
      onChangeRef.current?.(next)
    }

    const bindSelect = () => {
      const nextSelect = container.querySelector('.goog-te-combo')
      if (!nextSelect || nextSelect === selectRef.current) return

      if (selectRef.current) {
        selectRef.current.removeEventListener('change', handleSelectChange)
      }

      selectRef.current = nextSelect
      nextSelect.classList.add('translate-google-combo')
      nextSelect.setAttribute('aria-hidden', 'true')
      nextSelect.tabIndex = -1
      nextSelect.addEventListener('change', handleSelectChange)
      syncGoogleTranslateSelection(value)
    }

    bindSelect()
    const observer = new MutationObserver(bindSelect)
    observer.observe(container, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      if (selectRef.current) {
        selectRef.current.removeEventListener('change', handleSelectChange)
      }
      selectRef.current = null
    }
  }, [ready])

  const selectedLanguage = getLanguageOption(value)

  return (
    <div className="translate-widget notranslate" translate="no">
      <div className="translate-widget-top">
        <div className="translate-widget-copy">
          <span className="translate-widget-eyebrow">{selectLabel}</span>
          <p>{helperText}</p>
        </div>
        <div className="translate-widget-status" aria-live="polite">
          <span className="translate-widget-status-pill">{selectedLanguage.label}</span>
          <span className="translate-widget-direction-pill">{selectedLanguage.dir.toUpperCase()}</span>
        </div>
      </div>

      <label className="translate-select-shell">
        <span className="translate-select-icon" aria-hidden="true">
          <Languages />
        </span>
        <select
          value={value}
          onChange={(e) => onChangeRef.current?.(e.target.value)}
          disabled={!ready}
          aria-label={selectLabel}
          className="translate-language-select"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="translate-select-chevron" aria-hidden="true" />
      </label>

      {!ready && !unavailable ? (
        <div className="translate-widget-loading">
          <Loader2 aria-hidden="true" />
          <span>{loadingLabel}</span>
        </div>
      ) : null}

      <div id={CONTAINER_ID} />
      {unavailable ? (
        <div className="translate-widget-error">
          <p>{errorLabel}</p>
          <a href="https://translate.google.com/" target="_blank" rel="noreferrer">
            {errorLinkLabel}
          </a>
        </div>
      ) : null}
    </div>
  )
}

export { GoogleTranslateWidget, LANGUAGE_OPTIONS, getLanguageOption }

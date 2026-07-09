import { useEffect, useRef, useState } from 'react'
import { Languages, X } from 'lucide-react'

const SCRIPT_ID = 'google-translate-element-script'
const CONTAINER_ID = 'google_translate_element'

function initializeGoogleTranslate() {
  const container = document.getElementById(CONTAINER_ID)
  const TranslateElement = window.google?.translate?.TranslateElement

  if (!container || !TranslateElement || container.dataset.initialized === 'true') return false

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

function GoogleTranslate() {
  const [open, setOpen] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const retryRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const initialize = () => {
      if (cancelled) return
      if (initializeGoogleTranslate()) {
        setUnavailable(false)
        return
      }

      retryRef.current = window.setTimeout(() => {
        if (!cancelled && !initializeGoogleTranslate()) setUnavailable(true)
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

  return (
    <div className="google-translate-control notranslate" translate="no">
      <button
        type="button"
        className="google-translate-trigger"
        aria-label={open ? 'Close language translator' : 'Translate this page'}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X aria-hidden="true" /> : <Languages aria-hidden="true" />}
        <span>Translate</span>
      </button>

      <div className={`google-translate-panel${open ? ' is-open' : ''}`}>
        <p>Translate this page</p>
        <span>Powered by Google Translate</span>
        <div id={CONTAINER_ID} />
        {unavailable ? (
          <a
            href="https://translate.google.com/"
            target="_blank"
            rel="noreferrer"
            className="google-translate-fallback"
          >
            Open Google Translate
          </a>
        ) : null}
      </div>
    </div>
  )
}

export { GoogleTranslate }

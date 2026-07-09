import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

const SCRIPT_ID = 'google-translate-element-script'
const CONTAINER_ID = 'google_translate_element'

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

function GoogleTranslateWidget() {
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const retryRef = useRef(null)

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

  return (
    <div className="translate-widget notranslate" translate="no">
      {!ready && !unavailable ? (
        <div className="translate-widget-loading">
          <Loader2 aria-hidden="true" />
          <span>Loading Google Translate…</span>
        </div>
      ) : null}
      <div id={CONTAINER_ID} />
      {unavailable ? (
        <div className="translate-widget-error">
          <p>Google Translate could not load in this browser.</p>
          <a href="https://translate.google.com/" target="_blank" rel="noreferrer">
            Open Google Translate
          </a>
        </div>
      ) : null}
    </div>
  )
}

export { GoogleTranslateWidget }

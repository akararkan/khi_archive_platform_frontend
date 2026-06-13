import { useEffect, useState } from 'react'
import { Sun } from 'lucide-react'

// A compact tone control for teacher surfaces. It drives the shared
// `--khi-tone` custom property and persists per browser.
const KEY = 'khi-tone'

function readTone() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw == null) return 100
    const n = Number(raw)
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 100
  } catch {
    return 100
  }
}

export function KhiToneSlider() {
  const [tone, setTone] = useState(readTone)

  useEffect(() => {
    document.documentElement.style.setProperty('--khi-tone', String(tone))
    try { localStorage.setItem(KEY, String(tone)) } catch { /* storage unavailable */ }
  }, [tone])

  return (
    <div className="khi-tone" role="group" aria-label="تۆنی پاشبنەما">
      <span className="ic" aria-hidden="true"><Sun className="size-[18px]" /></span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={tone}
        onChange={(e) => setTone(Number(e.target.value))}
        aria-label="ڕووناکی پاشبنەما"
      />
      <span className="lbl">ڕووناکی</span>
    </div>
  )
}

export default KhiToneSlider

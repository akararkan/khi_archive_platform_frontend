import { CheckCircle2, Globe2, Languages } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GoogleTranslateWidget } from '@/components/ui/google-translate'
import { IconHome } from '@/components/khi/icons'

const LANGUAGE_CHIPS = [
  'English',
  'العربية',
  'فارسی',
  'Türkçe',
  'Deutsch',
  'Français',
  'Español',
]

function PublicTranslatePage() {
  return (
    <main className="translate-page">
      <section className="translate-hero">
        <div className="translate-orbit orbit-one" aria-hidden="true" />
        <div className="translate-orbit orbit-two" aria-hidden="true" />

        <nav className="translate-breadcrumb" aria-label="breadcrumb">
          <Link to="/public">
            <IconHome />
            سەرەتا
          </Link>
          <span>/</span>
          <strong>وەرگێڕان</strong>
        </nav>

        <div className="translate-hero-content">
          <div className="translate-hero-icon">
            <Languages aria-hidden="true" />
          </div>
          <p className="translate-kicker">GOOGLE TRANSLATE</p>
          <h1>گەنجینەکە بە زمانی خۆت بخوێنەوە</h1>
          <p>
            زمانی دڵخوازت هەڵبژێرە؛ Google Translate هەموو پەڕەکانی گەنجینەکە
            بۆت وەردەگێڕێت.
          </p>
        </div>
      </section>

      <section className="translate-content">
        <div className="translate-widget-card">
          <div className="translate-card-heading">
            <span className="translate-card-icon">
              <Globe2 aria-hidden="true" />
            </span>
            <div>
              <p>هەنگاوی یەکەم</p>
              <h2>زمانێک هەڵبژێرە</h2>
            </div>
          </div>

          <GoogleTranslateWidget />

          <div className="translate-language-chips" aria-label="Available language examples">
            {LANGUAGE_CHIPS.map((language) => (
              <span key={language}>{language}</span>
            ))}
          </div>

          <div className="translate-note">
            <CheckCircle2 aria-hidden="true" />
            <p>
              دوای هەڵبژاردنی زمان، ناوەڕۆکی پەڕەکە خۆکارانە وەردەگێڕدرێت.
              هەرکاتێک دەتەوێت دەتوانیت بگەڕێیتەوە بۆ زمانی ڕەسەن.
            </p>
          </div>
        </div>

        <aside className="translate-info-card">
          <span className="translate-info-number">01</span>
          <h3>وەرگێڕانی تەواوی پەڕە</h3>
          <p>
            ناونیشان، وردەکاری، فلتەر و زانیارییەکانی تۆمارەکان هەموویان
            لە هەمان پەڕەدا وەردەگێڕدرێن.
          </p>
          <div className="translate-divider" />
          <span className="translate-info-number">02</span>
          <h3>گەڕانەوە بۆ کوردی</h3>
          <p>
            لە لیستی زمانەکان “Kurdish (Sorani)” هەڵبژێرە بۆ گەڕانەوە بۆ
            ناوەڕۆکی ڕەسەن.
          </p>
        </aside>
      </section>
    </main>
  )
}

export { PublicTranslatePage }

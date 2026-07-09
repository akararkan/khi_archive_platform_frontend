import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Globe2, Languages } from 'lucide-react'
import { Link } from 'react-router-dom'

import { GoogleTranslateWidget, LANGUAGE_OPTIONS, getLanguageOption } from '@/components/ui/google-translate'
import { IconHome } from '@/components/khi/icons'

const PAGE_COPY = {
  ckb: {
    breadcrumbHome: 'سەرەتا',
    breadcrumbCurrent: 'وەرگێڕان',
    heroKicker: 'وەرگێڕانی زۆر خێرا',
    heroTitle: 'گەنجینەکە بە زمانی خۆت بخوێنەوە',
    heroBody: 'زمانێک هەڵبژێرە و Google Translate ناوەڕۆکی پەڕەکە بە شێوەیەکی خۆکار وەردەگێڕێت.',
    stepKicker: 'هەنگاوی یەکەم',
    stepTitle: 'زمانێک هەڵبژێرە',
    stepBody: 'هەڵبژاردنی زمان لە خوارەوە هەمان کات ڕێکخستنی پەڕەکە و ئاڕاستەی دەقەکان دەگۆڕێت.',
    selectLabel: 'زمانی وەرگێڕان',
    selectHelper: 'هەڵبژاردنی زمان لە خوارەوە، هەموو پەڕەکە و دۆخی نووسین دەگۆڕێت.',
    loadingLabel: 'Google Translate بار دەکرێت…',
    errorLabel: 'Google Translate نەتوانرا لەم وێبگەڕەدا باربکرێت.',
    errorLinkLabel: 'Google Translate بکەرەوە',
    chipsLabel: 'نمونەی زمانەکان',
    note: 'هەڵبژاردنی هەر زمانێک ناوەڕۆکی پەڕەکە، ڕێکخستن و دەستکەوتەکان خۆکارانە دەگۆڕێت.',
    infoOneTitle: 'وەرگێڕانی تەواوی پەڕە',
    infoOneBody: 'ناونیشان، فلتەر، دەق و وردەکارییەکان هەموویان بە هەمان زمان نوێ دەبنەوە.',
    infoTwoTitle: 'گەڕانەوە بۆ سۆرانی',
    infoTwoBody: 'Kurdish (Sorani) هەڵبژێرە بۆ گەڕانەوە بۆ دەق و ئاڕاستەی ڕەسەن.',
  },
  en: {
    breadcrumbHome: 'Home',
    breadcrumbCurrent: 'Translate',
    heroKicker: 'Live translation',
    heroTitle: 'Read the archive in your language',
    heroBody: 'Choose a language and Google Translate will update the page content automatically.',
    stepKicker: 'Step one',
    stepTitle: 'Pick a language',
    stepBody: 'Use the dropdown below to change the live translation and the page direction.',
    selectLabel: 'Translation language',
    selectHelper: 'Pick a language from the dropdown to switch the whole page and its layout direction.',
    loadingLabel: 'Loading Google Translate…',
    errorLabel: 'Google Translate could not load in this browser.',
    errorLinkLabel: 'Open Google Translate',
    chipsLabel: 'Language examples',
    note: 'Any language you choose updates the content, layout direction, and controls right away.',
    infoOneTitle: 'Full-page translation',
    infoOneBody: 'Titles, filters, and metadata update to match the selected language.',
    infoTwoTitle: 'Back to Sorani',
    infoTwoBody: 'Choose Kurdish (Sorani) to return to the original archive copy and direction.',
  },
  ar: {
    breadcrumbHome: 'الرئيسية',
    breadcrumbCurrent: 'الترجمة',
    heroKicker: 'ترجمة مباشرة',
    heroTitle: 'اقرأ الأرشيف بلغتك',
    heroBody: 'اختر لغة، وسيقوم Google Translate بتحديث محتوى الصفحة تلقائياً.',
    stepKicker: 'الخطوة الأولى',
    stepTitle: 'اختر لغة',
    stepBody: 'استخدم القائمة المنسدلة لتغيير الترجمة واتجاه الصفحة بالكامل.',
    selectLabel: 'لغة الترجمة',
    selectHelper: 'اختر اللغة من القائمة المنسدلة لتبديل الصفحة كلها واتجاهها.',
    loadingLabel: 'جارٍ تحميل Google Translate…',
    errorLabel: 'تعذر تحميل Google Translate في هذا المتصفح.',
    errorLinkLabel: 'فتح Google Translate',
    chipsLabel: 'أمثلة اللغات',
    note: 'أي لغة تختارها ستغيّر المحتوى واتجاه الصفحة وعناصر التحكم فوراً.',
    infoOneTitle: 'ترجمة الصفحة كاملة',
    infoOneBody: 'العناوين والمرشحات والبيانات الوصفية تتبدل مع اللغة المختارة.',
    infoTwoTitle: 'العودة إلى السوراني',
    infoTwoBody: 'اختر Kurdish (Sorani) للعودة إلى النسخة الأصلية واتجاهها.',
  },
  fa: {
    breadcrumbHome: 'خانه',
    breadcrumbCurrent: 'ترجمه',
    heroKicker: 'ترجمه زنده',
    heroTitle: 'آرشیو را به زبان خودت بخوان',
    heroBody: 'یک زبان را انتخاب کن تا Google Translate محتوای صفحه را به‌صورت خودکار به‌روزرسانی کند.',
    stepKicker: 'گام اول',
    stepTitle: 'یک زبان انتخاب کن',
    stepBody: 'از فهرست کشویی پایین برای تغییر ترجمه و جهت کل صفحه استفاده کن.',
    selectLabel: 'زبان ترجمه',
    selectHelper: 'از فهرست کشویی زبان را انتخاب کن تا کل صفحه و جهت آن تغییر کند.',
    loadingLabel: 'در حال بارگذاری Google Translate…',
    errorLabel: 'Google Translate در این مرورگر قابل بارگذاری نیست.',
    errorLinkLabel: 'باز کردن Google Translate',
    chipsLabel: 'نمونه زبان‌ها',
    note: 'هر زبانی که انتخاب کنی، محتوا، جهت صفحه و کنترل‌ها فوراً تغییر می‌کنند.',
    infoOneTitle: 'ترجمه کامل صفحه',
    infoOneBody: 'عنوان‌ها، فیلترها و داده‌ها با زبان انتخاب‌شده هماهنگ می‌شوند.',
    infoTwoTitle: 'بازگشت به سورانی',
    infoTwoBody: 'Kurdish (Sorani) را انتخاب کن تا به متن و جهت اصلی برگردی.',
  },
  tr: {
    breadcrumbHome: 'Ana sayfa',
    breadcrumbCurrent: 'Çeviri',
    heroKicker: 'Canlı çeviri',
    heroTitle: 'Arşivi kendi dilinde oku',
    heroBody: 'Bir dil seç ve Google Translate sayfa içeriğini otomatik olarak güncellesin.',
    stepKicker: 'İlk adım',
    stepTitle: 'Bir dil seç',
    stepBody: 'Aşağıdaki açılır menü ile canlı çeviriyi ve sayfa yönünü değiştir.',
    selectLabel: 'Çeviri dili',
    selectHelper: 'Tüm sayfayı ve yönünü değiştirmek için açılır menüden bir dil seç.',
    loadingLabel: 'Google Translate yükleniyor…',
    errorLabel: 'Google Translate bu tarayıcıda yüklenemedi.',
    errorLinkLabel: 'Google Translate aç',
    chipsLabel: 'Dil örnekleri',
    note: 'Seçtiğin her dil içerik, yön ve kontrolleri hemen değiştirir.',
    infoOneTitle: 'Tüm sayfa çevirisi',
    infoOneBody: 'Başlıklar, filtreler ve meta veriler seçilen dile uyum sağlar.',
    infoTwoTitle: 'Sorani’ye dön',
    infoTwoBody: 'Orijinal arşiv metnine ve yönüne dönmek için Kurdish (Sorani) seç.',
  },
  de: {
    breadcrumbHome: 'Startseite',
    breadcrumbCurrent: 'Übersetzung',
    heroKicker: 'Live-Übersetzung',
    heroTitle: 'Lies das Archiv in deiner Sprache',
    heroBody: 'Wähle eine Sprache, und Google Translate aktualisiert den Seiteninhalt automatisch.',
    stepKicker: 'Schritt eins',
    stepTitle: 'Sprache wählen',
    stepBody: 'Mit dem Dropdown kannst du die Übersetzung und die Seitenausrichtung wechseln.',
    selectLabel: 'Übersetzungssprache',
    selectHelper: 'Wähle im Dropdown eine Sprache, um die ganze Seite und ihre Richtung umzuschalten.',
    loadingLabel: 'Google Translate wird geladen…',
    errorLabel: 'Google Translate konnte in diesem Browser nicht geladen werden.',
    errorLinkLabel: 'Google Translate öffnen',
    chipsLabel: 'Sprachbeispiele',
    note: 'Jede gewählte Sprache ändert Inhalt, Richtung und Steuerelemente sofort.',
    infoOneTitle: 'Übersetzung der ganzen Seite',
    infoOneBody: 'Titel, Filter und Metadaten passen sich der gewählten Sprache an.',
    infoTwoTitle: 'Zurück zu Sorani',
    infoTwoBody: 'Wähle Kurdish (Sorani), um zum ursprünglichen Text und Layout zurückzukehren.',
  },
  fr: {
    breadcrumbHome: 'Accueil',
    breadcrumbCurrent: 'Traduction',
    heroKicker: 'Traduction en direct',
    heroTitle: 'Lisez l’archive dans votre langue',
    heroBody: 'Choisissez une langue et Google Translate mettra automatiquement à jour le contenu de la page.',
    stepKicker: 'Première étape',
    stepTitle: 'Choisir une langue',
    stepBody: 'Utilisez le menu déroulant pour changer la traduction et le sens de la page.',
    selectLabel: 'Langue de traduction',
    selectHelper: 'Choisissez une langue dans le menu pour modifier toute la page et son sens.',
    loadingLabel: 'Chargement de Google Translate…',
    errorLabel: 'Google Translate n’a pas pu être chargé dans ce navigateur.',
    errorLinkLabel: 'Ouvrir Google Translate',
    chipsLabel: 'Exemples de langues',
    note: 'Chaque langue choisie modifie immédiatement le contenu, la direction et les commandes.',
    infoOneTitle: 'Traduction de toute la page',
    infoOneBody: 'Titres, filtres et métadonnées s’adaptent à la langue choisie.',
    infoTwoTitle: 'Retour au sorani',
    infoTwoBody: 'Choisissez Kurdish (Sorani) pour revenir au texte et au sens d’origine.',
  },
  es: {
    breadcrumbHome: 'Inicio',
    breadcrumbCurrent: 'Traducción',
    heroKicker: 'Traducción en vivo',
    heroTitle: 'Lee el archivo en tu idioma',
    heroBody: 'Elige un idioma y Google Translate actualizará el contenido de la página automáticamente.',
    stepKicker: 'Paso uno',
    stepTitle: 'Elige un idioma',
    stepBody: 'Usa el menú desplegable para cambiar la traducción y la dirección de la página.',
    selectLabel: 'Idioma de traducción',
    selectHelper: 'Elige un idioma en el menú para cambiar toda la página y su dirección.',
    loadingLabel: 'Cargando Google Translate…',
    errorLabel: 'Google Translate no se pudo cargar en este navegador.',
    errorLinkLabel: 'Abrir Google Translate',
    chipsLabel: 'Ejemplos de idiomas',
    note: 'Cada idioma que elijas cambia al instante el contenido, la dirección y los controles.',
    infoOneTitle: 'Traducción de toda la página',
    infoOneBody: 'Títulos, filtros y metadatos se adaptan al idioma seleccionado.',
    infoTwoTitle: 'Volver al sorani',
    infoTwoBody: 'Elige Kurdish (Sorani) para regresar al texto y la dirección originales.',
  },
}

function PublicTranslatePage() {
  const [selectedCode, setSelectedCode] = useState('ckb')

  const selectedLanguage = useMemo(() => getLanguageOption(selectedCode), [selectedCode])
  const copy = useMemo(() => PAGE_COPY[selectedCode] || PAGE_COPY.en, [selectedCode])

  useEffect(() => {
    const original = {
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      bodyDir: document.body?.dir || '',
    }

    return () => {
      document.documentElement.dir = original.dir || ''
      document.documentElement.lang = original.lang || ''
      if (document.body) document.body.dir = original.bodyDir
    }
  }, [])

  useEffect(() => {
    document.documentElement.dir = selectedLanguage.dir
    document.documentElement.lang = selectedLanguage.code
    if (document.body) document.body.dir = selectedLanguage.dir
  }, [selectedLanguage])

  return (
    <main className="translate-page" dir={selectedLanguage.dir} data-lang={selectedLanguage.code}>
      <section className="translate-hero">
        <div className="translate-orbit orbit-one" aria-hidden="true" />
        <div className="translate-orbit orbit-two" aria-hidden="true" />

        <nav className="translate-breadcrumb" aria-label="breadcrumb">
          <Link to="/public">
            <IconHome />
            {copy.breadcrumbHome}
          </Link>
          <span aria-hidden="true">/</span>
          <strong>{copy.breadcrumbCurrent}</strong>
        </nav>

        <div className="translate-hero-grid">
          <div className="translate-hero-copy">
            <div className="translate-hero-badges">
              <span className="translate-hero-pill">{selectedLanguage.label}</span>
              <span className="translate-hero-pill subtle">{selectedLanguage.dir.toUpperCase()}</span>
            </div>
            <div className="translate-hero-icon">
              <Languages aria-hidden="true" />
            </div>
            <p className="translate-kicker">{copy.heroKicker}</p>
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroBody}</p>
          </div>

          <div className="translate-hero-panel">
            <div className="translate-card-heading">
              <span className="translate-card-icon">
                <Globe2 aria-hidden="true" />
              </span>
              <div>
                <p>{copy.stepKicker}</p>
                <h2>{copy.stepTitle}</h2>
              </div>
            </div>

            <GoogleTranslateWidget
              value={selectedCode}
              onChange={setSelectedCode}
              selectLabel={copy.selectLabel}
              helperText={copy.selectHelper}
              loadingLabel={copy.loadingLabel}
              errorLabel={copy.errorLabel}
              errorLinkLabel={copy.errorLinkLabel}
            />

            <div className="translate-language-chips" aria-label={copy.chipsLabel}>
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  className={language.code === selectedCode ? 'active' : ''}
                  onClick={() => setSelectedCode(language.code)}
                >
                  <span>{language.label}</span>
                  <small>{language.dir.toUpperCase()}</small>
                </button>
              ))}
            </div>

            <div className="translate-note">
              <CheckCircle2 aria-hidden="true" />
              <p>{copy.note}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="translate-content">
        <aside className="translate-info-card">
          <span className="translate-info-number">01</span>
          <h3>{copy.infoOneTitle}</h3>
          <p>{copy.infoOneBody}</p>
          <div className="translate-divider" />
          <span className="translate-info-number">02</span>
          <h3>{copy.infoTwoTitle}</h3>
          <p>{copy.infoTwoBody}</p>
        </aside>
      </section>
    </main>
  )
}

export { PublicTranslatePage }

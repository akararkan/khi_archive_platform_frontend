import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

import { HelpUsDialog } from '@/components/public/HelpUsDialog'
import {
  formatPublicDate, mediaThumbHref, pickMediaTitle, extractPersonFromItem,
} from '@/components/public/public-helpers'
import { DETAIL, yearNum } from '@/components/khi/khi-data'
import KhiMediaDetail from '@/components/khi/KhiMediaDetail'
import {
  KhiDetailShell, KhiContentCard, KhiMetaPanel, KhiMetaPanelIf, KhiMetaRow,
  KhiPillRow, KhiSearchValue, KhiProjectLink, KhiPersonLink, KhiCategoryLinks,
} from '@/components/khi/KhiDetail'
import {
  IconPerson, IconProject, IconBook, IconLanguage, IconCalendar, IconLayers,
  IconText, IconMic, IconQuote, IconPlus,
} from '@/components/khi/icons'
import { guestTexts } from '@/services/guest'
import { decodePublicCode, isEncodedPublicCode, publicDetailPath } from '@/components/public/public-route-id'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

function toList(v, cap = 12) {
  if (!v) return []
  const arr = Array.isArray(v) ? v : String(v).split(/[,،;]/)
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, cap)
}

function TextPdfPageImagesViewer({ fileUrl, title }) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState(1)

  useEffect(() => {
    setActivePage(1)
  }, [fileUrl])

  useEffect(() => {
    if (!fileUrl) {
      setPages([])
      setLoading(false)
      setError('')
      return undefined
    }

    let canceled = false
    const abortController = new AbortController()
    let loadingTask = null

    async function renderPages() {
      try {
        setLoading(true)
        setError('')
        setPages([])

        const response = await fetch(fileUrl, {
          signal: abortController.signal,
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Failed to download document: ${response.status}`)
        }

        const rawData = new Uint8Array(await response.arrayBuffer())
        loadingTask = getDocument({ data: rawData })
        const pdf = await loadingTask.promise
        const renderedPages = []

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (canceled) break
          const page = await pdf.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1.3 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvasContext: context, viewport }).promise
          const pageImage = canvas.toDataURL('image/png')
          renderedPages.push(pageImage)
          if (!canceled) {
            setPages((prev) => [...prev, pageImage])
          }
          page.cleanup()
          if (canceled) break
        }
      } catch (err) {
        if (!canceled && err?.name !== 'AbortError') {
          setError(err?.message || 'Could not render document preview.')
          setPages([])
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    renderPages()

    return () => {
      canceled = true
      abortController.abort()
      if (loadingTask) {
        loadingTask.destroy().catch(() => null)
      }
    }
  }, [fileUrl])

  const pageCount = pages.length
  const leftPage = pages[activePage - 1]
  const rightPage = pages[activePage]
  const hasSpread = pageCount > 1

  const visiblePages = pageCount === 0 ? [] : hasSpread ? [leftPage, rightPage].filter(Boolean) : [leftPage]

  const handlePrevious = () => {
    setActivePage((current) => Math.max(1, current - 2))
  }

  const handleNext = () => {
    setActivePage((current) => Math.min(pageCount - (pageCount % 2 === 0 ? 1 : 0), current + 2))
  }

  const handlePageChange = (event) => {
    const page = Number(event.target.value)
    setActivePage(page)
  }

  return (
    <div className="protected-file-viewer">
      {loading ? (
        <div className="media-unavailable">Loading document images…</div>
      ) : error ? (
        <div className="media-unavailable">{error}</div>
      ) : visiblePages.length ? (
        <>
          <div className="protected-file-viewer-header">
            <div className="protected-file-viewer-controls">
              <button type="button" className="viewer-nav-button" onClick={handlePrevious} disabled={activePage <= 1}>
                ‹
              </button>
              <button type="button" className="viewer-nav-button" onClick={handleNext} disabled={activePage >= pageCount - (pageCount % 2 === 0 ? 1 : 0)}>
                ›
              </button>
              <div className="viewer-page-indicator">
                Page {activePage}{hasSpread && pageCount > activePage ? `–${Math.min(activePage + 1, pageCount)}` : ''} of {pageCount}
              </div>
            </div>
            <input
              type="range"
              min="1"
              max={pageCount}
              step="1"
              value={activePage}
              onChange={handlePageChange}
              className="viewer-page-slider"
            />
          </div>
          <div className="protected-file-grid">
            {visiblePages.map((src, index) => (
              <div
                key={`pdf-page-${activePage + index}`}
                className="protected-file-page"
                data-page={`Page ${activePage + index}`}
                style={{ backgroundImage: `url(${src})` }}
                role="img"
                aria-label={`${title} – Page ${activePage + index}`}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="media-unavailable">Preview is not available for this file type.</div>
      )}
    </div>
  )
}

function PublicTextDetailPage() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const code = decodePublicCode(routeCode)
  const [text, setText] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (routeCode && !isEncodedPublicCode(routeCode)) {
      navigate(publicDetailPath('texts', routeCode), { replace: true })
    }
  }, [navigate, routeCode])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    guestTexts
      .one(code, { signal: ctrl.signal })
      .then((d) => { if (!ctrl.signal.aborted) setText(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this text.') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [code])

  const person = useMemo(() => extractPersonFromItem(text), [text])

  if (loading || error || !text) {
    return <KhiDetailShell loading={loading} error={error} notFound={!text} />
  }

  const title = pickMediaTitle(text) || DETAIL.none
  const originalCandidate = text.originalTitle || text.titleOriginal || text.titleInCentralKurdish || text.centralKurdishTitle
  const original = originalCandidate && originalCandidate !== title ? originalCandidate : null
  const fileUrl = text.textFileUrl
  const isPdf = fileUrl && /\.pdf($|\?)/i.test(fileUrl)
  const projectCode = text.project?.projectCode || text.projectCode

  const content = (
    <>
      {fileUrl ? (
        isPdf ? (
          <TextPdfPageImagesViewer fileUrl={fileUrl} title={title} />
        ) : (
          <div className="media-unavailable">Preview is not available for this file type.</div>
        )
      ) : (
        <div className="media-unavailable">{DETAIL.fileUnavailable}</div>
      )}
      {text.summary ? <KhiContentCard icon={IconQuote} title={DETAIL.summary}><p>{text.summary}</p></KhiContentCard> : null}
      {text.bodyText ? <KhiContentCard icon={IconText} title={DETAIL.body}><p>{text.bodyText}</p></KhiContentCard> : null}
    </>
  )

  const infoCards = [
    { icon: IconPerson, label: DETAIL.person, value: person?.fullName || person?.name, to: person?.personCode ? publicDetailPath('persons', person.personCode) : null },
    { icon: IconProject, label: DETAIL.project, value: text.project?.projectName || text.projectName, to: projectCode ? publicDetailPath('projects', projectCode) : null },
    { icon: IconBook, label: DETAIL.documentType, value: text.documentType },
    { icon: IconMic, label: DETAIL.author, value: text.author },
    { icon: IconLanguage, label: DETAIL.language, value: text.language },
    { icon: IconCalendar, label: DETAIL.year, value: yearNum(text) },
  ]

  const meta = (
    <>
      <KhiMetaPanel icon={IconLayers} title={DETAIL.details}>
        <KhiMetaRow label={DETAIL.project} value={projectCode}><KhiProjectLink project={text.project || { projectCode: text.projectCode, projectName: text.projectName }} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.person} value={person?.personCode}><KhiPersonLink person={person} fallbackName={person?.name} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.categories} value={text.categories}><KhiCategoryLinks categories={text.categories} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.subject} value={text.subject || text.subjects}><KhiPillRow values={text.subject || text.subjects} search /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.audience} value={text.audience}><KhiSearchValue value={text.audience} /></KhiMetaRow>
      </KhiMetaPanel>

      <KhiMetaPanelIf obj={text} icon={IconBook} title={DETAIL.document} keys={['documentType', 'genre', 'script', 'series', 'publisher', 'printingHouse', 'isbn']}>
        <KhiMetaRow label={DETAIL.documentType} value={text.documentType}><KhiSearchValue value={text.documentType} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.genre} value={text.genre}><KhiPillRow values={text.genre} search /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.script} value={text.script}><KhiSearchValue value={text.script} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.series} value={text.series}><KhiSearchValue value={text.series} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.publisher} value={text.publisher}><KhiSearchValue value={text.publisher} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.printingHouse} value={text.printingHouse}><KhiSearchValue value={text.printingHouse} /></KhiMetaRow>
        <KhiMetaRow label="ISBN" value={text.isbn}>{text.isbn}</KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={text} icon={IconMic} title={DETAIL.credits} keys={['author', 'contributors', 'contributor']}>
        <KhiMetaRow label={DETAIL.author} value={text.author}><KhiSearchValue value={text.author} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.contributors} value={text.contributors || text.contributor}><KhiPillRow values={text.contributors || text.contributor} search /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={text} icon={IconLanguage} title={DETAIL.langPlace} keys={['language', 'dialect']}>
        <KhiMetaRow label={DETAIL.language} value={text.language}><KhiSearchValue value={text.language} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.dialect} value={text.dialect}><KhiSearchValue value={text.dialect} /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={text} icon={IconCalendar} title={DETAIL.dates} keys={['printDate', 'documentDate', 'dateCreated']}>
        <KhiMetaRow label={DETAIL.date}>{formatPublicDate(text.documentDate || text.printDate)}</KhiMetaRow>
        <KhiMetaRow label={DETAIL.recorded}>{formatPublicDate(text.dateCreated)}</KhiMetaRow>
      </KhiMetaPanelIf>
    </>
  )

  return (
    <>
      <HelpUsDialog open={helpOpen} onOpenChange={setHelpOpen} mediaType="TEXT" mediaCode={code} mediaTitle={title} mediaData={text} />
      <KhiDetailShell>
        <KhiMediaDetail
          kind="text"
          title={title}
          subtitle={original}
          description={text.description || text.summary}
          image={mediaThumbHref(text)}
          tags={toList(text.tags)}
          breadcrumbItems={[
            { to: '/public', label: DETAIL.home },
            { to: '/public/browse?types=text', label: 'دەقەکان' },
            { label: title },
          ]}
          actions={[
            { label: DETAIL.help, icon: IconPlus, onClick: () => setHelpOpen(true) },
          ]}
          infoCards={infoCards}
          content={content}
          meta={meta}
        />
      </KhiDetailShell>
    </>
  )
}

export { PublicTextDetailPage }

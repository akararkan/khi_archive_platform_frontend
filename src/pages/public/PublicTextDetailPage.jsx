import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { BookOpen, ChevronLeft, ChevronRight, FileText as FileTextIcon } from 'lucide-react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

import { HelpUsDialog } from '@/components/public/HelpUsDialog'
import {
  pickMediaTitle, extractPersonFromItem,
} from '@/components/public/public-helpers'
import { DETAIL, yearNum } from '@/components/khi/khi-data'
import KhiMediaDetail from '@/components/khi/KhiMediaDetail'
import { KhiPublicMediaFields } from '@/components/khi/KhiPublicMediaFields'
import {
  KhiDetailShell, KhiContentCard, KhiMetaPanel, KhiMetaRow,
  KhiProjectLink, KhiPersonLink, KhiCategoryLinks,
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

function stopProtectedMediaEvent(event) {
  event.preventDefault()
  event.stopPropagation()
}

function getSpreadStartPage(page, pageCount) {
  const safeCount = Math.max(1, pageCount || 1)
  const safePage = Math.min(safeCount, Math.max(1, Number(page) || 1))
  return safePage % 2 === 0 ? Math.max(1, safePage - 1) : safePage
}

function TextPdfPageImagesViewer({ fileUrl, title }) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState(1)
  const [viewMode, setViewMode] = useState('spread')
  const pageCount = pages.length

  useEffect(() => {
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

  const isSpread = viewMode === 'spread' && pageCount > 1
  const maxStartPage = pageCount
    ? (isSpread ? pageCount - (pageCount % 2 === 0 ? 1 : 0) : pageCount)
    : 1
  const normalizedActivePage = pageCount
    ? Math.min(maxStartPage, isSpread ? getSpreadStartPage(activePage, pageCount) : activePage)
    : 1
  const visiblePages = pageCount === 0
    ? []
    : isSpread
      ? [
        { src: pages[normalizedActivePage - 1], pageNumber: normalizedActivePage },
        { src: pages[normalizedActivePage], pageNumber: normalizedActivePage + 1 },
      ].filter((page) => page.src)
      : [{ src: pages[normalizedActivePage - 1], pageNumber: normalizedActivePage }].filter((page) => page.src)

  const handlePrevious = () => {
    setActivePage((current) => {
      const startPage = isSpread ? getSpreadStartPage(current, pageCount) : current
      return Math.max(1, startPage - (isSpread ? 2 : 1))
    })
  }

  const handleNext = () => {
    setActivePage((current) => {
      const startPage = isSpread ? getSpreadStartPage(current, pageCount) : current
      return Math.min(maxStartPage, startPage + (isSpread ? 2 : 1))
    })
  }

  const handlePageChange = (event) => {
    const page = Number(event.target.value)
    setActivePage(isSpread ? getSpreadStartPage(page, pageCount) : page)
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    setActivePage((current) => {
      if (mode === 'spread') return getSpreadStartPage(current, pageCount)
      return Math.min(Math.max(1, current), pageCount || 1)
    })
  }

  return (
    <div
      className="protected-file-viewer protected-media"
      onAuxClick={stopProtectedMediaEvent}
      onContextMenu={stopProtectedMediaEvent}
    >
      {loading ? (
        <div className="document-viewer-status">Loading document images...</div>
      ) : error ? (
        <div className="document-viewer-status error">{error}</div>
      ) : visiblePages.length ? (
        <>
          <div className="protected-file-viewer-header">
            <div className="viewer-page-indicator" aria-live="polite">
              <FileTextIcon aria-hidden="true" />
              <span>
                Page {normalizedActivePage}{isSpread && pageCount > normalizedActivePage ? `-${Math.min(normalizedActivePage + 1, pageCount)}` : ''} of {pageCount}
              </span>
            </div>
            <div className="viewer-toolbar">
              {pageCount > 1 ? (
                <div className="viewer-mode-toggle" role="group" aria-label="Page layout">
                  <button
                    type="button"
                    className={`viewer-mode-button${!isSpread ? ' active' : ''}`}
                    onClick={() => handleViewModeChange('single')}
                    aria-pressed={!isSpread}
                    title="Single page"
                  >
                    <FileTextIcon aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`viewer-mode-button${isSpread ? ' active' : ''}`}
                    onClick={() => handleViewModeChange('spread')}
                    aria-pressed={isSpread}
                    title="Two pages"
                  >
                    <BookOpen aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              <div className="protected-file-viewer-controls">
                <button type="button" className="viewer-nav-button" onClick={handlePrevious} disabled={normalizedActivePage <= 1} aria-label="Previous page">
                  <ChevronRight aria-hidden="true" />
                </button>
                <button type="button" className="viewer-nav-button" onClick={handleNext} disabled={normalizedActivePage >= maxStartPage} aria-label="Next page">
                  <ChevronLeft aria-hidden="true" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max={pageCount}
              step="1"
              value={normalizedActivePage}
              onChange={handlePageChange}
              className="viewer-page-slider"
              aria-label="Document page"
            />
          </div>
          <div className="protected-file-stage">
            <div className={`protected-file-grid ${isSpread ? 'is-spread' : 'is-single'}`}>
              {visiblePages.map(({ src, pageNumber }) => (
                <figure
                  key={`pdf-page-${pageNumber}`}
                  className="protected-file-page"
                  data-page={`Page ${pageNumber}`}
                >
                  <img
                    src={src}
                    alt={`${title} - Page ${pageNumber}`}
                    draggable={false}
                    onAuxClick={stopProtectedMediaEvent}
                    onContextMenu={stopProtectedMediaEvent}
                  />
                </figure>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="document-viewer-status">Preview is not available for this file type.</div>
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
          <TextPdfPageImagesViewer key={fileUrl} fileUrl={fileUrl} title={title} />
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
      </KhiMetaPanel>
      <KhiPublicMediaFields kind="text" item={text} />
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
          image={text.coverImageUrl || null}
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

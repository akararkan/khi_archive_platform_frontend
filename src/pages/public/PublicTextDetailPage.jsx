import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

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
  IconText, IconMic, IconQuote, IconExternal, IconPlus,
} from '@/components/khi/icons'
import { guestTexts } from '@/services/guest'

function toList(v, cap = 12) {
  if (!v) return []
  const arr = Array.isArray(v) ? v : String(v).split(/[,،;]/)
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, cap)
}

function PublicTextDetailPage() {
  const { code } = useParams()
  const [text, setText] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

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

  const infoCards = [
    { icon: IconPerson, label: DETAIL.person, value: person?.fullName || person?.name, to: person?.personCode ? `/public/persons/${person.personCode}` : null },
    { icon: IconProject, label: DETAIL.project, value: text.project?.projectName || text.projectName, to: projectCode ? `/public/projects/${projectCode}` : null },
    { icon: IconBook, label: DETAIL.documentType, value: text.documentType },
    { icon: IconMic, label: DETAIL.author, value: text.author },
    { icon: IconLanguage, label: DETAIL.language, value: text.language },
    { icon: IconCalendar, label: DETAIL.year, value: yearNum(text) },
  ]

  const content = (
    <>
      {fileUrl && isPdf ? (
        <div className="media-stage"><iframe src={fileUrl} title={title} loading="lazy" /></div>
      ) : null}
      {!fileUrl ? <div className="media-unavailable">{DETAIL.fileUnavailable}</div> : null}
      {text.summary ? <KhiContentCard icon={IconQuote} title={DETAIL.summary}><p>{text.summary}</p></KhiContentCard> : null}
      {text.bodyText ? <KhiContentCard icon={IconText} title={DETAIL.body}><p>{text.bodyText}</p></KhiContentCard> : null}
    </>
  )

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
            ...(fileUrl ? [
              { label: DETAIL.openDoc, href: fileUrl, icon: IconExternal, external: true, primary: true },
            ] : []),
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

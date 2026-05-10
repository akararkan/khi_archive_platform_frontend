import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, ExternalLink } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ErrorState,
  PageContainer,
} from '@/components/public/PublicShared'
import {
  CategoryLinks,
  MediaHero,
  MetaPanel,
  MetaRow,
  PersonLink,
  PillRow,
  ProjectLink,
} from '@/components/public/PublicMediaDetailShared'
import { formatPublicDate } from '@/components/public/public-helpers'
import { guestTexts } from '@/services/guest'

function PublicTextDetailPage() {
  const { code } = useParams()
  const [text, setText] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError('')
    guestTexts
      .one(code, { signal: ctrl.signal })
      .then((d) => setText(d || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError('Could not load this text.')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [code])

  const breadcrumbs = useMemo(
    () => [
      { to: '/public', label: 'Home' },
      { to: '/public/texts', label: 'Texts' },
      { label: text?.titleEnglish || text?.titleOriginal || 'Untitled text' },
    ],
    [text],
  )

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-8 h-96 w-full rounded-2xl" />
      </PageContainer>
    )
  }
  if (error || !text) {
    return (
      <PageContainer>
        <ErrorState error={error || 'Text not found.'} />
      </PageContainer>
    )
  }

  const title = text.titleEnglish || text.titleOriginal || 'Untitled text'
  const original = text.titleOriginal && text.titleOriginal !== title ? text.titleOriginal : null
  const fileUrl = text.textFileUrl
  const isPdf = fileUrl && /\.pdf($|\?)/i.test(fileUrl)

  return (
    <>
      <MediaHero
        kind="Text"
        title={title}
        originalTitle={original}
        description={text.description || text.summary}
        breadcrumbs={breadcrumbs}
        action={
          fileUrl ? (
            <div className="flex flex-wrap gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants(), 'gap-1.5')}
              >
                <ExternalLink className="size-4" />
                Open document
              </a>
              <a
                href={fileUrl}
                download
                className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
              >
                <Download className="size-4" />
                Download
              </a>
            </div>
          ) : null
        }
      />
      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            {fileUrl && isPdf ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/5">
                <iframe
                  src={fileUrl}
                  title={title}
                  className="h-[80vh] w-full"
                  loading="lazy"
                />
              </div>
            ) : null}

            {text.summary ? (
              <Section title="Summary">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'anywhere' }}>
                  {text.summary}
                </p>
              </Section>
            ) : null}

            {text.bodyText ? (
              <Section title="Text">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'anywhere' }}>
                  {text.bodyText}
                </p>
              </Section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <MetaPanel title="Details">
              <MetaRow label="Document type">{text.documentType}</MetaRow>
              <MetaRow label="Author">{text.author}</MetaRow>
              <MetaRow label="Subject">{text.subject}</MetaRow>
              <MetaRow label="Genre">{text.genre}</MetaRow>
              <MetaRow label="Language">{text.language}</MetaRow>
              <MetaRow label="Dialect">{text.dialect}</MetaRow>
              <MetaRow label="Pages">{text.pageCount}</MetaRow>
              <MetaRow label="Date">{formatPublicDate(text.documentDate || text.recordedAt)}</MetaRow>
              <MetaRow label="Project">
                <ProjectLink project={text.project || { projectCode: text.projectCode, projectName: text.projectName }} />
              </MetaRow>
              <MetaRow label="Person">
                <PersonLink person={text.person} fallbackCode={text.personCode} fallbackName={text.personName} />
              </MetaRow>
              <MetaRow label="Categories">
                <CategoryLinks categories={text.categories} />
              </MetaRow>
              <MetaRow label="Subjects">
                <PillRow values={text.subjects} />
              </MetaRow>
            </MetaPanel>

            {(text.tags?.length || text.keywords?.length) ? (
              <MetaPanel title="Tags & keywords">
                <MetaRow label="Tags">
                  <PillRow values={text.tags} tone="primary" />
                </MetaRow>
                <MetaRow label="Keywords">
                  <PillRow values={text.keywords} />
                </MetaRow>
              </MetaPanel>
            ) : null}
          </aside>
        </div>
      </PageContainer>
    </>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export { PublicTextDetailPage }

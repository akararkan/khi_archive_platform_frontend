import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { VideoPlayer } from '@/components/ui/video-player'
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
import { guestVideos } from '@/services/guest'

function PublicVideoDetailPage() {
  const { code } = useParams()
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError('')
    guestVideos
      .one(code, { signal: ctrl.signal })
      .then((d) => setVideo(d || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError('Could not load this video.')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [code])

  const breadcrumbs = useMemo(
    () => [
      { to: '/public', label: 'Home' },
      { to: '/public/videos', label: 'Videos' },
      { label: video?.titleEnglish || video?.titleOriginal || 'Untitled video' },
    ],
    [video],
  )

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-8 aspect-video w-full rounded-2xl" />
      </PageContainer>
    )
  }
  if (error || !video) {
    return (
      <PageContainer>
        <ErrorState error={error || 'Video not found.'} />
      </PageContainer>
    )
  }

  const title = video.titleEnglish || video.titleOriginal || 'Untitled video'
  const original = video.titleOriginal && video.titleOriginal !== title ? video.titleOriginal : null

  return (
    <>
      <MediaHero
        kind="Video"
        title={title}
        originalTitle={original}
        description={video.description}
        breadcrumbs={breadcrumbs}
      />
      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            {video.videoFileUrl ? (
              <VideoPlayer
                src={video.videoFileUrl}
                title={title}
                subtitle={video.event || video.location || video.language || ''}
                downloadHref={video.videoFileUrl}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
                Video file not publicly available.
              </div>
            )}

            {video.description ? (
              <Section title="Description">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'anywhere' }}>
                  {video.description}
                </p>
              </Section>
            ) : null}

            {video.transcription ? (
              <Section title="Transcription">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'anywhere' }}>
                  {video.transcription}
                </p>
              </Section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <MetaPanel title="Details">
              <MetaRow label="Event">{video.event}</MetaRow>
              <MetaRow label="Location">{video.location}</MetaRow>
              <MetaRow label="Subject">{video.subject}</MetaRow>
              <MetaRow label="Genre">{video.genre}</MetaRow>
              <MetaRow label="Language">{video.language}</MetaRow>
              <MetaRow label="Dialect">{video.dialect}</MetaRow>
              <MetaRow label="Recorded">{formatPublicDate(video.recordedAt || video.recordingDate)}</MetaRow>
              <MetaRow label="Duration">
                {video.duration ? `${video.duration}s` : video.durationFormatted}
              </MetaRow>
              <MetaRow label="Project">
                <ProjectLink project={video.project || { projectCode: video.projectCode, projectName: video.projectName }} />
              </MetaRow>
              <MetaRow label="Person">
                <PersonLink person={video.person} fallbackCode={video.personCode} fallbackName={video.personName} />
              </MetaRow>
              <MetaRow label="Categories">
                <CategoryLinks categories={video.categories} />
              </MetaRow>
              <MetaRow label="Contributors">
                <PillRow values={video.contributors} />
              </MetaRow>
            </MetaPanel>

            {(video.tags?.length || video.keywords?.length) ? (
              <MetaPanel title="Tags & keywords">
                <MetaRow label="Tags">
                  <PillRow values={video.tags} tone="primary" />
                </MetaRow>
                <MetaRow label="Keywords">
                  <PillRow values={video.keywords} />
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

export { PublicVideoDetailPage }

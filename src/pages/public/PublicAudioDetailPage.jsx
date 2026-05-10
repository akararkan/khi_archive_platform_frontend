import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { AudioPlayer } from '@/components/ui/audio-player'
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
import { guestAudios } from '@/services/guest'

function PublicAudioDetailPage() {
  const { code } = useParams()
  const [audio, setAudio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError('')
    guestAudios
      .one(code, { signal: ctrl.signal })
      .then((d) => setAudio(d || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError('Could not load this audio.')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [code])

  const breadcrumbs = useMemo(
    () => [
      { to: '/public', label: 'Home' },
      { to: '/public/audios', label: 'Audios' },
      { label: audio?.titleEnglish || audio?.titleOriginal || 'Untitled audio' },
    ],
    [audio],
  )

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-8 h-32 w-full rounded-2xl" />
      </PageContainer>
    )
  }
  if (error || !audio) {
    return (
      <PageContainer>
        <ErrorState error={error || 'Audio not found.'} />
      </PageContainer>
    )
  }

  const title = audio.titleEnglish || audio.titleOriginal || 'Untitled audio'
  const original = audio.titleOriginal && audio.titleOriginal !== title ? audio.titleOriginal : null

  return (
    <>
      <MediaHero
        kind="Audio"
        title={title}
        originalTitle={original}
        description={audio.description}
        breadcrumbs={breadcrumbs}
      />
      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            {audio.audioFileUrl ? (
              <AudioPlayer
                src={audio.audioFileUrl}
                title={title}
                subtitle={audio.form || audio.language || ''}
                downloadHref={audio.audioFileUrl}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
                Audio file not publicly available.
              </div>
            )}

            {audio.description ? (
              <Section title="Description">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'anywhere' }}>
                  {audio.description}
                </p>
              </Section>
            ) : null}

            {audio.transcription ? (
              <Section title="Transcription">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'anywhere' }}>
                  {audio.transcription}
                </p>
              </Section>
            ) : null}

            {audio.lyrics ? (
              <Section title="Lyrics">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'anywhere' }}>
                  {audio.lyrics}
                </p>
              </Section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <MetaPanel title="Details">
              <MetaRow label="Form">{audio.form}</MetaRow>
              <MetaRow label="Language">{audio.language}</MetaRow>
              <MetaRow label="Dialect">{audio.dialect}</MetaRow>
              <MetaRow label="Type of basta">{audio.typeOfBasta}</MetaRow>
              <MetaRow label="Type of maqam">{audio.typeOfMaqam}</MetaRow>
              <MetaRow label="Genre">{audio.genre}</MetaRow>
              <MetaRow label="Recorded">{formatPublicDate(audio.recordedAt || audio.recordingDate)}</MetaRow>
              <MetaRow label="Duration">
                {audio.duration ? `${audio.duration}s` : audio.durationFormatted}
              </MetaRow>
              <MetaRow label="Project">
                <ProjectLink project={audio.project || { projectCode: audio.projectCode, projectName: audio.projectName }} />
              </MetaRow>
              <MetaRow label="Person">
                <PersonLink person={audio.person} fallbackCode={audio.personCode} fallbackName={audio.personName} />
              </MetaRow>
              <MetaRow label="Categories">
                <CategoryLinks categories={audio.categories} />
              </MetaRow>
              <MetaRow label="Subjects">
                <PillRow values={audio.subjects} />
              </MetaRow>
              <MetaRow label="Contributors">
                <PillRow values={audio.contributors} />
              </MetaRow>
            </MetaPanel>

            {(audio.tags?.length || audio.keywords?.length) ? (
              <MetaPanel title="Tags & keywords">
                <MetaRow label="Tags">
                  <PillRow values={audio.tags} tone="primary" />
                </MetaRow>
                <MetaRow label="Keywords">
                  <PillRow values={audio.keywords} />
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

export { PublicAudioDetailPage }

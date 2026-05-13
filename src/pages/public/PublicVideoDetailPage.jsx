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
  MetaPanelIf,
  MetaRow,
  PersonLink,
  PillRow,
  ProjectLink,
} from '@/components/public/PublicMediaDetailShared'
import { formatPublicDate, pickMediaTitle } from '@/components/public/public-helpers'
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
      { label: pickMediaTitle(video) || 'Untitled video' },
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

  const title = pickMediaTitle(video) || 'Untitled video'
  const originalCandidate =
    video.originalTitle ||
    video.titleOriginal ||
    video.titleInCentralKurdish ||
    video.centralKurdishTitle
  const original = originalCandidate && originalCandidate !== title ? originalCandidate : null

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
              <MetaRow
                label="Project"
                value={video.project?.projectCode || video.projectCode}
              >
                <ProjectLink project={video.project || { projectCode: video.projectCode, projectName: video.projectName }} />
              </MetaRow>
              <MetaRow
                label="Person"
                value={video.person?.personCode || video.personCode}
              >
                <PersonLink person={video.person} fallbackCode={video.personCode} fallbackName={video.personName} />
              </MetaRow>
              <MetaRow label="Categories" value={video.categories}>
                <CategoryLinks categories={video.categories} />
              </MetaRow>
              <MetaRow label="Recorded">{formatPublicDate(video.recordedAt || video.recordingDate)}</MetaRow>
              <MetaRow label="Duration" value={video.duration || video.durationFormatted}>
                {video.duration || video.durationFormatted}
              </MetaRow>
            </MetaPanel>

            <MetaPanelIf
              obj={video}
              title="Subject & form"
              keys={['event', 'location', 'subject', 'genre', 'personShownInVideo', 'colorOfVideo', 'whereThisVideoUsed']}
            >
              <MetaRow label="Event">{video.event}</MetaRow>
              <MetaRow label="Location">{video.location}</MetaRow>
              <MetaRow label="Subject" value={video.subject}>
                <PillRow values={video.subject} />
              </MetaRow>
              <MetaRow label="Genre" value={video.genre}>
                <PillRow values={video.genre} />
              </MetaRow>
              <MetaRow label="People shown">{video.personShownInVideo}</MetaRow>
              <MetaRow label="Color">{video.colorOfVideo}</MetaRow>
              <MetaRow label="Used in">{video.whereThisVideoUsed}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={video}
              title="Credits"
              keys={['creatorArtistDirector', 'producer', 'contributor', 'contributors', 'audience']}
            >
              <MetaRow label="Creator / Director">{video.creatorArtistDirector}</MetaRow>
              <MetaRow label="Producer">{video.producer}</MetaRow>
              <MetaRow label="Contributors" value={video.contributors || video.contributor}>
                <PillRow values={video.contributors || video.contributor} />
              </MetaRow>
              <MetaRow label="Audience">{video.audience}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={video}
              title="Language"
              keys={['language', 'dialect', 'subtitle']}
            >
              <MetaRow label="Language">{video.language}</MetaRow>
              <MetaRow label="Dialect">{video.dialect}</MetaRow>
              <MetaRow label="Subtitle">{video.subtitle}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={video}
              title="Dates"
              keys={['dateCreated', 'datePublished', 'dateModified']}
            >
              <MetaRow label="Created">{formatPublicDate(video.dateCreated)}</MetaRow>
              <MetaRow label="Published">{formatPublicDate(video.datePublished)}</MetaRow>
              <MetaRow label="Modified">{formatPublicDate(video.dateModified)}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={video}
              title="Technical"
              keys={['orientation', 'dimension', 'resolution', 'frameRate', 'bitDepth', 'overallBitRate', 'videoCodec', 'audioCodec', 'audioChannels', 'extension', 'fileSize', 'videoVersion']}
            >
              <MetaRow label="Orientation">{video.orientation}</MetaRow>
              <MetaRow label="Dimension">{video.dimension}</MetaRow>
              <MetaRow label="Resolution">{video.resolution}</MetaRow>
              <MetaRow label="Frame rate">{video.frameRate}</MetaRow>
              <MetaRow label="Bit depth">{video.bitDepth}</MetaRow>
              <MetaRow label="Bit rate">{video.overallBitRate}</MetaRow>
              <MetaRow label="Video codec">{video.videoCodec}</MetaRow>
              <MetaRow label="Audio codec">{video.audioCodec}</MetaRow>
              <MetaRow label="Audio channels">{video.audioChannels}</MetaRow>
              <MetaRow label="Extension">{video.extension}</MetaRow>
              <MetaRow label="File size">{video.fileSize}</MetaRow>
              <MetaRow label="Version">{video.videoVersion}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={video}
              title="Archive & provenance"
              keys={['videoStatus', 'archiveCataloging', 'provenance', 'accrualMethod', 'physicalLabel', 'locationInArchiveRoom', 'lccClassification']}
            >
              <MetaRow label="Status">{video.videoStatus}</MetaRow>
              <MetaRow label="Cataloging">{video.archiveCataloging}</MetaRow>
              <MetaRow label="Provenance">{video.provenance}</MetaRow>
              <MetaRow label="Accrual method">{video.accrualMethod}</MetaRow>
              <MetaRow label="Physical label">{video.physicalLabel}</MetaRow>
              <MetaRow label="Archive room">{video.locationInArchiveRoom}</MetaRow>
              <MetaRow label="LCC">{video.lccClassification}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={video}
              title="Rights"
              keys={['copyright', 'rightOwner', 'dateCopyrighted', 'availability', 'licenseType', 'usageRights', 'owner', 'publisher']}
            >
              <MetaRow label="Copyright">{video.copyright}</MetaRow>
              <MetaRow label="Right owner">{video.rightOwner}</MetaRow>
              <MetaRow label="Date copyrighted">{formatPublicDate(video.dateCopyrighted)}</MetaRow>
              <MetaRow label="Availability">{video.availability}</MetaRow>
              <MetaRow label="License">{video.licenseType}</MetaRow>
              <MetaRow label="Usage">{video.usageRights}</MetaRow>
              <MetaRow label="Owner">{video.owner}</MetaRow>
              <MetaRow label="Publisher">{video.publisher}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={video}
              title="Notes"
              keys={['note']}
            >
              <MetaRow label="Note">{video.note}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={video}
              title="Tags & keywords"
              keys={['tags', 'keywords']}
            >
              <MetaRow label="Tags" value={video.tags}>
                <PillRow values={video.tags} tone="primary" />
              </MetaRow>
              <MetaRow label="Keywords" value={video.keywords}>
                <PillRow values={video.keywords} />
              </MetaRow>
            </MetaPanelIf>
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

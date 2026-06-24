import React from 'react'
import useGuestFeed from '@/hooks/use-guest-feed'

function normalizeFeedCard(kind, item) {
  const cfg = {
    image: {
      code: item.imageCode || item.code,
      title: item.originalTitle || item.alternativeTitle || item.title || item.romanizedTitle,
      fileUrl: item.imageFileUrl || item.fileUrl,
    },
    audio: {
      code: item.audioCode || item.code,
      title: item.originalTitle || item.alterTitle || item.title || item.romanizedTitle,
      fileUrl: item.audioFileUrl || item.fileUrl,
    },
    video: {
      code: item.videoCode || item.code,
      title: item.originalTitle || item.alternativeTitle || item.title || item.romanizedTitle,
      fileUrl: item.videoFileUrl || item.fileUrl,
    },
    text: {
      code: item.textCode || item.code,
      title: item.originalTitle || item.alternativeTitle || item.title || item.romanizedTitle,
      fileUrl: item.textFileUrl || item.fileUrl,
    },
  }[kind]

  return { kind, ...cfg, item }
}

export default function GuestFeed({ filters = {}, mixed = false }) {
  const { data, loading, error } = useGuestFeed(filters)

  if (loading) return <div>Loading guest feed…</div>
  if (error) return <div>Error loading feed</div>
  if (!data) return null

  if (mixed) {
    const cards = [
      ...(data.images?.content ?? []).map((i) => normalizeFeedCard('image', i)),
      ...(data.audios?.content ?? []).map((i) => normalizeFeedCard('audio', i)),
      ...(data.videos?.content ?? []).map((i) => normalizeFeedCard('video', i)),
      ...(data.texts?.content ?? []).map((i) => normalizeFeedCard('text', i)),
    ]

    return (
      <div className="guest-mixed-grid">
        {cards.map((c) => (
          <article key={`${c.kind}:${c.code}`} className="guest-card">
            <h3>{c.title}</h3>
            <p>{c.kind}</p>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="guest-sections">
      {['images', 'audios', 'videos', 'texts'].map((sectionKey) => {
        const section = data[sectionKey]
        if (!section || !Array.isArray(section.content) || section.content.length === 0) return null
        const title = { images: 'Photos', audios: 'Sounds', videos: 'Videos', texts: 'Texts' }[sectionKey]
        return (
          <section key={sectionKey}>
            <h2>{title} ({section.totalElements ?? section.numberOfElements ?? 0})</h2>
            <div className="guest-grid">
              {section.content.map((item) => {
                const kind = (section.kind && section.kind.replace(/s$/, '')) || sectionKey.replace(/s$/, '')
                const c = normalizeFeedCard(kind, item)
                return (
                  <article key={c.code} className="guest-card">
                    <h3>{c.title}</h3>
                    <p>{kind}</p>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

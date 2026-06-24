// Small wrapper to build friendly `filters` and call the existing `guestFeed`
// service which already handles repeated params serialization.
import { guestFeed } from '@/services/guest'

export async function fetchGuestFeed(filters = {}) {
  const {
    page = 0,
    size = 50,
    q,
    projectCode,
    categoryCode,
    personCode,
    language,
    dialect,
    region,
    dateFrom,
    dateTo,
    sortBy,
    sortDirection,
    types,
    subjects,
    genres,
    tags,
    keywords,
    signal,
  } = filters

  const params = { page, size }

  if (q) params.q = q
  if (projectCode) params.projectCode = projectCode
  if (categoryCode) params.categoryCode = categoryCode
  if (personCode) params.personCode = personCode
  if (language) params.language = language
  if (dialect) params.dialect = dialect
  if (region) params.region = region
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo
  if (sortBy) params.sortBy = sortBy
  if (sortDirection) params.sortDirection = sortDirection

  if (types != null) {
    params.types = Array.isArray(types) ? types : String(types).split(',').filter(Boolean)
  }

  if (subjects != null) params.subject = Array.isArray(subjects) ? subjects : String(subjects).split(',').filter(Boolean)
  if (genres != null) params.genre = Array.isArray(genres) ? genres : String(genres).split(',').filter(Boolean)
  if (tags != null) params.tag = Array.isArray(tags) ? tags : String(tags).split(',').filter(Boolean)
  if (keywords != null) params.keyword = Array.isArray(keywords) ? keywords : String(keywords).split(',').filter(Boolean)

  return guestFeed({ ...params, signal })
}

export default fetchGuestFeed

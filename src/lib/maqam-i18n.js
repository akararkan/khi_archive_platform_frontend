// Kurdish (Sorani / Central Kurdish, RTL) strings for the TEACHER workspace.
//
// All teacher-facing copy lives here so the dialect/script is a one-file swap.
// To switch to Kurmanji (Latin) later, replace the `ku` values below — no
// component changes required. Western digits are kept for codes/times so they
// line up with the Latin maqam codes (MAQAM_000001) shown alongside.

export const ku = {
  // Brand / layout
  brand: 'ئەرشیفی KHI',
  workspace: 'شوێنی کاری مامۆستا',
  signOut: 'چوونەدەرەوە',
  myProfile: 'پرۆفایلی من',
  navMaqam: 'مقامەکان',

  // List page
  listTitle: 'مقامەکانی تۆ',
  listSubtitle: 'ئەو تۆمارانەی بۆ پۆلێنکردن پێت سپێردراون. گوێ بگرە و جۆری مقام دیاری بکە.',
  searchPlaceholder: 'گەڕان بەپێی ناوی گۆرانی یان گۆرانیبێژ…',
  refresh: 'نوێکردنەوە',
  loading: 'بارکردن…',
  emptyTitle: 'هیچ تۆمارێکت پێ نەسپێردراوە',
  emptyDescription: 'تا ئێستا هیچ مقامێک بۆ پۆلێنکردن پێت نەسپێردراوە. دواتر سەردانی ئێرە بکەرەوە.',
  errorLoad: 'نەتوانرا تۆمارەکان باربکرێن.',
  retry: 'دووبارە هەوڵبدەرەوە',

  // Record card / status
  byProducer: 'گۆرانیبێژ',
  voted: 'دەنگت دا',
  notVoted: 'هێشتا دەنگت نەداوە',
  open: 'کردنەوە',
  records: 'تۆمار',

  // Detail page
  back: 'گەڕانەوە',
  detailListenTitle: 'گوێگرتن لە دەنگ',
  detailListenHint: 'کاتی گوێگرتنت بە شێوەی ئۆتۆماتیکی تۆمار دەکرێت.',
  audioUnavailable: 'دەنگ بەردەست نییە.',
  audioLoading: 'بارکردنی دەنگ…',
  audioError: 'نەتوانرا دەنگ باربکرێت. دووبارە هەوڵبدەرەوە.',
  archiveNote: 'تێبینی ئەرشیف',

  // Vote form
  voteTitle: 'پۆلێنکردنی مقام',
  voteSubtitle: 'جۆری مقام بنووسە و ئەگەر بتەوێت تێبینیەک زیاد بکە.',
  maqamTypeLabel: 'جۆری مقام',
  maqamTypePlaceholder: 'بۆ نموونە: حوسێنی، بەیات، نەهاوەند…',
  teacherNoteLabel: 'تێبینی (ئارەزوومەندانە)',
  teacherNotePlaceholder: 'هەر تێبینیەک سەبارەت بەم تۆمارە…',
  submitVote: 'ناردنی دەنگ',
  updateVote: 'نوێکردنەوەی دەنگ',
  saving: 'پاشەکەوتکردن…',
  voteRequired: 'تکایە جۆری مقام بنووسە.',
  voteSavedTitle: 'دەنگەکەت تۆمارکرا',
  voteSavedDesc: 'سوپاس بۆ پۆلێنکردنت.',
  voteUpdatedTitle: 'دەنگەکەت نوێکرایەوە',
  yourVote: 'دەنگی تۆ',
  yourVoteHint: 'دەتوانیت دەنگی خۆت بنێریت یان بیگۆڕیت.',

  // Review console (single-page table + auto-detail)
  consoleSubtitle:
    'یەک تۆمار بە وردەکاری تەواو نیشان دەدرێت. گوێ بگرە، دەنگ و تێبینی مامۆستایانی تر ببینە، و بە دوگمەی «داهاتوو» بڕۆ بۆ تۆماری دواتر.',
  next: 'داهاتوو',
  previous: 'پێشوو',
  of: 'لە',
  detailsLoading: 'بارکردنی وردەکاری…',
  otherTeachersTitle: 'دەنگی مامۆستایانی تر',
  otherTeachersHint: 'تەنها بۆ بینین — ناتوانیت بیانگۆڕیت',
  othersNoVote: 'هێشتا دەنگی نەداوە',
  noOtherVotes: 'هیچ مامۆستایەکی تر لەسەر ئەم تۆمارە نییە.',

  // Records table
  tableTitle: 'لیستی تۆمارەکان',
  tableHint: 'کرتە لەسەر هەر تۆمارێک بکە بۆ بینینی لە سەرەوە.',
  nowViewing: 'ئێستا',
  colNo: '#',
  colSong: 'گۆرانی',
  colProducer: 'گۆرانیبێژ',
  colCode: 'کۆد',
  colDuration: 'ماوە',
  colStatus: 'دۆخی تۆ',
  colPanel: 'دەنگی پۆل',

  // Engagement
  engagementTitle: 'کاتی گوێگرتنت',
  totalListen: 'کۆی کاتی گوێگرتن',
  furthestPoint: 'دوورترین خاڵ',
  sessionCount: 'ژمارەی دانیشتن',
  coverage: 'ڕێژەی گوێگرتن',
  lastListen: 'دوایین گوێگرتن',
  noEngagement: 'هێشتا گوێت لەم تۆمارە نەگرتووە.',

  // Errors / generic
  genericError: 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.',
  notFound: 'ئەم تۆمارە نەدۆزرایەوە.',
}

// Format a duration (seconds) into a Sorani Kurdish label, e.g.
// "3 خولەک و 20 چرکە" or "1 کاتژمێر و 5 خولەک".
export function formatKuDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  if (s === 0) return '0 چرکە'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts = []
  if (h > 0) parts.push(`${h} کاتژمێر`)
  if (m > 0) parts.push(`${m} خولەک`)
  if (sec > 0 && h === 0) parts.push(`${sec} چرکە`)
  return parts.join(' و ') || '0 چرکە'
}

// Format an ISO timestamp for the Kurdish UI. Uses the ku-Arab locale when the
// runtime supports it, falling back to a plain readable string otherwise.
export function formatKuDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ckb', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    try {
      return new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return String(value)
    }
  }
}

// A handful of common maqam names offered as quick-pick chips in the vote form.
export const COMMON_MAQAM_TYPES = [
  'حوسێنی',
  'بەیات',
  'نەهاوەند',
  'ڕاست',
  'سەگاە',
  'چارگاە',
  'کوردی',
  'عەجەم',
  'حیجاز',
  'سابا',
]

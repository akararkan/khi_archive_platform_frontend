const videoFieldsMetadata = {
  // ── Identification ────────────────────────────────────────────────
  videoVersion: {
    title: 'وەشانی ڤیدیۆ',
    description: 'RAW بۆ ڕۆکۆردی سەرەتایی و MASTER بۆ وەشانی کۆتایی و باشترکراو.',
  },
  versionNumber: {
    title: 'ژمارەی وەشان',
    description: 'ژمارەی وەشانی ئەم تۆمارە (وەک: 1، 2، …).',
  },
  copyNumber: {
    title: 'ژمارەی کۆپی',
    description: 'ئەگەر چەند کۆپی لە هەمان وەشان هەبێت، ژمارەکەی بنووسە.',
  },

  // ── Titles ────────────────────────────────────────────────────────
  fileName: {
    title: 'ناوی فایل',
    description: 'ناوی فایلی ڤیدیۆ وەک خۆی لە سیستەمی ئەرشیف.',
  },
  originalTitle: {
    title: 'ناوی ڕەسەن',
    description: 'ناونیشانی ڕەسەنی ڤیدیۆ بەو زمان و خەتە سەرەکیە کە نووسراوە.',
  },
  alternativeTitle: {
    title: 'ناوی دیکە',
    description: 'هەر ناوێکی تری ناسراو بۆ ڤیدیۆکە.',
  },
  titleInCentralKurdish: {
    title: 'ناوی سۆرانی',
    description: 'وەرگێڕان یان نووسینی ناونیشان بە کوردیی ناوەڕاست (سۆرانی).',
  },
  romanizedTitle: {
    title: 'ناوی لاتینی',
    description: 'شێوازی نووسینی ناو بە پیتی لاتینی بۆ گەڕان.',
  },

  // ── Description ──────────────────────────────────────────────────
  description: {
    title: 'وەسف',
    description: 'وەسفێکی تەواو لە ناوەڕۆکی ڤیدیۆ، باکگراوەند، و زانیارییە گرنگەکان.',
  },

  // ── Subject & form ───────────────────────────────────────────────
  event: {
    title: 'بۆنە',
    description: 'بۆنە یان ڕووداوی تۆمارکراو لە ڤیدیۆ (وەک کۆڕ، فێستیڤاڵ، …).',
  },
  location: {
    title: 'شوێن',
    description: 'شوێنی تۆمارکردنی ڤیدیۆ.',
  },
  subject: {
    title: 'بابەت',
    description: 'بابەتی سەرەکی ڤیدیۆ. زیاتر لە یەک بابەت دەکرێت زیاد بکرێت.',
  },
  personShownInVideo: {
    title: 'کەسانی دیار',
    description: 'ناوی هەموو ئەو کەسانەی کە لە ڤیدیۆدا دەردەکەون.',
  },
  colorOfVideo: {
    title: 'ڕەنگی ڤیدیۆ',
    description: 'ڕەنگاوڕەنگ یاخوود ڕەش و سپی.',
  },
  whereThisVideoUsed: {
    title: 'لە کوێ بەکارهاتووە',
    description: 'ئەگەر پێشتر بەکارهاتبێت، شوێنی بەکارهێنانی (تیڤی، فیلم، یوتیوب، …).',
  },

  // ── Credits ───────────────────────────────────────────────────────
  creatorArtistDirector: {
    title: 'دروستکار / دەرهێنەر',
    description: 'ناوی کەسی سەرەکی کە ڤیدیۆکەی دروست کردووە یان دەرهێناوە.',
  },
  producer: {
    title: 'بەرهەمهێنەر',
    description: 'ناوی بەرهەمهێنەر یان کۆمپانیای بەرهەمهێنان.',
  },
  contributor: {
    title: 'بەشدار',
    description: 'ناوی هەموو بەشدارانی تر لە ئامادەکردنی ڤیدیۆ.',
  },
  audience: {
    title: 'گرووپی ئاماژەکراو',
    description: 'گرووپی خوازراوی بینەران (نموونە: گشتی، منداڵان، توێژەرەوان).',
  },

  // ── Language ──────────────────────────────────────────────────────
  language: {
    title: 'زمان',
    description: 'زمانی سەرەکی ڤیدیۆ.',
  },
  dialect: {
    title: 'زاراوە',
    description: 'زاراوەی زمانەکە (نموونە: سۆرانی، بادینی، هەورامی، …).',
  },
  subtitle: {
    title: 'ژێرنووس',
    description: 'زمانەکانی ژێرنووس کە بەردەستن لەگەڵ ڤیدیۆ.',
  },

  // ── Technical ─────────────────────────────────────────────────────
  orientation: {
    title: 'ئاراستە',
    description: 'ئاراستەی ڤیدیۆ: ستوونی (Portrait) یان دەستی (Landscape).',
  },
  dimension: {
    title: 'قەبارە',
    description: 'قەبارەی ڤیدیۆ بە پیکسێل (نموونە: 1920×1080).',
  },
  resolution: {
    title: 'ڕیزۆڵووشن',
    description: 'ڕیزۆڵووشنی ڤیدیۆ (نموونە: HD، Full HD، 4K).',
  },
  duration: {
    title: 'ماوە',
    description: 'ماوەی تەواوی ڤیدیۆ بە کاتژمێر:خولەک:چرکە.',
  },
  frameRate: {
    title: 'فرەیم ڕەیت',
    description: 'ژمارەی فرەیم لە چرکەدا (نموونە: 24fps، 30fps، 60fps).',
  },
  bitDepth: {
    title: 'بیت دێپت',
    description: 'قووڵی بیت لە هەر پیکسێل بۆ ڕەنگ (نموونە: 8-bit، 10-bit).',
  },
  overallBitRate: {
    title: 'بیت ڕەیتی گشتی',
    description: 'ڕێژەی گشتی بیت بە میگابیت لە چرکەدا (Mbps).',
  },
  videoCodec: {
    title: 'کۆدێکی ڤیدیۆ',
    description: 'کۆدێکی پەستاندنی ڤیدیۆ (نموونە: H.264، H.265، VP9).',
  },
  audioCodec: {
    title: 'کۆدێکی دەنگ',
    description: 'کۆدێکی پەستاندنی دەنگ (نموونە: AAC، MP3، Opus).',
  },
  audioChannels: {
    title: 'چەناڵی دەنگ',
    description: 'ژمارەی چەناڵی دەنگ (Mono، Stereo، 5.1، …).',
  },
  extension: {
    title: 'پاشگری فایل',
    description: 'پاشگری فایلی ڤیدیۆ (نموونە: mp4، mov، mkv).',
  },
  fileSize: {
    title: 'قەبارەی فایل',
    description: 'قەبارەی گشتی فایلی ڤیدیۆ.',
  },

  // ── Tags & keywords ──────────────────────────────────────────────
  videoTags: {
    title: 'تاگەکان',
    description: 'تاگەکان بۆ گرووپکردن و پاڵاوتنی خێرا. بە کۆما (,) جیا بکەرەوە.',
  },
  videoKeywords: {
    title: 'وشە کلیلەکان',
    description: 'وشە سەرەکییەکان بۆ باشترکردنی گەڕان.',
  },

  // ── Dates ─────────────────────────────────────────────────────────
  dateCreated: {
    title: 'بەرواری دروستکردن',
    description: 'ڕۆژی سەرەتایی دروستکردنی ڤیدیۆکە.',
  },
  datePublished: {
    title: 'بەرواری بڵاوکردنەوە',
    description: 'ڕۆژی بڵاوکردنەوەی فەرمی، ئەگەر هەبێت.',
  },
  dateModified: {
    title: 'بەرواری گۆڕانکاری',
    description: 'دوایین جار کە ڤیدیۆ یان زانیارییەکانی گۆڕاون.',
  },

  // ── Storage ──────────────────────────────────────────────────────
  volumeName: {
    title: 'فۆڵدەری سەرەکی',
    description: 'ناوی فۆڵدەری گەورە یان درایڤ کە لێی هاتووە. خۆکارانە لە "بڕۆ بۆ فۆڵدەر"ـەوە دەخوێنرێتەوە.',
  },
  directory: {
    title: 'دایرێکتۆری',
    description: 'فۆڵدەری دایک کە فایلی ڤیدیۆ تێیدایە.',
  },
  pathInExternalVolume: {
    title: 'ڕێگای دەرەکی',
    description: 'ڕێگای تەواوی فایل لە سەرچاوەی دەرەکی.',
  },
  autoPath: {
    title: 'ڕێگای خۆکار',
    description: 'ڕێگای ئۆتۆماتیکی فایل. خۆکارانە لە فایلی هەڵبژێردراوەوە دەخوێنرێتەوە.',
  },

  // ── Archive & provenance ─────────────────────────────────────────
  videoStatus: {
    title: 'باری ڤیدیۆ',
    description: 'باری ئێستای ڤیدیۆ لە ئەرشیف (نموونە: ئامادە، لە چاوەڕوانیدا، گۆڕانکاری دەوێت).',
  },
  archiveCataloging: {
    title: 'پۆلێنکردنی ئەرشیف',
    description: 'باری پۆلێنکردنی ڤیدیۆ لە ناو سیستەمی ئەرشیف.',
  },
  provenance: {
    title: 'سەرچاوە',
    description: 'مێژووی سەرچاوەی ڤیدیۆ — لەکوێوە و چۆن گەشتووەتە ئەرشیف.',
  },
  accrualMethod: {
    title: 'شێوازی وەرگرتن',
    description: 'چۆن ڤیدیۆکە گەیشتووە بە ئەرشیف (وەک: دیاری، کڕین، گواستنەوە).',
  },

  // ── Physical archive ─────────────────────────────────────────────
  physicalAvailability: {
    title: 'بەردەستی کۆپی فیزیکی',
    description: 'ئەگەر کۆپی فیزیکی (وەک VHS، فیلم، DVD) لە ئەرشیفدا هەبێت ئەمە چالاک بکە.',
  },
  physicalLabel: {
    title: 'لەیبڵی فیزیکی',
    description: 'هەر لەیبڵ یان ناسنامەیەک کە لەسەر کۆپی فیزیکیەکە نووسراوە.',
  },
  locationInArchiveRoom: {
    title: 'شوێن لە ژووری ئەرشیف',
    description: 'شوێنی پاراستن لە ژووری ئەرشیف (شیلف، قوتوو، …).',
  },
  lccClassification: {
    title: 'پۆلێنی LCC',
    description: 'پۆلێنی کتێبخانەی کۆنگرێسی ئەمریکا.',
  },
  note: {
    title: 'تێبینی',
    description: 'تێبینی ناوخۆیی ئەرشیف کە بۆ گشتی نیشان نادرێت.',
  },

  // ── Rights ────────────────────────────────────────────────────────
  copyright: {
    title: 'مافی چاپ',
    description: 'بەیانی مافی چاپ.',
  },
  rightOwner: {
    title: 'خاوەنی ماف',
    description: 'ناوی کەس یان دامەزراوەی خاوەنی مافی یاسایی.',
  },
  dateCopyrighted: {
    title: 'بەرواری مافی چاپ',
    description: 'ساڵی تۆمارکردنی مافی چاپ.',
  },
  availability: {
    title: 'بەردەستبوون',
    description: 'باری بەردەستبوون بۆ بەکارهێنان (نموونە: گشتی، تایبەت، سنوردار).',
  },
  licenseType: {
    title: 'جۆری مۆڵەت',
    description: 'جۆری مۆڵەتی بەکارهێنان.',
  },
  usageRights: {
    title: 'مافی بەکارهێنان',
    description: 'ڕێنماییەکانی بەکارهێنان.',
  },
  owner: {
    title: 'خاوەن',
    description: 'ناوی خاوەنی فیزیکی یان یاسایی ڤیدیۆ.',
  },
  publisher: {
    title: 'بڵاوکەرەوە',
    description: 'دامەزراوە یان کۆمپانیای بڵاوکەرەوەی فەرمی.',
  },
}

function getVideoFieldMetadata(fieldKey) {
  return videoFieldsMetadata[fieldKey] || null
}

export { videoFieldsMetadata, getVideoFieldMetadata }

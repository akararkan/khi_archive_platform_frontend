const imageFieldsMetadata = {
  // ── Identification ────────────────────────────────────────────────
  imageVersion: {
    title: 'وەشانی وێنە',
    description: 'RAW بۆ وێنەی سەرەتایی و MASTER بۆ وەشانی کۆتایی و باشترکراو.',
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
    description: 'ناوی فایلی وێنە وەک خۆی لە سیستەمی ئەرشیف.',
  },
  originalTitle: {
    title: 'ناوی ڕەسەن',
    description: 'ناونیشانی ڕەسەنی وێنە بەو زمان و خەتە سەرەکیە کە نووسراوە.',
  },
  alternativeTitle: {
    title: 'ناوی دیکە',
    description: 'هەر ناوێکی تری ناسراو بۆ وێنەکە.',
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
    description: 'وەسفێکی تەواو لە ناوەڕۆکی وێنە، باکگراوەند، و زانیارییە گرنگەکان.',
  },

  // ── Subject & form ───────────────────────────────────────────────
  event: {
    title: 'بۆنە',
    description: 'بۆنە یان ڕووداوی کاتی گرتنی وێنە.',
  },
  location: {
    title: 'شوێن',
    description: 'شوێنی گرتنی وێنە.',
  },
  subject: {
    title: 'بابەت',
    description: 'بابەتی سەرەکی وێنە.',
  },
  form: {
    title: 'فۆرم',
    description: 'فۆرمی وێنە (نموونە: پۆرتڕێت، چێژگەلانی، بۆنە، دۆکیومێنتاری، …).',
  },
  personShownInImage: {
    title: 'کەسانی دیار',
    description: 'ناوی هەموو ئەو کەسانەی کە لە وێنەدا دەردەکەون.',
  },
  colorOfImage: {
    title: 'ڕەنگ',
    description: 'وێنە ڕەنگاوڕەنگە یاخوود ڕەش و سپی.',
  },
  whereThisImageUsed: {
    title: 'لە کوێ بەکارهاتووە',
    description: 'ئەگەر پێشتر بڵاوکراوەتەوە، شوێنی بەکارهێنانی (کتێب، گۆڤار، …).',
  },

  // ── Camera ────────────────────────────────────────────────────────
  manufacturer: {
    title: 'دروستکەری کامێرا',
    description: 'کۆمپانیای دروستکەری کامێرا (نموونە: Nikon، Canon، Sony).',
  },
  model: {
    title: 'مۆدێل',
    description: 'مۆدێلی کامێرا (نموونە: D850، 5D Mark IV).',
  },
  lens: {
    title: 'لێنز',
    description: 'لێنزی بەکارهاتوو لە کاتی گرتنی وێنە.',
  },

  // ── Credits ───────────────────────────────────────────────────────
  creatorArtistPhotographer: {
    title: 'وێنەگر / هونەرمەند',
    description: 'ناوی کەس کە وێنەکەی گرتووە یان دروستی کردووە.',
  },
  contributor: {
    title: 'بەشدار',
    description: 'ناوی هەموو بەشدارانی تر.',
  },
  audience: {
    title: 'گرووپی ئاماژەکراو',
    description: 'گرووپی خوازراوی بینەران.',
  },

  // ── Technical ─────────────────────────────────────────────────────
  orientation: {
    title: 'ئاراستە',
    description: 'ئاراستەی وێنە: ستوونی (Portrait) یان دەستی (Landscape).',
  },
  dimension: {
    title: 'قەبارە',
    description: 'قەبارەی وێنە بە پیکسێل (نموونە: 4032×3024).',
  },
  dpi: {
    title: 'DPI',
    description: 'ژمارەی خاڵ لە هەر ئینچ — کوالێتی چاپکردن دیاری دەکات.',
  },
  bitDepth: {
    title: 'بیت دێپت',
    description: 'قووڵی بیت لە هەر پیکسێل (نموونە: 8-bit، 16-bit).',
  },
  extension: {
    title: 'پاشگری فایل',
    description: 'پاشگری فایلی وێنە (نموونە: jpg، png، tiff، raw).',
  },
  fileSize: {
    title: 'قەبارەی فایل',
    description: 'قەبارەی گشتی فایلی وێنە.',
  },

  // ── Tags & keywords ──────────────────────────────────────────────
  tags: {
    title: 'تاگەکان',
    description: 'تاگەکان بۆ گرووپکردن و پاڵاوتنی خێرا. بە کۆما (,) جیا بکەرەوە.',
  },
  keywords: {
    title: 'وشە کلیلەکان',
    description: 'وشە سەرەکییەکان بۆ باشترکردنی گەڕان.',
  },

  // ── Dates ─────────────────────────────────────────────────────────
  dateCreated: {
    title: 'بەرواری دروستکردن',
    description: 'ڕۆژی گرتنی وێنە.',
  },
  datePublished: {
    title: 'بەرواری بڵاوکردنەوە',
    description: 'ڕۆژی بڵاوکردنەوەی فەرمی.',
  },
  dateModified: {
    title: 'بەرواری گۆڕانکاری',
    description: 'دوایین جار کە وێنە یان زانیارییەکانی گۆڕاون.',
  },

  // ── Storage ──────────────────────────────────────────────────────
  volumeName: {
    title: 'فۆڵدەری سەرەکی',
    description: 'ناوی فۆڵدەری گەورە. خۆکارانە لە "بڕۆ بۆ فۆڵدەر"ـەوە دەخوێنرێتەوە.',
  },
  directory: {
    title: 'دایرێکتۆری',
    description: 'فۆڵدەری دایک کە فایلی وێنە تێیدایە.',
  },
  pathInExternalVolume: {
    title: 'ڕێگای دەرەکی',
    description: 'ڕێگای تەواوی فایل لە سەرچاوەی دەرەکی.',
  },
  autoPath: {
    title: 'ڕێگای خۆکار',
    description: 'ڕێگای ئۆتۆماتیکی فایل. خۆکارانە دەخوێنرێتەوە.',
  },

  // ── Archive & provenance ─────────────────────────────────────────
  imageStatus: {
    title: 'باری وێنە',
    description: 'باری ئێستای وێنە لە ئەرشیف.',
  },
  archiveCataloging: {
    title: 'پۆلێنکردنی ئەرشیف',
    description: 'باری پۆلێنکردن لە سیستەمی ئەرشیف.',
  },
  provenance: {
    title: 'سەرچاوە',
    description: 'مێژووی سەرچاوەی وێنە.',
  },
  accrualMethod: {
    title: 'شێوازی وەرگرتن',
    description: 'چۆن وێنە گەیشتووە بە ئەرشیف (وەک: دیاری، کڕین، گواستنەوە).',
  },
  photostory: {
    title: 'چیرۆکی وێنە',
    description: 'چیرۆک یان زانیاری بنبڕەوەی کە وێنە دەگێڕێتەوە.',
  },

  // ── Physical archive ─────────────────────────────────────────────
  physicalAvailability: {
    title: 'بەردەستی کۆپی فیزیکی',
    description: 'ئەگەر کۆپی فیزیکی (وەک چاپکراو، نیگاتیڤ) لە ئەرشیفدا هەبێت.',
  },
  physicalLabel: {
    title: 'لەیبڵی فیزیکی',
    description: 'لەیبڵ یان ناسنامەی لەسەر کۆپی فیزیکی.',
  },
  locationInArchiveRoom: {
    title: 'شوێن لە ژووری ئەرشیف',
    description: 'شوێنی پاراستن لە ژووری ئەرشیف.',
  },
  lccClassification: {
    title: 'پۆلێنی LCC',
    description: 'پۆلێنی کتێبخانەی کۆنگرێسی ئەمریکا.',
  },
  note: {
    title: 'تێبینی',
    description: 'تێبینی ناوخۆیی ئەرشیف.',
  },

  // ── Rights ────────────────────────────────────────────────────────
  copyright: {
    title: 'مافی چاپ',
    description: 'بەیانی مافی چاپ.',
  },
  rightOwner: {
    title: 'خاوەنی ماف',
    description: 'ناوی خاوەنی مافی یاسایی.',
  },
  dateCopyrighted: {
    title: 'بەرواری مافی چاپ',
    description: 'ساڵی تۆمارکردنی مافی چاپ.',
  },
  availability: {
    title: 'بەردەستبوون',
    description: 'باری بەردەستبوون.',
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
    description: 'ناوی خاوەنی فیزیکی یان یاسایی.',
  },
  publisher: {
    title: 'بڵاوکەرەوە',
    description: 'دامەزراوەی بڵاوکەرەوەی فەرمی.',
  },
}

function getImageFieldMetadata(fieldKey) {
  return imageFieldsMetadata[fieldKey] || null
}

export { imageFieldsMetadata, getImageFieldMetadata }

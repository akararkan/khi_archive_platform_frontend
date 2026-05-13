const textFieldsMetadata = {
  // ── Identification ────────────────────────────────────────────────
  textVersion: {
    title: 'وەشانی دەق',
    description: 'RAW بۆ وەشانی سەرەتایی و MASTER بۆ وەشانی کۆتایی.',
  },
  versionNumber: {
    title: 'ژمارەی وەشان',
    description: 'ژمارەی وەشانی ئەم تۆمارە (وەک: 1، 2، …).',
  },
  copyNumber: {
    title: 'ژمارەی کۆپی',
    description: 'ئەگەر چەند کۆپی لە هەمان وەشان هەبێت.',
  },

  // ── Titles ────────────────────────────────────────────────────────
  fileName: {
    title: 'ناوی فایل',
    description: 'ناوی فایلی دەق وەک خۆی.',
  },
  originalTitle: {
    title: 'ناوی ڕەسەن',
    description: 'ناونیشانی ڕەسەنی دەق بەو زمان و خەتە سەرەکیە کە نووسراوە.',
  },
  alternativeTitle: {
    title: 'ناوی دیکە',
    description: 'هەر ناوێکی تری ناسراو بۆ دەقەکە.',
  },
  titleInCentralKurdish: {
    title: 'ناوی سۆرانی',
    description: 'وەرگێڕان یان نووسینی ناونیشان بە کوردیی ناوەڕاست.',
  },
  romanizedTitle: {
    title: 'ناوی لاتینی',
    description: 'شێوازی نووسینی ناو بە پیتی لاتینی.',
  },

  // ── Description ──────────────────────────────────────────────────
  description: {
    title: 'وەسف',
    description: 'وەسفێکی تەواو لە ناوەڕۆکی دەق.',
  },

  // ── Document ──────────────────────────────────────────────────────
  documentType: {
    title: 'جۆری دۆکیومێنت',
    description: 'جۆری دەق (وەک: کتێب، گۆڤار، نامە، شیعر، …).',
  },
  subject: {
    title: 'بابەت',
    description: 'بابەتی سەرەکی دەقەکە.',
  },
  script: {
    title: 'خەت / ئەلفبە',
    description: 'خەتی نووسین (نموونە: عەرەبی، لاتینی، یاخوود کوردی).',
  },
  isbn: {
    title: 'ISBN',
    description: 'ژمارەی نێودەوڵەتی کتێب، ئەگەر هەبێت.',
  },
  assignmentNumber: {
    title: 'ژمارەی تۆمار',
    description: 'ژمارەی ناوخۆیی ئەرشیف بۆ دەقەکە.',
  },
  edition: {
    title: 'چاپ',
    description: 'ژمارەی چاپی دەقەکە (نموونە: چاپی یەکەم، دووەم، …).',
  },
  volume: {
    title: 'بەرگ',
    description: 'بەرگی دەقەکە لە چەند بەرگییەکاندا.',
  },
  series: {
    title: 'زنجیرە',
    description: 'ناوی زنجیرە یان کۆلێکشن، ئەگەر بەشێک بێت لە کاری گەورەتر.',
  },
  transcription: {
    title: 'تەرجەمە / دەستنووس',
    description: 'دەستنووسی دەق ئەگەر بڵاوکراوەی پێشتر بوو.',
  },

  // ── Language ──────────────────────────────────────────────────────
  language: {
    title: 'زمان',
    description: 'زمانی سەرەکی دەقەکە.',
  },
  dialect: {
    title: 'زاراوە',
    description: 'زاراوەی زمانەکە (سۆرانی، بادینی، هەورامی، …).',
  },

  // ── Credits ───────────────────────────────────────────────────────
  author: {
    title: 'نووسەر',
    description: 'ناوی نووسەری دەقەکە.',
  },
  contributors: {
    title: 'بەشدارەکان',
    description: 'هەموو ئەو کەسانەی بەشدارن لە دروستکردن (وەرگێڕ، ئامادەکار، …).',
  },
  printingHouse: {
    title: 'چاپخانە',
    description: 'ناوی چاپخانە کە دەقەکەی چاپ کردووە.',
  },
  audience: {
    title: 'گرووپی ئاماژەکراو',
    description: 'گرووپی خوازراوی خوێنەران.',
  },

  // ── Physical / technical ─────────────────────────────────────────
  pageCount: {
    title: 'ژمارەی لاپەڕە',
    description: 'ژمارەی گشتی لاپەڕەکانی دەق.',
  },
  orientation: {
    title: 'ئاراستە',
    description: 'ئاراستەی لاپەڕە (ستوونی یان دەستی).',
  },
  size: {
    title: 'قەبارە',
    description: 'قەبارەی فیزیکی (وەک: A4، A5، …).',
  },
  physicalDimensions: {
    title: 'قەبارەی فیزیکی',
    description: 'پانی و درێژی فیزیکی بە سانتیمەتر.',
  },
  extension: {
    title: 'پاشگری فایل',
    description: 'پاشگری فایل (نموونە: pdf، docx، txt).',
  },
  fileSize: {
    title: 'قەبارەی فایل',
    description: 'قەبارەی گشتی فایلەکە.',
  },

  // ── Tags & keywords ──────────────────────────────────────────────
  tags: {
    title: 'تاگەکان',
    description: 'تاگەکان بۆ گرووپکردن. بە کۆما (,) جیا بکەرەوە.',
  },
  keywords: {
    title: 'وشە کلیلەکان',
    description: 'وشە سەرەکییەکان بۆ گەڕان.',
  },

  // ── Dates ─────────────────────────────────────────────────────────
  dateCreated: {
    title: 'بەرواری دروستکردن',
    description: 'ڕۆژی نووسینی سەرەتایی دەقەکە.',
  },
  printDate: {
    title: 'بەرواری چاپ',
    description: 'ڕۆژی چاپکردنی فیزیکی.',
  },
  datePublished: {
    title: 'بەرواری بڵاوکردنەوە',
    description: 'ڕۆژی بڵاوکردنەوەی فەرمی.',
  },
  dateModified: {
    title: 'بەرواری گۆڕانکاری',
    description: 'دوایین جار کە دەق یان زانیارییەکانی گۆڕاون.',
  },

  // ── Storage ──────────────────────────────────────────────────────
  volumeName: {
    title: 'فۆڵدەری سەرەکی',
    description: 'ناوی فۆڵدەری گەورە. خۆکارانە لە "بڕۆ بۆ فۆڵدەر"ـەوە دەخوێنرێتەوە.',
  },
  directory: {
    title: 'دایرێکتۆری',
    description: 'فۆڵدەری دایک کە فایل تێیدایە.',
  },
  pathInExternalVolume: {
    title: 'ڕێگای دەرەکی',
    description: 'ڕێگای تەواوی فایل لە سەرچاوەی دەرەکی.',
  },
  autoPath: {
    title: 'ڕێگای خۆکار',
    description: 'ڕێگای ئۆتۆماتیکی فایلەکە.',
  },

  // ── Archive & provenance ─────────────────────────────────────────
  textStatus: {
    title: 'باری دەق',
    description: 'باری ئێستای دەق لە ئەرشیف.',
  },
  archiveCataloging: {
    title: 'پۆلێنکردنی ئەرشیف',
    description: 'باری پۆلێنکردن لە سیستەمی ئەرشیف.',
  },
  provenance: {
    title: 'سەرچاوە',
    description: 'مێژووی سەرچاوەی دەقەکە.',
  },
  accrualMethod: {
    title: 'شێوازی وەرگرتن',
    description: 'چۆن دەقەکە گەیشتووە بە ئەرشیف.',
  },

  // ── Physical archive ─────────────────────────────────────────────
  physicalAvailability: {
    title: 'بەردەستی کۆپی فیزیکی',
    description: 'ئەگەر کۆپی فیزیکی (وەک کتێبی چاپکراو) لە ئەرشیفدا هەبێت.',
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

function getTextFieldMetadata(fieldKey) {
  return textFieldsMetadata[fieldKey] || null
}

export { textFieldsMetadata, getTextFieldMetadata }

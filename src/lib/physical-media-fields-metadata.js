// Field-help metadata for the physical-media form, mirroring the other
// `<entity>-fields-metadata.js` files. Each entry is the title + description
// shown by the `?` FieldHelpButton next to a form label. Copy is Sorani Kurdish
// to match the rest of the field-help system; field keys are the API camelCase.
const physicalMediaFieldsMetadata = {
  rowNumber: {
    title: 'ژمارەی ڕیز (No.)',
    description: 'ژمارەی ڕیزەکە لە لیستی ئەکسێلدا. تەنها بۆ ئاماژەیە.',
  },
  inventoryNumber: {
    title: 'ژمارەی کۆگا (Number)',
    description: 'ژمارەی کۆگا/ئینڤێنتۆری ئەو پارچە مادییە.',
  },
  physicalMediaType: {
    title: 'جۆری مەدیای مادی',
    description: 'جۆری ئامێرەکە، وەک Audio Cassette، Reel، VHS، DVD. پێویستە.',
  },
  mediaCategory: {
    title: 'جۆری بابەت',
    description: 'پۆلێنی گشتی ناوەڕۆکەکە (نموونە: مۆسیقا، چیرۆک، بەرنامە).',
  },
  title: {
    title: 'ناوی بابەت',
    description: 'ناونیشانی ئەو بابەتەی لەسەر مەدیاکە تۆمارکراوە. ناوی بابەت یان کۆدی مادی پێویستە.',
  },
  subType: {
    title: 'جۆر (Type)',
    description: 'جۆری وردتر یان ژێرپۆلی بابەتەکە.',
  },
  physicalLabel: {
    title: 'کۆد / لەیبڵی مادی',
    description: 'ئەو کۆد یان لەیبڵەی لەسەر خودی ئامێرەکە نووسراوە. ناوی بابەت یان ئەمە پێویستە.',
  },
  size: {
    title: 'قەبارە (Size)',
    description: 'قەبارەی فیزیکی ئامێرەکە (نموونە: ٧ ئینچ، C60).',
  },
  content: {
    title: 'ناوەڕۆک (Content)',
    description: 'کورتە دەربارەی ئەوەی لەسەر مەدیاکە تۆمارکراوە.',
  },
  owner: {
    title: 'خاوەن (Owner)',
    description: 'خاوەنی بنەڕەتی یان سەرچاوەی ئامێرەکە.',
  },
  year: {
    title: 'ساڵ (Year)',
    description: 'ساڵی تۆمارکردن یان بەرهەمهێنان.',
  },
  durationMin: {
    title: 'درێژایی (خولەک)',
    description: 'کۆی درێژایی ناوەڕۆکەکە بە خولەک.',
  },
  trackNumbers: {
    title: 'ژمارەی تراک',
    description: 'ژمارەی گشتی تراکەکان لەسەر مەدیاکە.',
  },
  trackName: {
    title: 'ناوی تراکەکان',
    description: 'ناوی تراکەکان، بە کۆما جیاکراوەتەوە.',
  },
  digitization: {
    title: 'دۆخی دیجیتاڵایز',
    description: 'دیجیتاڵ نەکراو (٠)، دیجیتاڵکراو (١)، یان دووبارەکراوە (٢). بەتاڵ = نادیار.',
  },
  digitizeDate: {
    title: 'ڕێکەوتی دیجیتاڵایز',
    description: 'ئەو ڕێکەوتەی ناوەڕۆکەکە دیجیتاڵ کراوە (ڕۆژ).',
  },
  needToClear: {
    title: 'پێویستی بە خاوێنکردنەوە',
    description: 'ئایا ئامێرەکە پێش کاپچەر پێویستی بە خاوێنکردنەوە هەیە؟ بەتاڵ = نادیار.',
  },
  extension: {
    title: 'Extension',
    description: 'پاشگری فایلی دیجیتاڵ (نموونە: wav، mp4).',
  },
  bitOrColorDepth: {
    title: 'Bit / Color Depth',
    description: 'قووڵایی بیت بۆ دەنگ یان قووڵایی ڕەنگ بۆ ڤیدیۆ/وێنە.',
  },
  sampleOrFrameRate: {
    title: 'Sample / Frame Rate',
    description: 'ڕێژەی نمونە بە kHz بۆ دەنگ یان فرەیم بە fps بۆ ڤیدیۆ.',
  },
  channelsOrResolution: {
    title: 'Channels / Resolution',
    description: 'ژمارەی کەناڵەکانی دەنگ یان ڕیزکراوەیی ڤیدیۆ/وێنە.',
  },
  playbackModel: {
    title: 'Playback Model',
    description: 'ئەو ئامێرەی بۆ لێدانەوەی مەدیاکە بەکارهاتووە.',
  },
  captureInterface: {
    title: 'Capture Interface',
    description: 'ئەو ڕووکارەی بۆ وەرگرتنی سیگناڵەکە بەکارهاتووە.',
  },
  signalInterface: {
    title: 'Signal Interface (Cable)',
    description: 'جۆری کێبڵ/سیگناڵی بەکارهاتوو لە کاتی کاپچەر.',
  },
  ingestSoftware: {
    title: 'Ingest Software',
    description: 'ئەو نەرمەکاڵایەی بۆ تۆمارکردنی دیجیتاڵ بەکارهاتووە.',
  },
  formatCodec: {
    title: 'Format / Codec',
    description: 'فۆرمات یان کۆدێکی فایلە دیجیتاڵەکە.',
  },
  tags: {
    title: 'تاگ (Tags)',
    description: 'وشە کلیلەکان بۆ ڕێکخستن و گەڕان، بە کۆما جیاکراوەتەوە.',
  },
  archiveDepNote: {
    title: 'تێبینی بەشی ئەرشیڤ',
    description: 'تێبینی ناوخۆیی لەلایەن بەشی ئەرشیڤەوە.',
  },
  captureDepNote: {
    title: 'تێبینی بەشی کاپچەر',
    description: 'تێبینی ناوخۆیی لەلایەن بەشی کاپچەر/دیجیتاڵایزەوە.',
  },
}

function getPhysicalMediaFieldMetadata(fieldKey) {
  return physicalMediaFieldsMetadata[fieldKey] || null
}

export { physicalMediaFieldsMetadata, getPhysicalMediaFieldMetadata }

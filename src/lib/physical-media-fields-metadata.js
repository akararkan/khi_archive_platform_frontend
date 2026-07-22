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
    description:
      'ژمارەی کۆگا/ئینڤێنتۆری ئەو پارچە مادییە. خۆکارانە لەلایەن سیستەمەوە دیاری دەکرێت و هەر جۆرێک ژمێرەری خۆی هەیە — دەستکاری ناکرێت.',
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
  physicalLabel: {
    title: 'کۆد / لەیبڵی مادی',
    description: 'ئەو کۆد یان لەیبڵەی لەسەر خودی ئامێرەکە نووسراوە. ناوی بابەت یان ئەمە پێویستە.',
  },
  physicalSize: {
    title: 'قەبارەی مادی (Physical Size)',
    description: 'قەبارەی خودی ئامێرە مادییەکە: گەورە، مامناوەند، ئاسایی، یان بچووک.',
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
  sizeGB: {
    title: 'قەبارەی دیجیتاڵ (Size GB)',
    description: 'قەبارەی فایلە دیجیتاڵەکە بە گیگابایت. دەقی ئازادە (نموونە: 4.7، 4.7 GB، 700 MB).',
  },
  bitOrColorDepth: {
    title: 'Bit Depth / Color Depth',
    description: 'قووڵایی بیت بۆ دەنگ یان قووڵایی ڕەنگ بۆ ڤیدیۆ/وێنە.',
  },
  sampleOrFrameRate: {
    title: 'Sample Rate kHz / Frame Rate FPS',
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

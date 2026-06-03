// Field-help metadata for the maqam create/edit form, mirroring the other
// entities' `<entity>-fields-metadata.js` files. Each entry is the title +
// description shown by the `?` FieldHelpButton next to a form label.
// Copy is Sorani Kurdish to match the rest of the field-help system.
const maqamFieldsMetadata = {
  songName: {
    title: 'ناوی گۆرانی',
    description: 'ناوی ئەو گۆرانی یان پارچە مۆسیقایەی کە تۆمار دەکرێت.',
  },
  producer: {
    title: 'گۆرانیبێژ / بەرهەمهێنەر',
    description: 'ناوی گۆرانیبێژ یان ئەو کەسەی گۆرانییەکەی بەرهەمهێناوە.',
  },
  archiveNote: {
    title: 'تێبینی ئەرشیف',
    description: 'تێبینی ناوخۆیی بۆ ستافی ئەرشیف. ئارەزوومەندانەیە و بۆ گشت کەس دەرناکەوێت.',
  },
  audioFile: {
    title: 'فایلی دەنگ',
    description: 'فایلی دەنگی گۆرانییەکە (audio/* تا ١ گیگابایت). بۆ دروستکردنی تۆماری نوێ پێویستە؛ لە دەستکارییدا ئەگەر بەتاڵی بهێڵیتەوە دەنگی پێشوو دەمێنێتەوە.',
  },
  teachers: {
    title: 'مامۆستایان',
    description: 'ئەو ١ بۆ ٣ مامۆستایەی کە جۆری مقام پۆلێن دەکەن. دواتریش لە کردارەکەی «مامۆستایان» دەتوانیت بیانگۆڕیت.',
  },
}

function getMaqamFieldMetadata(fieldKey) {
  return maqamFieldsMetadata[fieldKey] || null
}

export { maqamFieldsMetadata, getMaqamFieldMetadata }

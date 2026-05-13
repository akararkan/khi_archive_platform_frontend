const categoryFieldsMetadata = {
  categoryCode: {
    title: 'کۆدی پۆلێن',
    description: 'کۆدی تایبەتی پۆلێن (وەک حەرفی سەرەتای ناو + ژمارە). یەکجارییە و دوای دروستکردن ناگۆڕێت.',
  },
  name: {
    title: 'ناوی پۆلێن',
    description: 'ناوی پۆلێنەکە بنووسە بە شێوەیەکی ڕوون و کورت (نموونە: مۆسیقای فۆلکلۆر).',
  },
  description: {
    title: 'وەسف',
    description: 'کورتە دەربارەی ناوەڕۆکی پۆلێنەکە و ئەو پڕۆژانەی کە دەکەونە ژێری.',
  },
  keywords: {
    title: 'وشە کلیلەکان',
    description: 'وشە کلیلە گرنگەکان بۆ گەڕان. بە کۆما (,) جیا بکەرەوە.',
  },
}

function getCategoryFieldMetadata(fieldKey) {
  return categoryFieldsMetadata[fieldKey] || null
}

export { categoryFieldsMetadata, getCategoryFieldMetadata }

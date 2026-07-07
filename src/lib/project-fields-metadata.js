const projectFieldsMetadata = {
  projectName: {
    title: 'ناوی پڕۆژە',
    description: 'ناوێکی ڕوون و گونجاو بۆ پڕۆژەکە بنووسە کە بە ئاسانی بناسرێتەوە.',
  },
  projectCode: {
    title: 'کۆدی پڕۆژە',
    description:
      'بۆ پڕۆژەی بەکەس، frontend کۆدی پڕۆژە نانێرێت و backend وەک پێشوو دروستی دەکات. تەنها بۆ پڕۆژەی بێکەس frontend کۆدی تەواو وەک `DENG-PROJ-000004` دەنێرێت؛ backend هەمان کۆد هەڵدەگرێت. کۆدی مێدیا تەنها پێشگری پێش `PROJ` بەکاردێنێت، وەک `DENG_AUD_RAW_V1_Copy(1)_000001`.',
  },
  description: {
    title: 'وەسف',
    description: 'کورتەیەک لەسەر پڕۆژەکە، ناوەڕۆکی، و ئامانجی کۆکردنەوەی. یارمەتیدەرە بۆ گەڕان و ناساندن.',
  },
  tags: {
    title: 'تاگ',
    description: 'تاگەکان بە کۆما (,) جیا بکەرەوە. بەکاردێن بۆ گرووپکردن و پاڵاوتنی پڕۆژەکان.',
  },
  keywords: {
    title: 'وشە کلیلەکان',
    description: 'وشە سەرەکییەکان بنووسە بۆ باشترکردنی گەڕان. بە کۆما جیا بکەرەوە.',
  },
  person: {
    title: 'کەسی پەیوەندیدار',
    description: 'کەسی سەرەکی کە پڕۆژەکە دەربارەی ئەوە (وەک گۆرانیبێژ، نووسەر، …).',
  },
  categories: {
    title: 'پۆلێنەکان',
    description: 'یەک یان چەند پۆلێن هەڵبژێرە کە پڕۆژەکە لەژێریان ڕیز دەکرێت.',
  },
}

function getProjectFieldMetadata(fieldKey) {
  return projectFieldsMetadata[fieldKey] || null
}

export { projectFieldsMetadata, getProjectFieldMetadata }

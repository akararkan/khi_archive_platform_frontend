const projectFieldsMetadata = {
  projectName: {
    title: 'ناوی پڕۆژە',
    description: 'ناوێکی ڕوون و گونجاو بۆ پڕۆژەکە بنووسە کە بە ئاسانی بناسرێتەوە.',
  },
  projectCode: {
    title: 'کۆدی پڕۆژە',
    description: 'کۆدی تایبەتی پڕۆژەکە (وەک ناوی کەس + ژمارە). ئەمە بۆ ناساندن بەکاردێت و یەکجارییە.',
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

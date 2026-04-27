const personFieldsMetadata = {
  personCode: {
    title: 'کۆدی کەس',
    description: 'کۆدی تایبەتی ناساندنی کەسە. لە فۆڕمدا تەنها بەشی دوای KHI_ بنووسە.',
  },
  fullName: {
    title: 'ناوی تەواو',
    description: 'ناوی تەواوی کەسەکە بنووسە وەک لە سەرچاوە فەرمییەکان هاتووە.',
  },
  nickname: {
    title: 'ناوی ناسراو',
    description: 'ئەگەر کەسەکە بە ناوێکی تر ناسراوە، لێرە دایبنێ.',
  },
  romanizedName: {
    title: 'ناوی لاتینی',
    description: 'شێوازی نووسینی ناو بە پیتی لاتینی بۆ گەڕان و نیشاندان.',
  },
  gender: {
    title: 'ڕەگەز',
    description: 'ڕەگەزی کەسەکە دیاری بکە: MALE یان FEMALE یان UNKNOWN.',
  },
  personType: {
    title: 'جۆر/ڕۆڵی کەس',
    description: 'پیشە یان ڕۆڵی کەسەکە بنووسە (وەک: Singer, Artist).',
  },
  region: {
    title: 'ناوچە',
    description: 'ناوچە یان شوێنی گرنگی پەیوەندیدار بە ژیان/کارەکانی کەس.',
  },
  placeOfBirth: {
    title: 'شوێنی لەدایکبوون',
    description: 'شار/ناوچەی لەدایکبوونی کەسەکە.',
  },
  dateOfBirthYear: {
    title: 'ساڵی لەدایکبوون',
    description: 'ساڵەکە بە ژمارە بنووسە (نموونە: 1921).',
  },
  dateOfBirthMonth: {
    title: 'مانگی لەدایکبوون',
    description: 'مانگی لەدایکبوون (1 تا 12).',
  },
  dateOfBirthDay: {
    title: 'ڕۆژی لەدایکبوون',
    description: 'ڕۆژی لەدایکبوون (1 تا 31).',
  },
  placeOfDeath: {
    title: 'شوێنی مردن',
    description: 'ئەگەر هەبێت، شوێنی مردنی کەسەکە لێرە دابنێ.',
  },
  dateOfDeathYear: {
    title: 'ساڵی مردن',
    description: 'ساڵی مردن بە ژمارە (نموونە: 1972).',
  },
  dateOfDeathMonth: {
    title: 'مانگی مردن',
    description: 'مانگی مردن (1 تا 12).',
  },
  dateOfDeathDay: {
    title: 'ڕۆژی مردن',
    description: 'ڕۆژی مردن (1 تا 31).',
  },
  description: {
    title: 'وەسف/ژیاننامە',
    description: 'کورتەیەک لە ژیان، بەرهەمەکان، و کاریگەرییەکانی کەسەکە بنووسە.',
  },
  tag: {
    title: 'تاگ',
    description: 'وشەی ناساندن دابنێ بە کۆما (,) بۆ جیاکردنەوە.',
  },
  keywords: {
    title: 'وشەی کلیلەکان',
    description: 'وشە کلیلە گرنگەکان بنووسە بۆ باشترکردنی گەڕان.',
  },
  note: {
    title: 'تێبینی ناوخۆیی',
    description: 'تێبینی تایبەتی تیمی ئەرشیف کە بۆ بەکارهێنەری گشتی نیشان نادرێت.',
  },
  mediaPortrait: {
    title: 'وێنەی پۆرتڕێت',
    description: 'وێنەی سەرەکی کەسەکە هەڵبژێرە بۆ نیشاندانی خێراتر لە تۆمارەکان.',
  },
}

function getPersonFieldMetadata(fieldKey) {
  return personFieldsMetadata[fieldKey] || null
}

export { personFieldsMetadata, getPersonFieldMetadata }

// Bilingual (English + Sorani Kurdish) localization for the platform's
// `ApiErrorResponse` envelope. This is the FRONTEND mirror of the backend's
// `ErrorCategory` + `ErrorCode` enums.
//
// Wire shape produced by every backend handler / filter / entry-point:
//   {
//     timestamp, status,
//     error:    "MACHINE_CODE",        // ErrorCode  — entity-specific UX
//     category: "BROAD_FAMILY",        // ErrorCategory — broad UX treatment
//     message:  "user-safe sentence",  // already localized in tone (English)
//     hint:     "what to do next",     // recovery suggestion (English)
//     path, traceId,
//     details:  { field: msg } | { ...meta }   // omitted when empty
//   }
//
// We show BOTH languages everywhere an exception surfaces: the backend's
// English `message`/`hint` for the English line, and this catalog's Sorani
// strings for the Kurdish line. Dynamic English messages ("Audio 42 not
// found", "Category 'Quran' is used by 23 records") come through verbatim;
// the Kurdish line is the catalog's meaningful equivalent for that code.

// ── Broad families (ErrorCategory) ──────────────────────────────────────────
// Each carries a title + a generic hint in both languages, used as the
// fallback when a specific ErrorCode isn't in the catalog below.
export const ERROR_CATEGORIES = {
  VALIDATION: {
    title: { en: 'Validation failed', ku: 'زانیاری نادروستە' },
    hint: {
      en: 'Check the highlighted fields and try again.',
      ku: 'خانە دیاریکراوەکان بپشکنە و دووبارە هەوڵبدەرەوە.',
    },
  },
  AUTHENTICATION: {
    title: { en: 'Sign-in required', ku: 'پێویستە بچیتە ژوورەوە' },
    hint: { en: 'Sign in again to continue.', ku: 'بۆ بەردەوامبوون دووبارە بچۆرە ژوورەوە.' },
  },
  AUTHORIZATION: {
    title: { en: 'Access denied', ku: 'ڕێگەپێدان نییە' },
    hint: {
      en: 'Ask an administrator for the required permission.',
      ku: 'داوا لە بەڕێوەبەر بکە مۆڵەتی پێویستت پێ ببەخشێت.',
    },
  },
  ACCOUNT_STATE: {
    title: { en: 'Account problem', ku: 'کێشەی هەژمار' },
    hint: { en: 'Contact an administrator.', ku: 'پەیوەندی بە بەڕێوەبەرەوە بکە.' },
  },
  NOT_FOUND: {
    title: { en: 'Not found', ku: 'نەدۆزرایەوە' },
    hint: {
      en: 'Check the address and try again.',
      ku: 'ناونیشانەکە بپشکنە و دووبارە هەوڵبدەرەوە.',
    },
  },
  CONFLICT: {
    title: { en: 'Conflict', ku: 'ناکۆکی' },
    hint: {
      en: 'Reload the latest data and try again.',
      ku: 'نوێترین زانیاری باربکەرەوە و دووبارە هەوڵبدەرەوە.',
    },
  },
  MEDIA: {
    title: { en: 'Media problem', ku: 'کێشەی مێدیا' },
    hint: {
      en: 'Check the file type and size, then retry.',
      ku: 'جۆر و قەبارەی فایلەکە بپشکنە، پاشان دووبارە هەوڵبدەرەوە.',
    },
  },
  BAD_REQUEST: {
    title: { en: 'Invalid request', ku: 'داواکاری نادروست' },
    hint: {
      en: 'Check the request and try again.',
      ku: 'داواکارییەکە بپشکنە و دووبارە هەوڵبدەرەوە.',
    },
  },
  RATE_LIMIT: {
    title: { en: 'Too many requests', ku: 'داواکاری زۆر زۆرە' },
    hint: { en: 'Wait a moment and try again.', ku: 'کەمێک چاوەڕێ بکە و دووبارە هەوڵبدەرەوە.' },
  },
  DATABASE: {
    title: { en: 'Server error', ku: 'هەڵەی ڕاژەکار' },
    hint: {
      en: 'Retry shortly; if it persists, share the trace ID with support.',
      ku: 'دوای کەمێک دووبارە هەوڵبدەرەوە؛ ئەگەر بەردەوام بوو، کۆدی شوێنپێ (Trace ID) بدە بە پشتگیری.',
    },
  },
  STORAGE: {
    title: { en: 'Storage error', ku: 'هەڵەی هەڵگرتن' },
    hint: {
      en: 'Retry shortly; if it persists, share the trace ID with support.',
      ku: 'دوای کەمێک دووبارە هەوڵبدەرەوە؛ ئەگەر بەردەوام بوو، کۆدی شوێنپێ (Trace ID) بدە بە پشتگیری.',
    },
  },
  EXTERNAL_SERVICE: {
    title: { en: 'Service unavailable', ku: 'خزمەتگوزاری بەردەست نییە' },
    hint: { en: 'Try again shortly.', ku: 'دوای کەمێک دووبارە هەوڵبدەرەوە.' },
  },
  SERVER_ERROR: {
    title: { en: 'Server error', ku: 'هەڵەی ڕاژەکار' },
    hint: {
      en: 'Retry shortly; if it persists, share the trace ID with support.',
      ku: 'دوای کەمێک دووبارە هەوڵبدەرەوە؛ ئەگەر بەردەوام بوو، کۆدی شوێنپێ (Trace ID) بدە بە پشتگیری.',
    },
  },
}

// Categories whose responses carry a support-correlation traceId worth
// surfacing to the user (so they can quote it to support).
const TRACE_CATEGORIES = new Set([
  'SERVER_ERROR',
  'DATABASE',
  'STORAGE',
  'EXTERNAL_SERVICE',
])

// Token-rejection codes: a token WAS presented but the server rejected it.
// The api-client interceptor clears the session and redirects to /login on
// these. (TOKEN_MISSING is excluded — no token was sent, so route guards
// handle it without a hard redirect.) BAD_CREDENTIALS is excluded too so the
// login form keeps the user in place.
export const TOKEN_REJECTED_CODES = new Set([
  'TOKEN_EXPIRED',
  'TOKEN_REVOKED',
  'TOKEN_INVALID_SIGNATURE',
  'TOKEN_MALFORMED',
  'TOKEN_INVALID',
])

// ── Specific machine codes (ErrorCode) ──────────────────────────────────────
// Cross-cutting, non-entity codes. Entity-specific codes
// (AUDIO_NOT_FOUND, CATEGORY_IN_USE, …) are derived from patterns below.
const ERROR_CODES = {
  // Authentication ----------------------------------------------------------
  TOKEN_EXPIRED: {
    category: 'AUTHENTICATION',
    title: { en: 'Session expired', ku: 'کاتی دانیشتن بەسەرچوو' },
    message: { en: 'Your session has expired.', ku: 'ماوەی چوونەژوورەوەکەت بەسەرچووە.' },
    hint: { en: 'Sign in again to continue.', ku: 'بۆ بەردەوامبوون دووبارە بچۆرە ژوورەوە.' },
  },
  TOKEN_MISSING: {
    category: 'AUTHENTICATION',
    title: { en: 'Sign-in required', ku: 'پێویستە بچیتە ژوورەوە' },
    message: {
      en: 'Authentication is required to access this resource.',
      ku: 'بۆ گەیشتن بەم بەشە پێویستە بچیتە ژوورەوە.',
    },
    hint: { en: 'Sign in and try again.', ku: 'بچۆرە ژوورەوە و دووبارە هەوڵبدەرەوە.' },
  },
  TOKEN_REVOKED: {
    category: 'AUTHENTICATION',
    title: { en: 'Session ended', ku: 'دانیشتن کۆتایی هات' },
    message: { en: 'Your session has been invalidated.', ku: 'دانیشتنەکەت ناشیاو کراوە.' },
    hint: { en: 'Sign in again to continue.', ku: 'بۆ بەردەوامبوون دووبارە بچۆرە ژوورەوە.' },
  },
  TOKEN_INVALID_SIGNATURE: {
    category: 'AUTHENTICATION',
    title: { en: 'Invalid token', ku: 'تۆکنی نادروست' },
    message: { en: 'Token signature is invalid.', ku: 'واژووی تۆکن نادروستە.' },
    hint: {
      en: 'Sign in again to obtain a fresh token.',
      ku: 'دووبارە بچۆرە ژوورەوە بۆ وەرگرتنی تۆکنێکی نوێ.',
    },
  },
  TOKEN_MALFORMED: {
    category: 'AUTHENTICATION',
    title: { en: 'Invalid token', ku: 'تۆکنی نادروست' },
    message: { en: 'Your sign-in token is malformed.', ku: 'تۆکنی چوونەژوورەوەکەت تێکچووە.' },
    hint: {
      en: 'Sign in again to obtain a fresh token.',
      ku: 'دووبارە بچۆرە ژوورەوە بۆ وەرگرتنی تۆکنێکی نوێ.',
    },
  },
  TOKEN_INVALID: {
    category: 'AUTHENTICATION',
    title: { en: 'Invalid token', ku: 'تۆکنی نادروست' },
    message: { en: 'Your sign-in token is invalid.', ku: 'تۆکنی چوونەژوورەوەکەت نادروستە.' },
    hint: { en: 'Sign in again to continue.', ku: 'بۆ بەردەوامبوون دووبارە بچۆرە ژوورەوە.' },
  },
  AUTHENTICATION_FAILED: {
    category: 'AUTHENTICATION',
    title: { en: 'Authentication failed', ku: 'چوونەژوورەوە سەرنەکەوت' },
    message: { en: 'We could not verify your identity.', ku: 'نەمانتوانی ناسنامەت بسەلمێنین.' },
    hint: { en: 'Sign in again.', ku: 'دووبارە بچۆرە ژوورەوە.' },
  },
  BAD_CREDENTIALS: {
    category: 'AUTHENTICATION',
    title: { en: 'Incorrect credentials', ku: 'زانیاری چوونەژوورەوە هەڵەیە' },
    message: {
      en: 'Username or password is incorrect.',
      ku: 'ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە.',
    },
    hint: {
      en: 'Re-enter your details and try again.',
      ku: 'زانیارییەکانت دووبارە بنووسە و هەوڵبدەرەوە.',
    },
  },

  // Account state -----------------------------------------------------------
  ACCOUNT_LOCKED: {
    category: 'ACCOUNT_STATE',
    title: { en: 'Account locked', ku: 'هەژمار قوفڵدراوە' },
    message: { en: 'This account is locked.', ku: 'ئەم هەژمارە قوفڵدراوە.' },
    hint: {
      en: 'Wait until the lock expires, or contact an administrator to unlock it.',
      ku: 'چاوەڕێ بکە تا قوفڵەکە لادەچێت، یان پەیوەندی بە بەڕێوەبەرەوە بکە بۆ کردنەوەی.',
    },
  },
  ACCOUNT_DISABLED: {
    category: 'ACCOUNT_STATE',
    title: { en: 'Account disabled', ku: 'هەژمار ناچالاککراوە' },
    message: { en: 'This account is disabled.', ku: 'ئەم هەژمارە ناچالاککراوە.' },
    hint: {
      en: 'Contact an administrator to re-enable the account.',
      ku: 'پەیوەندی بە بەڕێوەبەرەوە بکە بۆ چالاککردنەوەی هەژمارەکە.',
    },
  },
  ACCOUNT_EXPIRED: {
    category: 'ACCOUNT_STATE',
    title: { en: 'Account expired', ku: 'هەژمار بەسەرچووە' },
    message: { en: 'This account has expired.', ku: 'ئەم هەژمارە بەسەرچووە.' },
    hint: { en: 'Contact an administrator.', ku: 'پەیوەندی بە بەڕێوەبەرەوە بکە.' },
  },
  CREDENTIALS_EXPIRED: {
    category: 'ACCOUNT_STATE',
    title: { en: 'Password expired', ku: 'وشەی نهێنی بەسەرچووە' },
    message: { en: 'Your credentials have expired.', ku: 'زانیاری چوونەژوورەوەکەت بەسەرچووە.' },
    hint: {
      en: 'Reset your password or contact an administrator.',
      ku: 'وشەی نهێنیەکەت بگۆڕەوە یان پەیوەندی بە بەڕێوەبەرەوە بکە.',
    },
  },

  // Authorization -----------------------------------------------------------
  ACCESS_DENIED: {
    category: 'AUTHORIZATION',
    title: { en: 'Access denied', ku: 'ڕێگەپێدان نییە' },
    message: {
      en: "You don't have permission to perform this action.",
      ku: 'مۆڵەتی ئەنجامدانی ئەم کارەت نییە.',
    },
    hint: {
      en: 'Ask an administrator to grant the required permission.',
      ku: 'داوا لە بەڕێوەبەر بکە مۆڵەتی پێویست ببەخشێت.',
    },
  },

  // Validation / bad request ------------------------------------------------
  JSON_PARSE_ERROR: {
    category: 'BAD_REQUEST',
    title: { en: 'Malformed request', ku: 'داواکاری تێکچوو' },
    message: {
      en: 'The request body could not be read.',
      ku: 'ناتوانرا ناوەڕۆکی داواکارییەکە بخوێنرێتەوە.',
    },
    hint: {
      en: 'Make sure the data is valid and try again.',
      ku: 'دڵنیابە زانیارییەکە دروستە و دووبارە هەوڵبدەرەوە.',
    },
  },
  MISSING_PARAMETER: {
    category: 'BAD_REQUEST',
    title: { en: 'Missing information', ku: 'زانیاری ون بووە' },
    message: { en: 'A required value is missing.', ku: 'بەهایەکی پێویست ون بووە.' },
    hint: {
      en: 'Fill in the required field and try again.',
      ku: 'خانە پێویستەکە پڕبکەرەوە و دووبارە هەوڵبدەرەوە.',
    },
  },
  TYPE_MISMATCH: {
    category: 'BAD_REQUEST',
    title: { en: 'Invalid value', ku: 'بەهای نادروست' },
    message: { en: 'A value has the wrong format.', ku: 'بەهایەک شێوازی نادروستی هەیە.' },
    hint: {
      en: 'Correct the value and try again.',
      ku: 'بەهاکە ڕاست بکەرەوە و دووبارە هەوڵبدەرەوە.',
    },
  },
  MISSING_REQUEST_PART: {
    category: 'BAD_REQUEST',
    title: { en: 'Missing part', ku: 'بەشێک ون بووە' },
    message: {
      en: 'A required part of the request is missing.',
      ku: 'بەشێکی پێویستی داواکارییەکە ون بووە.',
    },
    hint: {
      en: 'Attach the required part and try again.',
      ku: 'بەشە پێویستەکە هاوپێچ بکە و دووبارە هەوڵبدەرەوە.',
    },
  },
  METHOD_NOT_ALLOWED: {
    category: 'BAD_REQUEST',
    title: { en: 'Action not allowed', ku: 'ئەم کارە ڕێگەپێدراو نییە' },
    message: { en: "This action isn't supported here.", ku: 'ئەم کارە لێرە پشتگیری ناکرێت.' },
    hint: {
      en: 'Refresh the page and try again.',
      ku: 'پەڕەکە نوێ بکەرەوە و دووبارە هەوڵبدەرەوە.',
    },
  },
  NOT_ACCEPTABLE: {
    category: 'BAD_REQUEST',
    title: { en: 'Not acceptable', ku: 'وەرناگیرێت' },
    message: {
      en: "The server can't produce the requested format.",
      ku: 'ڕاژەکار ناتوانێت ئەم شێوازە دابین بکات.',
    },
    hint: { en: 'Try again.', ku: 'دووبارە هەوڵبدەرەوە.' },
  },
  UNKNOWN_PERMISSION: {
    category: 'VALIDATION',
    title: { en: 'Unknown permission', ku: 'مۆڵەتی نەناسراو' },
    message: {
      en: 'One or more permission codes are not recognized.',
      ku: 'یەک یان چەند کۆدێکی مۆڵەت نەناسراون.',
    },
    hint: {
      en: 'Pick valid permissions from the catalog and try again.',
      ku: 'مۆڵەتی دروست لە کەتەلۆگەکە هەڵبژێرە و دووبارە هەوڵبدەرەوە.',
    },
  },

  // Media -------------------------------------------------------------------
  UNSUPPORTED_MEDIA_TYPE: {
    category: 'MEDIA',
    title: { en: 'Unsupported file type', ku: 'جۆری فایل پشتگیری ناکرێت' },
    message: { en: "This content type isn't supported.", ku: 'ئەم جۆرە ناوەڕۆکە پشتگیری ناکرێت.' },
    hint: {
      en: 'Send a supported file type and try again.',
      ku: 'جۆرێکی پشتگیریکراوی فایل بنێرە و دووبارە هەوڵبدەرەوە.',
    },
  },
  UPLOAD_TOO_LARGE: {
    category: 'MEDIA',
    title: { en: 'File too large', ku: 'فایل زۆر گەورەیە' },
    message: { en: 'The upload exceeds the size limit.', ku: 'فایلەکە لە سنووری قەبارە تێپەڕیوە.' },
    hint: {
      en: 'Compress or split the file and retry.',
      ku: 'فایلەکە بچووک بکەرەوە یان دابەشی بکە و دووبارە هەوڵبدەرەوە.',
    },
  },

  // Conflict ----------------------------------------------------------------
  STALE_VERSION: {
    category: 'CONFLICT',
    title: { en: 'Edited elsewhere', ku: 'لە شوێنێکی تر دەستکاری کراوە' },
    message: {
      en: 'This record was changed by someone else while you were editing it.',
      ku: 'ئەم تۆمارە لەلایەن کەسێکی ترەوە گۆڕدراوە لە کاتی دەستکاریکردنتدا.',
    },
    hint: {
      en: 'Reload the latest version, re-apply your changes and try again.',
      ku: 'نوێترین وەشان باربکەرەوە، گۆڕانکارییەکانت دووبارە جێبەجێ بکە و هەوڵبدەرەوە.',
    },
  },

  // Rate limit --------------------------------------------------------------
  RATE_LIMITED: {
    category: 'RATE_LIMIT',
    title: { en: 'Too many requests', ku: 'داواکاری زۆر زۆرە' },
    message: { en: "You've made too many requests.", ku: 'زۆر داواکاریت کردووە.' },
    hint: { en: 'Wait a moment and try again.', ku: 'کەمێک چاوەڕێ بکە و دووبارە هەوڵبدەرەوە.' },
  },

  // Server / infrastructure -------------------------------------------------
  QUERY_TIMEOUT: {
    category: 'SERVER_ERROR',
    title: { en: 'Request timed out', ku: 'داواکاری کاتی بەسەرچوو' },
    message: { en: 'The request took too long.', ku: 'داواکارییەکە زۆری خایاند.' },
    hint: { en: 'Try again in a moment.', ku: 'دوای کەمێک دووبارە هەوڵبدەرەوە.' },
  },
  IO_ERROR: {
    category: 'STORAGE',
    title: { en: 'Storage error', ku: 'هەڵەی هەڵگرتن' },
    message: { en: 'A file or storage error occurred.', ku: 'هەڵەی فایل یان هەڵگرتن ڕوویدا.' },
    hint: {
      en: 'Retry shortly; if it persists, share the trace ID with support.',
      ku: 'دوای کەمێک دووبارە هەوڵبدەرەوە؛ ئەگەر بەردەوام بوو، کۆدی شوێنپێ بدە بە پشتگیری.',
    },
  },
  DATABASE_ERROR: {
    category: 'DATABASE',
    title: { en: 'Server error', ku: 'هەڵەی ڕاژەکار' },
    message: { en: 'A database error occurred.', ku: 'هەڵەی بنکەدراوە ڕوویدا.' },
    hint: {
      en: 'Retry shortly; if it persists, share the trace ID with support.',
      ku: 'دوای کەمێک دووبارە هەوڵبدەرەوە؛ ئەگەر بەردەوام بوو، کۆدی شوێنپێ بدە بە پشتگیری.',
    },
  },
  INTERNAL_SERVER_ERROR: {
    category: 'SERVER_ERROR',
    title: { en: 'Server error', ku: 'هەڵەی ڕاژەکار' },
    message: { en: 'An unexpected error occurred.', ku: 'هەڵەیەکی چاوەڕواننەکراو ڕوویدا.' },
    hint: {
      en: 'Retry shortly; if it persists, share the trace ID with support.',
      ku: 'دوای کەمێک دووبارە هەوڵبدەرەوە؛ ئەگەر بەردەوام بوو، کۆدی شوێنپێ بدە بە پشتگیری.',
    },
  },
}

// ── Entity-code pattern derivation ───────────────────────────────────────────
// Backend emits one code per (entity, situation): AUDIO_NOT_FOUND,
// CATEGORY_IN_USE, PHYSICAL_MEDIA_ALREADY_EXISTS, … Rather than enumerate every
// combination, we recognize the suffix and fill in the entity name in both
// languages. New entities work automatically once added to ENTITY_NAMES.
const ENTITY_NAMES = {
  AUDIO: { en: 'Audio', ku: 'دەنگ' },
  VIDEO: { en: 'Video', ku: 'ڤیدیۆ' },
  IMAGE: { en: 'Image', ku: 'وێنە' },
  TEXT: { en: 'Text', ku: 'دەق' },
  PERSON: { en: 'Person', ku: 'کەس' },
  PROJECT: { en: 'Project', ku: 'پڕۆژە' },
  CATEGORY: { en: 'Category', ku: 'پۆل' },
  PHYSICAL_MEDIA: { en: 'Physical media', ku: 'مێدیای فیزیکی' },
  MAQAM: { en: 'Maqam', ku: 'مقام' },
  USER: { en: 'User', ku: 'بەکارهێنەر' },
  ITEM: { en: 'Item', ku: 'تۆمار' },
  ROLE: { en: 'Role', ku: 'ڕۆڵ' },
  PERMISSION: { en: 'Permission', ku: 'مۆڵەت' },
  WARNING: { en: 'Warning', ku: 'ئاگاداری' },
  CORRECTION: { en: 'Correction', ku: 'ڕاستکردنەوە' },
  PROFILE: { en: 'Profile', ku: 'پرۆفایل' },
  ACCOUNT: { en: 'Account', ku: 'هەژمار' },
}

const SUFFIX_PATTERNS = [
  {
    suffix: '_NOT_FOUND',
    category: 'NOT_FOUND',
    title: (e) => ({ en: `${e.en} not found`, ku: `${e.ku} نەدۆزرایەوە` }),
    hint: {
      en: 'Confirm the id and that it has not been moved to trash.',
      ku: 'دڵنیابە لە ناسنامەکە و لەوەی نەخراوەتە تەنەکەی خۆڵ.',
    },
  },
  {
    suffix: '_ALREADY_EXISTS',
    category: 'CONFLICT',
    title: (e) => ({ en: `${e.en} already exists`, ku: `${e.ku} پێشتر هەیە` }),
    hint: {
      en: 'Pick a different value or update the existing record.',
      ku: 'بەهایەکی جیاواز هەڵبژێرە یان تۆمارە هەبووەکە نوێ بکەرەوە.',
    },
  },
  {
    suffix: '_IN_USE',
    category: 'CONFLICT',
    title: (e) => ({ en: `${e.en} is in use`, ku: `${e.ku} بەکاردێت` }),
    hint: {
      en: 'Reassign the linked records before deleting this one.',
      ku: 'پێش سڕینەوە، تۆمارە بەستراوەکان بگوازەرەوە.',
    },
  },
  {
    suffix: '_VALIDATION_ERROR',
    category: 'VALIDATION',
    title: (e) => ({ en: `${e.en} details invalid`, ku: `زانیاری ${e.ku} نادروستە` }),
    hint: {
      en: 'Fix the highlighted fields and resubmit.',
      ku: 'خانە دیاریکراوەکان ڕاست بکەرەوە و دووبارە بینێرە.',
    },
  },
]

function deriveFromPattern(code) {
  for (const pattern of SUFFIX_PATTERNS) {
    if (!code.endsWith(pattern.suffix)) continue
    const prefix = code.slice(0, -pattern.suffix.length)
    const entity = ENTITY_NAMES[prefix]
    if (!entity) continue
    return {
      category: pattern.category,
      title: pattern.title(entity),
      hint: pattern.hint,
    }
  }
  return null
}

// ── Field-name labels for per-field validation details ───────────────────────
const FIELD_LABELS_KU = {
  title: 'ناونیشان',
  name: 'ناو',
  username: 'ناوی بەکارهێنەر',
  email: 'ئیمەیڵ',
  password: 'وشەی نهێنی',
  description: 'وەسف',
  duration: 'ماوە',
  year: 'ساڵ',
  date: 'بەروار',
  category: 'پۆل',
  project: 'پڕۆژە',
  code: 'کۆد',
  file: 'فایل',
  language: 'زمان',
  author: 'نووسەر',
  producer: 'گۆرانیبێژ',
  type: 'جۆر',
  parameter: 'پارامەتر',
  field: 'خانە',
  reason: 'هۆکار',
}

// Status-code fallback titles for responses with no category/code (e.g. a raw
// gateway/proxy error that never reached our handlers).
const STATUS_CATEGORY = {
  400: 'BAD_REQUEST',
  401: 'AUTHENTICATION',
  403: 'AUTHORIZATION',
  404: 'NOT_FOUND',
  405: 'BAD_REQUEST',
  406: 'BAD_REQUEST',
  408: 'SERVER_ERROR',
  409: 'CONFLICT',
  410: 'NOT_FOUND',
  413: 'MEDIA',
  415: 'MEDIA',
  422: 'VALIDATION',
  423: 'ACCOUNT_STATE',
  429: 'RATE_LIMIT',
  500: 'SERVER_ERROR',
  502: 'EXTERNAL_SERVICE',
  503: 'EXTERNAL_SERVICE',
  504: 'SERVER_ERROR',
}

// ── Public helpers ───────────────────────────────────────────────────────────

export function humanizeErrorCode(code) {
  return String(code)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

// "personShownInImage" / "person.full_name" → "Person Shown In Image"
export function humanizeFieldName(name) {
  if (!name) return ''
  return String(name)
    .replace(/[._]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function fieldLabelKu(field) {
  const key = String(field || '').toLowerCase()
  return FIELD_LABELS_KU[key] || null
}

// Resolve the broad family for a response: prefer the explicit `category`,
// fall back to the code's catalog entry / derived pattern, then to status.
export function resolveErrorCategory(data, status) {
  const explicit = typeof data?.category === 'string' ? data.category.toUpperCase() : null
  if (explicit && ERROR_CATEGORIES[explicit]) return explicit

  const code = typeof data?.error === 'string' ? data.error : null
  if (code) {
    if (ERROR_CODES[code]) return ERROR_CODES[code].category
    const derived = deriveFromPattern(code)
    if (derived) return derived.category
  }

  if (typeof status === 'number' && STATUS_CATEGORY[status]) return STATUS_CATEGORY[status]
  return null
}

// Look up the bilingual catalog entry for a code (explicit or pattern-derived).
function catalogEntry(code) {
  if (!code) return null
  if (ERROR_CODES[code]) return ERROR_CODES[code]
  return deriveFromPattern(code)
}

// Meta keys on ACCESS_DENIED 403s — surfaced via the message/hint, not as
// per-field validation rows.
const ACCESS_DENIED_META_KEYS = new Set([
  'requiredAuthority',
  'actor',
  'actorAuthorities',
  'requestMethod',
])
// URL-pointer keys (debug breadcrumbs, not user-facing field errors).
const URL_HINT_KEYS = new Set(['catalog'])

// Extract per-field validation details as bilingual rows.
//   [{ field, label: { en, ku }, message }]
function extractDetails(details) {
  if (!details || typeof details !== 'object') return []

  const out = []
  for (const [field, value] of Object.entries(details)) {
    if (ACCESS_DENIED_META_KEYS.has(field)) continue
    if (URL_HINT_KEYS.has(field)) continue
    if (value == null) continue

    let message
    if (Array.isArray(value)) {
      const items = value
        .filter((v) => v != null)
        .map((v) => String(v).trim())
        .filter(Boolean)
      if (items.length === 0) continue
      message = items.join(', ')
    } else {
      message = String(value).trim()
      if (!message) continue
    }

    out.push({
      field,
      label: { en: humanizeFieldName(field), ku: fieldLabelKu(field) },
      message,
    })
  }
  return out
}

function trimOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

// Build the structured bilingual view from an already-extracted response body
// + status. This is the heart of the localization layer.
//
// Returns:
//   {
//     status, code, category, traceId, showTrace,
//     title:   { en, ku },
//     message: { en, ku },      // may have null members
//     hint:    { en, ku },      // may have null members
//     details: [{ field, label: { en, ku }, message }],
//   }
export function buildLocalizedError(data, status, fallbackTitle = 'Something went wrong') {
  const code = trimOrNull(data?.error)
  const category = resolveErrorCategory(data, status)
  const entry = catalogEntry(code)
  const categoryEntry = category ? ERROR_CATEGORIES[category] : null

  // Title — prefer the catalog's clean (non-dynamic) title, then the
  // category title, then a humanized code / status fallback.
  const titleEn =
    entry?.title?.en ||
    categoryEntry?.title?.en ||
    (code ? humanizeErrorCode(code) : null) ||
    fallbackTitle
  const titleKu = entry?.title?.ku || categoryEntry?.title?.ku || null

  // Message (description). English prefers the backend's dynamic message
  // (carries ids/counts), then the catalog's static English. Kurdish uses the
  // catalog (code-level, then category-level) since the backend text is English.
  const backendMessage = trimOrNull(data?.message)
  let messageEn = backendMessage || entry?.message?.en || null
  // Avoid the description echoing the title verbatim.
  if (messageEn && messageEn.toLowerCase() === String(titleEn).toLowerCase()) {
    messageEn = entry?.message?.en && entry.message.en !== backendMessage ? entry.message.en : null
  }
  const messageKu = entry?.message?.ku || null

  // Hint. English prefers the backend's hint, then the catalog code hint, then
  // the category hint. Kurdish from the catalog.
  const backendHint = trimOrNull(data?.hint)
  const hintEn = backendHint || entry?.hint?.en || categoryEntry?.hint?.en || null
  const hintKu = entry?.hint?.ku || categoryEntry?.hint?.ku || null

  const traceId = trimOrNull(data?.traceId)
  const showTrace = Boolean(
    traceId && (TRACE_CATEGORIES.has(category) || (typeof status === 'number' && status >= 500)),
  )

  return {
    status: typeof status === 'number' ? status : null,
    code,
    category,
    traceId,
    showTrace,
    title: { en: titleEn, ku: titleKu },
    message: { en: messageEn, ku: messageKu },
    hint: { en: hintEn, ku: hintKu },
    details: extractDetails(data?.details),
  }
}

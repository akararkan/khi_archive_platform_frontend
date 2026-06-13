import { TagsInput } from '@/components/ui/tags-input'
import { canonicalizeKeyword, MAX_KEYWORD_LENGTH } from '@/lib/canonicalize-tag'
import { suggestKeywords } from '@/services/keywords'

// TagsInput pre-wired for the `keywords` field: backend autocomplete
// (cross-entity, trashed-record-free) + client-side canonicalisation. Keywords
// are phrases, so the 200-char cap is wider than tags and spaces are kept —
// TagsInput only commits on comma / Enter / Tab, never on space.
function KeywordSuggestInput(props) {
  return (
    <TagsInput
      suggest={suggestKeywords}
      transform={canonicalizeKeyword}
      maxLength={MAX_KEYWORD_LENGTH}
      placeholder="Type to search keywords…"
      {...props}
    />
  )
}

export { KeywordSuggestInput }

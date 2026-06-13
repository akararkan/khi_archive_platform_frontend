import { TagsInput } from '@/components/ui/tags-input'
import { canonicalizeTag, MAX_TAG_LENGTH } from '@/lib/canonicalize-tag'
import { suggestTags } from '@/services/tags'

// TagsInput pre-wired for the canonical `tags` field: backend autocomplete
// (cross-entity, trashed-record-free) + client-side canonicalisation so chips
// dedupe instantly and show the exact value that will be stored. Use this for
// every `tags` field; keep plain <TagsInput> for free-text multi-value fields
// (subject, keywords, contributors, …) the server doesn't canonicalise.
function TagSuggestInput(props) {
  return (
    <TagsInput
      suggest={suggestTags}
      transform={canonicalizeTag}
      maxLength={MAX_TAG_LENGTH}
      placeholder="Type to search tags…"
      {...props}
    />
  )
}

export { TagSuggestInput }

import { CircleHelp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

// Small (?) button that pops a toast with a field's title + description.
// Used next to every form label across the admin/employee forms so the
// cataloging team can see what each field is for without leaving the
// form. Pass the metadata object directly — when null we render
// nothing so callers can wire `metadataFor(key)` blindly without a
// separate null-check.
function FieldHelpButton({ metadata }) {
  const toast = useToast()

  if (!metadata) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="size-6 rounded-full text-muted-foreground hover:text-foreground"
      onClick={() => toast.toast(metadata.title, metadata.description)}
    >
      <CircleHelp className="size-3.5" />
      <span className="sr-only">Show field help</span>
    </Button>
  )
}

// Label + help-button row. Layout matches the original PersonFieldLabel
// pattern (label on the left, help button right-aligned). Pass either:
//   - `metadata` directly, or
//   - `metadataFor` (a getter) plus `fieldKey` to look up by key
// so call sites can pick whichever is less verbose at their scale.
function FieldLabel({
  htmlFor,
  className,
  metadata,
  metadataFor,
  fieldKey,
  children,
}) {
  const resolved = metadata ?? (metadataFor && fieldKey ? metadataFor(fieldKey) : null)
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className={className || 'text-sm font-medium text-foreground'}>
        {children}
      </Label>
      <FieldHelpButton metadata={resolved} />
    </div>
  )
}

export { FieldHelpButton, FieldLabel }

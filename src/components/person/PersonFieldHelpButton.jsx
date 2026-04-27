import { CircleHelp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getPersonFieldMetadata } from '@/lib/person-fields-metadata'

function PersonFieldHelpButton({ fieldKey }) {
  const toast = useToast()
  const metadata = getPersonFieldMetadata(fieldKey)

  if (!metadata) {
    return null
  }

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

export { PersonFieldHelpButton }

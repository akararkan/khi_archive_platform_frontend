import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Highlight } from '@/components/ui/highlight'

/**
 * A monospace identifier pill with copy-to-clipboard.
 * Used for prominent archive codes like personCode, categoryCode, etc.
 * Pass `highlightQuery` to mark the matching substring of `code` (used by
 * the media search results so the user sees why a row matched on its code).
 */
function CodeBadge({ code, size = 'default', variant = 'solid', className, highlightQuery }) {
  const [copied, setCopied] = useState(false)

  if (!code) return null

  const handleCopy = async (event) => {
    event.stopPropagation()
    event.preventDefault()
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // clipboard unavailable — silent no-op
    }
  }

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    default: 'px-2 py-1 text-[11px] gap-1.5',
    lg: 'px-2.5 py-1.5 text-xs gap-1.5',
  }
  const variantStyles = {
    solid: 'border bg-background shadow-sm hover:bg-muted',
    subtle: 'border bg-muted/40 hover:bg-muted/60',
  }
  const iconSize = size === 'sm' ? 'size-2.5' : 'size-3'

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Copy ${code}`}
      className={cn(
        'group inline-flex items-center rounded-md font-mono font-semibold tracking-[0.08em] text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
    >
      <span className="text-muted-foreground">#</span>
      <span>
        {highlightQuery ? <Highlight text={code} query={highlightQuery} /> : code}
      </span>
      {copied ? (
        <Check className={cn(iconSize, 'text-emerald-500')} />
      ) : (
        <Copy className={cn(iconSize, 'text-muted-foreground/50 transition-colors group-hover:text-foreground')} />
      )}
    </button>
  )
}

export { CodeBadge }

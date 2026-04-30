import { useRef, useState } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Chip-style tag input.
 * - Type and press Enter (or , ; ، Tab) to commit a tag
 * - Backspace on empty input removes the last chip
 * - Pasting "a, b, c" splits into multiple chips
 * - Duplicates are ignored (case-insensitive)
 *
 * Value is an array of strings; onChange receives the new array.
 */
function TagsInput({
  value = [],
  onChange,
  placeholder = 'Type and press Enter…',
  id,
  maxTags,
  disabled = false,
  className,
}) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const commit = (raw) => {
    const parts = String(raw)
      .split(/[,،;]/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (parts.length === 0) return

    const seen = new Set(value.map((v) => v.toLowerCase()))
    const next = [...value]

    for (const part of parts) {
      if (maxTags && next.length >= maxTags) break
      const key = part.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        next.push(part)
      }
    }

    if (next.length !== value.length) onChange(next)
    setDraft('')
  }

  const removeAt = (index) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';' || event.key === 'Tab') {
      if (!draft.trim()) return
      if (event.key === 'Tab' && event.shiftKey) return
      event.preventDefault()
      commit(draft)
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      event.preventDefault()
      removeAt(value.length - 1)
    }
  }

  const handlePaste = (event) => {
    const text = event.clipboardData.getData('text')
    if (/[,;،]/.test(text)) {
      event.preventDefault()
      commit(text)
    }
  }

  const handleBlur = () => {
    if (draft.trim()) commit(draft)
  }

  return (
    <div
      role="group"
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 text-sm shadow-sm transition-colors',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="group/chip inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/60 py-0.5 pl-2 pr-0.5 text-xs font-medium text-foreground animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <span className="max-w-[20ch] truncate">{tag}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              removeAt(index)
            }}
            disabled={disabled}
            className="ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        id={id}
        type="text"
        disabled={disabled || Boolean(maxTags && value.length >= maxTags)}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[10ch] bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  )
}

export { TagsInput }

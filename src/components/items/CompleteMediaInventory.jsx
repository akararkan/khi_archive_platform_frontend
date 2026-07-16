import {
  FIELD_ALIASES,
  FULL_MEDIA_FIELD_GROUPS,
  FULL_SHARED_FIELD_GROUPS,
} from '@/components/khi/KhiPublicMediaFields'
import {
  buildCompleteMediaFieldGroups,
  formatCompleteFieldValue,
  isEmptyValue,
  valueFrom,
} from '@/components/items/full-media-inventory'
import { humanizeFieldName } from '@/lib/get-error-message'
import { cn } from '@/lib/utils'

function InventoryField({ field, item }) {
  const value = valueFrom(item, field, { aliases: FIELD_ALIASES, keepEmpty: true })
  const empty = isEmptyValue(value)
  return (
    <div className={cn('min-w-0 space-y-0.5', empty && 'opacity-60')}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {humanizeFieldName(field)}
      </p>
      <p
        className={cn(
          'whitespace-pre-wrap break-words text-sm leading-6',
          empty ? 'font-mono text-muted-foreground' : 'text-foreground',
        )}
        style={{ overflowWrap: 'anywhere' }}
      >
        {formatCompleteFieldValue(value)}
      </p>
    </div>
  )
}

function CompleteMediaInventory({
  className,
  item,
  kind,
  title = 'Complete field inventory',
}) {
  const groups = buildCompleteMediaFieldGroups(kind, item, {
    aliases: FIELD_ALIASES,
    fieldGroups: FULL_MEDIA_FIELD_GROUPS,
    sharedGroups: FULL_SHARED_FIELD_GROUPS,
  })
  if (!groups.length) return null

  return (
    <section className={cn('rounded-xl border border-border bg-background p-4', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
          All fields · {groups.reduce((total, group) => total + group.fields.length, 0)}
        </span>
      </div>
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.title} className="rounded-xl border border-border/70 bg-muted/10 p-3.5">
            <div className="mb-3 flex items-center gap-2 border-b border-border/70 pb-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/75">
                {group.title}
              </h4>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {group.fields.length}
              </span>
            </div>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.fields.map((field) => (
                <InventoryField key={field} field={field} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export { CompleteMediaInventory }

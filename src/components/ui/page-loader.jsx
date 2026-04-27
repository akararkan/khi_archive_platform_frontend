import { Loader2 } from 'lucide-react'

function PageLoader({ title = 'Loading', description = 'Please wait a moment.' }) {
  return (
    <section className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-8 text-center shadow-sm shadow-black/5">
        <Loader2 className="size-7 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </section>
  )
}

export { PageLoader }
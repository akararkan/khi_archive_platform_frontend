import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const featureChips = ['Fast sign in', 'Password recovery', 'Smooth onboarding']

function AuthShell({ title, description, children, footer, className }) {
  return (
    <section className="mx-auto grid min-h-dvh w-full max-w-6xl grid-cols-1 items-center gap-6 px-4 py-8 md:px-8 lg:grid-cols-[1fr_460px] lg:gap-10">
      <div className="relative hidden lg:block">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/85 p-10 shadow-2xl shadow-black/8 backdrop-blur">
          <div className="pointer-events-none absolute -top-28 -right-16 h-64 w-64 rounded-full bg-primary/14 blur-3xl dark:bg-primary/18" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-accent/35 blur-3xl dark:bg-accent/12" />

          <div className="relative">
            <span className="inline-flex rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground">
              KHI ARCHIVE PLATFORM
            </span>

            <h2 className="mt-5 max-w-lg text-4xl font-semibold leading-tight tracking-tight text-foreground">
              Simple access for your archive workspace.
            </h2>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              A clean and friendly authentication experience for login, registration, and password recovery.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {featureChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-border/80 bg-background/75 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-border/80 bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">Light and dark mode, automatic.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The UI follows your system appearance for a smooth experience across day and night.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card
        className={cn(
          'relative w-full overflow-hidden border-border/70 bg-background/95 py-6 shadow-2xl shadow-black/10 backdrop-blur',
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardHeader className="space-y-2 px-6 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6">{children}</CardContent>
        {footer ? <div className="px-6 pt-2 pb-1 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </Card>
    </section>
  )
}

export { AuthShell }

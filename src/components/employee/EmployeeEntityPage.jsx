function EmployeeEntityPage({ title, description, eyebrow, badge, action, children }) {
  return (
    <section className="space-y-6">
      <div className="space-y-4 border-b border-border pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                {title}
              </h1>
              {badge ? (
                <span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {badge}
                </span>
              ) : null}
            </div>
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>

      {children}
    </section>
  )
}

export { EmployeeEntityPage }

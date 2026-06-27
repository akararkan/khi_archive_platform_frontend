import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, CircleAlert, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LocalizedErrorContent } from '@/components/ui/error-display'
import { cn } from '@/lib/utils'

function hasHint(hint) {
  return Boolean(hint?.en || hint?.ku)
}

function buildErrorSlides(error) {
  if (!error || typeof error === 'string' || !error.i18n) {
    return [{ id: 'summary', label: 'Error summary', error }]
  }

  const view = error.i18n
  const slides = [
    {
      id: 'summary',
      label: 'Error summary',
      error: {
        i18n: {
          ...view,
          details: [],
          hint: { en: '', ku: '' },
          showTrace: false,
        },
      },
    },
  ]

  if (Array.isArray(view.details) && view.details.length > 0) {
    slides.push({
      id: 'fields',
      label: 'Information to review',
      error: {
        i18n: {
          ...view,
          title: {
            en: 'Information to review',
            ku: 'زانیارییەکانی پێداچوونەوە',
          },
          message: {
            en: 'Correct the following fields before trying again.',
            ku: 'پێش هەوڵدانەوە ئەم خانانە ڕاست بکەرەوە.',
          },
          hint: { en: '', ku: '' },
          status: null,
          code: null,
          showTrace: false,
        },
      },
    })
  }

  if (hasHint(view.hint) || (view.showTrace && view.traceId)) {
    slides.push({
      id: 'guidance',
      label: 'Next steps',
      error: {
        i18n: {
          ...view,
          title: {
            en: 'What to do next',
            ku: 'چی بکەیت',
          },
          message: hasHint(view.hint)
            ? view.hint
            : {
                en: 'Share the support reference below if the problem continues.',
                ku: 'ئەگەر کێشەکە بەردەوام بوو، ژمارەی پاڵپشتی خوارەوە بنێرە.',
              },
          details: [],
          hint: { en: '', ku: '' },
          status: null,
          code: null,
        },
      },
    })
  }

  return slides
}

function ErrorSlideshow({ error, className }) {
  const titleId = useId()
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)
  const closeTimerRef = useRef(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [isMounted, setIsMounted] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const slides = useMemo(() => buildErrorSlides(error), [error])
  const slide = slides[Math.min(activeSlide, slides.length - 1)]
  const isFirst = activeSlide === 0
  const isLast = activeSlide === slides.length - 1

  const close = useCallback(() => {
    setIsVisible(false)
    closeTimerRef.current = window.setTimeout(() => setIsMounted(false), 180)
  }, [])

  useEffect(() => {
    if (!isMounted) return undefined

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true)
      closeButtonRef.current?.focus()
    })
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') {
        setActiveSlide((current) => Math.min(current + 1, slides.length - 1))
      }
      if (event.key === 'ArrowLeft') {
        setActiveSlide((current) => Math.max(current - 1, 0))
      }
      if (event.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [close, isMounted, slides.length])

  if (!isMounted) return null

  const modal = (
    <div
      className={cn(
        'fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto p-4 transition-all duration-200 sm:p-6',
        isVisible
          ? 'bg-slate-950/45 opacity-100 backdrop-blur-md'
          : 'bg-slate-950/0 opacity-0 backdrop-blur-none',
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <section
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative my-auto w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/15 bg-card/95 text-card-foreground shadow-2xl shadow-black/30 ring-1 ring-black/5 backdrop-blur-xl transition-all duration-200',
          isVisible ? 'translate-y-0 scale-100' : 'translate-y-6 scale-[0.97]',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive via-rose-400 to-amber-300"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-destructive/10 blur-3xl"
        />

        <header className="relative flex items-start gap-4 border-b border-border/70 px-5 pb-4 pt-6 sm:px-7 sm:pb-5 sm:pt-7">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm shadow-destructive/10">
            <CircleAlert className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-destructive">
              Action needed
            </p>
            <h2 id={titleId} className="mt-1 font-heading text-xl font-semibold tracking-tight text-foreground">
              Something needs your attention
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Review the message, then return to the form and make the correction.
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={close}
            className="-mr-1 -mt-1 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close error"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {slide.label}
            </p>
            {slides.length > 1 ? (
              <p className="text-[10px] font-medium tabular-nums text-muted-foreground">
                {activeSlide + 1} / {slides.length}
              </p>
            ) : null}
          </div>

          <div
            key={slide.id}
            className="max-h-[48vh] min-h-28 overflow-y-auto rounded-2xl border border-border/70 bg-background/75 p-4 shadow-inner shadow-black/[0.025] animate-in fade-in-0 slide-in-from-right-3 duration-300 sm:p-5"
          >
            <LocalizedErrorContent error={slide.error} presentation="card" />
          </div>

          {slides.length > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-1.5" aria-label="Error slides">
              {slides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Show ${item.label}`}
                  aria-current={index === activeSlide ? 'step' : undefined}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === activeSlide
                      ? 'w-7 bg-destructive'
                      : 'w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/45',
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>

        <footer className="relative flex items-center justify-between gap-3 border-t border-border/70 bg-muted/25 px-5 py-4 sm:px-7">
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            Use ← → to move between slides · Esc to close
          </p>
          <div className="ml-auto flex items-center gap-2">
            {!isFirst ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSlide((current) => current - 1)}
                className="gap-1.5 rounded-xl"
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
            ) : null}
            {!isLast ? (
              <Button
                type="button"
                onClick={() => setActiveSlide((current) => current + 1)}
                className="gap-1.5 rounded-xl"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button type="button" onClick={close} className="rounded-xl px-5">
                Return to form
              </Button>
            )}
          </div>
        </footer>
      </section>
    </div>
  )

  return createPortal(modal, document.body)
}

// Shared across authentication, profile, person, category, project, and all
// media forms. Errors appear above the interface instead of shifting layouts.
function FormErrorBox({ error, className }) {
  if (!error || typeof document === 'undefined') return null
  return <ErrorSlideshow error={error} className={className} />
}

export { FormErrorBox }

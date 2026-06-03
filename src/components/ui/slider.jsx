import { Slider as BaseSlider } from '@base-ui/react/slider'

import { cn } from '@/lib/utils'

function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  thumbClassName,
  trackClassName,
  indicatorClassName,
  ariaLabel,
  children,
  ...rest
}) {
  const thumbCount = Array.isArray(value)
    ? value.length
    : Array.isArray(defaultValue)
      ? defaultValue.length
      : 1

  return (
    <BaseSlider.Root
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      {...rest}
    >
      <BaseSlider.Control className="relative flex h-6 w-full items-center">
        <BaseSlider.Track
          className={cn(
            'relative h-2 w-full grow overflow-hidden rounded-full bg-muted/70',
            trackClassName,
          )}
        >
          <BaseSlider.Indicator
            className={cn(
              'absolute h-full rounded-full bg-gradient-to-r from-primary/70 to-primary',
              indicatorClassName,
            )}
          />
        </BaseSlider.Track>
        {Array.from({ length: thumbCount }).map((_, i) => (
          <BaseSlider.Thumb
            key={i}
            index={i}
            aria-label={ariaLabel}
            className={cn(
              'block size-5 shrink-0 rounded-full border-2 border-primary bg-background',
              'shadow-[0_1px_6px_hsl(var(--primary)/0.35)]',
              'outline-none transition-all duration-150',
              'hover:scale-110 hover:shadow-[0_2px_10px_hsl(var(--primary)/0.45)]',
              'focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'data-dragging:scale-125 data-dragging:shadow-[0_3px_14px_hsl(var(--primary)/0.55)]',
              'disabled:pointer-events-none disabled:opacity-50',
              thumbClassName,
            )}
          />
        ))}
      </BaseSlider.Control>
      {children}
    </BaseSlider.Root>
  )
}

export { Slider }

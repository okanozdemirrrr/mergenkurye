/**
 * Scroll-triggered build animation engine
 * wireframe → filling → complete (one-way; never reverts)
 */

export type BuildStage = 'wireframe' | 'filling' | 'complete'

export interface ScrollBuildOptions {
  /** Root to observe (default: document) */
  root?: Element | Document | null
  /** Selector for sections (default: .build-section) */
  sectionSelector?: string
  /** Selector for elements (default: .build-element) */
  elementSelector?: string
  /** Progress thresholds */
  wireframeMax?: number
  completeMin?: number
}

const DEFAULTS = {
  sectionSelector: '.build-section',
  elementSelector: '.build-element',
  wireframeMax: 0.08,
  completeMin: 0.92,
} as const

const MOBILE_MQ = '(max-width: 767px)'
const REDUCED_MOTION_MQ = '(prefers-reduced-motion: reduce)'

type ElementState = {
  el: HTMLElement
  completed: boolean
  delayMs: number
  isTypewriter: boolean
  originalText: string
  revealed: number
  stage: BuildStage
  progress: number
  bootstrapped: boolean
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia(REDUCED_MOTION_MQ).matches
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(MOBILE_MQ).matches
}

/** Viewport progress: top at bottom → 0, center → ~0.5, top at top → 1 */
export function calcViewportProgress(el: Element): number {
  const rect = el.getBoundingClientRect()
  const viewH = window.innerHeight || 1
  // Element fully above viewport → complete
  if (rect.bottom <= 0) return 1
  // Element fully below viewport → not started
  if (rect.top >= viewH) return 0
  const raw = (viewH - rect.top) / (viewH + rect.height * 0.35)
  return Math.min(1, Math.max(0, raw))
}

function isFullyAboveViewport(el: Element): boolean {
  return el.getBoundingClientRect().bottom <= 0
}

function parseDelay(el: HTMLElement): number {
  const raw = el.getAttribute('data-build-delay')
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function setStage(el: HTMLElement, stage: BuildStage) {
  el.setAttribute('data-build-stage', stage)
}

function setProgress(el: HTMLElement, progress: number) {
  el.style.setProperty('--build-progress', String(progress))
}

function markComplete(state: ElementState) {
  state.completed = true
  state.stage = 'complete'
  state.progress = 1
  setProgress(state.el, 1)
  setStage(state.el, 'complete')
  state.el.classList.add('build-complete')
  state.el.style.willChange = 'auto'

  if (state.isTypewriter && state.originalText) {
    state.el.textContent = state.originalText
    state.revealed = Array.from(state.originalText).length
  }
}

function applyTypewriter(state: ElementState, progress: number, mobile: boolean) {
  if (!state.isTypewriter || !state.originalText || mobile) {
    if (state.isTypewriter && mobile && state.originalText) {
      // Keep a single text node so React children stay in sync when possible
      if (state.el.firstChild?.nodeType === Node.TEXT_NODE) {
        state.el.firstChild.textContent = state.originalText
      } else {
        state.el.textContent = state.originalText
      }
    }
    return
  }

  const chars = Array.from(state.originalText)
  const target = Math.floor(progress * chars.length)
  if (target === state.revealed) return
  state.revealed = target
  const next = chars.slice(0, target).join('')
  // Prefer mutating the existing text node to reduce React fights
  if (state.el.childNodes.length === 1 && state.el.firstChild?.nodeType === Node.TEXT_NODE) {
    state.el.firstChild.textContent = next
  } else {
    state.el.textContent = next
  }
}

function applyFillVisuals(state: ElementState, effectiveProgress: number, mobile: boolean) {
  const p = effectiveProgress
  setProgress(state.el, p)

  // Image / media reveal via clip-path
  if (state.el.matches('img, picture, video, .build-reveal')) {
    const pct = Math.round(p * 100)
    state.el.style.clipPath = p >= 1 ? 'none' : `inset(0 ${100 - pct}% 0 0)`
  }

  applyTypewriter(state, p, mobile)

  if (p <= DEFAULTS.wireframeMax) {
    if (state.stage !== 'wireframe') {
      state.stage = 'wireframe'
      setStage(state.el, 'wireframe')
    }
  } else if (p >= DEFAULTS.completeMin) {
    markComplete(state)
  } else if (state.stage !== 'filling') {
    state.stage = 'filling'
    setStage(state.el, 'filling')
  }
}

export class ScrollBuildController {
  private options: Required<Pick<ScrollBuildOptions, 'sectionSelector' | 'elementSelector' | 'wireframeMax' | 'completeMin'>> & {
    root: Element | Document | null
  }
  private states = new Map<HTMLElement, ElementState>()
  private sectionObserver: IntersectionObserver | null = null
  private elementObserver: IntersectionObserver | null = null
  private rafId: number | null = null
  private ticking = false
  private destroyed = false
  private mobile = false
  private reduced = false
  private onScroll: () => void
  private onResize: () => void
  private mediaMobile: MediaQueryList | null = null
  private mediaReduced: MediaQueryList | null = null

  constructor(options: ScrollBuildOptions = {}) {
    this.options = {
      root: options.root ?? null,
      sectionSelector: options.sectionSelector ?? DEFAULTS.sectionSelector,
      elementSelector: options.elementSelector ?? DEFAULTS.elementSelector,
      wireframeMax: options.wireframeMax ?? DEFAULTS.wireframeMax,
      completeMin: options.completeMin ?? DEFAULTS.completeMin,
    }

    this.onScroll = () => this.scheduleUpdate()
    this.onResize = () => {
      this.mobile = isMobile()
      this.scheduleUpdate()
    }
  }

  init(): void {
    if (typeof window === 'undefined' || this.destroyed) return

    this.reduced = prefersReducedMotion()
    this.mobile = isMobile()

    const scope: ParentNode =
      this.options.root && 'querySelectorAll' in this.options.root
        ? (this.options.root as ParentNode)
        : document

    const elements = Array.from(
      scope.querySelectorAll<HTMLElement>(this.options.elementSelector)
    )

    if (elements.length === 0) return

    // Reduced motion → everything complete immediately
    if (this.reduced) {
      for (const el of elements) {
        const state = this.createState(el)
        markComplete(state)
        this.states.set(el, state)
      }
      return
    }

    for (const el of elements) {
      const state = this.createState(el)
      this.states.set(el, state)

      // Already scrolled past → stay complete (mid-page refresh)
      if (isFullyAboveViewport(el)) {
        markComplete(state)
        continue
      }

      // Prepare wireframe start
      el.style.willChange = 'transform, opacity'
      setProgress(el, 0)
      setStage(el, 'wireframe')
      state.stage = 'wireframe'

      if (state.isTypewriter && !this.mobile) {
        state.el.textContent = ''
      }
    }

    this.elementObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement
          const state = this.states.get(el)
          if (!state || state.completed) continue

          if (entry.isIntersecting) {
            this.bootstrapIfNeeded(state)
          }
        }
        this.scheduleUpdate()
      },
      {
        root: this.options.root instanceof Element ? this.options.root : null,
        rootMargin: '12% 0px 12% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    )

    this.sectionObserver = new IntersectionObserver(
      () => this.scheduleUpdate(),
      {
        root: this.options.root instanceof Element ? this.options.root : null,
        rootMargin: '0px',
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      }
    )

    const sections = Array.from(
      scope.querySelectorAll<HTMLElement>(this.options.sectionSelector)
    )
    for (const section of sections) {
      this.sectionObserver.observe(section)
    }
    for (const el of elements) {
      const state = this.states.get(el)
      if (state && !state.completed) {
        this.elementObserver.observe(el)
      }
    }

    window.addEventListener('scroll', this.onScroll, { passive: true })
    window.addEventListener('resize', this.onResize, { passive: true })

    this.mediaMobile = window.matchMedia(MOBILE_MQ)
    this.mediaReduced = window.matchMedia(REDUCED_MOTION_MQ)
    this.mediaMobile.addEventListener('change', this.onResize)
    this.mediaReduced.addEventListener('change', () => {
      if (prefersReducedMotion()) {
        for (const state of this.states.values()) {
          if (!state.completed) markComplete(state)
        }
      }
    })

    // First paint update + bootstrap in-view hero elements
    requestAnimationFrame(() => {
      for (const state of this.states.values()) {
        if (state.completed) continue
        const rect = state.el.getBoundingClientRect()
        const inView = rect.top < window.innerHeight && rect.bottom > 0
        if (inView) this.bootstrapIfNeeded(state)
      }
      this.updateAll()
    })
  }

  private createState(el: HTMLElement): ElementState {
    const isTypewriter = el.classList.contains('build-typewriter')
    // Prefer data-build-text so React re-renders don't fight the typewriter
    const fromAttr = el.getAttribute('data-build-text')
    const originalText = isTypewriter
      ? (fromAttr ?? el.textContent ?? '')
      : ''
    if (isTypewriter && fromAttr != null) {
      el.setAttribute('aria-label', fromAttr)
    }
    return {
      el,
      completed: false,
      delayMs: this.mobile ? Math.min(parseDelay(el), 80) : parseDelay(el),
      isTypewriter,
      originalText,
      revealed: 0,
      stage: 'wireframe',
      progress: 0,
      bootstrapped: false,
    }
  }

  /**
   * Above-the-fold elements would otherwise jump to high progress.
   * Bootstrap lerps 0 → scrollTarget so hero still "builds" on first paint.
   */
  private bootstrapIfNeeded(state: ElementState) {
    if (state.bootstrapped || state.completed) return
    state.bootstrapped = true

    const target = calcViewportProgress(state.el)
    // Mid/low on page — pure scroll drive is fine
    if (target < 0.35) return

    const start = performance.now()
    const duration = this.mobile ? 480 : 900
    const delay = state.delayMs

    const tick = (now: number) => {
      if (this.destroyed || state.completed) return
      const elapsed = now - start - delay
      if (elapsed < 0) {
        requestAnimationFrame(tick)
        return
      }
      const t = Math.min(1, elapsed / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const blended = eased * Math.max(target, 0.98)
      applyFillVisuals(state, blended, this.mobile)
      if (t < 1 && !state.completed) {
        requestAnimationFrame(tick)
      } else if (!state.completed) {
        markComplete(state)
      }
    }
    requestAnimationFrame(tick)
  }

  private scheduleUpdate() {
    if (this.ticking || this.destroyed) return
    this.ticking = true
    this.rafId = requestAnimationFrame(() => {
      this.ticking = false
      this.updateAll()
    })
  }

  private updateAll() {
    if (this.destroyed) return
    this.mobile = isMobile()

    for (const state of this.states.values()) {
      if (state.completed) continue

      const scrollP = calcViewportProgress(state.el)

      // Stagger: delay shifts when fill begins (as fraction of progress)
      const delayFrac = Math.min(0.35, state.delayMs / 1200)
      let effective = 0
      if (scrollP > delayFrac) {
        effective = (scrollP - delayFrac) / (1 - delayFrac)
      }
      effective = Math.min(1, Math.max(0, effective))

      // During bootstrap lerp, don't fight with lower scroll values
      if (state.bootstrapped && state.progress > effective && state.progress < 1) {
        continue
      }

      applyFillVisuals(state, effective, this.mobile)
      state.progress = effective
    }
  }

  refresh(): void {
    this.scheduleUpdate()
  }

  destroy(): void {
    this.destroyed = true
    if (this.rafId != null) cancelAnimationFrame(this.rafId)
    this.sectionObserver?.disconnect()
    this.elementObserver?.disconnect()
    window.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('resize', this.onResize)
    this.mediaMobile?.removeEventListener('change', this.onResize)
    this.states.clear()
  }
}

/** Convenience: init and return disposer */
export function initScrollBuild(options?: ScrollBuildOptions): () => void {
  const controller = new ScrollBuildController(options)
  controller.init()
  return () => controller.destroy()
}

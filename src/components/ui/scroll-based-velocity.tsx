"use client"

import React, { useContext, useEffect, useRef, useState } from "react"
import {
  cancelFrame,
  frame,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react"
import type { MotionValue } from "motion/react"

import { cn } from "@/lib/utils"

interface ScrollVelocityRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  baseVelocity?: number
  direction?: 1 | -1
  scrollReactivity?: boolean
  vertical?: boolean
  pauseOnHover?: boolean
}

export const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min
}

// Below this scroll speed (px/s) the marquee ignores scroll entirely, so slow
// scrolling keeps a steady base speed instead of wobbling on every micro-scroll.
const VELOCITY_DEADZONE = 120
// Velocity range above the deadzone over which the factor ramps from 0 to its cap.
const VELOCITY_RANGE = 1000
const MAX_VELOCITY_FACTOR = 5
// Direction only flips once the (smoothed) factor is clearly directional, so slow
// scroll never flickers the rows back and forth around zero.
const DIRECTION_FLIP_THRESHOLD = 0.6
// Time constant (s) for the per-frame follow of the applied velocity factor. Every
// frame the factor eases toward its target over ~this long, so even if the source
// velocity spikes between frames the marquee speed only ever changes smoothly.
const FACTOR_SMOOTHING_TAU = 0.18

function mapVelocityToFactor(v: number) {
  const abs = Math.abs(v)
  if (abs < VELOCITY_DEADZONE) return 0
  const sign = v < 0 ? -1 : 1
  const t = Math.min(1, (abs - VELOCITY_DEADZONE) / VELOCITY_RANGE)
  const eased = t * t * (3 - 2 * t) // smoothstep → gentle onset, no sudden jump
  return sign * eased * MAX_VELOCITY_FACTOR
}

// Shared scroll-velocity pipeline: native scroll position → velocity → softened
// spring → deadzoned factor. The spring is the first-stage low-pass that filters
// the high-frequency jitter discrete scroll events produce at slow speeds; each
// row then applies a second-stage per-frame follow (see FACTOR_SMOOTHING_TAU).
function useScrollVelocityFactor() {
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 60,
    stiffness: 200,
    restDelta: 0.5,
  })
  return useTransform(smoothVelocity, mapVelocityToFactor)
}

const ScrollVelocityContext = React.createContext<MotionValue<number> | null>(
  null
)

export function ScrollVelocityContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const velocityFactor = useScrollVelocityFactor()

  return (
    <ScrollVelocityContext.Provider value={velocityFactor}>
      <div className={cn("relative w-full", className)} {...props}>
        {children}
      </div>
    </ScrollVelocityContext.Provider>
  )
}

export function ScrollVelocityRow(props: ScrollVelocityRowProps) {
  const sharedVelocityFactor = useContext(ScrollVelocityContext)
  if (sharedVelocityFactor) {
    return (
      <ScrollVelocityRowImpl {...props} velocityFactor={sharedVelocityFactor} />
    )
  }
  return <ScrollVelocityRowLocal {...props} />
}

interface ScrollVelocityRowImplProps extends ScrollVelocityRowProps {
  velocityFactor: MotionValue<number>
}

function ScrollVelocityRowImpl({
  children,
  baseVelocity = 5,
  direction = 1,
  className,
  velocityFactor,
  scrollReactivity = true,
  vertical = false,
  pauseOnHover = false,
  ...props
}: ScrollVelocityRowImplProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const [numCopies, setNumCopies] = useState(1)

  const baseX = useMotionValue(0)
  const baseDirectionRef = useRef<number>(direction >= 0 ? 1 : -1)
  const currentDirectionRef = useRef<number>(direction >= 0 ? 1 : -1)
  const smoothedFactorRef = useRef(0)
  const unitSize = useMotionValue(0)

  const isInViewRef = useRef(true)
  const isPageVisibleRef = useRef(true)
  const isHoveredRef = useRef(false)
  const prefersReducedMotionRef = useRef(false)

  // Valores lidos pelo tick. Ficam num ref porque o callback assinado no
  // frameloop precisa de identidade ESTÁVEL: `cancelFrame` só cancela a mesma
  // função que `frame.update` recebeu.
  const tickPropsRef = useRef({
    baseVelocity,
    scrollReactivity,
    pauseOnHover,
    velocityFactor,
  })
  useEffect(() => {
    tickPropsRef.current = {
      baseVelocity,
      scrollReactivity,
      pauseOnHover,
      velocityFactor,
    }
  })

  // Medida do bloco e número de cópias. Separado do ciclo de vida da
  // assinatura porque depende de `children`, que muda de identidade a cada
  // render do pai — e religar observers de visibilidade nesse ritmo seria
  // troca de um problema barato por churn.
  useEffect(() => {
    const container = containerRef.current
    const block = blockRef.current
    if (!container || !block) return

    const updateSizes = () => {
      const cs = vertical
        ? container.offsetHeight || 0
        : container.offsetWidth || 0
      const bs = vertical ? block.scrollHeight || 0 : block.scrollWidth || 0
      unitSize.set(bs)
      const nextCopies = bs > 0 ? Math.max(3, Math.ceil(cs / bs) + 2) : 1
      setNumCopies((prev) => (prev === nextCopies ? prev : nextCopies))
    }

    updateSizes()

    const ro = new ResizeObserver(updateSizes)
    ro.observe(container)
    ro.observe(block)

    return () => ro.disconnect()
  }, [children, unitSize, vertical])

  // O guard de viewport governa a ASSINATURA, não o corpo do callback.
  //
  // Antes, `useAnimationFrame` mantinha `frame.update(cb, keepAlive: true)`
  // vivo pela vida inteira da página e o corpo retornava cedo quando a linha
  // estava fora da tela. Medido na baseline desta change: com o scroll no
  // rodapé e as SEIS linhas de marquee reportando `inView: false`, o batcher
  // do Motion seguia sendo chamado 60 vezes por segundo, sem nada para fazer.
  // O guard resolvia o trabalho útil e não resolvia o custo do agendamento,
  // que é o que impede a thread principal de dormir.
  //
  // `frame.update`/`cancelFrame` é exatamente o par que `useAnimationFrame`
  // usa por dentro; o que muda é quem decide o tempo de vida da assinatura.
  // Cancelados todos os assinantes, o batcher PARA — ele só se reagenda em
  // `if (runNextFrame && allowKeepAlive)` — e volta sozinho por `wake()` na
  // próxima vez que qualquer coisa do Motion agendar trabalho.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let subscribed = false

    const tick = ({ delta }: { delta: number }) => {
      const { baseVelocity: bv, scrollReactivity: sr, pauseOnHover: poh, velocityFactor: vfm } =
        tickPropsRef.current
      // Hover continua sendo guard DE CORPO, de propósito: é estado momentâneo
      // de uma linha visível, e desassinar/reassinar a cada entrada de ponteiro
      // trocaria um custo barato por churn de assinatura.
      if (poh && isHoveredRef.current) return

      const dt = delta / 1000
      // Ease the applied factor toward its target every frame (frame-rate independent),
      // so spikes in the source velocity become a smooth ramp instead of frame-to-frame
      // wobble on slow scroll.
      const target = sr ? vfm.get() : 0
      const alpha = 1 - Math.exp(-dt / FACTOR_SMOOTHING_TAU)
      smoothedFactorRef.current += (target - smoothedFactorRef.current) * alpha
      const vf = smoothedFactorRef.current
      const absVf = Math.min(MAX_VELOCITY_FACTOR, Math.abs(vf))
      const speedMultiplier = prefersReducedMotionRef.current ? 1 : 1 + absVf

      if (absVf > DIRECTION_FLIP_THRESHOLD) {
        const scrollDirection = vf >= 0 ? 1 : -1
        currentDirectionRef.current = baseDirectionRef.current * scrollDirection
      }

      const size = unitSize.get() || 0
      if (size <= 0) return
      const pixelsPerSecond = (size * bv) / 100
      const moveBy =
        currentDirectionRef.current * pixelsPerSecond * speedMultiplier * dt
      baseX.set(baseX.get() + moveBy)
    }

    const sync = () => {
      const shouldRun = isInViewRef.current && isPageVisibleRef.current
      if (shouldRun && !subscribed) {
        // `keepAlive: true` mantém a assinatura viva entre frames — é o mesmo
        // que `useAnimationFrame` fazia. A diferença é que agora ela termina.
        frame.update(tick, true)
        subscribed = true
      } else if (!shouldRun && subscribed) {
        cancelFrame(tick)
        subscribed = false
      }
    }

    const handleVisibility = () => {
      isPageVisibleRef.current = document.visibilityState === "visible"
      sync()
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handlePRM = () => {
      prefersReducedMotionRef.current = mq.matches
    }

    // Um elemento em `display: none` reporta `isIntersecting: false`, então as
    // colunas escondidas por breakpoint caem aqui sem precisar de `matchMedia`.
    const io = new IntersectionObserver(([entry]) => {
      isInViewRef.current = entry.isIntersecting
      sync()
    })
    io.observe(container)

    document.addEventListener("visibilitychange", handleVisibility, {
      passive: true,
    })
    mq.addEventListener("change", handlePRM)

    handlePRM()
    isPageVisibleRef.current = document.visibilityState === "visible"
    // Estado inicial pessimista: o `IntersectionObserver` dispara logo após a
    // montagem e liga a assinatura se for o caso. Começar assinado deixaria a
    // página gastando frames até a primeira notificação.
    isInViewRef.current = false

    return () => {
      io.disconnect()
      document.removeEventListener("visibilitychange", handleVisibility)
      mq.removeEventListener("change", handlePRM)
      if (subscribed) cancelFrame(tick)
    }
  }, [baseX, unitSize])

  // Número, não string com sufixo `px`: o Motion já interpreta número em
  // `x`/`y` como pixels, e montar um template por linha por frame era ~240
  // strings efêmeras por segundo alimentando o GC, indefinidamente.
  const translate = useTransform([baseX, unitSize], ([v, size]) => {
    const unit = Number(size) || 1
    const offset = Number(v) || 0
    return -wrap(0, unit, offset)
  })

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden",
        vertical ? "h-full" : "w-full whitespace-nowrap",
        className
      )}
      onMouseEnter={
        pauseOnHover
          ? () => {
              isHoveredRef.current = true
            }
          : undefined
      }
      onMouseLeave={
        pauseOnHover
          ? () => {
              isHoveredRef.current = false
            }
          : undefined
      }
      {...props}
    >
      <motion.div
        className={cn(
          "transform-gpu will-change-transform select-none",
          vertical ? "flex flex-col" : "inline-flex items-center"
        )}
        style={vertical ? { y: translate } : { x: translate }}
      >
        {Array.from({ length: numCopies }).map((_, i) => (
          <div
            key={i}
            ref={i === 0 ? blockRef : null}
            aria-hidden={i !== 0}
            className={cn(
              "shrink-0",
              vertical ? "flex flex-col" : "inline-flex items-center"
            )}
          >
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

function ScrollVelocityRowLocal(props: ScrollVelocityRowProps) {
  const localVelocityFactor = useScrollVelocityFactor()
  return (
    <ScrollVelocityRowImpl {...props} velocityFactor={localVelocityFactor} />
  )
}

'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent as ReactPointerEvent, ReactElement, ReactNode, SVGProps } from 'react'
import Link from 'next/link'
import { AnimatePresence, LazyMotion, animate, domAnimation, m, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import {
  ArrowRight,
  Cable,
  ChartNoAxesColumnIncreasing,
  FilePen,
  FileText,
  ScanLine,
  Menu,
  MousePointer2,
  Play,
  ShieldCheck,
  Workflow,
  X,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Block stylesheet. Inlined so the published component is self-contained.
const BLOCK_CSS = `
:root {
  --color-n3-page: #f8f7f3;
  --color-n3-ink: #171717;
  --color-n3-grey: #74716c;
  --color-n3-line: #d9d6d0;
  --color-n3-accent: #ff7a2f;

  /* Onest, loaded from Google Fonts in layout.tsx via Next.js next/font */
  --font-n3-sans: var(--font-onest), ui-sans-serif, system-ui, sans-serif;
}

/* ---------- One alignment system: the nav and the hero share it ---------- */
.n3-root {
  --n3-gutter: 20px;
  --n3-nav-space: 76px;
}

@media (min-width: 640px) {
  .n3-root {
    --n3-gutter: 32px;
  }
}

@media (min-width: 1024px) {
  .n3-root {
    --n3-gutter: 56px;
  }
}

.n3-frame {
  padding-left: var(--n3-gutter);
  padding-right: var(--n3-gutter);
}

.n3-hero {
  min-height: calc(100dvh - var(--n3-nav-space));
}

@media (max-width: 1023px) {
  .n3-hero {
    min-height: 0;
  }
}

/* ---------- Type ---------- */
.n3-h1 {
  font-size: clamp(2.5rem, 1.1rem + 3.6vw, 4.35rem);
  line-height: 1.06;
  letter-spacing: -0.035em;
}

/* ---------- Background: warm paper, one soft light behind the visual ---------- */
.n3-bg {
  background:
    radial-gradient(ellipse 60% 70% at 74% 52%, rgb(255 255 255 / 0.95) 0%, rgb(255 255 255 / 0) 70%),
    radial-gradient(ellipse 40% 45% at 78% 58%, rgb(255 122 47 / 0.07) 0%, rgb(255 122 47 / 0) 70%),
    radial-gradient(ellipse 50% 40% at 100% 0%, rgb(233 230 223 / 0.7) 0%, rgb(233 230 223 / 0) 70%),
    var(--color-n3-page);
}

.n3-halo {
  border-radius: 9999px;
  background: radial-gradient(closest-side, rgb(255 255 255 / 0.9), rgb(255 255 255 / 0));
}

/* The floor grid runs under the whole hero */
.n3-floor,
.n3-floor-lit {
  --n3-floor-area: radial-gradient(ellipse 75% 80% at 72% 70%, #000 20%, transparent 100%);
  --n3-floor-edges:
    linear-gradient(to left, transparent 0%, #000 22%), linear-gradient(to top, transparent 0%, #000 28%);

  -webkit-mask-image: var(--n3-floor-area), var(--n3-floor-edges);
  mask-image: var(--n3-floor-area), var(--n3-floor-edges);
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}

.n3-floor {
  opacity: 0.35;
}

.n3-floor-spot {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 400ms ease;
  will-change: transform, opacity;
  -webkit-mask-image: radial-gradient(closest-side, #000 0%, transparent 100%);
  mask-image: radial-gradient(closest-side, #000 0%, transparent 100%);
}

.n3-floor-lit {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

[data-spot='on'] > .n3-floor-spot {
  opacity: 0.7;
}

@media (max-width: 1023px) {
  .n3-floor,
  .n3-floor-lit {
    --n3-floor-area: radial-gradient(ellipse 90% 60% at 50% 75%, #000 20%, transparent 100%);
  }
}

.n3-fade-edge {
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 14%);
  mask-image: linear-gradient(to right, transparent 0%, #000 14%);
}

@media (max-width: 1023px) {
  .n3-fade-edge {
    -webkit-mask-image: none;
    mask-image: none;
  }
}

/* ---------- Nav ---------- */
.n3-nav-bar {
  border-bottom: 1px solid transparent;
  transition:
    background-color 300ms ease,
    border-color 300ms ease;
}

.n3-nav-bar-scrolled {
  background-color: rgb(248 247 243 / 0.78);
  border-bottom-color: rgb(23 23 23 / 0.06);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

/* ---------- Label flip ---------- */
.n3-flip {
  perspective: 600px;
}

.n3-flip-box {
  --d: 0.75em;
  display: inline-grid;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--d) * -1)) rotateX(0deg);
  transition: transform 550ms cubic-bezier(0.22, 1, 0.36, 1);
}

.n3-flip-face {
  grid-area: 1 / 1;
  display: inline-flex;
  height: 1.5em;
  align-items: center;
  justify-content: center;
  line-height: 1.5em;
  backface-visibility: hidden;
  transform: translateZ(var(--d));
}

.n3-flip-back {
  transform: rotateX(-90deg) translateZ(var(--d));
}

.n3-flip:hover .n3-flip-box,
.n3-flip:focus-visible .n3-flip-box {
  transform: translateZ(calc(var(--d) * -1)) rotateX(90deg);
}

@media (prefers-reduced-motion: reduce) {
  .n3-flip-box {
    transition: none;
  }

  .n3-flip:hover .n3-flip-box,
  .n3-flip:focus-visible .n3-flip-box {
    transform: translateZ(calc(var(--d) * -1));
  }
}

.n3-dot {
  box-shadow: 0 0 0 4px rgb(255 122 47 / 0.14);
}

.n3-rise {
  animation: n3-rise 700ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.n3-drop {
  animation: n3-drop 600ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.n3-enter {
  animation: n3-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) 250ms backwards;
}

@keyframes n3-rise {
  from {
    opacity: 0;
    translate: 0 18px;
  }
}

@keyframes n3-drop {
  from {
    opacity: 0;
    translate: 0 -12px;
  }
}

@keyframes n3-enter {
  from {
    opacity: 0;
    scale: 0.97;
  }
}

@media (prefers-reduced-motion: reduce) {
  .n3-rise,
  .n3-drop,
  .n3-enter {
    animation: none;
  }
}

@keyframes n3-float {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(var(--n3-float, 6) * -1px));
  }
}

.n3-float {
  animation: n3-float var(--n3-float-seconds, 6.5s) ease-in-out infinite alternate;
}

@keyframes n3-seam {
  from {
    opacity: 0.78;
  }
  to {
    opacity: 1;
  }
}

.n3-seam-pulse {
  animation: n3-seam 4.8s ease-in-out infinite alternate;
}

@media (prefers-reduced-motion: reduce) {
  .n3-float,
  .n3-seam-pulse {
    animation: none;
  }
}

.n3-stage-card {
  border: 1px solid rgb(23 23 23 / 0.06);
  border-radius: 1.3em;
  background: rgb(255 255 255 / 0.82);
  box-shadow:
    0 1px 2px rgb(60 50 40 / 0.04),
    0 14px 34px -18px rgb(90 78 62 / 0.3),
    inset 0 1px 0 rgb(255 255 255 / 0.9);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  transition:
    border-color 300ms ease,
    box-shadow 300ms ease;
}

.n3-stage-card-lit {
  border-color: rgb(255 122 47 / 0.35);
  box-shadow:
    0 1px 2px rgb(60 50 40 / 0.04),
    0 18px 38px -18px rgb(255 122 47 / 0.4),
    inset 0 1px 0 rgb(255 255 255 / 0.9);
}

@container (max-width: 640px) {
  .n3-stage-apps {
    display: none;
  }
}
`

// ───── Geometry Engine ─────
const ISO_X = 0.866
const ISO_Y = 0.5
const CX = 500
const CY = 500
const RING_FLATTEN = 0.57
const RING_RX = [400, 530] as const

type SlabType = {
  half: number
  radius: number
  top: number
  depth: number
}

const BASE: SlabType = { half: 168, radius: 40, top: 475, depth: 34 }
const SEAM_GAP = 9
const MID: SlabType = { half: 151, radius: 36, top: BASE.top - SEAM_GAP - 28, depth: 28 }
const CAP: SlabType = { half: 101, radius: 28, top: MID.top - 14, depth: 14 }

type Point = [number, number]
const round = (n: number) => Math.round(n * 100) / 100

const project = (x: number, y: number, cx = CX, cy = CY): Point => {
  return [cx + (x - y) * ISO_X, cy + (x + y) * ISO_Y]
}

const footprint = (half: number, radius: number, steps = 14): Point[] => {
  const r = Math.min(radius, half)
  const c = half - r
  const corners: [number, number, number][] = [
    [c, c, 0],
    [-c, c, 90],
    [-c, -c, 180],
    [c, -c, 270]
  ]

  const pts: Point[] = []
  for (const [ox, oy, start] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = ((start + (90 * i) / steps) * Math.PI) / 180
      pts.push([ox + r * Math.cos(a), oy + r * Math.sin(a)])
    }
  }
  return pts
}

const toPath = (pts: Point[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`

const topPath = (slab: SlabType, inset = 0, cx = CX, dy = 0) => {
  const half = slab.half - inset
  const radius = Math.max(slab.radius - inset, 1)
  return toPath(footprint(half, radius).map(([x, y]) => project(x, y, cx, slab.top + dy)))
}

const hull = (points: Point[]): Point[] => {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

  const build = (list: Point[]) => {
    const out: Point[] = []
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...build(pts), ...build([...pts].reverse())]
}

const bodyPath = (slab: SlabType, inset = 0) => {
  const half = slab.half - inset
  const radius = Math.max(slab.radius - inset, 1)
  const outline = footprint(half, radius)
  const upper = outline.map(([x, y]) => project(x, y, CX, slab.top))
  const lower = outline.map(([x, y]) => project(x, y, CX, slab.top + slab.depth))
  return toPath(hull([...upper, ...lower]))
}

const facePoint = (slab: SlabType, side: 'left' | 'right', u: number, v: number): Point => {
  const { half, top, depth } = slab
  if (side === 'left') {
    const [x, y] = project(-half + 2 * half * u, half, CX, top)
    return [x, y + depth * v]
  }
  const [x, y] = project(half, half - 2 * half * u, CX, top)
  return [x, y + depth * v]
}

const FACE_MATRIX = {
  left: `${ISO_X} ${ISO_Y} 0 1`,
  right: `${ISO_X} ${-ISO_Y} 0 1`,
  top: `${ISO_X} ${ISO_Y} ${-ISO_X} ${ISO_Y}`
}

const ringPoint = (rx: number, angleDeg: number): Point => {
  const a = (angleDeg * Math.PI) / 180
  return [round(CX + rx * Math.cos(a)), round(CY + rx * RING_FLATTEN * Math.sin(a))]
}

const ringPath = (rx: number) => {
  const ry = rx * RING_FLATTEN
  return `M${CX + rx} ${CY}A${rx} ${ry} 0 1 1 ${CX - rx} ${CY}A${rx} ${ry} 0 1 1 ${CX + rx} ${CY}Z`
}

// ───── SVG Leaves & Core Parts ─────
const LEAF = 'M11 0H19A3 3 0 0 1 22 3V11A11 11 0 0 1 11 22H3A3 3 0 0 1 0 19V11A11 11 0 0 1 11 0Z'
const TURNS = [0, 90, 180, 270]
const OPACITY = [1, 0.9, 0.8, 0.9]

const SyntraLeaves = ({ fill, fades = false, stroke }: { fill: string; fades?: boolean; stroke?: string }) => {
  return (
    <>
      {TURNS.map((turn, i) => (
        <path
          key={turn}
          d={LEAF}
          transform={`rotate(${turn}) translate(-25 -25)`}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke ? 0.6 : undefined}
          opacity={fades ? OPACITY[i] : 1}
        />
      ))}
    </>
  )
}

const ORANGE = '#FF7A2F'

const FaceMark = ({
  slab,
  side,
  u,
  v,
  w,
  h,
  fill,
  glow
}: { slab: SlabType; side: 'left' | 'right'; u: number; v: number; w: number; h: number; fill: string; glow?: boolean }) => {
  const [x, y] = facePoint(slab, side, u, v)
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) matrix(${FACE_MATRIX[side]} 0 0)`}>
      {glow && (
        <rect
          x={-w / 2 - 2}
          y={-h / 2 - 3}
          width={w + 4}
          height={h + 6}
          rx={h}
          fill={fill}
          filter='url(#n3-blur-sm)'
          opacity='0.75'
        />
      )}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} />
    </g>
  )
}

const PanelLine = ({ slab, side, v, from = 0.14, to = 0.86 }: { slab: SlabType; side: 'left' | 'right'; v: number; from?: number; to?: number }) => {
  const [x1, y1] = facePoint(slab, side, from, v)
  const [x2, y2] = facePoint(slab, side, to, v)
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke='#A7A298' strokeWidth='0.9' opacity='0.55' />
}

const Fastener = ({ slab, x, y }: { slab: SlabType; x: number; y: number }) => {
  const [px, py] = project(x, y, CX, slab.top)
  return (
    <g transform={`translate(${px.toFixed(2)} ${py.toFixed(2)}) matrix(${FACE_MATRIX.top} 0 0)`}>
      <circle r='6.5' fill='url(#n3-hole)' stroke='#C9C5BB' strokeWidth='1' />
    </g>
  )
}

const SlabBody = ({ slab }: { slab: SlabType }) => {
  return (
    <g>
      <path d={bodyPath(slab)} fill='url(#n3-side)' />
      <path d={bodyPath(slab)} fill='url(#n3-side-shade)' />
      <path d={bodyPath(slab)} fill='none' stroke='#CFCBC1' strokeWidth='1' opacity='0.85' />
    </g>
  )
}

const SlabTop = ({ slab, groove }: { slab: SlabType; groove?: number }) => {
  return (
    <g>
      <path d={topPath(slab)} fill='url(#n3-bevel)' stroke='#D9D6D0' strokeWidth='1' />
      <path d={topPath(slab, 4.5)} fill='url(#n3-top)' stroke='#fff' strokeWidth='1' opacity='1' />
      {groove !== undefined && <path d={topPath(slab, groove)} fill='none' stroke='#DAD6CE' strokeWidth='1.2' />}
    </g>
  )
}

const LOGO_SIDE = ['#B24C19', '#C3531C', '#D15A1F', '#DC6022', '#E46525', '#EA6A28']
const LOGO_SCALE = 1.42

const CoreLogo = ({ x, y }: { x: number; y: number }) => {
  const plane = (lift: number) => `translate(${x} ${y - lift}) matrix(${FACE_MATRIX.top} 0 0) scale(${LOGO_SCALE})`
  const top = LOGO_SIDE.length
  return (
    <g>
      <g transform={`${plane(0)} translate(2.4 2.4)`} opacity='0.22' filter='url(#n3-blur-sm)'>
        <SyntraLeaves fill='#6E6556' />
      </g>
      {LOGO_SIDE.map((fill, k) => (
        <g key={fill} transform={plane(k)}>
          <SyntraLeaves fill={fill} />
        </g>
      ))}
      <g transform={plane(top)}>
        <rect x='-27' y='-27' width='54' height='54' fill='url(#n3-logo-top)' clipPath='url(#n3-mark-clip)' />
        <SyntraLeaves fill='none' stroke='#FFD3B4' />
      </g>
    </g>
  )
}

const CoreDefs = () => {
  return (
    <defs>
      <linearGradient id='n3-side' x1='0' y1='0' x2='1' y2='0'>
        <stop offset='0' stopColor='#F3F1EB' />
        <stop offset='0.46' stopColor='#E9E6DF' />
        <stop offset='0.5' stopColor='#DAD6CD' />
        <stop offset='1' stopColor='#E3DFD7' />
      </linearGradient>
      <linearGradient id='n3-side-shade' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0.45' stopColor='#7C7566' stopOpacity='0' />
        <stop offset='1' stopColor='#7C7566' stopOpacity='0.16' />
      </linearGradient>
      <linearGradient id='n3-bevel' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stopColor='#FFFFFF' />
        <stop offset='1' stopColor='#E6E2DA' />
      </linearGradient>
      <linearGradient id='n3-top' x1='0.1' y1='0' x2='0.9' y2='1'>
        <stop offset='0' stopColor='#FFFFFF' />
        <stop offset='1' stopColor='#F2EFE9' />
      </linearGradient>
      <linearGradient id='n3-inlay' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stopColor='#EFEBE4' />
        <stop offset='1' stopColor='#FFFFFF' />
      </linearGradient>
      <linearGradient id='n3-seam' x1='0' y1='0' x2='1' y2='0'>
        <stop offset='0' stopColor='#FFC59F' />
        <stop offset='0.5' stopColor={ORANGE} />
        <stop offset='1' stopColor='#FFA470' />
      </linearGradient>
      <linearGradient id='n3-slot' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stopColor='#5F5A52' />
        <stop offset='1' stopColor='#8E897F' />
      </linearGradient>
      <linearGradient id='n3-logo-top' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stopColor='#FFB07C' />
        <stop offset='0.55' stopColor='#FF8442' />
        <stop offset='1' stopColor='#FF6E24' />
      </linearGradient>
      <clipPath id='n3-mark-clip'>
        <SyntraLeaves fill='#000' />
      </clipPath>
      <radialGradient id='n3-hole' cx='0.5' cy='0.4' r='0.7'>
        <stop offset='0' stopColor='#D9D5CC' />
        <stop offset='1' stopColor='#F3F1EB' />
      </radialGradient>
      <filter id='n3-blur-sm' x='-40%' y='-40%' width='180%' height='180%'>
        <feGaussianBlur stdDeviation='3.5' />
      </filter>
      <filter id='n3-blur-glow' x='-40%' y='-40%' width='180%' height='180%'>
        <feGaussianBlur stdDeviation='9' />
      </filter>
      <filter id='n3-blur-spill' x='-40%' y='-40%' width='180%' height='180%'>
        <feGaussianBlur stdDeviation='18' />
      </filter>
    </defs>
  )
}

const SyntraCoreObject = (props: SVGProps<SVGSVGElement>) => {
  const seam: SlabType = {
    half: MID.half - 2,
    radius: MID.radius - 2,
    top: MID.top + MID.depth - 1,
    depth: SEAM_GAP + 1
  }

  const spillDy = BASE.top - MID.top
  const [logoX, logoY] = [CX, CAP.top]

  return (
    <svg viewBox='0 0 1000 1000' role='img' aria-label='The DataVai core' {...props}>
      <CoreDefs />
      <SlabBody slab={BASE} />
      <SlabTop slab={BASE} groove={10} />
      <PanelLine slab={BASE} side='left' v={0.3} />
      <PanelLine slab={BASE} side='right' v={0.3} />
      <FaceMark slab={BASE} side='right' u={0.5} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      <FaceMark slab={BASE} side='right' u={0.58} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      <FaceMark slab={BASE} side='right' u={0.66} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      <FaceMark slab={BASE} side='left' u={0.32} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      <FaceMark slab={BASE} side='left' u={0.4} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />

      <g className='n3-seam-pulse'>
        <path d={topPath(MID, 4, CX, spillDy)} fill={ORANGE} opacity='0.24' filter='url(#n3-blur-spill)' />
        <path d={bodyPath(seam)} fill={ORANGE} opacity='0.6' filter='url(#n3-blur-glow)' />
      </g>
      <path d={bodyPath(seam)} fill='url(#n3-seam)' />

      <SlabBody slab={MID} />
      <SlabTop slab={MID} groove={11} />
      <PanelLine slab={MID} side='left' v={0.78} />
      <PanelLine slab={MID} side='right' v={0.78} />
      <FaceMark slab={MID} side='left' u={0.62} v={0.42} w={34} h={7.5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='left' u={0.34} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='left' u={0.42} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='right' u={0.44} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='right' u={0.52} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
      <FaceMark slab={MID} side='right' u={0.68} v={0.42} w={22} h={4.5} fill='url(#n3-slot)' />
      <g className='n3-seam-pulse'>
        <FaceMark slab={MID} side='left' u={0.2} v={0.42} w={7} h={2.6} fill={ORANGE} glow />
      </g>

      <Fastener slab={MID} x={0} y={-MID.half + 28} />
      <Fastener slab={MID} x={-MID.half + 28} y={0} />
      <Fastener slab={MID} x={MID.half - 28} y={0} />
      <Fastener slab={MID} x={0} y={MID.half - 28} />

      <SlabBody slab={CAP} />
      <SlabTop slab={CAP} />
      <path d={topPath(CAP, 19)} fill='url(#n3-inlay)' stroke='#DDD9D1' strokeWidth='1.2' />
      <path d={topPath(CAP, 20.5)} fill='none' stroke='#fff' strokeWidth='1' opacity='0.9' />

      <CoreLogo x={logoX} y={logoY} />
    </svg>
  )
}

const SyntraCoreShadow = (props: SVGProps<SVGSVGElement>) => {
  const floor = { ...BASE, top: BASE.top + BASE.depth + 30 }
  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <defs>
        <filter id='n3-blur-lg' x='-30%' y='-30%' width='160%' height='160%'>
          <feGaussianBlur stdDeviation='26' />
        </filter>
        <filter id='n3-blur-md' x='-30%' y='-30%' width='160%' height='160%'>
          <feGaussianBlur stdDeviation='9' />
        </filter>
      </defs>
      <path d={topPath(floor, -14)} fill='#8A8377' opacity='0.2' filter='url(#n3-blur-lg)' />
      <path d={topPath(floor, 6)} fill='#5D574D' opacity='0.22' filter='url(#n3-blur-md)' />
    </svg>
  )
}

const NODES: [number, number][] = [
  [118, 132],
  [318, 82],
  [690, 96],
  [884, 188],
  [936, 470],
  [70, 512],
  [150, 858],
  [850, 846]
]

const SyntraDepthBackdrop = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <defs>
        <linearGradient id='n3-glass' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#fff' stopOpacity='0.7' />
          <stop offset='1' stopColor='#fff' stopOpacity='0.12' />
        </linearGradient>
      </defs>

      <g fill='url(#n3-glass)' stroke='#E3E0D9' strokeWidth='1' opacity='0.35'>
        <rect width='290' height='250' rx='22' transform='matrix(0.866 -0.5 0 1 232 300)' />
        <rect width='290' height='250' rx='22' transform='matrix(0.866 0.5 0 1 520 150)' />
      </g>

      <g fill='#fff' stroke='#CFCBC1' strokeWidth='1'>
        {NODES.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4 : 3} opacity='0.85' />
        ))}
      </g>
    </svg>
  )
}

// ───── DataVai Hero Configuration ─────
const EASE = [0.22, 1, 0.36, 1] as const

const COPY = {
  eyebrow: 'AI document intelligence',
  headline: ['Turn invoices into', 'verified data with'],
  accentWord: 'DataVai.',
  body: 'Upload PDFs, scans, Excel and CSV. DataVai reads every field, checks the maths, and flags only what needs a human.',
  primaryCta: 'Open dashboard',
  secondaryCta: 'See how it works'
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Connectors', href: '#connectors' },
  { label: 'GitHub', href: 'https://github.com/arz282-ctrl/data-v-ai', external: true }
]

const METRICS = [
  { value: '7', label: 'File formats', icon: FileText },
  { value: '1,000+', label: 'Page PDFs supported', icon: ScanLine },
  { value: 'Grounded', label: 'Every value checked', icon: ShieldCheck }
] as const

const MOTION = {
  floatDistance: 10,
  floatSeconds: 6.5,
  tiltDegrees: 3.5,
  ringParallax: 12,
  backdropParallax: 5,
  orbitSeconds: [70, 95],
  orbitOpenOpacity: 0.15
}

const ARTBOARD = 1000

// Stages: bottom to top (1: Sources -> 2: OCR -> 3: AI -> 4: Validation -> 5: Results)
const STAGES = [
  {
    title: 'Connected Sources',
    items: ['Uploads', 'Email', 'Drive'],
    apps: ['Google Drive', 'Zapier'] as const,
    icon: 'sources' as const,
    side: 'right' as const
  },
  {
    title: 'Document Reading',
    items: ['OCR', 'Parsing', 'Quality'],
    icon: 'context' as const,
    side: 'left' as const
  },
  {
    title: 'AI Extraction',
    items: ['Fields', 'Line items', 'Evidence'],
    apps: ['Gemini', 'OpenAI'] as const,
    side: 'right' as const,
    main: true
  },
  {
    title: 'Validation & Review',
    items: ['Maths', 'Duplicates', 'Cross-check'],
    icon: 'automation' as const,
    side: 'left' as const
  },
  {
    title: 'Searchable Results',
    items: ['JSON', 'Search', 'Exports'],
    apps: ['Slack', 'Notion', 'Google Sheets'] as const,
    icon: 'outcomes' as const,
    side: 'right' as const
  }
]

type Stage = (typeof STAGES)[number]
const isMain = (stage: Stage): boolean => Boolean('main' in stage && stage.main)

const EXPLODE = {
  spring: { stiffness: 105, damping: 25, mass: 1 },
  gap: 94,
  aiLift: 12,
  topPlateY: 230,
  stagger: 0.05,
  scales: [0.63, 0.62, 0.7, 1.07, 1.06]
}

const STAGE_CARDS = {
  left: { edge: -2, width: 31 },
  right: { edge: 0, width: 29 },
  restInset: 10,
  outward: 2,
  beadSeconds: 1.6
}

// ───── Explode Layout ─────
const PLATE_SLABS: SlabType[] = [
  { ...BASE, top: BASE.top + 17, depth: 17 },
  { ...BASE, top: BASE.top, depth: 17 },
  MID,
  { ...CAP, top: CAP.top + 7, depth: 7 },
  { ...CAP, top: CAP.top, depth: 7 }
]

const AI_PLATE = 2

const TARGET_TOPS = PLATE_SLABS.map(
  (_, i) => EXPLODE.topPlateY + (PLATE_SLABS.length - 1 - i) * EXPLODE.gap - (i === AI_PLATE ? EXPLODE.aiLift : 0)
)

const TRAVEL = PLATE_SLABS.map((slab, i) => TARGET_TOPS[i] - slab.top)
const clamp = (v: number) => Math.min(1, Math.max(0, v))

const plateProgress = (i: number, p: number) => {
  const delay = Math.abs(i - AI_PLATE) * EXPLODE.stagger
  return clamp((p - delay) / (1 - delay))
}

const plateY = (i: number, p: number) => TRAVEL[i] * plateProgress(i, p)
const plateScale = (i: number, p: number) => 1 + (EXPLODE.scales[i] - 1) * plateProgress(i, p)

const tipOffset = (i: number) => {
  const { half, radius } = PLATE_SLABS[i]
  return 0.866 * (2 * half - 0.586 * radius) * EXPLODE.scales[i]
}

const tipX = (i: number, side: 'left' | 'right') => CX + (side === 'right' ? 1 : -1) * tipOffset(i)
const cornerY = (i: number) => TARGET_TOPS[i] + PLATE_SLABS[i].depth / 2

// ───── Exploded Core Visual ─────
const SKIRT = [0, 4, 0, 10, 10]

type PlateProps = {
  index: number
  progress: MotionValue<number>
  children: ReactNode
}

const Plate = ({ index, progress, children }: PlateProps) => {
  const y = useTransform(progress, v => plateY(index, v))
  const scale = useTransform(progress, v => plateScale(index, v))
  const apart = useTransform(progress, v => plateProgress(index, v))
  const shadow = useTransform(apart, v => v * 0.16)

  const slab = PLATE_SLABS[index]
  const skirt = SKIRT[index]

  return (
    <m.g style={{ y, scale }}>
      {index > 0 && (
        <m.path
          d={topPath(slab, -6, CX, slab.depth + 34)}
          fill='#6E6556'
          filter='url(#n3-blur-spill)'
          style={{ opacity: shadow }}
        />
      )}
      {skirt > 0 && (
        <m.g style={{ opacity: apart }}>
          <SlabBody slab={{ ...slab, top: slab.top + slab.depth - 1, depth: skirt + 1 }} />
        </m.g>
      )}
      {children}
    </m.g>
  )
}

const PlateNumber = ({ slab, n, main = false }: { slab: SlabType; n: number; main?: boolean }) => {
  const k = slab.half * 0.56
  const [x, y] = project(k, k, CX, slab.top)
  const plane = `matrix(${FACE_MATRIX.top} 0 0) rotate(-45)`
  const label = String(n).padStart(2, '0')

  const text = {
    textAnchor: 'middle' as const,
    dominantBaseline: 'central' as const,
    fontSize: 25,
    fontWeight: 500,
    letterSpacing: 2.5
  }

  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} aria-hidden>
      <text {...text} transform={`translate(0 0.9) ${plane}`} fill='#FFFFFF' opacity='0.95'>
        {label}
      </text>
      <text {...text} transform={plane} fill={main ? '#FF8C4D' : '#CBC6BC'}>
        {label}
      </text>
    </g>
  )
}

const AiEmphasis = ({ progress }: { progress: MotionValue<number> }) => {
  const on = useTransform(progress, v => clamp((v - 0.5) / 0.4))
  const rim = useTransform(on, v => v * 0.9)
  const halo = useTransform(on, v => v * 0.55)
  const spill = useTransform(halo, v => v * 0.35)

  return (
    <g transform={`translate(${CX} ${MID.top}) matrix(${FACE_MATRIX.top} 0 0)`}>
      <m.circle r='86' fill={ORANGE} filter='url(#n3-blur-spill)' style={{ opacity: spill }} />
      <m.circle r='56' fill='none' stroke={ORANGE} strokeWidth='1.4' style={{ opacity: rim }} />
      <m.circle r='38' fill='none' stroke={ORANGE} strokeWidth='1' strokeDasharray='3 6' style={{ opacity: halo }} />
      <m.circle r='9' fill={ORANGE} style={{ opacity: rim }} />
    </g>
  )
}

const SyntraExplodedCore = ({ progress, ...props }: SVGProps<SVGSVGElement> & { progress: MotionValue<number> }) => {
  const strongGlow = useTransform(progress, v => clamp((v - 0.4) / 0.5) * 0.6)
  const seam = { half: MID.half - 2, radius: MID.radius - 2, top: MID.top + MID.depth - 1, depth: SEAM_GAP + 1 }

  const inlay = (slab: (typeof PLATE_SLABS)[number]) => (
    <>
      <path d={topPath(slab, 19)} fill='url(#n3-inlay)' stroke='#DDD9D1' strokeWidth='1.2' />
      <path d={topPath(slab, 20.5)} fill='none' stroke='#fff' strokeWidth='1' opacity='0.9' />
    </>
  )

  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <CoreDefs />
      <Plate index={0} progress={progress}>
        <SlabBody slab={PLATE_SLABS[0]} />
        <SlabTop slab={PLATE_SLABS[0]} groove={10} />
        <PlateNumber slab={PLATE_SLABS[0]} n={1} />
        <FaceMark slab={BASE} side='right' u={0.5} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
        <FaceMark slab={BASE} side='right' u={0.58} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
        <FaceMark slab={BASE} side='right' u={0.66} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
        <FaceMark slab={BASE} side='left' u={0.32} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
        <FaceMark slab={BASE} side='left' u={0.4} v={0.62} w={4.5} h={4.5} fill='url(#n3-slot)' />
      </Plate>

      <Plate index={1} progress={progress}>
        <SlabBody slab={PLATE_SLABS[1]} />
        <SlabTop slab={PLATE_SLABS[1]} groove={10} />
        <PlateNumber slab={PLATE_SLABS[1]} n={2} />
        <PanelLine slab={BASE} side='left' v={0.3} />
        <PanelLine slab={BASE} side='right' v={0.3} />
      </Plate>

      <Plate index={AI_PLATE} progress={progress}>
        <g className='n3-seam-pulse'>
          <path d={topPath(MID, 4, CX, BASE.top - MID.top)} fill={ORANGE} opacity='0.24' filter='url(#n3-blur-spill)' />
          <path d={bodyPath(seam)} fill={ORANGE} opacity='0.6' filter='url(#n3-blur-glow)' />
        </g>
        <m.path d={bodyPath(seam)} fill={ORANGE} filter='url(#n3-blur-glow)' style={{ opacity: strongGlow }} />
        <path d={bodyPath(seam)} fill='url(#n3-seam)' />
        <SlabBody slab={MID} />
        <SlabTop slab={MID} groove={11} />
        <PlateNumber slab={MID} n={3} main />
        <PanelLine slab={MID} side='left' v={0.78} />
        <PanelLine slab={MID} side='right' v={0.78} />
        <FaceMark slab={MID} side='left' u={0.62} v={0.42} w={34} h={7.5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='left' u={0.34} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='left' u={0.42} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='right' u={0.44} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='right' u={0.52} v={0.42} w={5} h={5} fill='url(#n3-slot)' />
        <FaceMark slab={MID} side='right' u={0.68} v={0.42} w={22} h={4.5} fill='url(#n3-slot)' />
        <g className='n3-seam-pulse'>
          <FaceMark slab={MID} side='left' u={0.2} v={0.42} w={7} h={2.6} fill={ORANGE} glow />
        </g>
        <Fastener slab={MID} x={0} y={-MID.half + 28} />
        <Fastener slab={MID} x={-MID.half + 28} y={0} />
        <Fastener slab={MID} x={MID.half - 28} y={0} />
        <Fastener slab={MID} x={0} y={MID.half - 28} />
        <AiEmphasis progress={progress} />
      </Plate>

      <Plate index={3} progress={progress}>
        <SlabBody slab={PLATE_SLABS[3]} />
        <SlabTop slab={PLATE_SLABS[3]} />
        {inlay(PLATE_SLABS[3])}
        <PlateNumber slab={PLATE_SLABS[3]} n={4} />
      </Plate>

      <Plate index={4} progress={progress}>
        <SlabBody slab={PLATE_SLABS[4]} />
        <SlabTop slab={PLATE_SLABS[4]} />
        {inlay(CAP)}
        <CoreLogo x={CX} y={CAP.top} />
      </Plate>
    </svg>
  )
}

const SyntraOrbitalSystem = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <g fill='none' stroke='#D9D6D0' strokeWidth='1'>
        <ellipse cx={CX} cy={CY} rx={RING_RX[0]} ry={RING_RX[0] * RING_FLATTEN} opacity='0.8' />
        <ellipse cx={CX} cy={CY} rx={RING_RX[1]} ry={RING_RX[1] * RING_FLATTEN} opacity='0.65' />
      </g>
    </svg>
  )
}

type NodeType = { ring: 0 | 1; angle: number; size: number }

const NODES2: NodeType[] = [
  { ring: 0, angle: 20, size: 7 },
  { ring: 0, angle: 110, size: 5.5 },
  { ring: 0, angle: 200, size: 8 },
  { ring: 0, angle: 290, size: 6 },
  { ring: 1, angle: 60, size: 6 },
  { ring: 1, angle: 132, size: 8 },
  { ring: 1, angle: 204, size: 5.5 },
  { ring: 1, angle: 276, size: 7 },
  { ring: 1, angle: 348, size: 6.5 }
]

const Crystal = ({ size }: { size: number }) => {
  return (
    <g filter='url(#n3-crystal-shadow)'>
      <circle r={size * 1.55} fill='url(#n3-crystal-halo)' />
      <circle r={size} fill='url(#n3-crystal-body)' />
      <circle r={size} fill='url(#n3-crystal-refract)' />
      <circle r={size - 0.5} fill='none' stroke='url(#n3-crystal-rim)' strokeWidth='1' />
      <ellipse
        cx={-size * 0.32}
        cy={-size * 0.4}
        rx={size * 0.36}
        ry={size * 0.2}
        transform={`rotate(-30 ${-size * 0.32} ${-size * 0.4})`}
        fill='#FFFFFF'
        opacity='0.95'
      />
      <circle cx={size * 0.34} cy={-size * 0.5} r={Math.max(0.7, size * 0.07)} fill='#FFFFFF' opacity='0.85' />
    </g>
  )
}

type SyntraParticlesProps = SVGProps<SVGSVGElement> & { half: 'back' | 'front'; animate: boolean; paused?: boolean }

const SyntraParticles = ({ half, animate, paused = false, ...props }: SyntraParticlesProps) => {
  const ref = useRef<SVGSVGElement>(null)
  const clipId = `n3-clip-${half}`

  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    if (paused) svg.pauseAnimations()
    else svg.unpauseAnimations()
  }, [paused])

  return (
    <svg ref={ref} viewBox='0 0 1000 1000' aria-hidden {...props}>
      <defs>
        <clipPath id={clipId}>
          {half === 'back' ? (
            <rect x='-200' y='-200' width='1400' height={CY + 200} />
          ) : (
            <rect x='-200' y={CY} width='1400' height='700' />
          )}
        </clipPath>
        <linearGradient id='n3-crystal-body' x1='0.15' y1='0.1' x2='0.85' y2='0.95'>
          <stop offset='0' stopColor='#FFE7D8' stopOpacity='0.9' />
          <stop offset='0.5' stopColor='#FFA56E' stopOpacity='0.88' />
          <stop offset='1' stopColor='#F2661F' stopOpacity='0.95' />
        </linearGradient>
        <radialGradient id='n3-crystal-refract' cx='0.6' cy='0.78' r='0.45'>
          <stop offset='0' stopColor='#FFF4EC' stopOpacity='0.85' />
          <stop offset='1' stopColor='#FFF4EC' stopOpacity='0' />
        </radialGradient>
        <linearGradient id='n3-crystal-rim' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#FFFFFF' stopOpacity='0.95' />
          <stop offset='1' stopColor='#C94F12' stopOpacity='0.55' />
        </linearGradient>
        <radialGradient id='n3-crystal-halo' cx='0.5' cy='0.5' r='0.5'>
          <stop offset='0.5' stopColor='#FF7A2F' stopOpacity='0.12' />
          <stop offset='1' stopColor='#FF7A2F' stopOpacity='0' />
        </radialGradient>
        <filter id='n3-crystal-shadow' x='-80%' y='-80%' width='260%' height='260%'>
          <feDropShadow dx='0' dy='2.5' stdDeviation='2.5' floodColor='#9A4A1E' floodOpacity='0.25' />
        </filter>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {NODES2.map((node, i) => {
          const rx = RING_RX[node.ring]
          const [x, y] = ringPoint(rx, node.angle)
          const dur = MOTION.orbitSeconds[node.ring]
          const reverse = node.ring === 1
          const start = node.angle / 360
          const begin = -dur * (reverse ? 1 - start : start)

          return (
            <g key={i} transform={animate ? undefined : `translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
              <Crystal size={node.size} />
              {animate && (
                <animateMotion
                  dur={`${dur}s`}
                  begin={`${begin}s`}
                  repeatCount='indefinite'
                  path={ringPath(rx)}
                  {...(reverse && { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' })}
                />
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

const DOTS = Array.from({ length: 26 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180
  const r = 160 + ((i * 53) % 340)
  return [
    round(CX + r * Math.cos(a) * 1.02),
    round(CY + r * Math.sin(a) * RING_FLATTEN * 1.6),
    0.8 + (i % 3) * 0.5
  ] as const
})

const SyntraTechnicalBackdrop = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 1000 1000' aria-hidden {...props}>
      <defs>
        <linearGradient id='n3-axis-v' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#C9C5BC' stopOpacity='0' />
          <stop offset='0.5' stopColor='#C9C5BC' stopOpacity='0.45' />
          <stop offset='1' stopColor='#C9C5BC' stopOpacity='0' />
        </linearGradient>
        <linearGradient id='n3-axis-h' x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0' stopColor='#C9C5BC' stopOpacity='0' />
          <stop offset='0.5' stopColor='#C9C5BC' stopOpacity='0.7' />
          <stop offset='1' stopColor='#C9C5BC' stopOpacity='0' />
        </linearGradient>
      </defs>

      <rect x={CX - 0.5} y='110' width='1' height='780' fill='url(#n3-axis-v)' />
      <rect x='70' y={CY - 0.5} width='860' height='1' fill='url(#n3-axis-h)' />

      <g fill='#C9C5BC'>
        {DOTS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity={0.35 + (i % 4) * 0.12} />
        ))}
      </g>

      <g stroke='#C9C5BC' strokeWidth='1' opacity='0.5'>
        {(
          [
            [212, 292],
            [790, 690],
            [860, 430],
            [150, 560]
          ] as const
        ).map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 5} ${y}h10M${x} ${y - 5}v10`} />
        ))}
      </g>
    </svg>
  )
}

// ───── App Logos for DataVai Stages ─────
const SyntraGoogleDriveLogo = (props: SVGProps<SVGSVGElement>) => {
  const uid = useId().replace(/[^\w-]/g, '')
  return (
    <svg viewBox='0 0 256 238' aria-hidden {...props}>
      <defs>
        <linearGradient id={`${uid}SVGjzk6ueva`} x1='86.924%' x2='7.63%' y1='94.294%' y2='45.952%'>
          <stop offset='9%' stopColor='#ffe921' />
          <stop offset='100%' stopColor='#fec700' />
        </linearGradient>
        <linearGradient id={`${uid}SVGb0f7AcFJ`} x1='99.538%' x2='23.437%' y1='93.901%' y2='54.033%'>
          <stop offset='15%' stopColor='#a9a8ff' />
          <stop offset='33%' stopColor='#6d97ff' />
          <stop offset='48%' stopColor='#3186ff' />
        </linearGradient>
        <linearGradient id={`${uid}SVGxMwz6dYk`} x1='87.128%' x2='-.639%' y1='51.518%' y2='93.078%'>
          <stop offset='55%' stopColor='#0ebc5f' />
          <stop offset='85%' stopColor='#78c9ff' />
        </linearGradient>
        <path
          id={`${uid}SVGAiIt3btS`}
          d='M77.303 29.27c22.531-39.026 78.863-39.027 101.394 0l69.373 120.158c22.531 39.027-5.633 87.81-50.698 87.81H58.628c-45.065 0-73.23-48.783-50.698-87.81z'
        />
      </defs>
      <mask id={`${uid}SVG6FLXsceq`} fill='#fff'>
        <use href={`#${uid}SVGAiIt3btS`} />
      </mask>
      <g mask={`url(#${uid}SVG6FLXsceq)`}>
        <path
          fill={`url(#${uid}SVGjzk6ueva)`}
          d='M341.719 295.937H200.166l-29.293-50.735l70.777-122.589z'
          transform='translate(-42.87 -58.67)'
        />
        <path
          fill={`url(#${uid}SVGb0f7AcFJ)`}
          d='m0 295.916l100.069-173.325v.003l-29.282 50.723h58.57l70.783 122.596l-200.138.001z'
          transform='translate(-42.87 -58.67)'
        />
        <path
          fill={`url(#${uid}SVGxMwz6dYk)`}
          d='m170.881 0l70.781 122.6l-29.286 50.726H70.812z'
          transform='translate(-42.87 -58.67)'
        />
      </g>
    </svg>
  )
}

const SyntraZapierLogo = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 256 256' aria-hidden {...props}>
      <path
        fill='#FF4A00'
        d='M128.08 0c7.231.013 14.343.624 21.256 1.78V76.3l52.831-52.696a128.425 128.425 0 0 1 16.34 13.789a128.468 128.468 0 0 1 13.84 16.312L179.513 106.4h74.715A127.58 127.58 0 0 1 256 127.587v.173c0 7.226-.613 14.306-1.772 21.2H179.5l52.847 52.682a129.615 129.615 0 0 1-13.824 16.312h-.015a128.254 128.254 0 0 1-16.326 13.789l-52.846-52.696v74.52a130.321 130.321 0 0 1-21.243 1.781h-.186a130.26 130.26 0 0 1-21.23-1.78v-74.52l-52.831 52.695a128.401 128.401 0 0 1-30.18-30.1L76.5 148.96H1.785A126.984 126.984 0 0 1 0 127.72v-.371c.012-1.875.135-4.166.311-6.536l.055-.713c.522-6.671 1.419-13.7 1.419-13.7H76.5L23.666 53.705a126.265 126.265 0 0 1 13.81-16.286l.026-.026a127.746 127.746 0 0 1 16.344-13.789L106.677 76.3V1.78A130.278 130.278 0 0 1 127.933 0h.147Zm-.013 95.76h-.122a76.718 76.718 0 0 0-27.034 4.902a76.662 76.662 0 0 0-4.915 26.952v.12a76.383 76.383 0 0 0 4.927 26.951a76.608 76.608 0 0 0 27.022 4.902h.122c9.51 0 18.617-1.74 27.022-4.902a76.146 76.146 0 0 0 4.915-26.952v-.12c0-9.484-1.747-18.57-4.915-26.951a76.614 76.614 0 0 0-27.022-4.902Z'
      />
    </svg>
  )
}

const SyntraGeminiLogo = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 16 16' aria-hidden {...props}>
      <path
        fill='#448aff'
        d='M15 8.014A7.457 7.457 0 0 0 8.014 15h-.028A7.456 7.456 0 0 0 1 8.014v-.028A7.456 7.456 0 0 0 7.986 1h.028A7.457 7.457 0 0 0 15 7.986z'
      />
    </svg>
  )
}

const SyntraOpenaiLogo = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 256 260' aria-hidden {...props}>
      <path d='M239.184 106.203a64.72 64.72 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.72 64.72 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.67 64.67 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.77 64.77 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483m-97.56 136.338a48.4 48.4 0 0 1-31.105-11.255l1.535-.87l51.67-29.825a8.6 8.6 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601M37.158 197.93a48.35 48.35 0 0 1-5.781-32.589l1.534.921l51.722 29.826a8.34 8.34 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803M23.549 85.38a48.5 48.5 0 0 1 25.58-21.333v61.39a8.29 8.29 0 0 0 4.195 7.316l62.874 36.272l-21.845 12.636a.82.82 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405zm179.466 41.695l-63.08-36.63L161.73 77.86a.82.82 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.54 8.54 0 0 0-4.4-7.213m21.742-32.69l-1.535-.922l-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.72.72 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391zM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87l-51.67 29.825a8.6 8.6 0 0 0-4.246 7.367zm11.868-25.58L128.067 97.3l28.188 16.218v32.434l-28.086 16.218l-28.188-16.218z' />
    </svg>
  )
}

const SyntraSlackLogo = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 256 256' aria-hidden {...props}>
      <path
        fill='#e01e5a'
        d='M53.841 161.32c0 14.832-11.987 26.82-26.819 26.82S.203 176.152.203 161.32c0-14.831 11.987-26.818 26.82-26.818H53.84zm13.41 0c0-14.831 11.987-26.818 26.819-26.818s26.819 11.987 26.819 26.819v67.047c0 14.832-11.987 26.82-26.82 26.82c-14.83 0-26.818-11.988-26.818-26.82z'
      />
      <path
        fill='#36c5f0'
        d='M94.07 53.638c-14.832 0-26.82-11.987-26.82-26.819S79.239 0 94.07 0s26.819 11.987 26.819 26.819v26.82zm0 13.613c14.832 0 26.819 11.987 26.819 26.819s-11.987 26.819-26.82 26.819H26.82C11.987 120.889 0 108.902 0 94.069c0-14.83 11.987-26.818 26.819-26.818z'
      />
      <path
        fill='#2eb67d'
        d='M201.55 94.07c0-14.832 11.987-26.82 26.818-26.82s26.82 11.988 26.82 26.82s-11.988 26.819-26.82 26.819H201.55zm-13.41 0c0 14.832-11.988 26.819-26.82 26.819c-14.831 0-26.818-11.987-26.818-26.82V26.82C134.502 11.987 146.489 0 161.32 0s26.819 11.987 26.819 26.819z'
      />
      <path
        fill='#ecb22e'
        d='M161.32 201.55c14.832 0 26.82 11.987 26.82 26.818s-11.988 26.82-26.82 26.82c-14.831 0-26.818-11.988-26.818-26.82V201.55zm0-13.41c-14.831 0-26.818-11.988-26.818-26.82c0-14.831 11.987-26.818 26.819-26.818h67.25c14.832 0 26.82 11.987 26.82 26.819s-11.988 26.819-26.82 26.819z'
      />
    </svg>
  )
}

const SyntraNotionLogo = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 256 268' aria-hidden {...props}>
      <path
        fill='#fff'
        d='M16.092 11.538L164.09.608c18.179-1.56 22.85-.508 34.28 7.801l47.243 33.282C253.406 47.414 256 48.975 256 55.207v182.527c0 11.439-4.155 18.205-18.696 19.24L65.44 267.378c-10.913.517-16.11-1.043-21.825-8.327L8.826 213.814C2.586 205.487 0 199.254 0 191.97V29.726c0-9.352 4.155-17.153 16.092-18.188'
      />
      <path d='M164.09.608L16.092 11.538C4.155 12.573 0 20.374 0 29.726v162.245c0 7.284 2.585 13.516 8.826 21.843l34.789 45.237c5.715 7.284 10.912 8.844 21.825 8.327l171.864-10.404c14.532-1.035 18.696-7.801 18.696-19.24V55.207c0-5.911-2.336-7.614-9.21-12.66l-1.185-.856L198.37 8.409C186.94.1 182.27-.952 164.09.608M69.327 52.22c-14.033.945-17.216 1.159-25.186-5.323L23.876 30.778c-2.06-2.086-1.026-4.69 4.163-5.207l142.274-10.395c11.947-1.043 18.17 3.12 22.842 6.758l24.401 17.68c1.043.525 3.638 3.637.517 3.637L71.146 52.095zm-16.36 183.954V81.222c0-6.767 2.077-9.887 8.3-10.413L230.02 60.93c5.724-.517 8.31 3.12 8.31 9.879v153.917c0 6.767-1.044 12.49-10.387 13.008l-161.487 9.361c-9.343.517-13.489-2.594-13.489-10.921M212.377 89.53c1.034 4.681 0 9.362-4.681 9.897l-7.783 1.542v114.404c-6.758 3.637-12.981 5.715-18.18 5.715c-8.308 0-10.386-2.604-16.609-10.396l-50.898-80.079v77.476l16.1 3.646s0 9.362-12.989 9.362l-35.814 2.077c-1.043-2.086 0-7.284 3.63-8.318l9.351-2.595V109.823l-12.98-1.052c-1.044-4.68 1.55-11.439 8.826-11.965l38.426-2.585l52.958 81.113v-71.76l-13.498-1.552c-1.043-5.733 3.111-9.896 8.3-10.404z' />
    </svg>
  )
}

const SyntraGoogleSheetsLogo = (props: SVGProps<SVGSVGElement>) => {
  const uid = useId().replace(/[^\w-]/g, '')
  return (
    <svg viewBox='0 0 74 100' aria-hidden {...props}>
      <defs>
        <path
          id={`${uid}SVGIGBbGcaJ`}
          fill='#fff'
          d='M45.398 1.43H7.867c-3.643 0-6.623 2.98-6.623 6.624v83.893c0 3.642 2.98 6.623 6.623 6.623h57.4c3.643 0 6.624-2.98 6.624-6.623V27.923z'
        />
      </defs>
      <mask
        id={`${uid}SVGeu8TmevZ`}
        width='71'
        height='98'
        x='1'
        y='1'
        maskUnits='userSpaceOnUse'
        style={{ maskType: 'alpha' }}
      >
        <use href={`#${uid}SVGIGBbGcaJ`} />
      </mask>
      <g fill='none'>
        <g mask={`url(#${uid}SVGeu8TmevZ)`}>
          <path
            fill='#0f9d58'
            d='M45.398 1.43H7.867c-3.643 0-6.623 2.98-6.623 6.624v83.893c0 3.642 2.98 6.623 6.623 6.623h57.4c3.643 0 6.624-2.98 6.624-6.623V27.923L56.436 16.884z'
          />
        </g>
        <g mask={`url(#${uid}SVGeu8TmevZ)`}>
          <path
            fill='#f1f1f1'
            d='M18.905 48.896v32.012H54.23V48.896zM34.36 76.493H23.321v-5.52h11.038zm0-8.831H23.321v-5.52h11.038zm0-8.831H23.321v-5.52h11.038zm15.454 17.662H38.775v-5.52h11.038zm0-8.831H38.775v-5.52h11.038zm0-8.831H38.775v-5.52h11.038z'
          />
        </g>
        <g mask={`url(#${uid}SVGeu8TmevZ)`}>
          <path fill={`url(#${uid}SVGoPMCPXuN)`} d='m47.335 25.986l24.556 24.55V27.922z' />
        </g>
        <g mask={`url(#${uid}SVGeu8TmevZ)`}>
          <path fill='#87ceac' d='M45.398 1.43V21.3a6.62 6.62 0 0 0 6.623 6.623h19.87z' />
        </g>
        <path
          fill={`url(#${uid}SVGXgG8ibSI)`}
          d='M45.398 1.43H7.867c-3.643 0-6.623 2.98-6.623 6.624v83.893c0 3.642 2.98 6.623 6.623 6.623h57.4c3.643 0 6.624-2.98 6.624-6.623V27.923z'
        />
        <defs>
          <radialGradient
            id={`${uid}SVGXgG8ibSI`}
            cx='0'
            cy='0'
            r='1'
            gradientTransform='translate(3.482 3.361)scale(113.917)'
            gradientUnits='userSpaceOnUse'
          >
            <stop stopColor='#fff' stopOpacity='.1' />
            <stop offset='1' stopColor='#fff' stopOpacity='0' />
          </radialGradient>
          <linearGradient
            id={`${uid}SVGoPMCPXuN`}
            x1='59.614'
            x2='59.614'
            y1='28.093'
            y2='50.539'
            gradientUnits='userSpaceOnUse'
          >
            <stop stopColor='#263238' stopOpacity='.2' />
            <stop offset='1' stopColor='#263238' stopOpacity='.02' />
          </linearGradient>
        </defs>
      </g>
    </svg>
  )
}

const APP_LOGOS: Record<string, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  'Google Drive': SyntraGoogleDriveLogo,
  Zapier: SyntraZapierLogo,
  Gemini: SyntraGeminiLogo,
  OpenAI: SyntraOpenaiLogo,
  Slack: SyntraSlackLogo,
  Notion: SyntraNotionLogo,
  'Google Sheets': SyntraGoogleSheetsLogo
}

const STAGE_ICONS = {
  sources: Cable,
  context: FilePen,
  automation: Workflow,
  outcomes: ChartNoAxesColumnIncreasing
}

type AppLogosProps = { stage: Stage; tiles: boolean; className?: string }

const AppLogos = ({ stage, tiles, className }: AppLogosProps) => {
  const apps = 'apps' in stage ? (stage.apps as readonly string[]) : []
  if (!apps || apps.length === 0) return null

  const isRoadmap = stage.title === 'Connected Sources' || stage.title === 'Searchable Results'

  return (
    <div className={cn('n3-stage-apps flex shrink-0 items-center', tiles ? 'gap-[0.45em]' : 'gap-[0.3em]', className)}>
      {apps.map(app => {
        const Logo = APP_LOGOS[app]
        if (!Logo) return null

        return tiles ? (
          <span
            key={app}
            className='border-(color:--color-n3-line) grid size-[2.15em] place-items-center rounded-[0.6em] border bg-white shadow-[0_1px_2px_rgb(60_50_40/0.06)]'
          >
            <Logo className='size-[1.2em]' />
          </span>
        ) : (
          <Logo key={app} className='size-[1.45em]' />
        )
      })}
      <span className='sr-only'>
        {isRoadmap ? `Connectors (roadmap): ${apps.join(', ')}` : `Works with ${apps.join(', ')}`}
      </span>
    </div>
  )
}

const StageCardBody = ({ index }: { index: number }) => {
  const stage = STAGES[index]
  const main = isMain(stage)
  const Icon = 'icon' in stage && stage.icon ? STAGE_ICONS[stage.icon as keyof typeof STAGE_ICONS] : null

  return (
    <div className='grid grid-cols-[1.35em_minmax(0,1fr)_auto] items-start gap-x-[0.5em]'>
      <span className='text-(color:--color-n3-grey) col-start-1 row-start-1 flex h-[1.64em] items-center text-[0.8em] font-medium tabular-nums'>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div
        className={cn(
          'col-start-2 row-start-1 flex flex-wrap items-baseline justify-between gap-x-[0.6em]',
          main && 'col-span-2'
        )}
      >
        <p className='text-(color:--color-n3-ink) text-[1.05em] leading-[1.25] font-semibold tracking-[-0.015em] md:whitespace-nowrap'>
          {stage.title}
        </p>
        {main && (
          <span className='text-(color:--color-n3-accent) shrink-0 text-[0.72em] font-semibold tracking-[0.12em] uppercase'>
            Main layer
          </span>
        )}
      </div>

      {Icon && (
        <span className='col-start-1 row-start-2 mt-[0.4em] flex h-[1.276em] items-center'>
          <Icon className='text-(color:--color-n3-accent) size-[1.25em]' strokeWidth={1.7} aria-hidden />
        </span>
      )}
      <div className={cn('col-start-2 row-start-2 mt-[0.4em]', main && 'col-span-2')}>
        <p className='text-(color:--color-n3-grey) text-[0.88em] leading-[1.45]'>{stage.items.join(' · ')}</p>
        {main && <AppLogos stage={stage} tiles className='mt-[0.75em] justify-end' />}
      </div>

      {!main && <AppLogos stage={stage} tiles={false} className='col-start-3 row-span-2 row-start-1 self-center' />}
    </div>
  )
}

const pct = (n: number) => `${(n / ARTBOARD) * 100}%`
const cardDirection = (index: number) => (STAGES[index].side === 'left' ? -1 : 1)

type StageCardProps = {
  index: number
  progress: MotionValue<number>
  open: boolean
  lit: boolean
  onHover: (index: number | null) => void
}

const StageCard = ({ index, progress, open, lit, onHover }: StageCardProps) => {
  const opacity = useTransform(progress, [0.35, 0.9], [0, 1])
  const x = useTransform(
    progress,
    [0, 1],
    [-cardDirection(index) * STAGE_CARDS.restInset, cardDirection(index) * STAGE_CARDS.outward]
  )

  const stage = STAGES[index]
  const { edge, width } = STAGE_CARDS[stage.side]
  const left = stage.side === 'left' ? edge : 100 - edge - width

  const handlePointerEnter = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') onHover(index)
  }

  const handlePointerLeave = () => {
    onHover(null)
  }

  return (
    <li
      style={{ top: pct(cornerY(index)), left: `${left}%`, width: `${width}%` }}
      className='absolute -translate-y-1/2'
    >
      <m.div
        style={{ opacity, x }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className={cn(
          'n3-stage-card px-[0.9em] py-[0.85em]',
          open && 'pointer-events-auto',
          lit && 'n3-stage-card-lit'
        )}
      >
        <StageCardBody index={index} />
      </m.div>
    </li>
  )
}

type StageCardsProps = {
  progress: MotionValue<number>
  open: boolean
  hovered: number | null
  onHover: (index: number | null) => void
}

const StageCards = ({ progress, open, hovered, onHover }: StageCardsProps) => {
  return (
    <ul
      aria-label='How DataVai works'
      aria-hidden={!open}
      className='pointer-events-none absolute inset-0 m-0 hidden list-none p-0 text-[clamp(10px,1.7cqw,15px)] md:block'
    >
      {STAGES.map((stage, i) => (
        <StageCard key={stage.title} index={i} progress={progress} open={open} lit={hovered === i} onHover={onHover} />
      ))}
    </ul>
  )
}

type SyntraStageConnectorProps = {
  className?: string
  plate: number
  card: number
  y: number
  side: 'left' | 'right'
  index: number
  main: boolean
  lit: boolean
  active: boolean
  progress: MotionValue<number>
}

const lineEnds = (plate: number, card: number, side: 'left' | 'right') => {
  const dir = side === 'right' ? 1 : -1
  return { plateX: plate + dir * 7, nodeX: card - dir * 10 }
}

const SyntraStageConnector = ({
  plate,
  card,
  y,
  side,
  index,
  main,
  lit,
  active,
  progress,
  className
}: SyntraStageConnectorProps) => {
  const show = useTransform(progress, [0.55, 0.9], [0, 1])
  const t = useMotionValue(0)

  const beadX = useTransform(t, k => {
    const ends = lineEnds(plate, card, side)
    return ends.nodeX + (ends.plateX - ends.nodeX) * k
  })

  const beadOpacity = useTransform([t, show], ([k, s]: number[]) => s * Math.sin(Math.PI * k))
  const { plateX, nodeX } = lineEnds(plate, card, side)

  useEffect(() => {
    if (!active) return

    const controls = animate(t, [0, 1], {
      duration: STAGE_CARDS.beadSeconds,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 1.4,
      delay: 0.5 + index * 0.25
    })

    return () => {
      controls.stop()
      t.set(0)
    }
  }, [active, index, t])

  return (
    <m.svg aria-hidden viewBox={`0 0 ${ARTBOARD} ${ARTBOARD}`} style={{ opacity: show }} className={className}>
      <line x1={plateX} x2={nodeX} y1={y} y2={y} stroke='#CFCAC1' strokeWidth='1' />
      <m.line
        x1={plateX}
        x2={nodeX}
        y1={y}
        y2={y}
        stroke={ORANGE}
        strokeWidth='1.2'
        initial={false}
        animate={{ opacity: lit ? 0.9 : 0 }}
        transition={{ duration: 0.25 }}
      />
      <circle cx={plateX} cy={y} r='2.6' fill='#A8A399' />
      <m.circle
        cx={nodeX}
        cy={y}
        r={main ? 10 : 8}
        fill={ORANGE}
        initial={false}
        animate={{ opacity: lit || main ? 0.22 : 0.12 }}
        transition={{ duration: 0.25 }}
      />
      <circle cx={nodeX} cy={y} r='3.6' fill={ORANGE} />
      <m.circle cx={beadX} cy={y} r='2.6' fill={ORANGE} style={{ opacity: beadOpacity }} />
    </m.svg>
  )
}

type StageConnectorsProps = {
  progress: MotionValue<number>
  active: boolean
  hovered: number | null
}

const StageConnectors = ({ progress, active, hovered }: StageConnectorsProps) => {
  return (
    <div className='pointer-events-none absolute inset-0 hidden md:block'>
      {STAGES.map((stage, i) => {
        const { edge, width } = STAGE_CARDS[stage.side]
        const cardEdge = stage.side === 'left' ? (edge + width) * 10 : (100 - edge - width) * 10

        return (
          <SyntraStageConnector
            key={stage.title}
            plate={tipX(i, stage.side)}
            card={cardEdge}
            y={cornerY(i)}
            side={stage.side}
            index={i}
            main={isMain(stage)}
            lit={hovered === i}
            active={active}
            progress={progress}
            className='pointer-events-none absolute inset-0 size-full overflow-visible'
          />
        )
      })}
    </div>
  )
}

const StageList = ({ reduce }: { reduce: boolean }) => {
  return (
    <m.ul
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
      aria-label='How DataVai works'
      className='m-0 grid list-none grid-cols-1 gap-2.5 p-0 text-[13px] sm:grid-cols-2 md:hidden'
    >
      {STAGES.map((stage, i) => (
        <li key={stage.title} className='n3-stage-card px-[1.05em] py-[0.95em]'>
          <StageCardBody index={i} />
        </li>
      ))}
    </m.ul>
  )
}

// ───── Core Visual & 3D Interactive Stack ─────
const subscribeToVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

const isPageVisible = () => !document.hidden
const isPageVisibleOnServer = () => true

type ParallaxLayerProps = {
  x: MotionValue<number>
  y: MotionValue<number>
  reach: number
  children: ReactNode
}

const ParallaxLayer = ({ x, y, reach, children }: ParallaxLayerProps) => {
  const tx = useTransform(x, v => v * reach)
  const ty = useTransform(y, v => v * reach)

  return (
    <m.div style={{ x: tx, y: ty }} className='pointer-events-none absolute inset-0'>
      {children}
    </m.div>
  )
}

type TiltedProps = {
  rotateX: MotionValue<number>
  rotateY: MotionValue<number>
  children: ReactNode
}

const Tilted = ({ rotateX, rotateY, children }: TiltedProps) => {
  return (
    <div className='pointer-events-none absolute inset-0 [perspective:1400px]'>
      <m.div style={{ rotateX, rotateY }} className='absolute inset-0'>
        <div className='n3-float absolute inset-0'>{children}</div>
      </m.div>
    </div>
  )
}

const CoreVisual = () => {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const pointerType = useRef('mouse')
  const visualRef = useRef<HTMLDivElement>(null)

  const reduce = useReducedMotion() ?? false
  const onScreen = useInView(visualRef, { initial: true, margin: '40px' })
  const pageVisible = useSyncExternalStore(subscribeToVisibility, isPageVisible, isPageVisibleOnServer)

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const x = useSpring(px, { stiffness: 55, damping: 18, mass: 0.9 })
  const y = useSpring(py, { stiffness: 55, damping: 18, mass: 0.9 })
  const rotateY = useTransform(x, v => v * MOTION.tiltDegrees)

  const target = useMotionValue(0)
  const progress = useSpring(target, reduce ? { duration: 0.01 } : EXPLODE.spring)

  const rotateX = useTransform([y, progress], ([v, p]: number[]) => v * -MOTION.tiltDegrees + p * 4)
  const restOpacity = useTransform(progress, [0, 0.04], [1, 0])
  const explodedOpacity = useTransform(progress, [0, 0.03], [0, 1])
  const shadowOpacity = useTransform(progress, [0, 1], [1, 0.55])
  const orbitOpacity = useTransform(progress, [0, 0.6], [1, MOTION.orbitOpenOpacity])
  const hintOpacity = useTransform(progress, [0, 0.25], [1, 0])

  const beadsPaused = open || !onScreen || !pageVisible

  useEffect(() => {
    target.set(open ? 1 : 0)
  }, [open, target])

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return
    const box = e.currentTarget.getBoundingClientRect()
    px.set(((e.clientX - box.left) / box.width - 0.5) * 2)
    py.set(((e.clientY - box.top) / box.height - 0.5) * 2)
  }

  const handlePointerLeave = () => {
    px.set(0)
    py.set(0)
    setOpen(false)
  }

  const handleCardHover = (index: number | null) => {
    setHovered(index)
    if (index !== null && !reduce) setOpen(true)
  }

  const handleCorePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    pointerType.current = e.pointerType
  }

  const handleCorePointerEnter = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && !reduce) setOpen(true)
  }

  const handleCoreClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0 || pointerType.current !== 'mouse') setOpen(v => !v)
  }

  const handleCoreBlur = () => {
    setOpen(false)
  }

  return (
    <LazyMotion features={domAnimation}>
      <>
        <div
          ref={visualRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className='n3-enter @container relative -my-[6%] -ml-[12.5%] aspect-square w-[125%] max-w-none md:mx-auto md:my-0 md:w-full md:max-w-[840px] lg:mx-0 lg:w-[104%] lg:max-w-none'
        >
          <div className='absolute inset-0'>
            <div aria-hidden className='n3-halo pointer-events-none absolute inset-[6%]' />

            <div className='n3-fade-edge absolute inset-0'>
              <ParallaxLayer x={x} y={y} reach={-MOTION.backdropParallax}>
                <SyntraDepthBackdrop className='absolute inset-0 size-full overflow-visible' />
                <SyntraTechnicalBackdrop className='absolute inset-0 size-full overflow-visible' />
              </ParallaxLayer>
            </div>

            <ParallaxLayer x={x} y={y} reach={MOTION.ringParallax}>
              <m.div style={{ opacity: orbitOpacity }} className='absolute inset-0'>
                <SyntraOrbitalSystem className='absolute inset-0 size-full overflow-visible' />
                <SyntraParticles
                  half='back'
                  animate={!reduce}
                  paused={beadsPaused}
                  className='absolute inset-0 size-full overflow-visible'
                />
              </m.div>
            </ParallaxLayer>

            <m.div style={{ opacity: shadowOpacity }} className='absolute inset-0'>
              <SyntraCoreShadow className='pointer-events-none absolute inset-0 size-full overflow-visible' />
            </m.div>

            <Tilted rotateX={rotateX} rotateY={rotateY}>
              <m.div style={{ opacity: restOpacity }} className='absolute inset-0'>
                <SyntraCoreObject className='absolute inset-0 size-full overflow-visible' />
              </m.div>
              <m.div style={{ opacity: explodedOpacity }} className='absolute inset-0'>
                <SyntraExplodedCore progress={progress} className='absolute inset-0 size-full overflow-visible' />
              </m.div>
              <StageConnectors progress={progress} active={open && !reduce} hovered={hovered} />
            </Tilted>

            <ParallaxLayer x={x} y={y} reach={MOTION.ringParallax}>
              <m.div style={{ opacity: orbitOpacity }} className='absolute inset-0'>
                <SyntraParticles
                  half='front'
                  animate={!reduce}
                  paused={beadsPaused}
                  className='absolute inset-0 size-full overflow-visible'
                />
              </m.div>
            </ParallaxLayer>

            <Tilted rotateX={rotateX} rotateY={rotateY}>
              <StageCards progress={progress} open={open} hovered={hovered} onHover={handleCardHover} />
            </Tilted>
          </div>

          <m.p
            aria-hidden
            style={{ opacity: hintOpacity }}
            className='text-(color:--color-n3-grey) pointer-events-none absolute top-[84%] left-1/2 m-0 flex -translate-x-1/2 items-center gap-1.5 text-[12.5px] whitespace-nowrap'
          >
            <MousePointer2 className='text-(color:--color-n3-accent) size-3.5' strokeWidth={1.8} />
            <span className='[@media(hover:none)]:hidden'>Hover to see how it works</span>
            <span className='hidden [@media(hover:none)]:inline'>Tap to see how it works</span>
          </m.p>

          <button
            type='button'
            aria-expanded={open}
            aria-label='Show how DataVai works inside'
            onPointerDown={handleCorePointerDown}
            onPointerEnter={handleCorePointerEnter}
            onClick={handleCoreClick}
            onBlur={handleCoreBlur}
            className='focus-visible:outline-(color:--color-n3-accent) absolute top-[30%] left-[22%] h-[44%] w-[56%] cursor-default rounded-[3rem] focus-visible:outline-2 focus-visible:outline-offset-4'
          />
        </div>
        <StageList reduce={reduce} />
      </>
    </LazyMotion>
  )
}

// ───── Flip Label Component ─────
const FlipLabel = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <span className='n3-flip-box'>
      <span className={cn('n3-flip-face', className)}>{children}</span>
      <span aria-hidden className={cn('n3-flip-face n3-flip-back', className)}>
        {children}
      </span>
    </span>
  )
}

// ───── Hero Copy & Call To Action ─────
const rise = (delay: number) => ({ style: { animationDelay: `${delay}s` } })

const HeroCopy = () => {
  return (
    <div className='flex flex-col justify-center'>
      <p
        {...rise(0.1)}
        className='n3-rise text-(color:--color-n3-grey) flex items-center gap-3 text-[12px] font-medium tracking-[0.22em] uppercase'
      >
        <span aria-hidden className='n3-dot bg-(color:--color-n3-accent) size-2 rounded-full' />
        {COPY.eyebrow}
      </p>

      <h1 id='n3-title' {...rise(0.18)} className='n3-rise n3-h1 text-(color:--color-n3-ink) mt-7 font-normal'>
        {COPY.headline.map((line, i) => (
          <span key={line} className='block'>
            {line}
            {i === COPY.headline.length - 1 && <span className='text-(color:--color-n3-accent)'> {COPY.accentWord}</span>}
          </span>
        ))}
      </h1>

      <p {...rise(0.3)} className='n3-rise text-(color:--color-n3-grey) mt-7 max-w-[30rem] text-[17px] leading-[1.6] lg:text-[19px]'>
        {COPY.body}
      </p>

      <div {...rise(0.4)} className='n3-rise mt-9 flex flex-wrap items-center gap-3'>
        <Link
          href='/dashboard'
          className='n3-flip bg-(color:--color-n3-accent) focus-visible:outline-(color:--color-n3-ink) inline-flex h-13 items-center rounded-full px-7 text-[16px] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-14'
        >
          <FlipLabel className='gap-2.5'>
            {COPY.primaryCta}
            <ArrowRight className='size-4' strokeWidth={1.8} aria-hidden />
          </FlipLabel>
        </Link>
        <a
          href='#how-it-works'
          className='n3-flip border-(color:--color-n3-line) text-(color:--color-n3-ink) focus-visible:outline-(color:--color-n3-accent) inline-flex h-13 items-center rounded-full border bg-white/50 px-6 text-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-14'
        >
          <FlipLabel className='gap-3'>
            <span className='border-(color:--color-n3-ink) grid size-5 place-items-center rounded-full border'>
              <Play className='size-2.5 fill-current' strokeWidth={0} aria-hidden />
            </span>
            {COPY.secondaryCta}
          </FlipLabel>
        </a>
      </div>

      <dl {...rise(0.58)} className='n3-rise mt-12 grid grid-cols-3 sm:flex sm:items-stretch lg:mt-20'>
        {METRICS.map(({ value, label, icon: Icon }, i) => (
          <div
            key={label}
            className={cn(
              'flex flex-col items-start gap-2 pr-3 sm:flex-row sm:items-center sm:gap-3 sm:pr-8',
              i > 0 && 'border-(color:--color-n3-line) border-l pl-4 sm:pl-8'
            )}
          >
            <Icon className='text-(color:--color-n3-ink) size-8 shrink-0' strokeWidth={1.25} aria-hidden />
            <div>
              <dd className='text-(color:--color-n3-ink) text-[14px] leading-5 font-medium'>{value}</dd>
              <dt className='text-(color:--color-n3-grey) text-[13px] leading-5'>{label}</dt>
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ───── Floor Grid & Cursor Spotlight ─────
const CELL = { w: 84, h: 48 }

type SyntraFloorGridProps = SVGProps<SVGSVGElement> & { id: string; stroke?: string; strokeWidth?: number }

const SyntraFloorGrid = ({ id, stroke = '#D3CFC6', strokeWidth = 0.8, ...props }: SyntraFloorGridProps) => {
  return (
    <svg aria-hidden width='100%' height='100%' {...props}>
      <defs>
        <pattern id={id} width={CELL.w} height={CELL.h} patternUnits='userSpaceOnUse'>
          <path
            d={`M0 ${CELL.h / 2}L${CELL.w / 2} 0L${CELL.w} ${CELL.h / 2}M0 ${CELL.h / 2}L${CELL.w / 2} ${CELL.h}L${CELL.w} ${CELL.h / 2}`}
            fill='none'
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect width='100%' height='100%' fill={`url(#${id})`} />
    </svg>
  )
}

const SPOT = 340

const HeroFloor = () => {
  const ref = useRef<HTMLDivElement>(null)
  const spotRef = useRef<HTMLDivElement>(null)
  const litRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    const spot = spotRef.current
    const lit = litRef.current
    const section = el?.parentElement

    if (!el || !spot || !lit || !section) return

    const resize = new ResizeObserver(([entry]) => {
      lit.style.width = `${entry.contentRect.width}px`
      lit.style.height = `${entry.contentRect.height}px`
    })

    resize.observe(section)
    let frame = 0

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return

      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = section.getBoundingClientRect()
        const x = e.clientX - box.left - SPOT / 2
        const y = e.clientY - box.top - SPOT / 2

        spot.style.transform = `translate3d(${x}px, ${y}px, 0)`
        lit.style.transform = `translate3d(${-x}px, ${-y}px, 0)`
        el.dataset.spot = 'on'
      })
    }

    const handlePointerLeave = () => {
      cancelAnimationFrame(frame)
      el.dataset.spot = 'off'
    }

    section.addEventListener('pointermove', handlePointerMove)
    section.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      section.removeEventListener('pointermove', handlePointerMove)
      section.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [])

  return (
    <div ref={ref} aria-hidden data-spot='off' className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'>
      <SyntraFloorGrid id='n3-floor-cell' className='n3-floor absolute inset-0' />
      <div ref={spotRef} style={{ width: SPOT, height: SPOT }} className='n3-floor-spot'>
        <div ref={litRef} className='n3-floor-lit'>
          <SyntraFloorGrid id='n3-floor-cell-lit' stroke='#FF7A2F' strokeWidth={1} className='block size-full' />
        </div>
      </div>
    </div>
  )
}

const Hero = () => {
  return (
    <section id='top' aria-labelledby='n3-title' className='n3-hero relative isolate overflow-x-clip'>
      <HeroFloor />
      <div className='n3-frame mx-auto grid max-w-360 items-center gap-6 pt-6 pb-12 lg:min-h-[inherit] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:py-10 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:gap-20'>
        <HeroCopy />
        <CoreVisual />
      </div>
    </section>
  )
}

const SyntraMark = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='-27 -27 54 54' aria-hidden {...props}>
      <defs>
        <linearGradient id='n3-mark' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#FF9A5C' />
          <stop offset='1' stopColor='#FF7A2F' />
        </linearGradient>
      </defs>
      <SyntraLeaves fill='url(#n3-mark)' fades />
    </svg>
  )
}

// ───── Navbar ─────
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    const root = el?.closest<HTMLElement>('.n3-root')
    if (!el || !root) return

    const measure = () => root.style.setProperty('--n3-nav-space', `${el.getBoundingClientRect().height}px`)
    const observer = new ResizeObserver(measure)
    measure()
    observer.observe(el)
    document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [])

  return (
    <LazyMotion features={domAnimation}>
      <header ref={wrapRef} className='n3-drop sticky top-0 z-50'>
        <div className={cn('n3-nav-bar', (scrolled || open) && 'n3-nav-bar-scrolled')}>
          <nav
            aria-label='Primary'
            className='n3-frame mx-auto flex h-18 max-w-360 items-center justify-between lg:h-24'
          >
            <Link href='/' aria-label='DataVai home' className='text-(color:--color-n3-ink) flex items-center gap-2.5'>
              <SyntraMark className='size-9' />
              <span className='text-[26px] font-medium tracking-[-0.04em]'>
                Data<span className='text-(color:--color-n3-accent)'>Vai</span>
              </span>
            </Link>

            <ul className='hidden items-center gap-10 lg:flex'>
              {NAV_LINKS.map(link => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-(color:--color-n3-ink) hover:text-(color:--color-n3-accent) focus-visible:text-(color:--color-n3-accent) inline-flex items-center gap-1 py-2 text-[16px] transition-colors duration-200 focus-visible:outline-none'
                    >
                      <span>{link.label}</span>
                      <ExternalLink className='size-3.5 opacity-60' />
                    </a>
                  ) : (
                    <a
                      href={link.href}
                      className='text-(color:--color-n3-ink) hover:text-(color:--color-n3-accent) focus-visible:text-(color:--color-n3-accent) inline-flex items-center py-2 text-[16px] transition-colors duration-200 focus-visible:outline-none'
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>

            <div className='flex items-center gap-2 sm:gap-4'>
              <a
                href='https://github.com/arz282-ctrl/data-v-ai'
                target='_blank'
                rel='noopener noreferrer'
                className='text-(color:--color-n3-ink) hover:text-(color:--color-n3-accent) hidden px-3 py-2 text-[16px] transition-colors duration-200 sm:block'
              >
                GitHub
              </a>
              <Link
                href='/dashboard'
                className='n3-flip bg-(color:--color-n3-ink) focus-visible:outline-(color:--color-n3-accent) inline-flex h-11 items-center rounded-full px-5 text-[15px] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-13 sm:px-6 sm:text-[16px]'
              >
                <FlipLabel className='gap-2'>
                  Open dashboard
                  <ArrowRight className='size-4' strokeWidth={1.8} aria-hidden />
                </FlipLabel>
              </Link>
              <button
                type='button'
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                aria-controls='n3-mobile-menu'
                onClick={() => setOpen(v => !v)}
                className='text-(color:--color-n3-ink) grid size-11 place-items-center rounded-full lg:hidden cursor-pointer'
              >
                {open ? <X className='size-5' strokeWidth={1.6} /> : <Menu className='size-5' strokeWidth={1.6} />}
              </button>
            </div>
          </nav>

          <AnimatePresence initial={false}>
            {open && (
              <m.div
                id='n3-mobile-menu'
                initial={reduce ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: EASE }}
                className='n3-frame pb-5 lg:hidden'
              >
                <ul className='border-(color:--color-n3-ink)/8 flex flex-col border-t pt-2'>
                  {NAV_LINKS.map(link => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className='text-(color:--color-n3-ink) flex h-12 items-center text-[16px]'
                        {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <Link
                      href='/dashboard'
                      onClick={() => setOpen(false)}
                      className='text-(color:--color-n3-accent) font-semibold flex h-12 items-center text-[16px]'
                    >
                      Open dashboard
                    </Link>
                  </li>
                </ul>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </LazyMotion>
  )
}

// ───── Main Exported SyntraHero Component ─────
const motionVars = {
  '--n3-float': MOTION.floatDistance,
  '--n3-float-seconds': `${MOTION.floatSeconds}s`
} as CSSProperties

const CoreHeroBase = () => {
  return (
    <div style={motionVars} className='n3-root n3-bg font-(family-name:--font-n3-sans) text-(color:--color-n3-ink) w-full antialiased'>
      <Navbar />
      <Hero />
    </div>
  )
}

export function SyntraHero() {
  return (
    <>
      <style>{BLOCK_CSS}</style>
      <CoreHeroBase />
    </>
  )
}

export default SyntraHero

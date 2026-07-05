import type { ArtifactFile } from '@/lib/artifact-analysis'

export const INSPECTOR_MESSAGE_SOURCE = 'llamacoder-inspector' as const

export type InspectorRect = {
  top: number
  left: number
  width: number
  height: number
}

export type InspectorHoverMessage = {
  source: typeof INSPECTOR_MESSAGE_SOURCE
  type: 'hover'
  id: string | null
  tag?: string
  rect?: InspectorRect | null
}

export type InspectorSelectMessage = {
  source: typeof INSPECTOR_MESSAGE_SOURCE
  type: 'select'
  id: string
  tag: string
  className: string
  text: string
  rect: InspectorRect
}

export type InspectorTreeNode = {
  id: string
  tag: string
  depth: number
  className: string
  text: string
}

export type InspectorTreeMessage = {
  source: typeof INSPECTOR_MESSAGE_SOURCE
  type: 'tree'
  nodes: InspectorTreeNode[]
}

export type InspectorParentMessage = {
  source: typeof INSPECTOR_MESSAGE_SOURCE
  type: 'set-enabled' | 'highlight' | 'clear-highlight' | 'request-tree'
  enabled?: boolean
  id?: string | null
}

export type InspectorOutboundMessage = InspectorHoverMessage | InspectorSelectMessage | InspectorTreeMessage
export type InspectorInboundMessage = InspectorParentMessage

export type ElementTarget = {
  id: string
  filePath: string
  tag: string
  className: string
  text: string
  match: string
  line?: number
}

const JSX_OPEN_TAG =
  /<([A-Za-z][A-Za-z0-9.]*)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g

const SKIP_TAGS = new Set([
  'Fragment',
  'React.Fragment',
  'Suspense',
  'StrictMode',
  'Provider',
  'Consumer',
  'Slot',
])

const HTML_TAGS = new Set([
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'button', 'section', 'header', 'footer', 'main', 'nav',
  'ul', 'ol', 'li', 'img', 'input', 'label', 'form', 'article', 'aside',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'video', 'canvas', 'svg',
])

function isInspectableTag(tag: string) {
  if (SKIP_TAGS.has(tag)) return false
  if (/^[A-Z]/.test(tag)) return true
  return HTML_TAGS.has(tag.toLowerCase())
}

export function normalizeInspectorPath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, '')
    .replace(/^src\//, '')
}

function lineNumberAt(content: string, index: number) {
  return content.slice(0, index).split('\n').length
}

function readClassName(attrs: string) {
  const quoted = attrs.match(/className="([^"]*)"/)?.[1]
  if (quoted !== undefined) return quoted
  const template = attrs.match(/className=\{`([^`]*)`\}/)?.[1]
  if (template !== undefined) return template
  const expr = attrs.match(/className=\{"([^"]*)"\}/)?.[1]
  if (expr !== undefined) return expr
  return ''
}

function readInspectorId(attrs: string) {
  return attrs.match(/data-llama-id="([^"]*)"/)?.[1] || ''
}

export function detectElementTargets(files: ArtifactFile[]): ElementTarget[] {
  const targets: ElementTarget[] = []

  for (const file of files.filter((item) => /\.(tsx|jsx)$/i.test(item.path))) {
    const normalizedPath = normalizeInspectorPath(file.path)
    let index = 0

    for (const match of file.code.matchAll(JSX_OPEN_TAG)) {
      if (index >= 96) break

      const full = match[0]
      const tag = match[1]
      const attrs = match[2] || ''
      const inner = match[4] || ''

      if (!tag || !isInspectableTag(tag)) continue

      const className = readClassName(attrs)
      const text = inner.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim().slice(0, 140)
      const existingId = readInspectorId(attrs)
      const id = existingId || `${normalizedPath}:${index}:${tag}`
      const matchIndex = match.index ?? 0

      targets.push({
        id,
        filePath: file.path,
        tag,
        className,
        text,
        match: full,
        line: lineNumberAt(file.code, matchIndex),
      })
      index += 1
    }
  }

  return targets.slice(0, 200)
}

export function instrumentFileForInspector(file: ArtifactFile): string {
  const normalizedPath = normalizeInspectorPath(file.path)
  let index = 0

  return file.code.replace(JSX_OPEN_TAG, (full, tag: string, attrs: string, closing: string, inner?: string) => {
    if (SKIP_TAGS.has(tag)) return full
    if (attrs.includes('data-llama-id=')) return full

    const id = `${normalizedPath}:${index}:${tag}`
    index += 1
    const nextAttrs = attrs.trim().length ? ` ${attrs.trim()}` : ''
    if (closing === '/>') {
      return `<${tag} data-llama-id="${id}"${nextAttrs}/>`
    }
    return `<${tag} data-llama-id="${id}"${nextAttrs}>${inner || ''}</${tag}>`
  })
}

export function instrumentFilesForInspector(files: ArtifactFile[]): ArtifactFile[] {
  return files.map((file) => {
    if (!/\.(tsx|jsx)$/i.test(file.path)) return file
    return { ...file, code: instrumentFileForInspector(file) }
  })
}

export function stripInspectorAttributes(code: string) {
  return code.replace(/\s*data-llama-id="[^"]*"/g, '')
}

export function stripInspectorFromFiles(files: ArtifactFile[]): ArtifactFile[] {
  return files.map((file) => ({
    ...file,
    code: stripInspectorAttributes(file.code),
  }))
}

export function patchElement(files: ArtifactFile[], target: ElementTarget, nextMatch: string) {
  return files.map((file) => {
    if (file.path !== target.filePath) return file
    const index = file.code.indexOf(target.match)
    if (index === -1) return file
    return {
      ...file,
      code: file.code.slice(0, index) + nextMatch + file.code.slice(index + target.match.length),
    }
  })
}

export function refreshElementTarget(files: ArtifactFile[], target: ElementTarget): ElementTarget | null {
  const elements = detectElementTargets(files)
  return elements.find((element) => element.id === target.id) || null
}

export function findElementParent(targets: ElementTarget[], target: ElementTarget): ElementTarget | null {
  const fileTargets = targets.filter((item) => item.filePath === target.filePath)
  const index = fileTargets.findIndex((item) => item.id === target.id)
  if (index <= 0) return null
  return fileTargets[index - 1] || null
}

export function replaceClassToken(className: string, groups: string[], next: string) {
  const tokens = className
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (token) =>
        !groups.some(
          (prefix) =>
            token === prefix ||
            token.startsWith(`${prefix}-`) ||
            token.startsWith(prefix),
        ),
    )
  if (next) tokens.push(next)
  return tokens.join(' ')
}

export function updateElementClassName(target: ElementTarget, nextClassName: string) {
  if (target.match.includes('className=')) {
    return target.match.replace(/className="([^"]*)"/, `className="${nextClassName}"`)
  }
  if (target.match.includes('data-llama-id=')) {
    return target.match.replace(
      /(data-llama-id="[^"]*")/,
      `$1 className="${nextClassName}"`,
    )
  }
  return target.match.replace(/^<([A-Za-z][A-Za-z0-9.]*)/, `<$1 className="${nextClassName}"`)
}

/**
 * Precise, single-property className editing for the style property panel.
 * Unlike replaceClassToken (which strips by string-prefix and can conflate
 * unrelated classes that happen to share a prefix — e.g. `text-[22px]` for
 * font size vs `text-[#fff]` for color both start with `text-[`), this takes
 * a predicate function so each control only ever touches its own class.
 */
export function applyClassProperty(
  className: string,
  matchToken: (token: string) => boolean,
  nextToken: string | null,
): string {
  const tokens = className.split(/\s+/).filter(Boolean).filter((token) => !matchToken(token))
  if (nextToken) tokens.push(nextToken)
  return tokens.join(' ')
}

/** Reads the current value of a property (if any) matching the predicate,
 * so the panel can populate controls with the element's existing state. */
export function readClassProperty(className: string, matchToken: (token: string) => boolean): string | null {
  const tokens = className.split(/\s+/).filter(Boolean)
  return tokens.find(matchToken) ?? null
}

// --- Property → Tailwind token predicates/builders used by the style panel ---
// Centralized here so the mapping between "typography/color/layout controls"
// and actual Tailwind classes has one source of truth.
export const STYLE_PROPERTY_MATCHERS = {
  fontFamily: (t: string) => t.startsWith('[font-family:'),
  fontSize: (t: string) => /^text-\[[\d.]+(px|rem|em)\]$/.test(t),
  fontWeight: (t: string) =>
    ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'].includes(t),
  italic: (t: string) => t === 'italic' || t === 'not-italic',
  lineHeight: (t: string) => /^leading-\[[\d.]+(em|px|rem)?\]$/.test(t) || ['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose'].includes(t),
  letterSpacing: (t: string) => /^tracking-\[-?[\d.]+em\]$/.test(t) || ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest'].includes(t),
  textAlign: (t: string) => ['text-left', 'text-center', 'text-right', 'text-justify'].includes(t),
  textCase: (t: string) => ['uppercase', 'lowercase', 'capitalize', 'normal-case'].includes(t),
  textDecoration: (t: string) => ['underline', 'line-through', 'no-underline', 'overline'].includes(t),
  textColor: (t: string) => /^text-\[#/.test(t),
  bgColor: (t: string) => /^bg-\[#/.test(t),
  display: (t: string) => ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden'].includes(t),
  marginTop: (t: string) => /^mt-\[[\d.]+px\]$/.test(t),
  marginRight: (t: string) => /^mr-\[[\d.]+px\]$/.test(t),
  marginBottom: (t: string) => /^mb-\[[\d.]+px\]$/.test(t),
  marginLeft: (t: string) => /^ml-\[[\d.]+px\]$/.test(t),
  paddingTop: (t: string) => /^pt-\[[\d.]+px\]$/.test(t),
  paddingRight: (t: string) => /^pr-\[[\d.]+px\]$/.test(t),
  paddingBottom: (t: string) => /^pb-\[[\d.]+px\]$/.test(t),
  paddingLeft: (t: string) => /^pl-\[[\d.]+px\]$/.test(t),
} as const

export type StylePropertyKey = keyof typeof STYLE_PROPERTY_MATCHERS
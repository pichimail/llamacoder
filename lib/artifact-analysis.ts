export type ArtifactFile = {
  path: string
  code: string
  language?: string
}

export type DesignToken = {
  name: string
  value: string
  category: 'color' | 'typography' | 'spacing' | 'radius' | 'effect'
}

export type SchemaColumn = {
  name: string
  type: string
  nullable: boolean
  isPrimary?: boolean
  isForeign?: boolean
}

export type SchemaTable = {
  name: string
  columns: SchemaColumn[]
  relations: { name: string; relatedTable: string }[]
}

export function normalizeArtifactFiles(files: unknown): ArtifactFile[] {
  if (!Array.isArray(files)) return []

  const normalized: ArtifactFile[] = []

  for (const file of files) {
    if (!file || typeof file !== 'object') continue

    const value = file as Record<string, unknown>
    const path = typeof value.path === 'string' ? value.path.replace(/^\/+/, '') : ''
    const code =
      typeof value.code === 'string'
        ? value.code
        : typeof value.content === 'string'
          ? value.content
          : ''

    if (!path || !code) continue

    const artifactFile: ArtifactFile = { path, code }
    if (typeof value.language === 'string' && value.language.length > 0) {
      artifactFile.language = value.language
    }
    normalized.push(artifactFile)
  }

  return normalized
}

export function getLatestArtifactFiles(messages: Array<{ files?: unknown; content?: string; role?: string }>) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    const files = normalizeArtifactFiles(message.files)
    if (message.role === 'assistant' && files.length > 0) return files
  }
  return []
}

export function countRenderableFiles(files: ArtifactFile[]) {
  return files.filter((file) => /\.(tsx|ts|jsx|js|css|json|prisma|sql)$/i.test(file.path)).length
}

export function findFile(files: ArtifactFile[], matcher: RegExp | string) {
  if (typeof matcher === 'string') return files.find((file) => file.path === matcher)
  return files.find((file) => matcher.test(file.path))
}

export function detectDesignTokens(files: ArtifactFile[]): DesignToken[] {
  const tokens: DesignToken[] = []
  const seen = new Set<string>()
  const cssFiles = files.filter((file) => /\.(css|tsx|jsx)$/i.test(file.path))
  const fullText = cssFiles.map((file) => file.code).join('\n')

  const add = (token: DesignToken) => {
    const key = `${token.category}:${token.name}:${token.value}`
    if (seen.has(key)) return
    seen.add(key)
    tokens.push(token)
  }

  for (const match of fullText.matchAll(/--([\w-]+)\s*:\s*([^;}{]+)[;}]/g)) {
    const name = match[1]
    const value = match[2].trim()
    const category = /color|bg|background|foreground|border|ring|accent|primary|secondary|muted|card|popover|destructive/i.test(name)
      ? 'color'
      : /radius|rounded/i.test(name)
        ? 'radius'
        : /font|type|text/i.test(name)
          ? 'typography'
          : /spacing|space|gap|padding|margin/i.test(name)
            ? 'spacing'
            : 'effect'
    add({ name: `--${name}`, value, category })
  }

  for (const match of fullText.matchAll(/#(?:[\da-f]{3}){1,2}\b/gi)) {
    add({ name: `color-${tokens.length + 1}`, value: match[0], category: 'color' })
  }

  const classMatches = fullText.match(/(?:text|bg|from|via|to|border|ring|fill|stroke)-[a-z]+-\d{2,3}/g) || []
  classMatches.slice(0, 32).forEach((value, index) => {
    add({ name: `class-${index + 1}`, value, category: 'color' })
  })

  const fontMatches = fullText.match(/font-(sans|serif|mono|\[[^\]]+\])/g) || []
  fontMatches.forEach((value, index) => {
    add({ name: `font-${index + 1}`, value, category: 'typography' })
  })

  const spacingMatches = fullText.match(/(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-y|space-x)-[\w\[\]./-]+/g) || []
  spacingMatches.slice(0, 28).forEach((value, index) => {
    add({ name: `space-${index + 1}`, value, category: 'spacing' })
  })

  const radiusMatches = fullText.match(/rounded(?:-[\w\[\]./-]+)?/g) || []
  radiusMatches.slice(0, 16).forEach((value, index) => {
    add({ name: `radius-${index + 1}`, value, category: 'radius' })
  })

  return tokens.slice(0, 96)
}

export function applyTokenChange(files: ArtifactFile[], token: DesignToken, nextValue: string) {
  let changed = false
  const nextFiles = files.map((file) => {
    if (changed || !/\.(css|tsx|jsx)$/i.test(file.path)) return file
    if (!file.code.includes(token.value)) return file

    changed = true
    return { ...file, code: file.code.replace(token.value, nextValue) }
  })

  return { files: nextFiles, changed }
}

export function detectDatabaseSchema(files: ArtifactFile[]): SchemaTable[] {
  const prismaFile = files.find((file) => /schema\.prisma$/i.test(file.path))
  if (prismaFile) return parsePrismaSchema(prismaFile.code)

  const sqlFiles = files.filter((file) => /\.(sql)$/i.test(file.path) || /supabase\/.*\.(sql|ts)$/i.test(file.path))
  const sqlTables = sqlFiles.flatMap((file) => parseSqlTables(file.code))

  const drizzleFiles = files.filter((file) => /\.(ts|tsx|js|jsx)$/i.test(file.path) && /(pgTable|mysqlTable|sqliteTable)\s*\(/.test(file.code))
  const drizzleTables = drizzleFiles.flatMap((file) => parseDrizzleTables(file.code))

  return [...sqlTables, ...drizzleTables]
}

function parsePrismaSchema(schema: string): SchemaTable[] {
  const tables: SchemaTable[] = []
  const modelRegex = /model\s+(\w+)\s*{([\s\S]*?)}/g
  let match: RegExpExecArray | null

  while ((match = modelRegex.exec(schema))) {
    const name = match[1]
    const body = match[2]
    const columns: SchemaColumn[] = []
    const relations: { name: string; relatedTable: string }[] = []

    body.split('\n').forEach((rawLine) => {
      const line = rawLine.trim()
      if (!line || line.startsWith('//') || line.startsWith('@@')) return
      const parts = line.split(/\s+/)
      if (parts.length < 2) return
      const fieldName = parts[0]
      const fieldType = parts[1]
      if (fieldName.startsWith('@')) return

      const normalizedType = fieldType.replace(/[?\[\]]/g, '')
      const isRelation = /^[A-Z]/.test(normalizedType) && !['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Decimal', 'BigInt'].includes(normalizedType)
      if (isRelation) {
        relations.push({ name: fieldName, relatedTable: normalizedType })
        return
      }

      columns.push({
        name: fieldName,
        type: fieldType,
        nullable: fieldType.includes('?'),
        isPrimary: line.includes('@id'),
        isForeign: line.includes('@relation') || /Id$/.test(fieldName),
      })
    })

    tables.push({ name, columns, relations })
  }

  return tables
}

function parseSqlTables(sql: string): SchemaTable[] {
  const tables: SchemaTable[] = []
  const tableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?["`]?([\w.-]+)["`]?\s*\(([\s\S]*?)\);/gi
  let match: RegExpExecArray | null

  while ((match = tableRegex.exec(sql))) {
    const name = match[1].split('.').pop() || match[1]
    const columns = match[2]
      .split(',')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^(primary|foreign|constraint|unique|index)\b/i.test(line))
      .map((line) => {
        const [columnName = 'column', columnType = 'text'] = line.replace(/["`]/g, '').split(/\s+/)
        return {
          name: columnName,
          type: columnType,
          nullable: !/not\s+null/i.test(line),
          isPrimary: /primary\s+key/i.test(line),
          isForeign: /references\s+/i.test(line),
        }
      })

    tables.push({ name, columns, relations: [] })
  }

  return tables
}

function parseDrizzleTables(source: string): SchemaTable[] {
  const tables: SchemaTable[] = []
  const tableRegex = /(pgTable|mysqlTable|sqliteTable)\s*\(\s*['"`]([\w.-]+)['"`]\s*,\s*{([\s\S]*?)}\s*\)/g
  let match: RegExpExecArray | null

  while ((match = tableRegex.exec(source))) {
    const tableName = match[2]
    const body = match[3]
    const columns: SchemaColumn[] = []

    body.split('\n').forEach((rawLine) => {
      const line = rawLine.trim().replace(/,$/, '')
      if (!line || line.startsWith('//') || !line.includes(':')) return
      const [rawName, rawFactory = ''] = line.split(':')
      const name = rawName.trim().replace(/["'`]/g, '')
      const type = rawFactory.trim().match(/^(\w+)/)?.[1] || 'column'
      columns.push({
        name,
        type,
        nullable: !/\.notNull\(\)/.test(line),
        isPrimary: /\.primaryKey\(\)/.test(line),
        isForeign: /\.references\(/.test(line) || /Id$/.test(name),
      })
    })

    tables.push({ name: tableName, columns, relations: [] })
  }

  return tables
}

export function patchFileContent(files: ArtifactFile[], path: string, nextCode: string) {
  return files.map((file) => (file.path === path ? { ...file, code: nextCode } : file))
}

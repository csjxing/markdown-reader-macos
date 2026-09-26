import { TableOfContents, TableFormatInfo } from '../store'

/**
 * Detect table formats in content
 * Returns array of table info with format type (HTML vs Markdown)
 */
export function detectTableFormats(content: string): TableFormatInfo[] {
  const tables: TableFormatInfo[] = []

  // Detect HTML tables
  const htmlTableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi
  let match
  while ((match = htmlTableRegex.exec(content)) !== null) {
    tables.push({
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      originalText: match[0],
      isHtml: true
    })
  }

  // Detect Markdown tables
  // Markdown table: rows starting with | and separated by |, with a separator row
  const markdownTableRegex = /(?:^|\n)(\|[^\n]+\|\n)(\|[-:\s|]+\|\n)((?:\|[^\n]+\|\n?)+)/g
  while ((match = markdownTableRegex.exec(content)) !== null) {
    // Check if this overlaps with an HTML table
    const tableStart = match.index + (match[0].startsWith('\n') ? 1 : 0)
    const tableEnd = match.index + match[0].length

    const overlaps = tables.some(t =>
      (tableStart >= t.startIndex && tableStart < t.endIndex) ||
      (tableEnd > t.startIndex && tableEnd <= t.endIndex) ||
      (tableStart <= t.startIndex && tableEnd >= t.endIndex)
    )

    if (!overlaps) {
      tables.push({
        startIndex: tableStart,
        endIndex: tableEnd,
        originalText: match[0].trim(),
        isHtml: false
      })
    }
  }

  // Sort by start index
  tables.sort((a, b) => a.startIndex - b.startIndex)

  return tables
}

/**
 * Convert Markdown table to HTML table
 */
export function markdownTableToHtml(markdownTable: string): string {
  const lines = markdownTable.trim().split('\n').filter(line => line.trim())
  if (lines.length < 2) return markdownTable

  // Skip separator line (second line with |---|---|)
  const headerLine = lines[0]
  const dataLines = lines.slice(2)

  const parseRow = (line: string, isHeader: boolean = false): string => {
    const cells = line.split('|').filter(cell => cell.trim() !== '')
    const tag = isHeader ? 'th' : 'td'
    const cellsHtml = cells.map(cell => `<${tag}>${cell.trim()}</${tag}>`).join('')
    return `<tr>${cellsHtml}</tr>`
  }

  let html = '<table>\n'
  html += parseRow(headerLine, true) + '\n'
  dataLines.forEach(line => {
    html += parseRow(line, false) + '\n'
  })
  html += '</table>'

  return html
}

/**
 * Convert HTML table to Markdown table
 */
export function htmlTableToMarkdown(htmlTable: string): string {
  let md = '\n'

  // Extract rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const rows: string[][] = []
  let rowMatch

  while ((rowMatch = rowRegex.exec(htmlTable)) !== null) {
    const rowContent = rowMatch[1]
    const cells: string[] = []

    // Extract cells (th or td)
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let cellMatch
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells.push(cellMatch[1].trim())
    }

    if (cells.length > 0) {
      rows.push(cells)
    }
  }

  if (rows.length === 0) return htmlTable

  // Build markdown table
  rows.forEach((row, index) => {
    md += '| ' + row.join(' | ') + ' |\n'
    if (index === 0) {
      md += '| ' + row.map(() => '---').join(' | ') + ' |\n'
    }
  })

  return md + '\n'
}

/**
 * Restore original table formats in edited content
 * This function takes the new content and the original table format info,
 * and converts tables back to their original format
 */
export function restoreTableFormats(
  newContent: string,
  originalFormats: TableFormatInfo[]
): string {
  if (originalFormats.length === 0) return newContent

  // Detect tables in new content (they will all be in Markdown format from tiptap-markdown)
  const newTables = detectTableFormats(newContent)

  if (newTables.length === 0) return newContent

  // Match new tables with original tables by position/order
  let result = newContent
  let offset = 0

  for (let i = 0; i < Math.min(newTables.length, originalFormats.length); i++) {
    const newTable = newTables[i]
    const originalFormat = originalFormats[i]

    // If original was HTML, convert new table to HTML
    if (originalFormat.isHtml) {
      const newTableText = result.substring(newTable.startIndex + offset, newTable.endIndex + offset)
      const htmlTable = markdownTableToHtml(newTableText)

      result = result.substring(0, newTable.startIndex + offset) +
               htmlTable +
               result.substring(newTable.endIndex + offset)

      offset += htmlTable.length - newTableText.length
    }
  }

  return result
}

/**
 * Extract table of contents from markdown content
 */
export function extractTableOfContents(content: string): TableOfContents[] {
  const headings: TableOfContents[] = []
  const regex = /^(#{1,6})\s+(.+)$/gm
  let match

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length
    const title = match[2].trim()
    const id = generateHeadingId(title)

    headings.push({
      id,
      title,
      level,
      position: match.index
    })
  }

  return headings
}

/**
 * Generate a heading ID from title
 */
export function generateHeadingId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

/**
 * Get word count
 */
export function getWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Get character count
 */
export function getCharacterCount(content: string): number {
  return content.length
}

/**
 * Truncate text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Parse front matter from markdown
 */
export function parseFrontMatter(content: string): {
  frontMatter: Record<string, string>
  content: string
} {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/
  const match = content.match(frontMatterRegex)

  if (!match) {
    return { frontMatter: {}, content }
  }

  const frontMatterString = match[1]
  const frontMatter: Record<string, string> = {}

  frontMatterString.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length) {
      frontMatter[key.trim()] = valueParts.join(':').trim()
    }
  })

  return {
    frontMatter,
    content: content.substring(match[0].length)
  }
}

/**
 * Split content into chunks for pagination
 */
export function splitIntoPages(content: string, charsPerPage: number = 3000): string[] {
  const pages: string[] = []
  let remaining = content

  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) {
      pages.push(remaining)
      break
    }

    // Try to find a good break point (paragraph end, sentence end, or word boundary)
    let breakPoint = charsPerPage

    // Look for paragraph break
    const paragraphBreak = remaining.lastIndexOf('\n\n', charsPerPage)
    if (paragraphBreak > charsPerPage * 0.5) {
      breakPoint = paragraphBreak + 2
    } else {
      // Look for sentence end
      const sentenceEnd = remaining.lastIndexOf('. ', charsPerPage)
      if (sentenceEnd > charsPerPage * 0.5) {
        breakPoint = sentenceEnd + 2
      }
    }

    pages.push(remaining.substring(0, breakPoint))
    remaining = remaining.substring(breakPoint)
  }

  return pages
}
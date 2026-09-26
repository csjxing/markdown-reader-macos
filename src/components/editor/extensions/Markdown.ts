import { Extension } from '@tiptap/core'

// Simple Markdown parser/serializer for Tiptap
// This converts between Markdown and HTML for the editor

export const Markdown = Extension.create({
  name: 'markdown',

  addStorage() {
    return { getMarkdown: () => '' }
  },
  onCreate() {
    this.storage.getMarkdown = () => htmlToMarkdown(this.editor.getHTML())
  },
})

// Convert HTML to Markdown
function htmlToMarkdown(html: string): string {
  let md = html

  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')

  // Bold and Italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
  md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
  md = md.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '==$1==')

  // Code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
  md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')

  // Lists
  md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1')
  md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gis, '$1')
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n')
  md = md.replace(/<ol[^>]*>/gi, '')
  md = md.replace(/<\/ol>/gi, '')

  // Task lists
  md = md.replace(/<input[^>]*type="checkbox"[^>]*checked[^>]*>/gi, '[x] ')
  md = md.replace(/<input[^>]*type="checkbox"[^>]*>/gi, '[ ] ')

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
    return content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n'
  })

  // Horizontal rules
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n\n')

  // Paragraphs and breaks
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n')
  md = md.replace(/<br\s*\/?>/gi, '\n')

  // Tables - simplified conversion
  md = md.replace(/<table[^>]*>(.*?)<\/table>/gis, (_, content) => {
    let tableMd = '\n'
    const rows = content.match(/<tr[^>]*>(.*?)<\/tr>/gis) || []
    rows.forEach((row: string, index: number) => {
      const cells = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gis) || []
      const cellContents = cells.map((cell: string) =>
        cell.replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/is, '$1').trim()
      )
      tableMd += '| ' + cellContents.join(' | ') + ' |\n'
      if (index === 0) {
        tableMd += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n'
      }
    })
    return tableMd + '\n'
  })

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  md = md.replace(/&nbsp;/g, ' ')
  md = md.replace(/&lt;/g, '<')
  md = md.replace(/&gt;/g, '>')
  md = md.replace(/&amp;/g, '&')
  md = md.replace(/&quot;/g, '"')

  // Clean up extra whitespace
  md = md.replace(/\n{3,}/g, '\n\n')
  md = md.trim()

  return md
}

// Convert Markdown to HTML (simple parser for common elements)
export function markdownToHtml(markdown: string): string {
  let html = markdown

  // Escape HTML
  html = html.replace(/&/g, '&amp;')
  html = html.replace(/</g, '&lt;')
  html = html.replace(/>/g, '&gt;')

  // Code blocks (must be before other transformations)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
  html = html.replace(/``([^`]+)``/g, '<code>$1</code>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headers
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>')
  html = html.replace(/==(.+?)==/g, '<mark>$1</mark>')

  // Links and Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr />')

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

  // Lists
  html = html.replace(/^- \[x\] (.+)$/gm, '<input type="checkbox" checked disabled /> $1')
  html = html.replace(/^- \[ \] (.+)$/gm, '<input type="checkbox" disabled /> $1')
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>')
  html = '<p>' + html + '</p>'
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/<p>(<h[1-6]>)/g, '$1')
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1')
  html = html.replace(/<p>(<hr \/>)/g, '$1')
  html = html.replace(/(<hr \/>)<\/p>/g, '$1')
  html = html.replace(/<p>(<pre>)/g, '$1')
  html = html.replace(/(<\/pre>)<\/p>/g, '$1')
  html = html.replace(/<p>(<blockquote>)/g, '$1')
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1')
  html = html.replace(/<p>(<li>)/g, '$1')
  html = html.replace(/(<\/li>)<\/p>/g, '$1')

  return html
}
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { PluggableList } from 'unified'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import { TableOfContents } from '../../store'
import 'highlight.js/styles/github.css'

// Keep GitHub's allowlist and DOM-clobber protection. Documents are content,
// never embedded applications with access to the reader's native bridge.
const documentSchema = {
  ...defaultSchema,
  strip: [...(defaultSchema.strip || []), 'iframe', 'object', 'embed', 'form', 'style', 'webview', 'applet', 'base', 'meta', 'link'],
}
const headingPrefix = defaultSchema.clobberPrefix || 'user-content-'
const remarkPlugins = [remarkGfm]
const safePlugins: PluggableList = [[rehypeSanitize, documentSchema], [rehypeSlug, { prefix: headingPrefix }], rehypeHighlight]
const htmlPlugins = [rehypeRaw, ...safePlugins]

export function documentAnchor(href: string): string {
  let fragment = href.slice(1)
  try { fragment = decodeURIComponent(fragment) } catch { /* Keep malformed fragments inert. */ }
  // Source IDs are prefixed by sanitize even when they already start with this
  // string (as GFM footnotes do). TOC entries already use final DOM IDs.
  return headingPrefix + fragment
}

interface MarkdownRendererProps {
  content: string
  onTocGenerated?: (toc: TableOfContents[]) => void
  onScrollToElement?: (elementId: string) => void
  copyLabels?: { copy: string; copied: string; failed: string }
}

const defaultCopyLabels = { copy: 'Copy code', copied: 'Copied', failed: 'Copy failed' }

function CodeBlock({ children, labels }: { children?: ReactNode; labels: typeof defaultCopyLabels }) {
  const codeRef = useRef<HTMLPreElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const [status, setStatus] = useState<'copy' | 'copied' | 'failed'>('copy')
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = async () => {
    try {
      const text = codeRef.current?.textContent || ''
      if (window.electronAPI?.writeClipboard) await window.electronAPI.writeClipboard(text)
      else await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch { setStatus('failed') }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('copy'), 2000)
  }
  return <div className="reader-code-block">
    <button type="button" className="reader-code-copy" onClick={copy} aria-live="polite">{labels[status]}</button>
    <pre ref={codeRef}>{children}</pre>
  </div>
}

function MarkdownRenderer({ content, onTocGenerated, onScrollToElement, copyLabels = defaultCopyLabels }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Raw HTML needs a second HTML parser. Plain Markdown can skip that pass.
  const rehypePlugins = useMemo(() => content.includes('<') ? htmlPlugins : safePlugins, [content])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const frameId = requestAnimationFrame(() => {
      if (!containerRef.current) return

      const headingElements = containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const toc: TableOfContents[] = []

      headingElements.forEach((el, index) => {
        const title = el.textContent?.trim() || ''
        const level = parseInt(el.tagName.charAt(1))
        const id = el.id || `heading-${index}`

        toc.push({ id, title, level, position: index })
      })

      onTocGenerated?.(toc)
    })

    return () => cancelAnimationFrame(frameId)
  }, [content, onTocGenerated])

  return (
    <div ref={containerRef} className="markdown-content">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          pre: ({ children }) => <CodeBlock labels={copyLabels}>{children}</CodeBlock>,
          a: ({ href, children, node: _node, ...props }) => {
            if (href?.startsWith('#')) {
              const targetId = documentAnchor(href)
              return (
                <a
                  href={`#${encodeURIComponent(targetId)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    onScrollToElement?.(targetId)
                  }}
                  {...props}
                >
                  {children}
                </a>
              )
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
          },
          img: ({ src, alt, node: _node, ...props }) => (
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className="max-w-full h-auto rounded-lg shadow-md my-4 cursor-pointer hover:opacity-90"
              onClick={() => src && window.open(src, '_blank')}
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// Progress, search input and toolbar changes must never reparse the document.
export default memo(MarkdownRenderer)

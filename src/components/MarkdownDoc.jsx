import { Fragment, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { parseMarkdown } from '../utils/markdown'
import { TexMath } from './TexMath'

export function Inline({ nodes }) {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={index}>{node.value}</Fragment>
      case 'code':
        return (
          <code key={index} className="md-code">
            {node.value}
          </code>
        )
      case 'math':
        return <TexMath key={index} source={node.value} />
      case 'strong':
        return (
          <strong key={index}>
            <Inline nodes={node.children} />
          </strong>
        )
      case 'em':
        return (
          <em key={index}>
            <Inline nodes={node.children} />
          </em>
        )
      case 'strike':
        return (
          <s key={index}>
            <Inline nodes={node.children} />
          </s>
        )
      case 'link':
        return (
          <a key={index} href={node.href} target="_blank" rel="noreferrer">
            <Inline nodes={node.children} />
          </a>
        )
      default:
        return null
    }
  })
}

function MarkdownList({ block }) {
  const Tag = block.ordered ? 'ol' : 'ul'
  return (
    <Tag className="md-list">
      {block.items.map((item, index) => (
        <li key={index}>
          <Inline nodes={item.content} />
          {item.children.map((child, childIndex) => (
            <MarkdownList key={childIndex} block={child} />
          ))}
        </li>
      ))}
    </Tag>
  )
}

// Reference tables run to eight columns, which no reading column can hold.
// The frame scrolls, and Expand lifts it out to full viewport width — that is
// the only way a table this wide is actually readable.
function MarkdownTable({ block }) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setExpanded(false)
    }
    // Freeze the page behind the overlay, or scrolling inside the table drifts
    // the document underneath it.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded])

  const columns = block.header.length

  const frame = (
    <div className={`md-table-frame${expanded ? ' is-expanded' : ''}`}>
      <div className="md-table-toolbar">
        <span className="md-table-meta">
          {columns} columns · {block.rows.length} rows
        </span>
        <button type="button" className="md-table-expand" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Close' : 'Expand'}
        </button>
      </div>
      <div className="md-table-wrap" tabIndex={0} role="group" aria-label={`Table, ${columns} columns`}>
        <table className="md-table">
          <thead>
            <tr>
              {block.header.map((cell, index) => (
                <th key={index} style={{ textAlign: block.align[index] ?? 'left' }}>
                  <Inline nodes={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={{ textAlign: block.align[cellIndex] ?? 'left' }}>
                    <Inline nodes={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (!expanded) return frame

  // Portalled to body: an ancestor in the workspace creates a stacking context,
  // which would otherwise trap the overlay behind the app header no matter how
  // high its z-index goes.
  return (
    <>
      <div className="md-table-placeholder">
        <span>Table expanded</span>
        <button type="button" className="md-table-expand" onClick={() => setExpanded(false)}>
          Close
        </button>
      </div>
      {createPortal(
        <>
          <div className="md-table-backdrop" onClick={() => setExpanded(false)} />
          {frame}
        </>,
        document.body,
      )}
    </>
  )
}

function MarkdownBlock({ block }) {
  switch (block.type) {
    case 'heading': {
      // Section headings are rendered by MarkdownDoc itself so they can carry a
      // collapse control; anything deeper renders inline here.
      const Tag = `h${Math.min(6, block.level)}`
      return (
        <Tag id={block.id} className={`md-h md-h${block.level}`}>
          <Inline nodes={block.content} />
        </Tag>
      )
    }
    case 'paragraph':
      return (
        <p className="md-p">
          <Inline nodes={block.content} />
        </p>
      )
    case 'table':
      return <MarkdownTable block={block} />
    case 'code':
      return (
        <div className="md-pre-wrap">
          {block.lang && <span className="md-pre-lang">{block.lang}</span>}
          <pre className="md-pre">
            <code>{block.value}</code>
          </pre>
        </div>
      )
    case 'math':
      return (
        <div className="md-math-block">
          <TexMath source={block.value} display />
        </div>
      )
    case 'quote':
      return (
        <blockquote className="md-quote">
          {block.blocks.map((child, index) => (
            <MarkdownBlock key={index} block={child} />
          ))}
        </blockquote>
      )
    case 'list':
      return <MarkdownList block={block} />
    case 'rule':
      return <hr className="md-rule" />
    default:
      return null
  }
}

// Group the block stream into collapsible sections, one per top-level heading.
// A long reference note is only usable if you can fold the parts you are not
// revising right now.
function toSections(blocks) {
  const sections = []
  let current = { heading: null, blocks: [] }

  for (const block of blocks) {
    if (block.type === 'heading' && block.level <= 2) {
      if (current.heading || current.blocks.length) sections.push(current)
      current = { heading: block, blocks: [] }
      continue
    }
    current.blocks.push(block)
  }
  if (current.heading || current.blocks.length) sections.push(current)
  return sections
}

function Section({ section, index }) {
  const [open, setOpen] = useState(true)

  if (!section.heading) {
    return (
      <div className="md-preamble">
        {section.blocks.map((block, blockIndex) => (
          <MarkdownBlock key={blockIndex} block={block} />
        ))}
      </div>
    )
  }

  const headingId = section.heading.id || `section-${index}`
  return (
    <section className={`md-section${open ? '' : ' is-closed'}`} id={headingId}>
      <button
        type="button"
        className={`md-section-toggle md-section-l${section.heading.level}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="md-section-chevron" aria-hidden="true" />
        <span className="md-section-title">
          <Inline nodes={section.heading.content} />
        </span>
      </button>
      {open && (
        <div className="md-section-body">
          {section.blocks.map((block, blockIndex) => (
            <MarkdownBlock key={blockIndex} block={block} />
          ))}
        </div>
      )}
    </section>
  )
}

export function MarkdownDoc({ blocks, source }) {
  const parsed = useMemo(() => blocks ?? parseMarkdown(source), [blocks, source])
  const sections = useMemo(() => toSections(parsed), [parsed])

  if (!parsed.length) return <p className="empty-state">This note is empty.</p>

  return (
    <div className="md-doc">
      {sections.map((section, index) => (
        <Section key={section.heading?.id ?? `pre-${index}`} section={section} index={index} />
      ))}
    </div>
  )
}

// Preview inside the editor: same styling, no collapsing, so the author sees
// the whole document while typing.
export function MarkdownPreview({ source }) {
  const parsed = useMemo(() => parseMarkdown(source), [source])
  if (!parsed.length) return <p className="empty-state">Nothing to preview yet.</p>
  return (
    <div className="md-doc md-doc-flat">
      {parsed.map((block, index) => (
        <MarkdownBlock key={index} block={block} />
      ))}
    </div>
  )
}

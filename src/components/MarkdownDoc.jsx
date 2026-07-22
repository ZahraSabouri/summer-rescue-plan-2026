import { Fragment, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { parseMarkdown, splitNoteSections } from '../utils/markdown'
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
      case 'underline':
        return (
          <u key={index}>
            <Inline nodes={node.children} />
          </u>
        )
      case 'color':
        return (
          <span key={index} className={`md-color-${node.color}`}>
            <Inline nodes={node.children} />
          </span>
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

// Answer hidden until clicked — same "::" convention and hide/reveal
// mechanic as ModuleKnowledge.jsx's SelfTest, minus the persisted "I know
// this / Shaky" rating (this component doesn't have a card/tracker-state
// context to save that into; it's read-only wherever it's used).
function QuizList({ questions }) {
  const [revealed, setRevealed] = useState(() => new Set())

  function toggle(index) {
    setRevealed((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <ol className="md-quiz-list">
      {questions.map((entry, index) => {
        const open = revealed.has(index)
        return (
          <li key={index} className="md-quiz-item">
            <p className="md-quiz-question">
              <Inline nodes={entry.question} />
            </p>
            {entry.answerText &&
              (open ? (
                <div className="md-quiz-answer">
                  <p>
                    <Inline nodes={entry.answer} />
                  </p>
                  <button type="button" className="text-button" onClick={() => toggle(index)}>
                    Hide
                  </button>
                </div>
              ) : (
                <button type="button" className="text-button md-quiz-reveal" onClick={() => toggle(index)}>
                  Show answer
                </button>
              ))}
          </li>
        )
      })}
    </ol>
  )
}

export function MarkdownDoc({ blocks, source }) {
  const parsed = useMemo(() => blocks ?? parseMarkdown(source), [blocks, source])
  // Pulls out a "## Check yourself" quiz list (rendered with answers hidden
  // until clicked, instead of the raw "question :: answer" text) and a
  // "## Sources" list (rendered as a plain footer) before grouping whatever
  // remains into the normal collapsible sections. Notes without either
  // heading are completely unaffected — `body` is just `parsed` unchanged.
  const { body, questions, sources } = useMemo(() => splitNoteSections(parsed), [parsed])
  const sections = useMemo(() => toSections(body), [body])

  if (!parsed.length) return <p className="empty-state">This note is empty.</p>

  return (
    <div className="md-doc">
      {sections.map((section, index) => (
        <Section key={section.heading?.id ?? `pre-${index}`} section={section} index={index} />
      ))}
      {questions.length > 0 && (
        <section className="md-section md-quiz-section">
          <h3 className="md-h md-h2 md-quiz-heading">Check yourself</h3>
          <QuizList questions={questions} />
        </section>
      )}
      {sources.length > 0 && (
        <footer className="md-sources">
          <span>Sources</span>
          <ul>
            {sources.map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ul>
        </footer>
      )}
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

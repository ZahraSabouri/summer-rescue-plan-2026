import { useRef, useState } from 'react'
import { TEXT_COLORS } from '../utils/markdown'
import { MarkdownPreview } from './MarkdownDoc'

// A Markdown + toolbar text field: buttons wrap/insert the same Markdown
// syntax MarkdownDoc already renders (notes, knowledge, etc.), so "rich text"
// here means real formatting without a second content format to store or a
// WYSIWYG dependency. Not used for single-line fields (checklists) — those
// stay plain text on purpose.
const WRAP = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  underline: ['++', '++'],
  strike: ['~~', '~~'],
}

function wrapSelection(value, start, end, [open, close]) {
  const selected = value.slice(start, end) || 'text'
  const text = `${value.slice(0, start)}${open}${selected}${close}${value.slice(end)}`
  return { text, selStart: start + open.length, selEnd: start + open.length + selected.length }
}

const COLOR_LABELS = { red: 'Red', amber: 'Amber', green: 'Green', blue: 'Blue' }

function prefixLines(value, start, end, prefix) {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const lineEnd = value.indexOf('\n', end)
  const block = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd)
  const prefixed = block
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : line))
    .join('\n')
  const text = value.slice(0, lineStart) + prefixed + value.slice(lineEnd === -1 ? value.length : lineEnd)
  return { text, selStart: start + prefix.length, selEnd: end + prefix.length * (block.split('\n').length || 1) }
}

export function RichTextField({ id, value, onChange, rows = 4, placeholder = '', className = '' }) {
  const ref = useRef(null)
  const [preview, setPreview] = useState(false)

  function replace(next) {
    onChange(next.text)
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(next.selStart, next.selEnd)
    })
  }

  function wrap(kind) {
    const el = ref.current
    if (!el) return
    replace(wrapSelection(value ?? '', el.selectionStart, el.selectionEnd, WRAP[kind]))
  }

  function bulletList() {
    const el = ref.current
    if (!el) return
    replace(prefixLines(value ?? '', el.selectionStart, el.selectionEnd, '- '))
  }

  function heading() {
    const el = ref.current
    if (!el) return
    replace(prefixLines(value ?? '', el.selectionStart, el.selectionEnd, '## '))
  }

  function color(name) {
    const el = ref.current
    if (!el) return
    replace(wrapSelection(value ?? '', el.selectionStart, el.selectionEnd, [`{${name}:`, '}']))
  }

  return (
    <div className={`rich-text-field ${className}`}>
      <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
        <button
          type="button"
          className="secondary-button compact-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap('italic')}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap('underline')}
          title="Underline"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap('strike')}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={bulletList}
          title="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={heading}
          title="Heading"
        >
          H
        </button>
        <span className="rich-text-toolbar-divider" aria-hidden="true" />
        {TEXT_COLORS.map((name) => (
          <button
            key={name}
            type="button"
            className={`secondary-button compact-button rich-text-swatch swatch-${name}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => color(name)}
            title={`${COLOR_LABELS[name]} text`}
            aria-label={`${COLOR_LABELS[name]} text`}
          />
        ))}
        <button
          type="button"
          className={`secondary-button compact-button rich-text-preview-toggle${preview ? ' active' : ''}`}
          onClick={() => setPreview((v) => !v)}
        >
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div className="rich-text-preview">
          {(value ?? '').trim() ? <MarkdownPreview source={value} /> : <p className="muted">Nothing to preview yet.</p>}
        </div>
      ) : (
        <textarea
          ref={ref}
          id={id}
          dir="auto"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

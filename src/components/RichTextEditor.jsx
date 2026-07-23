import { useEffect, useRef, useState } from 'react'
import { Extension } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { COLOR_HEX, FONT_CSS, SIZE_CSS, TEXT_COLORS, markdownToHtml, tiptapJsonToMarkdown } from '../utils/markdown'

// TipTap ships Color/FontFamily as attribute-extensions of the generic
// TextStyle mark, but has no equivalent for font SIZE — this is the same,
// officially-documented pattern (TipTap's "extend TextStyle" recipe), just
// for one more style property, constrained to SIZE_CSS's fixed whitelist by
// the toolbar below (this extension itself doesn't restrict the value).
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => (attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}),
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).run(),
    }
  },
})

const COLOR_LABELS = { red: 'Red', amber: 'Amber', green: 'Green', blue: 'Blue' }
const HEADING_LEVELS = [2, 3]

function ToolbarButton({ isActive, onClick, title, className = '', children }) {
  return (
    <button
      type="button"
      className={`secondary-button compact-button${isActive ? ' active' : ''}${className ? ` ${className}` : ''}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      aria-pressed={isActive}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor, rawMode, onToggleRawMode }) {
  if (!editor) return null

  if (rawMode) {
    return (
      <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
        <ToolbarButton isActive onClick={onToggleRawMode} title="Back to formatted view" className="rich-text-md-toggle">
          ← Formatted
        </ToolbarButton>
        <span className="rich-text-md-hint">Editing raw Markdown source</span>
      </div>
    )
  }

  const headingLevel = HEADING_LEVELS.find((level) => editor.isActive('heading', { level })) ?? 0
  const activeFont = Object.keys(FONT_CSS).find((name) => editor.isActive('textStyle', { fontFamily: FONT_CSS[name] })) ?? ''
  const activeSize = Object.keys(SIZE_CSS).find((name) => editor.isActive('textStyle', { fontSize: SIZE_CSS[name] })) ?? ''

  function setBlockType(event) {
    const level = Number(event.target.value)
    if (!level) editor.chain().focus().setParagraph().run()
    else editor.chain().focus().toggleHeading({ level }).run()
  }

  function setFont(event) {
    const name = event.target.value
    if (!name) editor.chain().focus().unsetFontFamily().run()
    else editor.chain().focus().setFontFamily(FONT_CSS[name]).run()
  }

  function setSize(event) {
    const name = event.target.value
    if (!name) editor.chain().focus().unsetFontSize().run()
    else editor.chain().focus().setFontSize(SIZE_CSS[name]).run()
  }

  function insertLink() {
    const previous = editor.getAttributes('link').href ?? ''
    const url = window.prompt('Link URL', previous)
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().setLink({ href: url.trim() }).run()
  }

  return (
    <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
      <select
        className="rich-text-select"
        value={String(headingLevel)}
        onChange={setBlockType}
        title="Paragraph or heading"
        aria-label="Paragraph or heading"
      >
        <option value="0">Paragraph</option>
        <option value="2">Heading</option>
        <option value="3">Subheading</option>
      </select>
      <ToolbarButton
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <u>U</u>
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote block"
      >
        &ldquo;Quote&rdquo;
      </ToolbarButton>
      <ToolbarButton
        isActive={editor.isActive('table')}
        onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}
        title="Insert table"
      >
        Table
      </ToolbarButton>
      <ToolbarButton isActive={editor.isActive('link')} onClick={insertLink} title="Link">
        Link
      </ToolbarButton>
      <span className="rich-text-toolbar-divider" aria-hidden="true" />
      {TEXT_COLORS.map((name) => (
        <button
          key={name}
          type="button"
          className={`secondary-button compact-button rich-text-swatch swatch-${name}${editor.isActive('textStyle', { color: COLOR_HEX[name] }) ? ' active' : ''}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().setColor(COLOR_HEX[name]).run()}
          title={`${COLOR_LABELS[name]} text`}
          aria-label={`${COLOR_LABELS[name]} text`}
        />
      ))}
      <ToolbarButton onClick={() => editor.chain().focus().unsetColor().run()} title="Clear text color">
        ⌀
      </ToolbarButton>
      <select className="rich-text-select" value={activeFont} onChange={setFont} title="Font" aria-label="Font">
        <option value="">Default font</option>
        <option value="serif">Serif</option>
        <option value="mono">Mono</option>
      </select>
      <select className="rich-text-select" value={activeSize} onChange={setSize} title="Text size" aria-label="Text size">
        <option value="">Normal size</option>
        <option value="lg">Large</option>
        <option value="xl">X-Large</option>
      </select>
      <span className="rich-text-toolbar-divider" aria-hidden="true" />
      <ToolbarButton onClick={onToggleRawMode} title="View and edit the raw Markdown source" className="rich-text-md-toggle">
        &lt;/&gt; Markdown
      </ToolbarButton>
    </div>
  )
}

// Drop-in replacement for the old RichTextField: same props (value/onChange/
// rows/placeholder/id/className), but a real WYSIWYG surface — bold looks
// bold as you type instead of showing literal ** characters — built on
// TipTap, translated to/from this app's existing markdown dialect at the
// edges (see utils/markdown.js's markdownToHtml/tiptapJsonToMarkdown; storage
// format is unchanged, so every note/description/evidence string already
// saved keeps working and keeps rendering via MarkdownDoc/MarkdownPreview
// exactly as before).
export function RichTextEditor({ id, value, onChange, rows = 4, placeholder = '', className = '' }) {
  const lastEmittedRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const [rawMode, setRawMode] = useState(false)
  const [rawText, setRawText] = useState(value)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: markdownToHtml(value),
    onUpdate: ({ editor: instance }) => {
      const next = tiptapJsonToMarkdown(instance.getJSON())
      lastEmittedRef.current = next
      onChangeRef.current(next)
    },
  })

  // The DOM (via TipTap's own state) is the source of truth while the user is
  // actively editing — re-setting content from a fresh markdownToHtml() parse
  // on every keystroke would reset the cursor to the start every time. Only
  // push the `value` prop into the editor when it changed from OUTSIDE this
  // component (switching which note/field is open, or an external update),
  // never when it's just the echo of our own onUpdate above.
  useEffect(() => {
    if (!editor || rawMode) return
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    editor.commands.setContent(markdownToHtml(value), { emitUpdate: false })
  }, [value, editor, rawMode])

  // Some people want to read/write the actual Markdown source directly
  // (checking exactly what got saved, pasting pre-formatted text, or just
  // preferring plain-text editing) rather than the WYSIWYG surface — this
  // switches to a plain textarea over the SAME value, changes still flow
  // through the normal onChange on every keystroke, and switching back
  // re-loads whatever was typed into the TipTap editor.
  function toggleRawMode() {
    if (!editor) return
    if (rawMode) {
      lastEmittedRef.current = rawText
      editor.commands.setContent(markdownToHtml(rawText), { emitUpdate: false })
      onChangeRef.current(rawText)
      setRawMode(false)
    } else {
      const current = tiptapJsonToMarkdown(editor.getJSON())
      setRawText(current)
      setRawMode(true)
    }
  }

  function handleRawChange(event) {
    const next = event.target.value
    setRawText(next)
    lastEmittedRef.current = next
    onChangeRef.current(next)
  }

  return (
    <div className={`rich-text-field${className ? ` ${className}` : ''}`} style={{ '--rte-rows': rows }}>
      <Toolbar editor={editor} rawMode={rawMode} onToggleRawMode={toggleRawMode} />
      {rawMode ? (
        <textarea
          id={id}
          className="rich-text-raw-surface"
          value={rawText}
          onChange={handleRawChange}
          placeholder={placeholder}
        />
      ) : (
        <EditorContent editor={editor} id={id} className="rich-text-surface" />
      )}
    </div>
  )
}

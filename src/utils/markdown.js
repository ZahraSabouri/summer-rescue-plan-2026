// A small, dependency-free Markdown parser for knowledge notes.
//
// The app runs on react + react-dom and nothing else, so notes get their own
// parser rather than a library. It covers what revision notes actually use:
// headings, tables, fenced blocks, lists, quotes, rules, and inline
// emphasis/code/links/math. Anything it does not recognise stays literal text,
// which is the right failure mode for pasted material.

// A small fixed palette, not arbitrary CSS colors: the rich-text toolbar
// offers exactly these as swatches, and {word:...} only matches one of them,
// so coloured text can never carry an arbitrary/unsafe style value.
export const TEXT_COLORS = ['red', 'amber', 'green', 'blue']

// Same reasoning as TEXT_COLORS: a fixed whitelist, not an arbitrary font
// name or pixel size, so {font:...}/{size:...} can never carry an
// unrecognised or unsafe value. serif/mono map to this app's existing
// self-hosted Fraunces and a system monospace stack; lg/xl map to fixed CSS
// sizes — see FONT_CSS/SIZE_CSS below.
export const TEXT_FONTS = ['serif', 'mono']
export const TEXT_SIZES = ['lg', 'xl']

const SPECIALS = new Set(['`', '$', '*', '_', '~', '[', '+', '{'])

// A single, essentially-never-typed-by-hand character representing a hard
// (Shift+Enter) line break inside a paragraph — inserted by parseMarkdown's
// paragraph joiner wherever a source line ends in 2+ trailing spaces (the
// same convention standard Markdown uses for hard breaks), and turned back
// into that same "  \n" convention by tiptapJsonToMarkdown on save.
const HARD_BREAK = '\u2028'

// Sticky patterns so the scanner can advance by index instead of re-slicing a
// multi-kilobyte note on every character.
const INLINE_RULES = [
  { type: 'code', re: /`([^`\n]+)`/y },
  { type: 'math', re: /\$([^$\n]+)\$/y },
  { type: 'strong', re: /\*\*([\s\S]+?)\*\*/y, nest: true },
  { type: 'strong', re: /__([\s\S]+?)__/y, nest: true },
  { type: 'strike', re: /~~([\s\S]+?)~~/y, nest: true },
  // No standard Markdown syntax for underline; ++text++ is unused elsewhere
  // in this parser and is what the rich-text toolbar's Underline button emits.
  { type: 'underline', re: /\+\+([\s\S]+?)\+\+/y, nest: true },
  // {red:text}/{font:mono:text}/{size:lg:text} are this parser's own
  // convention (not standard Markdown), emitted by the toolbar's colour
  // swatches and font/size pickers — matched separately below via
  // matchBraceWrapper, not as a regex rule here, because the WYSIWYG editor
  // can combine color+font+size on the same run ({font:mono:{green:text}}),
  // and a non-greedy regex has no way to find the correctly BALANCED closing
  // brace once the content contains its own nested {...}.
  { type: 'em', re: /\*([^*\n]+)\*/y, nest: true },
  { type: 'em', re: /_([^_\n]+)_/y, nest: true },
  { type: 'link', re: /\[([^\]]*)\]\(([^)\s]+)\)/y },
]

const COLOR_OPEN = new RegExp(`^\\{(${TEXT_COLORS.join('|')}):`)
const FONT_OPEN = new RegExp(`^\\{font:(${TEXT_FONTS.join('|')}):`)
const SIZE_OPEN = new RegExp(`^\\{size:(${TEXT_SIZES.join('|')}):`)

// Finds {red:...}/{font:x:...}/{size:x:...} starting at src[i] (src[i] must
// be '{'), matching the BALANCED closing brace rather than the first '}' —
// content can itself contain another of these wrappers (combining color and
// font on the same run nests one inside the other), and a simple regex has
// no notion of bracket depth. Returns null if it isn't one of these three
// wrappers at all, or the braces never balance (malformed/truncated input).
function matchBraceWrapper(src, i) {
  const rest = src.slice(i)
  const color = COLOR_OPEN.exec(rest)
  const font = !color && FONT_OPEN.exec(rest)
  const size = !color && !font && SIZE_OPEN.exec(rest)
  const open = color || font || size
  if (!open) return null

  let depth = 1
  let j = i + open[0].length
  while (j < src.length) {
    if (src[j] === '\\') {
      j += 2
      continue
    }
    if (src[j] === '{') depth += 1
    else if (src[j] === '}') {
      depth -= 1
      if (depth === 0) break
    }
    j += 1
  }
  if (depth !== 0) return null

  return {
    type: color ? 'color' : font ? 'font' : 'size',
    value: open[1],
    content: src.slice(i + open[0].length, j),
    end: j + 1,
  }
}

export function parseInline(input) {
  const src = String(input ?? '')
  const out = []
  let buffer = ''
  let i = 0

  const flush = () => {
    if (buffer) {
      out.push({ type: 'text', value: buffer })
      buffer = ''
    }
  }

  while (i < src.length) {
    const ch = src[i]
    if (ch === HARD_BREAK) {
      flush()
      out.push({ type: 'break' })
      i += 1
      continue
    }
    if (ch === '\\' && i + 1 < src.length) {
      buffer += src[i + 1]
      i += 2
      continue
    }
    if (ch === '{') {
      const wrapper = matchBraceWrapper(src, i)
      if (wrapper) {
        flush()
        out.push({ type: wrapper.type, [wrapper.type]: wrapper.value, children: parseInline(wrapper.content) })
        i = wrapper.end
        continue
      }
    }
    if (SPECIALS.has(ch)) {
      let matched = false
      for (const rule of INLINE_RULES) {
        rule.re.lastIndex = i
        const match = rule.re.exec(src)
        if (!match) continue
        // Read the end offset before recursing: the recursive call reuses these
        // same regex objects and would otherwise clobber lastIndex.
        const end = rule.re.lastIndex
        flush()
        if (rule.type === 'link') out.push({ type: 'link', href: match[2], children: parseInline(match[1]) })
        else if (rule.type === 'color') out.push({ type: 'color', color: match[1], children: parseInline(match[2]) })
        else if (rule.type === 'font') out.push({ type: 'font', font: match[1], children: parseInline(match[2]) })
        else if (rule.type === 'size') out.push({ type: 'size', size: match[1], children: parseInline(match[2]) })
        else if (rule.nest) out.push({ type: rule.type, children: parseInline(match[1]) })
        else out.push({ type: rule.type, value: match[1] })
        i = end
        matched = true
        break
      }
      if (matched) continue
    }
    buffer += ch
    i += 1
  }

  flush()
  return out
}

const COLOR_SPAN = new RegExp(`\\{(?:${TEXT_COLORS.join('|')}):([\\s\\S]*?)\\}`, 'g')
const FONT_SPAN = new RegExp(`\\{font:(?:${TEXT_FONTS.join('|')}):([\\s\\S]*?)\\}`, 'g')
const SIZE_SPAN = new RegExp(`\\{size:(?:${TEXT_SIZES.join('|')}):([\\s\\S]*?)\\}`, 'g')

// A short, human-readable digest for list rows and previews — strips every
// syntax marker this parser recognises rather than rendering or truncating
// raw source, so a preview never shows literal #/**/{color:...} punctuation.
export function stripMarkdown(source) {
  return String(source ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(COLOR_SPAN, '$1')
    .replace(FONT_SPAN, '$1')
    .replace(SIZE_SPAN, '$1')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1')
    .replace(/\+\+([\s\S]+?)\+\+/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/\[([^\]]*)\]\([^)\s]+\)/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

function inlineText(nodes) {
  return nodes
    .map((node) => (node.children ? inlineText(node.children) : (node.value ?? '')))
    .join('')
}

const FENCE = /^(```|~~~)\s*([\w-]*)\s*$/
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/
const QUOTE = /^\s*>\s?(.*)$/
const UL_ITEM = /^(\s*)[-*+]\s+(.*)$/
const OL_ITEM = /^(\s*)(\d+)[.)]\s+(.*)$/

function isTableSeparator(line) {
  if (!line || !line.includes('-')) return false
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)
}

function splitRow(line) {
  const cells = []
  let cur = ''
  const trimmed = line.trim()
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i]
    if (ch === '\\' && trimmed[i + 1] === '|') {
      cur += '|'
      i += 1
      continue
    }
    if (ch === '|') {
      cells.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  cells.push(cur)
  if (trimmed.startsWith('|')) cells.shift()
  if (trimmed.endsWith('|') && cells.length) cells.pop()
  return cells.map((cell) => cell.trim())
}

function alignmentsFrom(separator) {
  return splitRow(separator).map((cell) => {
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    return 'left'
  })
}

// Chat exports mangle display math into a bare `[ ... ]` block. Treating a
// lone bracket line as a math fence is what makes pasted material render as
// intended rather than as stray punctuation.
function isMathOpen(line) {
  const t = line.trim()
  return t === '[' || t === '$$' || t === '\\['
}

function isMathClose(line) {
  const t = line.trim()
  return t === ']' || t === '$$' || t === '\\]'
}

function buildList(items, ordered) {
  // Items arrive flat with their indent; rebuild nesting with a stack so that
  // indented sub-points do not collapse into the parent list.
  const root = { type: 'list', ordered, items: [] }
  if (!items.length) return root
  const stack = [{ indent: items[0].indent, list: root }]

  for (const item of items) {
    while (stack.length > 1 && item.indent < stack[stack.length - 1].indent) stack.pop()
    let top = stack[stack.length - 1]
    if (item.indent > top.indent) {
      const parent = top.list.items[top.list.items.length - 1]
      if (parent) {
        const child = { type: 'list', ordered: item.ordered, items: [] }
        parent.children.push(child)
        stack.push({ indent: item.indent, list: child })
        top = stack[stack.length - 1]
      }
    }
    top.list.items.push({ content: parseInline(item.text), children: [] })
  }

  return root
}

export function parseMarkdown(source) {
  const lines = String(source ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i += 1
      continue
    }

    const fence = FENCE.exec(line.trim())
    if (fence) {
      const lang = fence[2] || ''
      const body = []
      i += 1
      while (i < lines.length && !FENCE.test(lines[i].trim())) {
        body.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push({ type: 'code', lang, value: body.join('\n') })
      continue
    }

    const inlineDisplayMath = /^\s*\$\$(.+)\$\$\s*$/.exec(line)
    if (inlineDisplayMath) {
      blocks.push({ type: 'math', value: inlineDisplayMath[1].trim() })
      i += 1
      continue
    }

    if (isMathOpen(line)) {
      const body = []
      i += 1
      while (i < lines.length && !isMathClose(lines[i])) {
        body.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push({ type: 'math', value: body.join('\n').trim() })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const content = parseInline(heading[2])
      const plain = inlineText(content)
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        content,
        text: plain,
        id: slugify(plain),
      })
      i += 1
      continue
    }

    if (RULE.test(line)) {
      blocks.push({ type: 'rule' })
      i += 1
      continue
    }

    if (QUOTE.test(line)) {
      const body = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        body.push(QUOTE.exec(lines[i])[1])
        i += 1
      }
      blocks.push({ type: 'quote', blocks: parseMarkdown(body.join('\n')) })
      continue
    }

    if (line.includes('|') && isTableSeparator(lines[i + 1] ?? '')) {
      const header = splitRow(line).map(parseInline)
      const align = alignmentsFrom(lines[i + 1])
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]).map(parseInline))
        i += 1
      }
      blocks.push({ type: 'table', header, align, rows })
      continue
    }

    if (UL_ITEM.test(line) || OL_ITEM.test(line)) {
      const items = []
      const ordered = OL_ITEM.test(line)
      while (i < lines.length) {
        const current = lines[i]
        const ol = OL_ITEM.exec(current)
        const ul = UL_ITEM.exec(current)
        if (ol) items.push({ indent: ol[1].length, text: ol[3], ordered: true })
        else if (ul) items.push({ indent: ul[1].length, text: ul[2], ordered: false })
        else if (current.trim() && items.length && /^\s{2,}/.test(current)) {
          // A wrapped continuation line belongs to the item above it.
          items[items.length - 1].text += ` ${current.trim()}`
        } else break
        i += 1
      }
      blocks.push(buildList(items, ordered))
      continue
    }

    const paragraph = []
    // A line ending in 2+ trailing spaces is a hard break (same convention as
    // standard Markdown) — tracked per line, before .trim() discards it, so
    // the join below can insert HARD_BREAK instead of a plain space there.
    const hardBreakAfter = []
    while (i < lines.length && lines[i].trim()) {
      const next = lines[i]
      if (
        HEADING.test(next) ||
        RULE.test(next) ||
        QUOTE.test(next) ||
        FENCE.test(next.trim()) ||
        isMathOpen(next) ||
        UL_ITEM.test(next) ||
        OL_ITEM.test(next) ||
        (next.includes('|') && isTableSeparator(lines[i + 1] ?? ''))
      ) {
        break
      }
      hardBreakAfter.push(/ {2,}$/.test(next))
      paragraph.push(next.trim())
      i += 1
    }
    if (paragraph.length) {
      const joined = paragraph.reduce(
        (acc, text, index) => (index === 0 ? text : `${acc}${hardBreakAfter[index - 1] ? HARD_BREAK : ' '}${text}`),
        '',
      )
      blocks.push({ type: 'paragraph', content: parseInline(joined) })
    }
  }

  return blocks
}

export function buildToc(blocks) {
  return blocks
    .filter((block) => block.type === 'heading' && block.level <= 3)
    .map((block) => ({ id: block.id, text: block.text, level: block.level }))
}

export function readMinutes(source) {
  const words = String(source ?? '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export function countWords(source) {
  return String(source ?? '').trim().split(/\s+/).filter(Boolean).length
}

// Notes carry two special sections by convention. `## Check yourself` becomes
// self-test cards and `## Sources` becomes footer chips, so both are pulled out
// of the normal body flow before rendering.
const QUIZ_HEADING = /^check\s*yourself$/i
const SOURCES_HEADING = /^sources?$/i

// Split an inline node list at the first `::` inside a text node, keeping the
// nodes on either side intact. Splitting the flattened text instead would
// discard math and code formatting, which matters because questions routinely
// contain both.
function splitInlineOnMarker(nodes, marker) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.type !== 'text' || !node.value.includes(marker)) continue

    const at = node.value.indexOf(marker)
    const before = nodes.slice(0, index)
    const head = node.value.slice(0, at)
    if (head.trim()) before.push({ type: 'text', value: head })

    const after = []
    const tail = node.value.slice(at + marker.length)
    if (tail.trim()) after.push({ type: 'text', value: tail })
    after.push(...nodes.slice(index + 1))

    return [before, after]
  }
  return [nodes, null]
}

function listItemsToQuestions(block) {
  if (!block || block.type !== 'list') return []
  return block.items.map((item) => {
    const [question, answer] = splitInlineOnMarker(item.content, '::')
    return {
      question,
      answer,
      questionText: inlineText(question).trim(),
      answerText: answer ? inlineText(answer).trim() : '',
    }
  })
}

export function splitNoteSections(blocks) {
  const body = []
  const questions = []
  const sources = []
  let mode = 'body'

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    if (block.type === 'heading') {
      if (QUIZ_HEADING.test(block.text.trim())) {
        mode = 'quiz'
        continue
      }
      if (SOURCES_HEADING.test(block.text.trim())) {
        mode = 'sources'
        continue
      }
      mode = 'body'
    }
    if (mode === 'quiz') {
      questions.push(...listItemsToQuestions(block))
      continue
    }
    if (mode === 'sources') {
      if (block.type === 'list') {
        for (const item of block.items) sources.push(inlineText(item.content))
      }
      continue
    }
    body.push(block)
  }

  return { body, questions, sources }
}

// ============================================================================
// WYSIWYG editor bridge (RichTextEditor.jsx <-> this dialect)
//
// The editor itself is a TipTap instance; it knows nothing about {red:...}/
// {font:serif:...}/{size:lg:...} or any of this file's syntax. These two
// functions are the only place that translates between the two worlds:
//   markdownToHtml  — loads a stored markdown string INTO the editor (HTML in,
//                      TipTap parses it via its own schema).
//   tiptapJsonToMarkdown — saves the editor's content back OUT as this same
//                      dialect (TipTap's ProseMirror JSON out, walked by hand).
// COLOR_HEX/FONT_CSS/SIZE_CSS are the exact values both directions agree on —
// RichTextEditor's toolbar only ever applies one of these exact values, so
// reversing color/font/size on save is a plain lookup, never fuzzy matching.
// ============================================================================

export const COLOR_HEX = { red: '#b0483b', amber: '#a9781c', green: '#17756a', blue: '#3a6ea5' }
export const FONT_CSS = {
  serif: "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
  mono: "ui-monospace, 'Space Grotesk', Consolas, monospace",
}
export const SIZE_CSS = { lg: '1.25em', xl: '1.55em' }

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlAttr(text) {
  return escapeHtml(text).replace(/"/g, '&quot;')
}

function inlineNodesToHtml(nodes = []) {
  return nodes.map((node) => {
    switch (node.type) {
      case 'text':
        return escapeHtml(node.value)
      case 'break':
        return '<br>'
      case 'code':
        return `<code>${escapeHtml(node.value)}</code>`
      // TipTap has no math node/mark, so a math span is loaded as its own
      // literal "$...$" text — visible as plain text while editing rather
      // than rendered, while retaining the delimiters so it remains inline
      // math after the field is edited and saved.
      case 'math':
        return escapeHtml(`$${node.value}$`)
      case 'strong':
        return `<strong>${inlineNodesToHtml(node.children)}</strong>`
      case 'em':
        return `<em>${inlineNodesToHtml(node.children)}</em>`
      case 'strike':
        return `<s>${inlineNodesToHtml(node.children)}</s>`
      case 'underline':
        return `<u>${inlineNodesToHtml(node.children)}</u>`
      case 'color':
        return `<span style="color: ${COLOR_HEX[node.color]}">${inlineNodesToHtml(node.children)}</span>`
      case 'font':
        return `<span style="font-family: ${FONT_CSS[node.font]}">${inlineNodesToHtml(node.children)}</span>`
      case 'size':
        return `<span style="font-size: ${SIZE_CSS[node.size]}">${inlineNodesToHtml(node.children)}</span>`
      case 'link':
        return `<a href="${escapeHtmlAttr(node.href)}">${inlineNodesToHtml(node.children)}</a>`
      default:
        return ''
    }
  }).join('')
}

function blockToHtml(block) {
  switch (block.type) {
    case 'heading':
      return `<h${block.level}>${inlineNodesToHtml(block.content)}</h${block.level}>`
    case 'paragraph':
      return `<p>${inlineNodesToHtml(block.content)}</p>`
    case 'rule':
      return '<hr>'
    case 'quote':
      return `<blockquote>${block.blocks.map(blockToHtml).join('')}</blockquote>`
    case 'code':
      return `<pre><code>${escapeHtml(block.value)}</code></pre>`
    case 'math':
      // TipTap still displays this as editable literal text, but the double
      // delimiters preserve the display-math block on the next parse.
      return `<p>${escapeHtml(`$$${block.value}$$`)}</p>`
    case 'table': {
      const cellStyle = (align) => (align && align !== 'left' ? ` style="text-align: ${align}"` : '')
      const headerRow = `<tr>${block.header
        .map((cell, index) => `<th${cellStyle(block.align[index])}>${inlineNodesToHtml(cell)}</th>`)
        .join('')}</tr>`
      const bodyRows = block.rows
        .map(
          (row) =>
            `<tr>${row.map((cell, index) => `<td${cellStyle(block.align[index])}>${inlineNodesToHtml(cell)}</td>`).join('')}</tr>`,
        )
        .join('')
      return `<table><tbody>${headerRow}${bodyRows}</tbody></table>`
    }
    case 'list':
      return listBlockToHtml(block)
    default:
      return ''
  }
}

function listBlockToHtml(block) {
  const tag = block.ordered ? 'ol' : 'ul'
  const items = block.items
    .map((item) => `<li><p>${inlineNodesToHtml(item.content)}</p>${item.children.map(listBlockToHtml).join('')}</li>`)
    .join('')
  return `<${tag}>${items}</${tag}>`
}

// Renders the SAME parseMarkdown() AST as MarkdownDoc.jsx does, just to an
// HTML string instead of React elements — this is what feeds the WYSIWYG
// editor's initial content via TipTap's built-in HTML importer.
export function markdownToHtml(source) {
  return parseMarkdown(source).map(blockToHtml).join('')
}

function reverseLookup(map, value) {
  const normalised = String(value ?? '').toLowerCase()
  return Object.keys(map).find((key) => map[key].toLowerCase() === normalised) ?? null
}

// Wraps one text run in whatever this dialect's syntax reproduces the given
// TipTap marks. Order is fixed (color/font/size outermost, then bold, italic,
// underline, strike, then link outermost of all) — arbitrary as a choice, but
// every layer is a balanced, independently-matchable wrapper, so parseInline
// peels them back correctly regardless of how many are combined at once.
function markTextToMarkdown(text, marks = []) {
  const has = (type) => marks.some((mark) => mark.type === type)
  if (has('code')) return `\`${text.replace(/`/g, '')}\``

  let out = escapeMarkdownText(text)
  const textStyle = marks.find((mark) => mark.type === 'textStyle')?.attrs ?? {}
  if (textStyle.color) {
    const name = reverseLookup(COLOR_HEX, textStyle.color)
    if (name) out = `{${name}:${out}}`
  }
  if (textStyle.fontFamily) {
    const name = reverseLookup(FONT_CSS, textStyle.fontFamily)
    if (name) out = `{font:${name}:${out}}`
  }
  if (textStyle.fontSize) {
    const token = reverseLookup(SIZE_CSS, textStyle.fontSize)
    if (token) out = `{size:${token}:${out}}`
  }
  if (has('bold')) out = `**${out}**`
  if (has('italic')) out = `*${out}*`
  if (has('underline')) out = `++${out}++`
  if (has('strike')) out = `~~${out}~~`
  if (has('link')) {
    const href = marks.find((mark) => mark.type === 'link')?.attrs?.href ?? ''
    out = `[${out}](${href})`
  }
  return out
}

// The mirror image of escapeHtml above: any of this dialect's own trigger
// characters, found in plain text the user actually typed (as opposed to text
// this function itself just wrapped in ** / {color:...} / etc.), must be
// escaped so a later re-parse can't mistake it for formatting it never was.
// Paired math spans are preserved as a unit so their TeX punctuation is not
// escaped; the surrounding prose still gets the normal defensive escaping.
function escapeMarkdownText(text) {
  const source = String(text ?? '')
  const mathSpan = /\$\$[\s\S]+?\$\$|\$[^$\n]+\$/g
  let output = ''
  let cursor = 0

  for (const match of source.matchAll(mathSpan)) {
    const start = match.index ?? 0
    output += source.slice(cursor, start).replace(/[\\`$*_~[{+]/g, '\\$&')
    output += match[0]
    cursor = start + match[0].length
  }

  return output + source.slice(cursor).replace(/[\\`$*_~[{+]/g, '\\$&')
}

function inlineContentToMarkdown(content = []) {
  return content
    .map((node) => {
      if (node.type === 'text') return markTextToMarkdown(node.text ?? '', node.marks)
      if (node.type === 'hardBreak') return '  \n'
      return ''
    })
    .join('')
}

function listNodeToMarkdown(list, ordered, indent) {
  const pad = '  '.repeat(indent)
  return (list.content ?? [])
    .map((item, index) => {
      const [firstChild, ...rest] = item.content ?? []
      const marker = ordered ? `${index + 1}.` : '-'
      const text = firstChild ? inlineContentToMarkdown(firstChild.content) : ''
      const nested = rest
        .map((child) => blockNodeToMarkdown(child, indent + 1))
        .filter(Boolean)
        .join('\n')
      return `${pad}${marker} ${text}${nested ? `\n${nested}` : ''}`
    })
    .join('\n')
}

function tableNodeToMarkdown(table) {
  const rows = (table.content ?? []).map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .map((block) => (block.type === 'paragraph' ? inlineContentToMarkdown(block.content) : ''))
        .join(' ')
        .replace(/\|/g, '\\|'),
    ),
  )
  if (!rows.length) return ''
  const [header, ...body] = rows
  const rowLine = (cells) => `| ${cells.join(' | ')} |`
  return [rowLine(header), rowLine(header.map(() => '---')), ...body.map(rowLine)].join('\n')
}

function blockNodeToMarkdown(node, indent = 0) {
  switch (node.type) {
    case 'paragraph':
      return inlineContentToMarkdown(node.content)
    case 'heading':
      return `${'#'.repeat(node.attrs?.level ?? 2)} ${inlineContentToMarkdown(node.content)}`
    case 'bulletList':
      return listNodeToMarkdown(node, false, indent)
    case 'orderedList':
      return listNodeToMarkdown(node, true, indent)
    case 'blockquote':
      return (node.content ?? [])
        .map((child) => blockNodeToMarkdown(child))
        .join('\n\n')
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    case 'codeBlock':
      return `\`\`\`${node.attrs?.language ?? ''}\n${(node.content ?? []).map((text) => text.text ?? '').join('')}\n\`\`\``
    case 'horizontalRule':
      return '---'
    case 'table':
      return tableNodeToMarkdown(node)
    default:
      return ''
  }
}

// Walks TipTap's editor.getJSON() document back into this dialect's string
// format — the save path for RichTextEditor.jsx. Deliberately reads TipTap's
// structured JSON rather than re-parsing editor.getHTML(): the JSON is
// already a clean tree (node types + marks), no second HTML-parsing pass
// needed.
export function tiptapJsonToMarkdown(doc) {
  return (doc?.content ?? [])
    .map((node) => blockNodeToMarkdown(node))
    .join('\n\n')
    .trim()
}

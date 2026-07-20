// A small, dependency-free Markdown parser for knowledge notes.
//
// The app runs on react + react-dom and nothing else, so notes get their own
// parser rather than a library. It covers what revision notes actually use:
// headings, tables, fenced blocks, lists, quotes, rules, and inline
// emphasis/code/links/math. Anything it does not recognise stays literal text,
// which is the right failure mode for pasted material.

const SPECIALS = new Set(['`', '$', '*', '_', '~', '['])

// Sticky patterns so the scanner can advance by index instead of re-slicing a
// multi-kilobyte note on every character.
const INLINE_RULES = [
  { type: 'code', re: /`([^`\n]+)`/y },
  { type: 'math', re: /\$([^$\n]+)\$/y },
  { type: 'strong', re: /\*\*([\s\S]+?)\*\*/y, nest: true },
  { type: 'strong', re: /__([\s\S]+?)__/y, nest: true },
  { type: 'strike', re: /~~([\s\S]+?)~~/y, nest: true },
  { type: 'em', re: /\*([^*\n]+)\*/y, nest: true },
  { type: 'em', re: /_([^_\n]+)_/y, nest: true },
  { type: 'link', re: /\[([^\]]*)\]\(([^)\s]+)\)/y },
]

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
    if (ch === '\\' && i + 1 < src.length) {
      buffer += src[i + 1]
      i += 2
      continue
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
      paragraph.push(next.trim())
      i += 1
    }
    if (paragraph.length) blocks.push({ type: 'paragraph', content: parseInline(paragraph.join(' ')) })
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

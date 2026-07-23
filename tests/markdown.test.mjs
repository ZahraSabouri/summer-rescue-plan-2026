import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  COLOR_HEX,
  FONT_CSS,
  SIZE_CSS,
  TEXT_COLORS,
  TEXT_FONTS,
  TEXT_SIZES,
  buildToc,
  markdownToHtml,
  parseMarkdown,
  readMinutes,
  slugify,
  splitNoteSections,
  stripMarkdown,
  tiptapJsonToMarkdown,
} from '../src/utils/markdown.js'

function types(blocks) {
  return blocks.map((block) => block.type)
}

function plain(nodes) {
  return nodes.map((node) => (node.children ? plain(node.children) : (node.value ?? ''))).join('')
}

test('parses headings with ids and levels', () => {
  const blocks = parseMarkdown('# Master table\n\n## 1. Supervised learning\n')
  assert.deepEqual(types(blocks), ['heading', 'heading'])
  assert.equal(blocks[0].level, 1)
  assert.equal(blocks[1].level, 2)
  assert.equal(blocks[1].id, slugify('1. Supervised learning'))
})

test('parses a pipe table with alignment and keeps every row', () => {
  const source = [
    '| Learning paradigm | Target (y) | Output |',
    '| ----------------- | ---------: | :----: |',
    '| Supervised | Provided | Class label |',
    '| Unsupervised | Not provided | Groups |',
  ].join('\n')
  const [table] = parseMarkdown(source)
  assert.equal(table.type, 'table')
  assert.equal(table.header.length, 3)
  assert.deepEqual(table.align, ['left', 'right', 'center'])
  assert.equal(table.rows.length, 2)
  assert.equal(plain(table.rows[1][0]), 'Unsupervised')
})

test('keeps tree diagrams intact inside fenced blocks', () => {
  const source = ['```text', 'Artificial Intelligence', '└── Machine Learning', '    ├── Supervised', '```'].join('\n')
  const [code] = parseMarkdown(source)
  assert.equal(code.type, 'code')
  assert.equal(code.lang, 'text')
  assert.equal(code.value, 'Artificial Intelligence\n└── Machine Learning\n    ├── Supervised')
})

test('does not treat markdown syntax inside a fence as blocks', () => {
  const [code] = parseMarkdown('```\n# not a heading\n| not | a table |\n```')
  assert.equal(code.type, 'code')
  assert.ok(code.value.includes('# not a heading'))
})

test('reads a bare bracket block as display math', () => {
  const blocks = parseMarkdown('[\ny = f(X)\n]')
  assert.deepEqual(types(blocks), ['math'])
  assert.equal(blocks[0].value, 'y = f(X)')
})

test('reads a single-line $$ block as display math', () => {
  const blocks = parseMarkdown('$$y = f(X)$$')
  assert.deepEqual(types(blocks), ['math'])
  assert.equal(blocks[0].value, 'y = f(X)')
})

test('nests indented list items under their parent', () => {
  const [list] = parseMarkdown('- Supervised\n  - Classification\n  - Regression\n- Unsupervised')
  assert.equal(list.type, 'list')
  assert.equal(list.items.length, 2)
  assert.equal(list.items[0].children.length, 1)
  assert.equal(list.items[0].children[0].items.length, 2)
})

test('parses inline emphasis, code, links and math', () => {
  const [paragraph] = parseMarkdown('A **bold** and *thin* `k-NN` [link](https://x.test) with $y=f(x)$.')
  const kinds = paragraph.content.map((node) => node.type)
  assert.ok(kinds.includes('strong'))
  assert.ok(kinds.includes('em'))
  assert.ok(kinds.includes('code'))
  assert.ok(kinds.includes('link'))
  assert.ok(kinds.includes('math'))
})

test('parses coloured text for every colour in the fixed palette', () => {
  for (const name of TEXT_COLORS) {
    const [paragraph] = parseMarkdown(`{${name}:warning text}`)
    const [node] = paragraph.content
    assert.equal(node.type, 'color')
    assert.equal(node.color, name)
    assert.equal(plain(node.children), 'warning text')
  }
})

test('coloured text nests other inline formatting and an unknown colour stays literal', () => {
  const [paragraph] = parseMarkdown('{red:**bold warning**}')
  const [node] = paragraph.content
  assert.equal(node.type, 'color')
  assert.equal(node.children[0].type, 'strong')

  const [literalParagraph] = parseMarkdown('{purple:not a real colour}')
  assert.equal(plain(literalParagraph.content), '{purple:not a real colour}')
})

test('escaped pipes stay inside a table cell', () => {
  const [table] = parseMarkdown('| a | b |\n| --- | --- |\n| x \\| y | z |')
  assert.equal(plain(table.rows[0][0]), 'x | y')
  assert.equal(table.rows[0].length, 2)
})

test('splitNoteSections lifts the quiz and sources out of the body', () => {
  const source = [
    '## Overview',
    '',
    'Body text.',
    '',
    '## Check yourself',
    '',
    '1. What paradigm is a known Revenue target? :: Supervised classification.',
    '2. Why is deep learning not a fourth category?',
    '',
    '## Sources',
    '',
    '* `Session1.pdf`, p.15.',
  ].join('\n')
  const { body, questions, sources } = splitNoteSections(parseMarkdown(source))
  assert.deepEqual(types(body), ['heading', 'paragraph'])
  assert.equal(questions.length, 2)
  assert.equal(questions[0].answerText, 'Supervised classification.')
  assert.equal(questions[1].answerText, '')
  assert.equal(sources.length, 1)
})

test('a quiz question keeps math and code as nodes, not flattened text', () => {
  const source = ['## Check yourself', '', '1. Bound on $|C_{t+1}|$ in `halving`? :: It is $|C_t|/2$.'].join('\n')
  const [entry] = splitNoteSections(parseMarkdown(source)).questions

  // The question must retain a math node so it can be rendered, not stringified.
  assert.ok(entry.question.some((node) => node.type === 'math'))
  assert.ok(entry.question.some((node) => node.type === 'code'))
  assert.ok(entry.answer.some((node) => node.type === 'math'))
  // The plain-text forms are still available and carry no TeX delimiters.
  assert.ok(!entry.questionText.includes('$'))
  assert.match(entry.answerText, /It is/)
})

test('a quiz item with no answer marker yields a null answer', () => {
  const [entry] = splitNoteSections(parseMarkdown('## Check yourself\n\n1. Just a question?')).questions
  assert.equal(entry.answer, null)
  assert.equal(entry.answerText, '')
  assert.equal(entry.questionText, 'Just a question?')
})

test('buildToc lists headings down to level three', () => {
  const toc = buildToc(parseMarkdown('# One\n\n## Two\n\n#### Four\n'))
  assert.deepEqual(
    toc.map((entry) => entry.text),
    ['One', 'Two'],
  )
})

test('stripMarkdown gives a clean plain-text digest for previews', () => {
  assert.equal(stripMarkdown('## Heading\n\nSome **bold** and *thin* text.'), 'Heading Some bold and thin text.')
  assert.equal(stripMarkdown('- one\n- two'), 'one two')
  assert.equal(stripMarkdown('{red:careful} plain `code` and [a link](https://x.test)'), 'careful plain code and a link')
  assert.equal(stripMarkdown(''), '')
})

test('readMinutes never returns zero', () => {
  assert.equal(readMinutes(''), 1)
  assert.ok(readMinutes(new Array(600).fill('word').join(' ')) >= 3)
})

test('parses font and size spans for every value in each fixed whitelist', () => {
  for (const name of TEXT_FONTS) {
    const [paragraph] = parseMarkdown(`{font:${name}:styled text}`)
    const [node] = paragraph.content
    assert.equal(node.type, 'font')
    assert.equal(node.font, name)
    assert.equal(plain(node.children), 'styled text')
  }
  for (const name of TEXT_SIZES) {
    const [paragraph] = parseMarkdown(`{size:${name}:big text}`)
    const [node] = paragraph.content
    assert.equal(node.type, 'size')
    assert.equal(node.size, name)
    assert.equal(plain(node.children), 'big text')
  }
})

test('an unrecognised font or size name stays literal, same as an unknown colour', () => {
  const [fontParagraph] = parseMarkdown('{font:comicsans:not a real font}')
  assert.equal(plain(fontParagraph.content), '{font:comicsans:not a real font}')
  const [sizeParagraph] = parseMarkdown('{size:huge:not a real size}')
  assert.equal(plain(sizeParagraph.content), '{size:huge:not a real size}')
})

test('a line ending in two spaces is a hard break within the same paragraph', () => {
  const [paragraph] = parseMarkdown('Line one.  \nLine two.')
  assert.deepEqual(types([paragraph]), ['paragraph'])
  const kinds = paragraph.content.map((node) => node.type)
  assert.deepEqual(kinds, ['text', 'break', 'text'])
  assert.equal(paragraph.content[0].value, 'Line one.')
  assert.equal(paragraph.content[2].value, 'Line two.')
})

test('a normal wrapped line (no trailing spaces) still joins with a plain space', () => {
  const [paragraph] = parseMarkdown('Line one.\nLine two.')
  assert.equal(plain(paragraph.content), 'Line one. Line two.')
})

test('stripMarkdown also strips font and size spans', () => {
  assert.equal(stripMarkdown('{font:serif:styled} and {size:lg:big}'), 'styled and big')
})

// Regression: combining color + font on the same run in the WYSIWYG editor
// serializes as nested wrappers, e.g. {font:mono:{green:text}}. A non-greedy
// regex for the outer {font:...} stops at the FIRST '}' — the inner color
// span's closing brace — leaving a dangling '}' and showing raw syntax
// instead of rendering. parseInline must match the balanced closing brace.
test('color and font/size wrappers nest correctly when combined on one run', () => {
  const [paragraph] = parseMarkdown('{font:mono:{green:nested text}}')
  const [font] = paragraph.content
  assert.equal(font.type, 'font')
  assert.equal(font.font, 'mono')
  assert.equal(font.children.length, 1)
  assert.equal(font.children[0].type, 'color')
  assert.equal(font.children[0].color, 'green')
  assert.equal(plain(font.children), 'nested text')

  // No dangling literal '{' or '}' anywhere in the flattened text.
  assert.doesNotMatch(plain(paragraph.content), /[{}]/)
})

test('all three wrappers (color, font, size) nest three levels deep', () => {
  const [paragraph] = parseMarkdown('{size:xl:{font:serif:{red:deep text}}}')
  const [size] = paragraph.content
  assert.equal(size.type, 'size')
  assert.equal(size.children[0].type, 'font')
  assert.equal(size.children[0].children[0].type, 'color')
  assert.equal(plain(paragraph.content), 'deep text')
  assert.equal(stripMarkdown('{size:xl:{font:serif:{red:deep text}}}'), 'deep text')
})

test('markdownToHtml renders every inline and block kind this dialect supports', () => {
  const html = markdownToHtml(
    '# Title\n\nA **bold** *thin* ++under++ ~~gone~~ {red:warn} {font:serif:styled} {size:lg:big} [link](https://x.test) `code`.\n\n- one\n- two\n\n> quoted\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n',
  )
  assert.match(html, /<h1>Title<\/h1>/)
  assert.match(html, /<strong>bold<\/strong>/)
  assert.match(html, /<em>thin<\/em>/)
  assert.match(html, /<u>under<\/u>/)
  assert.match(html, /<s>gone<\/s>/)
  assert.match(html, new RegExp(`<span style="color: ${COLOR_HEX.red}">warn</span>`))
  assert.match(html, new RegExp(`<span style="font-family: ${FONT_CSS.serif}">styled</span>`))
  assert.match(html, new RegExp(`<span style="font-size: ${SIZE_CSS.lg}">big</span>`))
  assert.match(html, /<a href="https:\/\/x\.test">link<\/a>/)
  assert.match(html, /<code>code<\/code>/)
  assert.match(html, /<ul><li><p>one<\/p><\/li><li><p>two<\/p><\/li><\/ul>/)
  assert.match(html, /<blockquote><p>quoted<\/p><\/blockquote>/)
  assert.match(html, /<table>.*<th>a<\/th>.*<td>1<\/td>.*<\/table>/s)
})

test('markdownToHtml degrades math to literal, re-parseable text instead of losing it', () => {
  const html = markdownToHtml('An inline $y=f(x)$ formula.')
  assert.match(html, /\$y=f\(x\)\$/)
  // Round trip: what the editor would show is still recognised as math on
  // the next parse, as long as nothing touched it in between.
  const [paragraph] = parseMarkdown(html.replace(/<\/?p>/g, ''))
  assert.ok(paragraph.content.some((node) => node.type === 'math'))
})

test('math delimiters survive the TipTap save path', () => {
  const markdown = tiptapJsonToMarkdown({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Inline $y=f(x)$ stays mathematical.' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: '$$x_t = c + e_t$$' }],
      },
    ],
  })

  assert.match(markdown, /\$y=f\(x\)\$/)
  assert.match(markdown, /\$\$x_t = c \+ e_t\$\$/)
  assert.doesNotMatch(markdown, /\\[_+]/)
  const blocks = parseMarkdown(markdown)
  assert.ok(blocks[0].content.some((node) => node.type === 'math'))
  assert.equal(blocks[1].type, 'math')
})

// A hand-built stand-in for editor.getJSON() — TipTap's actual output shape
// for a document combining every mark/node RichTextEditor's toolbar can
// produce. Exercises the save-path serializer without needing a real editor
// instance (this file runs under node:test, not a browser).
function fakeDoc() {
  return {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Notes' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Plain, ' },
          { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
          { type: 'text', text: ', ' },
          { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
          { type: 'text', text: ', ' },
          { type: 'text', text: 'red', marks: [{ type: 'textStyle', attrs: { color: COLOR_HEX.red } }] },
          { type: 'text', text: ', ' },
          { type: 'text', text: 'mono', marks: [{ type: 'textStyle', attrs: { fontFamily: FONT_CSS.mono } }] },
          { type: 'text', text: ', ' },
          { type: 'text', text: 'xl', marks: [{ type: 'textStyle', attrs: { fontSize: SIZE_CSS.xl } }] },
          { type: 'text', text: ', a literal * character, and a ' },
          { type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'https://x.test' } }] },
          { type: 'text', text: '.' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hard break here' },
          { type: 'hardBreak' },
          { type: 'text', text: 'continues below.' },
        ],
      },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] },
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
              {
                type: 'bulletList',
                content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'nested' }] }] }],
              },
            ],
          },
        ],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a | b' }] }] },
              { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'c' }] }] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] },
              { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '2' }] }] },
            ],
          },
        ],
      },
    ],
  }
}

test('tiptapJsonToMarkdown serializes marks, hard breaks, nested lists and tables', () => {
  const markdown = tiptapJsonToMarkdown(fakeDoc())
  assert.match(markdown, /^## Notes/m)
  assert.match(markdown, /\*\*bold\*\*/)
  assert.match(markdown, /\*italic\*/)
  assert.match(markdown, new RegExp(`\\{red:red\\}`))
  assert.match(markdown, /\{font:mono:mono\}/)
  assert.match(markdown, /\{size:xl:xl\}/)
  assert.match(markdown, /a literal \\\* character/)
  assert.match(markdown, /\[link\]\(https:\/\/x\.test\)/)
  assert.match(markdown, /Hard break here {2}\ncontinues below\./)
  assert.match(markdown, /- one\n- two\n {2}- nested/)
  assert.match(markdown, /\| a \\\| b \| c \|/)
})

test('tiptapJsonToMarkdown output re-parses back into the equivalent AST', () => {
  const markdown = tiptapJsonToMarkdown(fakeDoc())
  const blocks = parseMarkdown(markdown)
  assert.deepEqual(types(blocks), ['heading', 'paragraph', 'paragraph', 'list', 'table'])

  const [, prose, hardBreakParagraph, list, table] = blocks
  const kinds = prose.content.map((node) => node.type)
  assert.ok(kinds.includes('strong'))
  assert.ok(kinds.includes('em'))
  assert.ok(kinds.includes('color'))
  assert.ok(kinds.includes('font'))
  assert.ok(kinds.includes('size'))
  assert.ok(kinds.includes('link'))
  // The literal asterisk the user typed survives as plain text, not as a
  // dangling/misinterpreted emphasis marker.
  assert.ok(plain(prose.content).includes('a literal * character'))

  assert.deepEqual(
    hardBreakParagraph.content.map((node) => node.type),
    ['text', 'break', 'text'],
  )

  assert.equal(list.items.length, 2)
  assert.equal(list.items[1].children[0].items.length, 1)

  assert.equal(table.header.length, 2)
  assert.equal(plain(table.header[0]), 'a | b')
  assert.equal(plain(table.rows[0][0]), '1')
})

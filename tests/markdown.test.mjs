import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildToc, parseMarkdown, readMinutes, slugify, splitNoteSections } from '../src/utils/markdown.js'

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

test('readMinutes never returns zero', () => {
  assert.equal(readMinutes(''), 1)
  assert.ok(readMinutes(new Array(600).fill('word').join(' ')) >= 3)
})

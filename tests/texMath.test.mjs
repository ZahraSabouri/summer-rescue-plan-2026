import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseTex, texToPlain } from '../src/utils/texMath.js'

function types(nodes) {
  return nodes.map((n) => n.t)
}

test('greek letters and operators become unicode', () => {
  const nodes = parseTex('\\alpha \\times \\beta \\geq \\sigma')
  const text = nodes.map((n) => n.v).join('')
  assert.ok(text.includes('α'))
  assert.ok(text.includes('×'))
  assert.ok(text.includes('β'))
  assert.ok(text.includes('≥'))
  assert.ok(text.includes('σ'))
})

test('dfrac produces a fraction node with numerator and denominator', () => {
  const [frac] = parseTex('\\dfrac{1}{N}')
  assert.equal(frac.t, 'frac')
  assert.equal(texToPlain(frac.num), '1')
  assert.equal(texToPlain(frac.den), 'N')
})

test('sum carries its limits as sub and sup', () => {
  const [op] = parseTex('\\sum_{i=1}^{N}')
  assert.equal(op.t, 'bigop')
  assert.equal(op.v, '∑')
  assert.equal(texToPlain(op.sub), 'i=1')
  assert.equal(texToPlain(op.sup), 'N')
})

test('single-character scripts attach without braces', () => {
  const nodes = parseTex('x^2_i')
  assert.equal(nodes.length, 1)
  assert.equal(texToPlain(nodes[0].sup), '2')
  assert.equal(texToPlain(nodes[0].sub), 'i')
})

test('hat and mathbf wrap their argument', () => {
  const [hat] = parseTex('\\hat{y}')
  assert.equal(hat.t, 'accent')
  assert.equal(hat.kind, 'hat')

  const [bold] = parseTex('\\mathbf{w}')
  assert.equal(bold.t, 'bold')
  assert.equal(texToPlain(bold.children), 'w')
})

test('the ridge regression loss parses end to end', () => {
  const src = 'L = \\dfrac{1}{N}\\sum_{i=1}^{N}(\\hat{y}_i - y_i)^2 + \\alpha\\sum_{j=1}^{n} w_j^2'
  const nodes = parseTex(src)
  const kinds = types(nodes)
  assert.ok(kinds.includes('frac'))
  assert.ok(kinds.includes('bigop'))
  // Nothing should survive as an unrendered command.
  assert.ok(!texToPlain(nodes).includes('\\'))
})

test('the min-max formula parses without leftover commands', () => {
  const src = "x' = new_{min} + (x - \\min) \\times \\dfrac{new_{max} - new_{min}}{\\max - \\min}"
  const plain = texToPlain(parseTex(src))
  assert.ok(!plain.includes('\\'))
  assert.ok(plain.includes('×'))
})

test('left and right delimiters keep the bracket and drop the sizing', () => {
  const plain = texToPlain(parseTex('\\left(\\dfrac{a}{b}\\right)'))
  assert.ok(plain.startsWith('('))
  assert.ok(plain.endsWith(')'))
  assert.ok(!plain.includes('left'))
})

test('binom renders as a choose-style stack', () => {
  const [binom] = parseTex('\\binom{5}{3}')
  assert.equal(binom.t, 'binom')
  assert.equal(texToPlain(binom.top), '5')
  assert.equal(texToPlain(binom.bottom), '3')
})

test('sqrt takes its radicand', () => {
  const [root] = parseTex('\\sqrt{M}')
  assert.equal(root.t, 'sqrt')
  assert.equal(texToPlain(root.children), 'M')
})

test('an unknown command is shown literally rather than dropped', () => {
  const plain = texToPlain(parseTex('\\notarealcommand{x}'))
  assert.ok(plain.includes('\\notarealcommand'))
})

test('double-bar norm notation survives', () => {
  const plain = texToPlain(parseTex('\\|\\mathbf{w}\\|'))
  assert.ok(plain.includes('‖'))
})

test('empty and plain input do not throw', () => {
  assert.deepEqual(parseTex(''), [])
  assert.equal(texToPlain(parseTex('y = wx + b')), 'y = wx + b')
})

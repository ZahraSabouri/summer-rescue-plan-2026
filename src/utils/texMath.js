// A small TeX subset parser for knowledge notes.
//
// Not a LaTeX engine. It covers what revision notes actually contain —
// fractions, sums with limits, superscripts, subscripts, roots, Greek letters
// and the common relation/operator symbols — and leaves anything it does not
// recognise as literal text.
//
// The alternative was KaTeX, which is ~270KB with its font files and would be
// the app's first runtime dependency. For formulas of this size a 200-line
// parser renders them just as legibly.

const SYMBOLS = {
  // Greek
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
  nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
  phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',

  // Relations and operators
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓',
  leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
  approx: '≈', equiv: '≡', sim: '∼', propto: '∝',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃',
  cup: '∪', cap: '∩', emptyset: '∅', forall: '∀', exists: '∃',
  infty: '∞', partial: '∂', nabla: '∇', ldots: '…', dots: '…', cdots: '⋯',
  rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', leftrightarrow: '↔',
  land: '∧', lor: '∨', neg: '¬', angle: '∠', perp: '⊥',
  quad: ' ', qquad: '  ', ',': ' ', ';': ' ', '!': '',
}

// Proof-writing vocabulary, merged in below. MAT700's answers are proofs, so
// these carry real weight — an unrendered \implies mid-derivation is worse
// than useless.
Object.assign(SYMBOLS, {
  implies: '⟹', impliedby: '⟸', iff: '⟺',
  Longrightarrow: '⟹', Longleftarrow: '⟸', Leftrightarrow: '⇔',
  blacksquare: '∎', square: '□', qed: '∎',
  therefore: '∴', because: '∵',
  ll: '≪', gg: '≫', subsetneq: '⊊', supseteq: '⊇', setminus: '∖',
  cong: '≅', simeq: '≃', mid: '∣', nmid: '∤', parallel: '∥',
  oplus: '⊕', otimes: '⊗', circ: '∘', bullet: '•', star: '⋆',
  prime: '′', ell: 'ℓ', aleph: 'ℵ',
  lceil: '⌈', rceil: '⌉', lfloor: '⌊', rfloor: '⌋',
  langle: '⟨', rangle: '⟩', vdots: '⋮', ddots: '⋱',
  uparrow: '↑', downarrow: '↓', mapsto: '↦', vdash: '⊢', models: '⊨',
})

// Operators that take limits above and below in display mode.
const BIG_OPS = { sum: '∑', prod: '∏', int: '∫', bigcup: '⋃', bigcap: '⋂', lim: 'lim', max: 'max', min: 'min', argmax: 'argmax', argmin: 'argmin' }

// Names rendered upright rather than italic.
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'sign', 'det', 'dim', 'gcd', 'sup', 'inf',
  'deg', 'dist', 'softmax', 'majority',
])

function isCommandChar(ch) {
  return /[a-zA-Z]/.test(ch)
}

class TexParser {
  constructor(source) {
    this.src = String(source ?? '')
    this.i = 0
  }

  peek() {
    return this.src[this.i]
  }

  // Read one atom: a group, a command, or a single character.
  readAtom() {
    const ch = this.peek()
    if (ch === undefined) return null

    if (ch === '{') {
      this.i += 1
      const children = this.parseUntil('}')
      if (this.peek() === '}') this.i += 1
      return { t: 'group', children }
    }

    if (ch === '\\') return this.readCommand()

    this.i += 1
    return { t: 'text', v: ch }
  }

  readCommand() {
    this.i += 1 // consume backslash
    let name = ''
    while (this.i < this.src.length && isCommandChar(this.src[this.i])) {
      name += this.src[this.i]
      this.i += 1
    }
    // Single-character commands such as \{ \, \| \%
    if (!name) {
      const ch = this.src[this.i]
      this.i += 1
      if (ch === '|') return { t: 'text', v: '‖' }
      if (ch in SYMBOLS) return { t: 'text', v: SYMBOLS[ch] }
      return { t: 'text', v: ch ?? '' }
    }

    if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
      const num = this.readAtom()
      const den = this.readAtom()
      return { t: 'frac', num: [num].filter(Boolean), den: [den].filter(Boolean) }
    }

    if (name === 'binom' || name === 'dbinom') {
      const top = this.readAtom()
      const bottom = this.readAtom()
      return { t: 'binom', top: [top].filter(Boolean), bottom: [bottom].filter(Boolean) }
    }

    if (name === 'sqrt') {
      const body = this.readAtom()
      return { t: 'sqrt', children: [body].filter(Boolean) }
    }

    if (name === 'hat' || name === 'bar' || name === 'vec' || name === 'tilde' || name === 'dot') {
      const body = this.readAtom()
      return { t: 'accent', kind: name, children: [body].filter(Boolean) }
    }

    if (name === 'mathbf' || name === 'boldsymbol' || name === 'bm') {
      const body = this.readAtom()
      return { t: 'bold', children: [body].filter(Boolean) }
    }

    if (name === 'text' || name === 'mathrm' || name === 'operatorname' || name === 'mathit') {
      const body = this.readAtom()
      return { t: 'upright', children: [body].filter(Boolean) }
    }

    if (name === 'left' || name === 'right') {
      // Size hints carry no meaning here; keep the delimiter that follows.
      const delim = this.src[this.i]
      this.i += 1
      if (delim === '.') return { t: 'text', v: '' }
      if (delim === '\\') {
        // e.g. \left\| — read the following command
        const inner = this.readCommand()
        return inner
      }
      return { t: 'text', v: delim ?? '' }
    }

    if (name in BIG_OPS) {
      return { t: 'bigop', v: BIG_OPS[name], name }
    }

    if (FUNCTIONS.has(name)) {
      return { t: 'upright', children: [{ t: 'text', v: name }] }
    }

    if (name in SYMBOLS) return { t: 'text', v: SYMBOLS[name] }

    // Unknown command: show it literally so nothing silently disappears.
    return { t: 'text', v: `\\${name}` }
  }

  parseUntil(stop) {
    const nodes = []
    while (this.i < this.src.length && this.peek() !== stop) {
      const ch = this.peek()

      if (ch === '^' || ch === '_') {
        this.i += 1
        const script = this.readAtom()
        const target = nodes[nodes.length - 1]
        const key = ch === '^' ? 'sup' : 'sub'
        // Attach to the preceding atom; big operators keep limits separately.
        if (target && (target.t === 'bigop' || target.sup || target.sub || true)) {
          target[key] = [script].filter(Boolean)
        } else {
          nodes.push({ t: 'group', children: [], [key]: [script].filter(Boolean) })
        }
        continue
      }

      const atom = this.readAtom()
      if (!atom) break
      nodes.push(atom)
    }
    return nodes
  }
}

export function parseTex(source) {
  return new TexParser(source).parseUntil(undefined)
}

// Plain-text fallback, used for aria-labels and for any consumer that cannot
// render the node tree.
export function texToPlain(nodes) {
  return nodes
    .map((node) => {
      switch (node.t) {
        case 'text':
          return node.v
        case 'frac':
          return `(${texToPlain(node.num)})/(${texToPlain(node.den)})`
        case 'binom':
          return `C(${texToPlain(node.top)}, ${texToPlain(node.bottom)})`
        case 'sqrt':
          return `sqrt(${texToPlain(node.children)})`
        case 'bigop':
          return node.v
        default:
          return node.children ? texToPlain(node.children) : ''
      }
    })
    .join('')
}

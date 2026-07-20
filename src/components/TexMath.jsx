import { Fragment, useMemo } from 'react'
import { parseTex, texToPlain } from '../utils/texMath'

// Accents are drawn by CSS above the glyph rather than as combining characters,
// which land high and to the right in the serif face used for maths. `bar` uses
// a rule; the others use a spacing glyph centred over the argument.
const ACCENT_GLYPH = { hat: 'ˆ', tilde: '˜', vec: '→', dot: '˙' }

function Nodes({ nodes, display }) {
  return nodes.map((node, index) => <Node key={index} node={node} display={display} />)
}

// Scripts render as sup/sub everywhere except on a big operator in display
// mode, where they stack above and below as limits.
function Scripts({ node, display }) {
  const stacked = display && node.t === 'bigop'
  if (stacked) return null
  return (
    <>
      {node.sub && (
        <sub>
          <Nodes nodes={node.sub} display={false} />
        </sub>
      )}
      {node.sup && (
        <sup>
          <Nodes nodes={node.sup} display={false} />
        </sup>
      )}
    </>
  )
}

function Node({ node, display }) {
  switch (node.t) {
    case 'text':
      return (
        <>
          {node.v}
          <Scripts node={node} display={display} />
        </>
      )

    case 'group':
      return (
        <>
          <Nodes nodes={node.children} display={display} />
          <Scripts node={node} display={display} />
        </>
      )

    case 'frac':
      return (
        <>
          <span className="tex-frac">
            <span className="tex-num">
              <Nodes nodes={node.num} display={false} />
            </span>
            <span className="tex-den">
              <Nodes nodes={node.den} display={false} />
            </span>
          </span>
          <Scripts node={node} display={display} />
        </>
      )

    case 'binom':
      return (
        <span className="tex-binom">
          <span className="tex-paren">(</span>
          <span className="tex-binom-stack">
            <span>
              <Nodes nodes={node.top} display={false} />
            </span>
            <span>
              <Nodes nodes={node.bottom} display={false} />
            </span>
          </span>
          <span className="tex-paren">)</span>
        </span>
      )

    case 'sqrt':
      return (
        <span className="tex-sqrt">
          <span className="tex-radical">√</span>
          <span className="tex-radicand">
            <Nodes nodes={node.children} display={false} />
          </span>
        </span>
      )

    case 'accent':
      return (
        <>
          <span className={`tex-accent tex-accent-${node.kind}`}>
            <span className="tex-accent-base">
              <Nodes nodes={node.children} display={false} />
            </span>
            {node.kind !== 'bar' && (
              <span className="tex-accent-mark" aria-hidden="true">
                {ACCENT_GLYPH[node.kind] ?? ''}
              </span>
            )}
          </span>
          <Scripts node={node} display={display} />
        </>
      )

    case 'bold':
      return (
        <>
          <span className="tex-bold">
            <Nodes nodes={node.children} display={display} />
          </span>
          <Scripts node={node} display={display} />
        </>
      )

    case 'upright':
      return (
        <>
          <span className="tex-upright">
            <Nodes nodes={node.children} display={display} />
          </span>
          <Scripts node={node} display={display} />
        </>
      )

    case 'bigop': {
      if (display && (node.sub || node.sup)) {
        return (
          <span className="tex-bigop-limits">
            {node.sup && (
              <span className="tex-limit">
                <Nodes nodes={node.sup} display={false} />
              </span>
            )}
            <span className="tex-bigop">{node.v}</span>
            {node.sub && (
              <span className="tex-limit">
                <Nodes nodes={node.sub} display={false} />
              </span>
            )}
          </span>
        )
      }
      return (
        <>
          <span className="tex-bigop">{node.v}</span>
          <Scripts node={node} display={display} />
        </>
      )
    }

    default:
      return null
  }
}

export function TexMath({ source, display = false }) {
  const nodes = useMemo(() => parseTex(source), [source])
  const plain = useMemo(() => texToPlain(nodes), [nodes])

  return (
    <span className={display ? 'tex tex-display' : 'tex tex-inline'} role="math" aria-label={plain}>
      <Nodes nodes={nodes} display={display} />
    </span>
  )
}

export { Fragment }

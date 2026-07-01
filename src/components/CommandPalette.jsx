import { useMemo, useRef, useState } from 'react'

function resultText(result) {
  return [result.title, result.subtitle, result.kind, result.keywords ?? ''].join(' ').toLowerCase()
}

function scoreResult(result, query) {
  if (!query) return result.kind === 'view' ? 4 : 1
  const text = resultText(result)
  if (result.title.toLowerCase().startsWith(query)) return 10
  if (text.includes(query)) return 5
  return 0
}

export function CommandPalette({
  open,
  views,
  cards,
  resources,
  onClose,
  onGoView,
  onOpenCard,
  onOpenResource,
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const viewResults = views.map((view) => ({
      id: `view:${view.id}`,
      kind: 'view',
      title: view.label,
      subtitle: 'Open view',
      target: view.id,
    }))
    const cardResults = cards.map((card) => ({
      id: `card:${card.id}`,
      kind: 'card',
      title: `${card.number}. ${card.title}`,
      subtitle: `${card.moduleGroup} / ${card.status}`,
      keywords: [card.description, card.phase, card.priority, ...(card.tags ?? [])].join(' '),
      target: card.id,
    }))
    const resourceResults = resources.map((resource) => ({
      id: `resource:${resource.id}`,
      kind: 'resource',
      title: resource.title,
      subtitle: `${resource.moduleTitle} / ${resource.group}`,
      keywords: [resource.type, resource.description, ...(resource.tags ?? [])].join(' '),
      target: resource.id,
    }))

    return [...viewResults, ...cardResults, ...resourceResults]
      .map((result) => ({ ...result, score: scoreResult(result, q) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title))
      .slice(0, 12)
  }, [cards, query, resources, views])

  if (!open) return null

  function run(result) {
    if (result.kind === 'view') onGoView(result.target)
    if (result.kind === 'card') onOpenCard(result.target)
    if (result.kind === 'resource') onOpenResource(result.target)
    setQuery('')
    onClose()
  }

  return (
    <div
      className="command-shell"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="command-panel">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search views, cards, and resources"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose()
            if (event.key === 'Enter' && results[0]) run(results[0])
          }}
        />
        <div className="command-results">
          {results.map((result) => (
            <button key={result.id} type="button" onClick={() => run(result)}>
              <span>{result.kind}</span>
              <strong>{result.title}</strong>
              <small>{result.subtitle}</small>
            </button>
          ))}
          {results.length === 0 && <p className="empty-state">No matching cards, resources, or views.</p>}
        </div>
      </div>
    </div>
  )
}

function searchableText(resource) {
  return [resource.title, resource.group, resource.type, resource.description, ...(resource.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function resourcesForCard(card, resources = []) {
  if (!card?.moduleGroup) return []
  return resources.filter((resource) => resource?.moduleGroup === card.moduleGroup)
}

export function searchResourcesForCard({ card, resources = [], linkedIds = [], query = '', limit = 8 }) {
  const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const linked = new Set(linkedIds)
  const maximum = Math.max(0, Math.floor(Number(limit) || 0))

  return resourcesForCard(card, resources)
    .filter((resource) => !linked.has(resource.id) && terms.every((term) => searchableText(resource).includes(term)))
    .sort((left, right) => {
      const leftTitle = String(left.title ?? '').toLowerCase()
      const rightTitle = String(right.title ?? '').toLowerCase()
      const phrase = terms.join(' ')
      const leftScore = leftTitle.startsWith(phrase) ? 2 : leftTitle.includes(phrase) ? 1 : 0
      const rightScore = rightTitle.startsWith(phrase) ? 2 : rightTitle.includes(phrase) ? 1 : 0
      return rightScore - leftScore || leftTitle.localeCompare(rightTitle)
    })
    .slice(0, maximum)
}

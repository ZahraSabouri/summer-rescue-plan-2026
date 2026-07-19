// Audits card -> resource wiring. Run: node scripts/verifyCardResources.mjs [ModuleGroup]
import { baseCards } from '../src/data/baseCards.js'
import { STUDY_MODULES } from '../src/data/studyModules.js'
import { applyAmlVideoStudyPlan, CARD_VIDEO_PLAN } from '../src/data/amlVideoPlan.js'
import { attachCardResourceLinks } from '../src/data/cardResources.js'
import { youtubeEmbedUrl } from '../src/utils/resourceLinks.js'

const only = process.argv[2]
const cards = attachCardResourceLinks(applyAmlVideoStudyPlan(baseCards), STUDY_MODULES)
const byId = new Map(STUDY_MODULES.flatMap((m) => m.resources).map((r) => [r.id, r]))
const isVideo = (id) => byId.get(id)?.type === 'YOUTUBE'
const minutesOf = (id) => Number(byId.get(id)?.description?.match(/(\d+) min/)?.[1] ?? 0)

console.log('=== RESOURCE REUSE ACROSS CARDS ===')
console.log('(progress is stored per resource, so a resource on N cards reports "studied" on all N)')
const use = new Map()
for (const card of cards) {
  for (const id of card.resourceIds ?? []) {
    if (!use.has(id)) use.set(id, [])
    use.get(id).push(card.id)
  }
}
const reusedVideos = [...use.entries()].filter(([id, cs]) => isVideo(id) && cs.length > 1)
console.log(`videos on more than one card: ${reusedVideos.length}`)
for (const [id, cs] of reusedVideos) console.log(`  ${id} -> ${cs.join(', ')}`)

console.log('\n=== DANGLING RESOURCE IDS ===')
const dangling = cards.flatMap((c) => (c.resourceIds ?? []).filter((id) => !byId.has(id)).map((id) => `${c.id} -> ${id}`))
console.log(dangling.length ? dangling.join('\n') : '  none')

console.log('\n=== PER-CARD ===')
let withVideo = 0
let withoutVideo = 0
let misranked = 0
for (const card of cards) {
  if (only && card.moduleGroup !== only) continue
  if (!only && card.moduleGroup !== 'Applied ML') continue
  const ids = card.resourceIds ?? []
  const videos = ids.filter(isVideo)
  const material = ids.filter((id) => !isVideo(id))
  videos.length ? withVideo++ : withoutVideo++
  const plan = CARD_VIDEO_PLAN[card.id]
  const core = plan?.core ?? []
  const optional = plan?.optional ?? []
  const coreMins = core.reduce((total, id) => total + minutesOf(id), 0)
  // Only CORE counts against the card's budget; optional deep-dives are opt-in.
  const ratio = card.estimatedHours ? coreMins / 60 / card.estimatedHours : 0
  console.log(`\n${card.id} [${card.phase}] ${card.estimatedHours}h — ${card.title}`)
  console.log(`  core ${core.length} (~${coreMins}min = ${Math.round(ratio * 100)}% of card): ${core.map((id) => byId.get(id).title).join(' | ') || '—'}`)
  if (optional.length) console.log(`  optional ${optional.length}: ${optional.map((id) => byId.get(id).shortTitle ?? byId.get(id).title).join(' | ')}`)
  console.log(`  material ${material.length}: ${material.slice(0, 5).map((id) => byId.get(id).title).join(' | ') || '—'}`)
  if (ids.length && isVideo(ids[0]) && material.length) {
    console.log('  !! video ranks above Tier-1 material')
    misranked++
  }
  if (ratio > 0.45) console.log('  !! CORE video time exceeds 45% of the card')
}
console.log(`\ncards with videos: ${withVideo}, without: ${withoutVideo}, misranked: ${misranked}`)

console.log('\n=== EMBED URL SPOT CHECK ===')
for (const id of ['aml-video-ubc-1-0-ml-introduction', 'aml-video-course-s4-svm-kernels', 'aml-video-cs156-l08']) {
  const r = byId.get(id)
  if (!r) continue
  console.log(`  ${id}\n    embed: ${youtubeEmbedUrl(r.url, { start: r.start, end: r.end })}`)
}

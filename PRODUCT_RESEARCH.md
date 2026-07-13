# Summer Rescue product research

Reviewed 12 July 2026. This is a product decision record for this six-week campaign, not a generic backlog.
It is deliberately outside the module resource catalogues.

## Product thesis

Summer Rescue should be a verified academic execution-and-evidence system. Its job is to answer four questions
with the least possible interpretation:

1. What boundary am I in now?
2. Which one output should I produce?
3. What exactly counts as finished, and what evidence should remain?
4. If the plan slipped, what explicit decision restores it without silently creating more work?

This combines Sunsama's calm daily execution and timeboxing, Structured's deliberate one-at-a-time replanning,
Motion's useful honesty about work that does not fit, Things' progressive disclosure, TickTick's task-linked
focus mode, and Amazing Marvin's one-task emphasis. It deliberately does not copy generic inboxes, automatic
replanning, streak pressure, or reward economies.

## Decisions shipped now

- **Full-screen Focus Room.** One linked card, exact finish/evidence requirements, current and next schedule
  boundaries, wall-clock timer, optional 25/5, 50/10 or Custom timing, and a one-line restart cue. It never
  completes or replans work.
- **Manual missed-card triage.** One overdue card at a time: Done, Rescue Lane, Waiting/Blocked, or a manually
  selected valid date. No bulk rollover.
- **Factual capacity signal.** Today reports protected academic hours against the eight-hour ceiling.
- **Pressure-safe progress.** Streak wording was removed from the active UI. The system measures outputs,
  evidence, actual time, pace, and exam readiness instead.
- **Honest desktop installation.** Chrome/Edge can install a standalone shell. No service worker is used and no
  offline claim is made while the private JSON/SQLite/resource service remains local-server based.

## Learning design rules

- Offload what must be done; retrieve what must be learned.
- Use retrieval practice and spaced return as the default learning loop; rereading is supporting work, not proof.
- Interleave only where the discrimination itself is useful. Do not shuffle unrelated work for novelty.
- Keep one active task visible and make transitions clean; task switching carries a measurable cost.
- Treat timer lengths as preferences, not scientific truths. A coherent question or coding step may finish before
  the break.
- Protect sleep. The eight-hour sleep block is part of the academic plan, not unused capacity.
- Compare actual and estimated time after enough evidence exists; do not pretend the first estimates are precise.

## Best next features after the campaign starts

These should be considered only after real use reveals a problem:

1. **Estimate calibration:** show median actual/estimate ratio by module after enough completed cards exist, then
   suggest—not apply—future estimate changes.
2. **Short Sunday review:** a five-question closeout using existing evidence: what finished, what slipped, what
   repeated error appeared, what capacity was unrealistic, and which one change applies next week.
3. **Verified recall queue:** schedule only prompts created from the user's real notes, marked work, and error logs.
   Never invent course facts.
4. **Optional low-energy mode:** reveal the smallest legitimate next step on an existing card without lowering its
   finish condition or adding a second plan.
5. **Local ambient sound:** only if bundled locally, explicitly controlled, and remembered without autoplay.

## Features to avoid during Summer Rescue

- Automatic card movement or AI schedule rewrites.
- Automatic rollover of missed work.
- AI-generated module content presented as verified truth.
- Streak loss, punitive plants, guilt notifications, or completion confetti that cannot respect reduced motion.
- Another inbox, daily journal, points system, or planning ritual.
- Notification volume that competes with the schedule.
- Offline caching of the application shell while the write API may be unavailable; that can create conflicting
  browser/file state and false confidence that work was saved.

## Sources

Product patterns:

- Sunsama Focus Mode: https://help.sunsama.com/docs/usage-guides/focus-mode/
- Sunsama daily planning: https://help.sunsama.com/docs/usage-guides/daily-planning/
- Structured Replan: https://help.structured.app/en/articles/4511874
- Motion scheduling logic: https://www.usemotion.com/help/time-management/auto-scheduling/reference-auto-scheduling/how-auto-scheduling-works-behind-the-scenes
- TickTick focus: https://help.ticktick.com/articles/7055782010496745472
- Things start dates and deadlines: https://culturedcode.com/things/support/articles/2803579/
- Amazing Marvin: https://amazingmarvin.com/product/

Learning and performance evidence:

- Retrieval-practice meta-analysis: https://pubmed.ncbi.nlm.nih.gov/25150680/
- Test-enhanced learning: https://pubmed.ncbi.nlm.nih.gov/16507066/
- Distributed-practice meta-analysis: https://pubmed.ncbi.nlm.nih.gov/16719566/
- Interleaving meta-analysis: https://pubmed.ncbi.nlm.nih.gov/31556629/
- Task-switching costs: https://pubmed.ncbi.nlm.nih.gov/11518143/
- Cognitive offloading: https://pubmed.ncbi.nlm.nih.gov/27542527/
- Progress monitoring and goal attainment: https://eprints.whiterose.ac.uk/id/eprint/91437/
- Sleep deprivation and cognition: https://pubmed.ncbi.nlm.nih.gov/20438143/
- Microbreak meta-analysis: https://pubmed.ncbi.nlm.nih.gov/36044424/

Installability and integrity:

- MDN PWA installability: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- MDN standalone apps: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Create_a_standalone_app
- MDN service workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Vite production deployment: https://vite.dev/guide/static-deploy

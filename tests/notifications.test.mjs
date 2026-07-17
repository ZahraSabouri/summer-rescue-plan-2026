import assert from 'node:assert/strict'
import test from 'node:test'

import { generateNotifications } from '../src/utils/notifications.js'

function noticesFor(card) {
  return generateNotifications({
    cards: [card],
    referenceDate: '2026-07-17',
    examCountdown: null,
    unsavedSinceBackup: false,
    mat700Active: true,
    campaignStart: '2026-07-16',
    createdAt: '2026-07-16T00:00:00.000Z',
  })
}

test('due notification names the actual deadline rather than a planning-window start', () => {
  const notices = noticesFor({
    id: 'groceries',
    title: 'LIFE — Groceries + supermarket run',
    moduleGroup: 'General',
    startDate: '2026-07-16',
    dueDate: '2026-07-18',
    done: false,
  })
  const notice = notices.find((item) => item.rule === 'due-tomorrow')
  assert.equal(notice.title, 'Due tomorrow · Sat 18 Jul')
  assert.equal(notice.detail, 'LIFE — Groceries + supermarket run')
  assert.doesNotMatch(notice.detail, /16 Jul/)
})

test('past-due life cards use the same overdue rule as every other card', () => {
  const notices = noticesFor({
    id: 'life',
    title: 'LIFE — Laundry + room reset',
    moduleGroup: 'General',
    dueDate: '2026-07-16',
    done: false,
  })
  assert.equal(notices.find((item) => item.rule === 'overdue')?.title, '1 day overdue')
})

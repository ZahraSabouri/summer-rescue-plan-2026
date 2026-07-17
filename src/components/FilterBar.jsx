import { useState } from 'react'
import {
  FILTER_DEFAULTS,
  MODULE_OPTIONS,
  PHASE_OPTIONS,
  PRIORITY_OPTIONS,
  SLOT_OPTIONS,
  STATUS_OPTIONS,
  TAG_OPTIONS,
} from '../data/constants'
import { KIND_META } from '../utils/progress'

function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FilterBar({
  filters,
  setFilters,
  resultCount,
  moduleOptions = MODULE_OPTIONS,
  phaseOptions = PHASE_OPTIONS,
  tagOptions = TAG_OPTIONS,
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const activeCount = Object.keys(FILTER_DEFAULTS).filter((key) => filters[key] !== FILTER_DEFAULTS[key]).length

  return (
    <section className={`filter-bar${mobileOpen ? ' is-open' : ''}`} aria-label="Card filters">
      <div className="filter-mobile-summary">
        <button
          type="button"
          className="secondary-button"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
        >
          {mobileOpen ? 'Hide filters' : `Filters${activeCount ? ` · ${activeCount} active` : ''}`}
        </button>
        <span>{resultCount} shown</span>
        {activeCount > 0 && (
          <button type="button" className="text-button" onClick={() => setFilters(FILTER_DEFAULTS)}>
            Clear
          </button>
        )}
      </div>
      <label className="search-field">
        <span>Search</span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => update('search', event.target.value)}
          placeholder="Card number, title, note, evidence..."
        />
      </label>

      <SelectFilter
        label="Phase"
        value={filters.phase}
        onChange={(value) => update('phase', value)}
        options={phaseOptions}
      />
      <SelectFilter
        label="Module / area"
        value={filters.module}
        onChange={(value) => update('module', value)}
        options={moduleOptions}
      />
      <label className="filter-field">
        <span>Kind</span>
        <select value={filters.kind ?? 'all'} onChange={(event) => update('kind', event.target.value)}>
          <option value="all">All</option>
          {Object.entries(KIND_META).map(([kind, meta]) => (
            <option key={kind} value={kind}>
              {meta.label}
            </option>
          ))}
        </select>
      </label>
      <SelectFilter
        label="Priority"
        value={filters.priority}
        onChange={(value) => update('priority', value)}
        options={PRIORITY_OPTIONS}
      />
      <SelectFilter
        label="Status"
        value={filters.status}
        onChange={(value) => update('status', value)}
        options={STATUS_OPTIONS}
      />
      <SelectFilter
        label="Slot"
        value={filters.slotType}
        onChange={(value) => update('slotType', value)}
        options={SLOT_OPTIONS}
      />
      <SelectFilter
        label="Tag"
        value={filters.tag}
        onChange={(value) => update('tag', value)}
        options={tagOptions}
      />

      <label className="filter-field">
        <span>Date</span>
        <select value={filters.dateMode} onChange={(event) => setFilters((current) => ({ ...current, dateMode: event.target.value, exactDate: '' }))}>
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="next7">Next 7 days</option>
          <option value="overdue">Overdue</option>
          <option value="no-date">No fixed date</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Deadline date</span>
        <input
          type="date"
          value={filters.exactDate ?? ''}
          onChange={(event) => setFilters((current) => ({ ...current, exactDate: event.target.value, dateMode: 'all' }))}
        />
      </label>

      <div className="filter-actions">
        <span>{resultCount} shown</span>
        <button type="button" className="secondary-button" onClick={() => setFilters(FILTER_DEFAULTS)}>
          Clear
        </button>
      </div>
    </section>
  )
}

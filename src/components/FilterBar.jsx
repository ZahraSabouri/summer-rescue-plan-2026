import {
  FILTER_DEFAULTS,
  MODULE_OPTIONS,
  PHASE_OPTIONS,
  PRIORITY_OPTIONS,
  SLOT_OPTIONS,
  STATUS_OPTIONS,
  TAG_OPTIONS,
} from '../data/constants'

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
}) {
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  return (
    <section className="filter-bar" aria-label="Card filters">
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
        label="Module"
        value={filters.module}
        onChange={(value) => update('module', value)}
        options={moduleOptions}
      />
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
        options={TAG_OPTIONS}
      />

      <label className="filter-field">
        <span>Date</span>
        <select value={filters.dateMode} onChange={(event) => update('dateMode', event.target.value)}>
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="next7">Next 7 days</option>
          <option value="overdue">Overdue</option>
          <option value="no-date">No fixed date</option>
        </select>
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

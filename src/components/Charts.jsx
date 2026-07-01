function niceMax(value, fallback = 1) {
  const v = Math.max(value, fallback)
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

export function ChartEmpty({ message }) {
  return <p className="chart-empty">{message}</p>
}

export function LineChart({
  data,
  series,
  xKey = 'label',
  height = 220,
  yMax,
  area = true,
  showDots = false,
}) {
  if (!data || data.length === 0) {
    return <ChartEmpty message="No data yet - it fills in as you log progress." />
  }

  const width = 720
  const padL = 34
  const padR = 14
  const padT = 14
  const padB = 26
  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const values = series.flatMap((s) =>
    data
      .map((d) => (d[s.key] == null ? null : Number(d[s.key])))
      .filter((value) => Number.isFinite(value)),
  )
  const maxVal = yMax ?? niceMax(Math.max(...values, 1), 1)
  const n = data.length
  const x = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v) => padT + innerH - (Math.min(v, maxVal) / maxVal) * innerH
  const ticks = Array.from({ length: 5 }, (_, i) => (maxVal / 4) * i)
  const labelEvery = Math.max(1, Math.ceil(n / 7))

  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" preserveAspectRatio="none">
      {ticks.map((tick, index) => (
        <g key={tick}>
          <line className="chart-grid" x1={padL} x2={width - padR} y1={y(tick)} y2={y(tick)} />
          <text className="chart-axis" x={padL - 6} y={y(tick) + 3} textAnchor="end">
            {index === 0 ? 0 : Math.round(tick)}
          </text>
        </g>
      ))}

      {data.map((d, index) =>
        index % labelEvery === 0 ? (
          <text key={`xl-${index}`} className="chart-axis" x={x(index)} y={height - 8} textAnchor="middle">
            {String(d[xKey] ?? '').slice(0, 6)}
          </text>
        ) : null,
      )}

      {series.map((s, seriesIndex) => {
        let openSegment = false
        const commands = []
        const points = []

        data.forEach((d, index) => {
          if (d[s.key] == null) {
            openSegment = false
            return
          }
          const point = `${x(index)},${y(Number(d[s.key]))}`
          commands.push(`${openSegment ? 'L' : 'M'} ${point}`)
          points.push({ point, x: x(index) })
          openSegment = true
        })

        const path = commands.join(' ')
        const dashed = Boolean(s.dashed)
        const canFill = area && seriesIndex === 0 && !dashed && points.length > 1
        const firstX = points[0]?.x ?? padL
        const lastX = points[points.length - 1]?.x ?? padL + innerW

        return (
          <g key={s.key}>
            {canFill && (
              <polygon
                className="chart-area"
                points={`${firstX},${padT + innerH} ${points.map((p) => p.point).join(' ')} ${lastX},${padT + innerH}`}
                style={{ fill: `var(${s.color})` }}
              />
            )}
            {path && (
              <path
                d={path}
                fill="none"
                style={{ stroke: `var(${s.color})` }}
                strokeWidth={dashed ? 2 : 2.5}
                strokeDasharray={dashed ? '6 5' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {showDots &&
              !dashed &&
              data.map((d, index) =>
                d[s.key] == null ? null : (
                  <circle
                    key={index}
                    cx={x(index)}
                    cy={y(Number(d[s.key]))}
                    r="2.6"
                    style={{ fill: `var(${s.color})` }}
                  />
                ),
              )}
          </g>
        )
      })}
    </svg>
  )
}

export function BarSeries({ data, valueKey = 'value', xKey = 'label', height = 180, color = '--chart-2' }) {
  if (!data || data.length === 0) return <ChartEmpty message="No logged data yet." />

  const width = 720
  const padL = 30
  const padR = 12
  const padT = 12
  const padB = 24
  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const maxVal = niceMax(Math.max(...data.map((d) => Number(d[valueKey] ?? 0))), 1)
  const n = data.length
  const slot = innerW / n
  const barW = Math.max(2, Math.min(34, slot * 0.62))
  const labelEvery = Math.max(1, Math.ceil(n / 8))

  return (
    <svg className="bar-chart" viewBox={`0 0 ${width} ${height}`} role="img" preserveAspectRatio="none">
      <line className="chart-grid" x1={padL} x2={width - padR} y1={padT + innerH} y2={padT + innerH} />
      {data.map((d, index) => {
        const value = Number(d[valueKey] ?? 0)
        const barHeight = (Math.min(value, maxVal) / maxVal) * innerH
        const cx = padL + slot * index + slot / 2
        return (
          <g key={`${d[xKey] ?? index}-${index}`}>
            <rect
              x={cx - barW / 2}
              y={padT + innerH - barHeight}
              width={barW}
              height={Math.max(0, barHeight)}
              rx="3"
              style={{ fill: `var(${color})` }}
            />
            {index % labelEvery === 0 && (
              <text className="chart-axis" x={cx} y={height - 7} textAnchor="middle">
                {String(d[xKey] ?? '').slice(0, 6)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function DonutRing({ value, total, label, sublabel, color = '--chart-1', size = 116 }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="donut" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle className="donut-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth="10" fill="none" />
        <circle
          className="donut-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ stroke: `var(${color})`, transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
        <text className="donut-pct" x="50%" y="48%" textAnchor="middle">
          {pct}%
        </text>
        {sublabel && (
          <text className="donut-sub" x="50%" y="64%" textAnchor="middle">
            {sublabel}
          </text>
        )}
      </svg>
      {label && <span className="donut-label">{label}</span>}
    </div>
  )
}

export function Sparkline({ values, color = '--chart-1', width = 120, height = 30 }) {
  if (!values || values.length === 0) return null

  const max = Math.max(...values, 1)
  const n = values.length
  const x = (index) => (n === 1 ? width / 2 : (index / (n - 1)) * width)
  const y = (value) => height - (value / max) * (height - 4) - 2
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' L ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <path d={`M ${points}`} fill="none" style={{ stroke: `var(${color})` }} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CalendarHeatmap({ days }) {
  if (!days || days.length === 0) return <ChartEmpty message="No activity recorded yet." />

  const cell = 13
  const gap = 3
  const max = Math.max(...days.map((d) => d.value), 1)
  const first = new Date(days[0].day)
  const firstDow = (first.getDay() + 6) % 7
  const padded = [...Array(firstDow).fill(null), ...days]
  const weeks = []
  for (let index = 0; index < padded.length; index += 7) {
    weeks.push(padded.slice(index, index + 7))
  }

  const width = weeks.length * (cell + gap) + 24
  const height = 7 * (cell + gap) + 18
  const dayLabels = ['M', '', 'W', '', 'F', '', 'S']
  const level = (value) => {
    if (value <= 0) return 0
    const ratio = value / max
    if (ratio > 0.66) return 4
    if (ratio > 0.33) return 3
    return 2
  }

  return (
    <svg className="heatmap" viewBox={`0 0 ${width} ${height}`} role="img" preserveAspectRatio="xMinYMin meet">
      {dayLabels.map((label, index) =>
        label ? (
          <text key={label} className="chart-axis" x={2} y={18 + index * (cell + gap) + cell - 3} textAnchor="start">
            {label}
          </text>
        ) : null,
      )}
      {weeks.map((week, weekIndex) =>
        week.map((day, dayIndex) => {
          if (!day) return null
          return (
            <rect
              key={`${weekIndex}-${dayIndex}`}
              x={20 + weekIndex * (cell + gap)}
              y={16 + dayIndex * (cell + gap)}
              width={cell}
              height={cell}
              rx="2.5"
              className={`heat-cell heat-${day.isFuture ? 'future' : level(day.value)}`}
            >
              <title>{`${day.day}: ${day.value} completed`}</title>
            </rect>
          )
        }),
      )}
    </svg>
  )
}

export function StackedModuleBars({ rows }) {
  if (!rows || rows.length === 0) return <ChartEmpty message="No module data." />

  const max = Math.max(...rows.map((row) => row.total), 1)
  return (
    <div className="stack-bars">
      {rows.map((row) => {
        const donePct = row.total ? (row.done / row.total) * 100 : 0
        const widthPct = (row.total / max) * 100
        return (
          <div className="stack-row" key={row.label}>
            <span className="stack-label" style={{ color: `var(${row.color ?? '--muted'})` }}>
              {row.label}
            </span>
            <div className="stack-track" style={{ width: `${Math.max(8, widthPct)}%` }}>
              <span className="stack-fill" style={{ width: `${donePct}%`, background: `var(${row.color ?? '--chart-1'})` }} />
            </div>
            <span className="stack-meta">
              {row.done}/{row.total}
            </span>
          </div>
        )
      })}
    </div>
  )
}

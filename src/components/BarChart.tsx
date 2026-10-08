import type { Bars } from '../features/stats/stats'

export function BarChart({ bars, unit = 'km' }: { bars: Bars; unit?: string }) {
  const max = Math.max(...bars.values, 0)
  const summary = bars.values.map((v, i) => `${bars.names[i]} ${v.toFixed(1)} ${unit}`).join(', ')
  return (
    <div className="bars" role="img" aria-label={summary}>
      {bars.values.map((v, i) => (
        <div className="barcol" key={i}>
          <div className="barwrap">
            <div className={'bar' + (i === bars.highlight ? ' on' : '')} title={`${bars.names[i]}: ${v.toFixed(1)} ${unit}`}
              style={{ height: max > 0 ? `${Math.max((v / max) * 100, 4)}%` : '4px' }} />
          </div>
          <span aria-hidden="true">{bars.labels[i]}</span>
        </div>))}
    </div>)
}

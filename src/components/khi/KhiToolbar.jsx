import React from 'react'
import { IconGrid, IconList, IconChevron } from './icons'
import { UI } from './khi-data'

const selectStyle = {
  appearance: 'none', WebkitAppearance: 'none', background: 'transparent',
  border: 'none', color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer',
  paddingInlineEnd: 4, outline: 'none',
}

// Results header: title + subtitle, grid/list toggle, and a sort <select>
// styled to match the kit's .sort-btn. `sortIndex` is the active option index.
export default function KhiToolbar({ title, subtitle, view, onView, sorts = [], sortIndex = 0, onSortChange }) {
  return (
    <div className="toolbar">
      <div>
        <h2>{title}</h2>
        {subtitle ? <div className="sub">{subtitle}</div> : null}
      </div>

      <div className="controls">
        <div className="toggle">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => onView('grid')}>
            <IconGrid /> {UI.grid}
          </button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => onView('list')}>
            <IconList /> {UI.list}
          </button>
        </div>

        {sorts.length ? (
          <label className="sort-btn">
            <span className="lab">{UI.sort}</span>
            <select value={sortIndex} onChange={(e) => onSortChange(Number(e.target.value))} style={selectStyle}>
              {sorts.map((s, i) => (
                <option key={`${s.key}-${s.dir}`} value={i}>{s.label}</option>
              ))}
            </select>
            <IconChevron />
          </label>
        ) : null}
      </div>
    </div>
  )
}

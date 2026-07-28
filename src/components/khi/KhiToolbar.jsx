import React from 'react'
import { IconGrid, IconList, IconChevron, IconFilter } from './icons'
import { UI } from './khi-data'

const selectStyle = {
  appearance: 'none', WebkitAppearance: 'none', background: 'transparent',
  border: 'none', color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer',
  paddingInlineEnd: 4, outline: 'none',
}

// Results header: one quiet Filters toggle (shows/hides the rail), the grid/list
// toggle, and a sort <select> styled to match the kit's .sort-btn. `sortIndex`
// is the active option index; `activeCount` badges the toggle with the number
// of live filters.
export default function KhiToolbar({
  view, onView, sorts = [], sortIndex = 0, onSortChange,
  sidebarOpen = true, onToggleSidebar, activeCount = 0, showView = true,
}) {
  return (
    <div className="toolbar">
      {/* The rail carries its own filter icon while open — the toolbar only
          shows an icon-only reopen control when the rail is hidden. */}
      {onToggleSidebar && !sidebarOpen ? (
        <button
          type="button"
          className="filters-toggle icon-only"
          onClick={onToggleSidebar}
          aria-pressed={sidebarOpen}
          aria-label={UI.filter}
          title={UI.filter}
        >
          <IconFilter />
          {activeCount > 0 ? <span className="cnt">{activeCount}</span> : null}
        </button>
      ) : <span />}

      <div className="controls">
        {showView ? (
          <div className="toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => onView('grid')}>
              <IconGrid /> {UI.grid}
            </button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => onView('list')}>
              <IconList /> {UI.list}
            </button>
          </div>
        ) : null}

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

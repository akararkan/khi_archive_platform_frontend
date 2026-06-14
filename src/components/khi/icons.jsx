// Lightweight inline SVG icons for the public "Living Archive" surface.
// They inherit `color` (currentColor) and are sized by CSS, so they work
// anywhere without an icon library. Ported from the design kit + a few
// additions (close, arrow, external, download, calendar).
import React from 'react'

const Svg = ({ children, sw = 1.8, fill = 'none', ...p }) => (
  <svg viewBox="0 0 24 24" fill={fill} stroke={fill === 'none' ? 'currentColor' : 'none'} strokeWidth={sw} {...p}>
    {children}
  </svg>
)

export const IconDashboard = (p) => <Svg {...p}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></Svg>
export const IconAll = (p) => <Svg {...p}><path d="m12 3 2.5 5 5.5.8-4 3.9 1 5.5L12 21l-5-2.8 1-5.5-4-3.9 5.5-.8z" /></Svg>
export const IconAudio = (p) => <Svg {...p}><path d="M3 12v3M7 8v11M11 4v16M15 9v9M19 6v8M23 11v3" strokeLinecap="round" /></Svg>
export const IconVideo = (p) => <Svg {...p}><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 6-3v10l-6-3" /></Svg>
export const IconText = (p) => <Svg {...p}><path d="M5 3h10l4 4v14H5z" /><path d="M9 9h6M9 13h6M9 17h4" strokeLinecap="round" /></Svg>
export const IconImage = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 4 4 3-3 4 4" /></Svg>
export const IconPerson = (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></Svg>
export const IconProject = (p) => <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>
export const IconSearch = (p) => <Svg sw={2} {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></Svg>
export const IconWorkspace = (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></Svg>
export const IconSignout = (p) => <Svg {...p}><path d="M15 21h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" /><path d="m8 17-5-5 5-5" /><path d="M3 12h12" /></Svg>
export const IconSignin = (p) => <Svg {...p}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></Svg>
export const IconBook = (p) => <Svg sw={1.6} {...p}><path d="M4 19V6a2 2 0 0 1 2-2h6v15" /><path d="M12 4h6a2 2 0 0 1 2 2v13" /><path d="M4 19h16" /><path d="M9 8h0M9 11h0" strokeLinecap="round" strokeWidth="2" /></Svg>
export const IconFilter = (p) => <Svg {...p}><path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" /></Svg>
export const IconCategory = (p) => <Svg {...p}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z" /><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" /></Svg>
export const IconRegion = (p) => <Svg {...p}><path d="M12 21s-7-5.7-7-11a7 7 0 0 1 14 0c0 5.3-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>
export const IconLanguage = (p) => <Svg {...p}><path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" /></Svg>
export const IconDecade = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" /></Svg>
export const IconCollection = (p) => <Svg sw={2} {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>
export const IconChevron = (p) => <Svg sw={2} {...p}><path d="m6 9 6 6 6-6" /></Svg>
export const IconGrid = (p) => <Svg sw={2} {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Svg>
export const IconList = (p) => <Svg sw={2} {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h0M3 12h0M3 18h0" strokeLinecap="round" /></Svg>
export const IconPlay = (p) => <Svg fill="currentColor" {...p}><path d="M8 5v14l11-7z" /></Svg>
export const IconClose = (p) => <Svg sw={2.2} {...p}><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></Svg>
export const IconArrowLeft = (p) => <Svg sw={2} {...p}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></Svg>
export const IconExternal = (p) => <Svg {...p}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></Svg>
export const IconDownload = (p) => <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" /></Svg>
export const IconCalendar = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" /></Svg>

// type id -> icon, used by the sidebar nav and result cards.
// (These maps are co-exported with the icon components; the react-refresh rule
// only cares for HMR of components, so the local disable is intentional.)
// eslint-disable-next-line react-refresh/only-export-components
export const TYPE_ICON = {
  all: IconAll, audio: IconAudio, video: IconVideo, text: IconText,
  image: IconImage, person: IconPerson, project: IconProject, category: IconCategory,
}
// eslint-disable-next-line react-refresh/only-export-components
export const FACET_ICON = {
  category: IconCategory, person: IconPerson, region: IconRegion,
  language: IconLanguage, dialect: IconLanguage, genre: IconDecade,
}

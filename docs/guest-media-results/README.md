# Guest media results container

This folder isolates the media-results area used by the public/guest catalogue.
It includes the toolbar, active-filter chips, loading/error/empty states, media
card grid, list view, scrolling result panel, and pagination.

## Extracted files


- `GuestMediaResultsContainer.jsx` — copy-ready React container using the
  project's existing `KhiToolbar` and `KhiCard` components.
- `guest-media-results.css` — the relevant container, card, media-preview,
  responsive, skeleton, and pagination styles.

## Live implementation

The real application continues to use these canonical files:

- `src/pages/public/KhiBrowsePage.jsx`
- `src/components/khi/KhiCard.jsx`
- `src/components/khi/KhiMediaPreview.jsx`
- `src/components/khi/KhiToolbar.jsx`
- `src/styles/khi-archive.css`

The extracted component is documentation/reference code and is not imported by
the application, so it will not affect the production bundle.

## Result structure

```text
catalogue-main
├── toolbar
├── active-chips (when filters are selected)
├── results-scroll
│   ├── skeleton grid
│   ├── error or empty state
│   └── khi-grid
│       └── KhiCard
│           ├── media
│           │   └── audio/video/image/text preview
│           └── body
│               ├── title
│               └── creator/region/year metadata
└── pager
```

## Card data shape

```js
{
  kind: 'audio', // audio | video | text | image | person | project | category
  code: 'record-code',
  title: 'Record title',
  to: '/public/audios/record-code',
  image: '',
  duration: '03:18',
  collection: 'Collection name',
  region: 'Sulaimani',
  decade: '1980',
  person: {
    name: 'Creator name',
    image: '',
  },
}
```

## Using the extracted container

```jsx
<GuestMediaResultsContainer
  title="گەنجینەکە"
  subtitle="هەموو دەنگ، ڤیدیۆ، دەق و وێنە"
  cards={cards}
  query={query}
  view="grid"
  page={0}
  totalPages={4}
  totalElements={82}
  pageSize={24}
  onPage={setPage}
  sorts={sorts}
  sortIndex={0}
  onSortChange={setSortIndex}
/>
```


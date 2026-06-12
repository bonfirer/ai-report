# i18n Multi-Language Support Design

## Overview

Add English + Chinese (zh-CN) internationalization to the AI Report Platform React frontend using `react-i18next`. Auto-detect browser language on first visit, persist choice via `localStorage`, with a manual toggle in the sidebar.

## Tech Stack

- **`react-i18next`** + **`i18next`** — core translation framework
- **`i18next-browser-languagedetector`** — auto-detect from `navigator.language`, query string, and `localStorage`
- No backend i18n — all translations bundled client-side; single `translation` namespace

## File Structure

```
client/src/
├── i18n/
│   ├── index.ts              # i18next instance creation + detection config
│   ├── en/
│   │   └── translation.json  # English key-value pairs
│   └── zh/
│       └── translation.json  # Chinese key-value pairs
├── main.tsx                   # Import i18n before App mount
└── App.tsx                    # Wrap with I18nextProvider
```

## Key Naming Convention

Flat dot-delimited keys prefixed by page/component domain:

| Domain | Key Pattern | Example |
|--------|-------------|---------|
| Navigation | `nav.<item>` | `nav.datasources` |
| DataSources | `datasources.<key>` | `datasources.title`, `datasources.empty.title` |
| KnowledgeGraph | `kg.<key>` | `kg.title`, `kg.searchPlaceholder` |
| Conversations | `conv.<key>` | `conv.title`, `conv.newChat` |
| Reports | `reports.<key>` | `reports.title`, `reports.visualizations` |
| ReportDetail | `reportDetail.<key>` | `reportDetail.backToReports` |
| Settings | `settings.<key>` | `settings.title`, `settings.llmProvider` |
| AIPanel | `aiPanel.<key>` | `aiPanel.noPools` |
| AssetPanel | `assetPanel.<key>` | `assetPanel.dataSources` |
| Shared UI | `common.<key>` | `common.delete`, `common.cancel` |
| Time | `time.<key>` | `time.justNow`, `time.minutesAgo` |
| Errors | `errors.<key>` | `errors.loadFailed`, `errors.saveFailed` |

## Initialization Flow

1. `i18n/index.ts` creates an `i18next` instance configured with:
   - `resources`: imported JSON bundles for `en` and `zh`
   - `lng`: `undefined` (let detector pick)
   - `fallbackLng`: `"en"`
   - `interpolation.escapeValue`: `false` (React handles escaping)
2. Language detector order: `localStorage` → `navigator` → `querystring` → `cookie`
3. `main.tsx` imports `./i18n` before rendering `<App />`
4. `App.tsx` wraps everything in `<I18nextProvider i18n={i18nInstance}>`

## Language Switcher

- Position: bottom of `NavSidebar`, above user avatar
- Visual: text button `EN` / `中`, muted sidebar colors, 10px font
- Behavior: calls `i18n.changeLanguage()`, persists via detector's localStorage cache

## Component Adaptation Pattern

```tsx
import { useTranslation } from 'react-i18next';

// Static string
<h1>{t('datasources.title')}</h1>

// Dynamic with interpolation
t('reports.visualizations', { count: visCount })

// Time relative
t('time.minutesAgo', { n: 5 })
```

## What Is NOT Translated

- API error messages from Rust backend (not frontend-controlled)
- User-generated content (report titles, conversation titles, data source names)
- SQL queries, database identifiers, technical monospace content
- Brand label "GENIE AI" in AIPanel header
- Code snippets and terminal-style output

## UI State Text That Stays Dynamic

- Time-ago strings (`timeAgo` utility) → move to i18n keys with interpolation
- Pluralization (`1 visualization` vs `2 visualizations`) → use `t()` with count
- Status labels (`Connected`, `Reconnecting...`) → translation keys
- Form button states (`Adding...`, `Testing...`, `Saving...`) → translation keys

## Pages Affected

| Page | ~Keys | Notable Dynamic Text |
|------|-------|---------------------|
| DataSourcesPage | ~18 | form states, empty state, test result |
| KnowledgeGraphPage | ~14 | legend counts, search, loading |
| ConversationsPage | ~16 | header title, suggestions, ws status |
| ReportsPage | ~12 | timeAgo, visualizations count |
| ReportDetailPage | ~14 | timeAgo, pool counts, no-data message |
| SettingsPage | ~16 | form states, test result, save notification |

## Components Affected

| Component | ~Keys | Notes |
|-----------|-------|-------|
| NavSidebar | ~6 | nav titles, settings |
| AssetPanel | ~8 | section headers, empty states |
| AIPanel | ~7 | empty state, render button, placeholder |
| ui.tsx | 0 | Pure presentational, receives text as props |

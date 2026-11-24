# MaiBoard

Source repository: [kedarisettisatwik/MaiBoard](https://github.com/kedarisettisatwik/MaiBoard).

## Expanded editor

- Blue palette and a custom connected-block M logo, including an SVG browser icon.
- Direct table-name editing in the block header and an always-available add-column control in its footer.
- Right-click blocks for Duplicate or Delete (red), and right-click connection lines for Delete. These operations participate in undo/redo.
- Lock icons protect individual blocks/section frames or a whole view from layout, style, text, delete and reorder changes. Locked tabs remain switchable and tables keep row/column/data controls. A locked section leaves its children editable unless their own block or whole view is locked. Locks are editor safeguards, not additional Firebase access permissions.
- Image blocks accept PNG, JPEG, WebP and GIF uploads up to 5 MB, or HTTP(S) image URLs. The unsaved demo accepts uploads up to 400 KB. Published snapshots intentionally include displayed images. Uploaded Firebase images use download-token URLs, so anyone who obtains the image URL can view it. Deploy the updated Storage rules before uploading images.
- Section rectangles contain assigned blocks. Moving or hiding a section includes its contents; deleting a section preserves the blocks. Only Layers drag-and-drop changes ownership: drop a block on a section or tab to move it inside, drop on another parent to reparent, or drop at the board root to remove it. Normal canvas dragging and resizing are constrained to the existing parent bounds and never reparent a block. There is no separate Add block to this tab control; use the main toolbar and Layers.
- Horizontal, vertical and accordion tab layouts. Accordion panels start closed and expand independently. Active tabs support underline, fill, pill or outline styling, with customizable accent and filled-text colors.
- K board (Kanban) blocks with editable columns, + to create cards, card editing/deletion, drag movement or an explicit destination-column selector, and live item counts per column. Removing a column moves its cards to the first remaining column. A K board can also feed live pie/bar reports showing cards per column.
- Drag Layers rows to reorder blocks, drop onto groups/sections/tabs to reparent, or drop at the board root to ungroup. Right-click a block row for red Delete or Copy (duplicate), or a connection row for Delete. Eye icons hide/show blocks. Sections remain behind their contents.
- New views can start blank or copy any existing view. Right-click a block or section on the canvas or in Layers for Copy to view or Move to view; contained blocks move/copy together and copied internal connections/reports are relinked.
- Named project views with a configurable starting view. A view contains canvas blocks, and a Tabs block can contain multiple independently arranged blocks in each tab. Tabs can alternatively show a reference to an existing project view. Button actions explicitly choose between opening a hyperlink, changing the whole project view, switching a specific Tabs block to another tab, or going to the next project view. Local tabs begin on their first tab when presenting. Nested tab/view references are depth-limited to avoid recursive loops. Later edits require republishing.
- Text supports bulleted lists, numbered lists and tickable to-do lists. Select text to switch the middle-bottom canvas toolbar to formatting controls; Canvas tools switches back. Published views display saved checklist states without editing controls.

Hiding or selecting a view changes visual presentation, not data-access permissions. Published snapshots contain the entire multi-view board; do not use hidden blocks or inactive views to store data that must remain private from presentation visitors.

React + Vite visual project workspace using Firebase Authentication, Cloud Firestore, and Cloud Storage. Firebase web configuration is read from Vite environment variables in `src/firebase.js`; no configuration values are hardcoded there. Private access is enforced by `firestore.rules` and `storage.rules`.

## Run

```sh
npm ci
# Copy .env.example to .env.local and fill in the Firebase web configuration
npm run dev
```

Open the Vite URL, normally http://localhost:5173. `#/demo` is an interactive, unsaved playground requiring no account. `npm test` verifies CSV parsing, table changes, chart calculations, safe links, and publication privacy. `npm run build` produces `dist/`.


## GitHub Pages deployment

The public website target is https://kedarisettisatwik.github.io/MaiBoard/. The hash routes work under the repository path, including signup, published boards and private Live mode. This URL becomes active after GitHub Pages is enabled and the deployment succeeds.

1. In the repository Settings → Secrets and variables → Actions, create a repository secret named FIREBASE_ENV. Its value is the complete contents of your filled .env.local, using the six names shown in .env.example. Do not commit this file.
2. In Settings → Pages → Build and deployment, choose GitHub Actions.
3. Push to master or run Deploy MaiBoard to GitHub Pages under Actions. The workflow installs dependencies, runs tests, validates required configuration, builds with /MaiBoard/ as its base path, and deploys dist.
4. Enable Firebase Email/Password authentication and add kedarisettisatwik.github.io to Authentication → Settings → Authorized domains. Create Firestore and Storage and deploy this repository's rules.

.env.local and all .env.* files are ignored except the empty .env.example template. The workflow creates a temporary .env.production.local from the GitHub secret and removes it after the build. VITE_ configuration is necessarily included in browser JavaScript; Firebase web API keys identify the project and are not server credentials. Access is protected by Firebase Authentication and the included Security Rules. Never put service-account keys or other server secrets in VITE_ variables.

## Firebase setup required

A read-only check returned `CONFIGURATION_NOT_FOUND` for Authentication on November 24, 2026. The supplied client configuration cannot enable backend services or deploy rules. This environment has no authenticated Firebase administrator session.

In [the Firebase console](https://console.firebase.google.com/project/maiboard-d0af8/overview):

1. Open **Authentication → Get started → Sign-in method** and enable **Email/Password**.
2. Under **Authentication → Settings → Authorized domains**, add the production domain and `localhost` / `127.0.0.1` for local testing. The Sites domain is `maiboard-workspace.mightywren7.chatgpt.site`. Configure the password-reset email template for the final domain.
3. Create the **default Cloud Firestore database** in production mode. Publish the included `firestore.rules`.
4. Create/verify the **Cloud Storage** bucket `maiboard-d0af8.firebasestorage.app`. Publish `storage.rules`. If Firebase requires enabling billing for Storage, the project owner must complete that step.
5. Deploy rules from an authenticated terminal, or paste each file into the corresponding console Rules editor:

```sh
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage --project maiboard-d0af8
```

Do not replace the included rules with unrestricted test-mode rules.

### Public website and presentation URLs

The existing Sites host retains its owner-private audience. Signing into Firebase inside the app does not remove that host-level restriction; only visitors who can access that host can open its presentation links.

For public signup and external presentation links, Firebase Hosting is configured in this checkout:

```sh
npm run build
firebase deploy --only hosting --project maiboard-d0af8
```

The standard Firebase Hosting origin is `https://maiboard-d0af8.web.app`. Add custom domains to Authentication's authorized domains. Presentation URLs use the current origin and `#/view/<id>`.

### Downloading source CSV files

Uploads are private and associated with their table. There is no separate Assets library. Published snapshots include table values, not source files or file metadata. Downloads use authenticated Storage requests rather than public download-token URLs. If original-file downloads encounter a browser CORS error, apply the included configuration from an authenticated Google Cloud terminal:

```sh
gcloud storage buckets update gs://maiboard-d0af8.firebasestorage.app --cors-file=storage.cors.json
```

Update `storage.cors.json` when the production origin changes.

## Features

- Signup, sign-in, password reset, user name and logout.
- Cloud projects, search, blank/sample templates, renaming and deletion.
- Dotted canvas, draggable and resizable blocks, zoom/pan/fit, undo/redo, duplication and layer order.
- Nested groups, table columns and tabs in Layers; selected block properties on the right.
- Text and tab panels: bold, italic, underline, highlight, lists, headings, per-selection fonts and hyperlinks.
- Link button blocks with label, destination and new-tab setting.
- Editable table titles, headers and values; add/delete rows/columns; import/replace CSV within a table.
- Live reports linked to selected table columns: pie chart, signed bar chart and numeric histogram, including configurable bins and invalid-value notices.
- Solid, dotted or dashed connectors; color, thickness, curves and arrowheads at either or both ends.
- Publish creates a read-only snapshot URL; republish updates it; unpublish revokes future reads. Viewing preserves interactive tabs, reports and hyperlinks.
- Serialized Firestore autosave, status/retry messages and a browser draft for recovery after interrupted/failed saves.

## Data and limits

- Firestore `users/{uid}/projects/{id}` stores metadata and serialized board JSON, avoiding Firestore's restriction on nested arrays in table data.
- Storage `users/{uid}/projects/{id}/csv/{fileId}.csv` stores private source files. File records remain associated with the project for cleanup after a table is removed or reimported.
- Firestore `publications/{shareId}` contains only the published board. Individual snapshot reads are public; listing snapshots is denied. Only the project owner can change or delete one. Email/display name and source CSV metadata are not copied into snapshots.

CSVs are limited to 5 MB, 1,000 data rows and 50 columns. Board JSON is limited to approximately 800 KB of UTF-8 content. Numeric report values support signs, commas, common currency symbols, percentages and exponent notation. Pie charts omit non-positive values and group large category sets. Histograms count numeric observations in equal-width bins. Missing source columns require choosing another column.

## Verification

Production builds and model tests run without backend access. Real account creation, reset email delivery, authenticated cloud saves, CSV uploads/downloads, cross-user isolation and publication reads must be verified after the Firebase services and rules are enabled. The rules have not been deployed to the production Firebase project from this environment. Realtime co-editing/conflict merging is not included.

`firebase.json` includes Auth, Firestore and Storage emulator ports. Set `VITE_USE_EMULATORS=true` when running against locally installed Firebase emulators for this project; do not use production accounts or data for emulator tests.

All blocks support transparent backgrounds, a color picker, and custom hex colors. Reports offer Blue, Vibrant, and Earth palettes plus individual category colors that persist in presentations. Buttons render without a surrounding card; Ctrl+click (or Cmd+click) runs an action in the editor, and a regular click runs it in presentation mode.


Publish generates a public, read-only snapshot URL (#/view/...) with no sign-in required. Live mode (#/live/...) requires the project owner to sign in. Its only data action is adding a new table row through a form; it cannot edit existing rows, rename tables, add columns, move blocks, or change styles. Row appends use a Firestore transaction to retain concurrent additions. Live changes update the private working project; publish again to refresh the public snapshot. Firestore owner rules protect private projects. Firebase configuration and rules must be activated as described above.


Report cards: use the Report card toolbar tool or change a report's Chart type to Report card. Select a table, column, and calculation (maximum, minimum, average, sum, record count, distinct values, or count in a configurable range). Range limits support inclusive/exclusive boundaries. Numeric cards omit blank/nonnumeric cells and support decimals, prefix, suffix, and value color. Cards update with table edits and work in published snapshots. New project immediately creates an empty Untitled board. The dashboard shows four independent sample projects above personal projects: Table report, Employee onboarding, Team delivery, and Budget overview, with Preview and Use sample actions. Selected text has separate highlight/text color dialogs. Checklist labels align beside their checkboxes. Connect toggles back to Select and keeps toolbar controls clickable. Button Properties includes Show icon.


Project view navigation is hidden by default in published and Live modes, including existing projects without an explicit setting. Use View navigation settings beside the editor view selector to enable Show view navigation. Button navigation remains active when view tabs are hidden; this is visual navigation control, not a restriction on the published snapshot's data.


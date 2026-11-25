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
- Explicit Save with save status and unsaved-change warnings before leaving.

## Data and limits

- Firestore `users/{uid}/projects/{id}` stores metadata and serialized board JSON, avoiding Firestore's restriction on nested arrays in table data.
- Storage `users/{uid}/projects/{id}/csv/{fileId}.csv` stores private source files. File records remain associated with the project for cleanup after a table is removed or reimported.
- Firestore `publications/{shareId}` contains only the published board. Individual snapshot reads are public; listing snapshots is denied. Only the project owner can change or delete one. Email/display name and source CSV metadata are not copied into snapshots.

CSVs are limited to 5 MB, 1,000 data rows and 50 columns. Board JSON is limited to approximately 800 KB of UTF-8 content. Numeric report values support signs, commas, common currency symbols, percentages and exponent notation. Pie charts omit non-positive values and group large category sets. Histograms count numeric observations in equal-width bins. Missing source columns require choosing another column.

## Verification

Production builds and model tests run without backend access. Real account creation, reset email delivery, authenticated cloud saves, CSV uploads/downloads, cross-user isolation and publication reads must be verified after the Firebase services and rules are enabled. The rules have not been deployed to the production Firebase project from this environment. Realtime co-editing/conflict merging is not included.

`firebase.json` includes Auth, Firestore and Storage emulator ports. Set `VITE_USE_EMULATORS=true` when running against locally installed Firebase emulators for this project; do not use production accounts or data for emulator tests.

All blocks support transparent backgrounds, a color picker, and custom hex colors. Reports offer Blue, Vibrant, and Earth palettes plus individual category colors that persist in presentations. Buttons render without a surrounding card; Ctrl+click (or Cmd+click) runs an action in the editor, and a regular click runs it in presentation mode.


Publish generates a read-only snapshot URL (#/view/...) with the configured audience. Live mode (#/live/...) requires the owner or invited editor to sign in and acquire the editor lease. It allows adding, editing and deleting table records, with an explicit Save button. Layout and column schema stay read-only. Publish again to refresh the shared snapshot.


Report cards: use the Report card toolbar tool or change a report's Chart type to Report card. Select a table, column, and calculation (maximum, minimum, average, sum, record count, distinct values, or count in a configurable range). Range limits support inclusive/exclusive boundaries. Numeric cards omit blank/nonnumeric cells and support decimals, prefix, suffix, and value color. Cards update with table edits and work in published snapshots. New project immediately creates an empty Untitled board. The dashboard shows four independent sample projects above personal projects: Table report, Employee onboarding, Team delivery, and Budget overview, with Preview and Use sample actions. Selected text has separate highlight/text color dialogs. Checklist labels align beside their checkboxes. Connect toggles back to Select and keeps toolbar controls clickable. Button Properties includes Show icon.


Project view navigation is hidden by default in published and Live modes, including existing projects without an explicit setting. Use View navigation settings beside the editor view selector to enable Show view navigation. Button navigation remains active when view tabs are hidden; this is visual navigation control, not a restriction on the published snapshot's data.


Tickets sample: exact ticket columns, restricted statuses/priorities, editable client suggestions, priority colors, Issue text search, dropdown filters and date filters. Filters are temporary viewer controls and apply to linked table charts/cards; clearing them restores all rows. NASHCM filled percentage uses nonblank cells divided by the currently filtered record count (zero rows shows 0%). Date-count cards use valid ISO YYYY-MM-DD dates and inclusive start/end dates. Configure column types, option lists, value colors and filter visibility under Table Properties. Live mode new-row forms use the same column controls and validate restricted choices before appending. Existing data from before a choice-list change remains visible as legacy values. Report cards hide calculation labels and offer Value font size. Sample gallery cards now use image thumbnails; clicking opens an unsaved preview, and Save project makes a private copy for the signed-in user.


Standalone filters replace embedded table filters. Add a Filter block from the canvas toolbar, then select Source table, Filter column, Filter control, and optional label in Properties. Runtime filter values are temporary and not saved or published as defaults. Multiple blocks combine with AND, including filters on the same column. Each filter defaults to table-only; enable Apply to reports for that filter's effect to reach linked charts and report cards. Report cards show values only by default; set Caption (optional) for a custom caption. Card editor headers remain available for selection/dragging, but published cards omit those headers. The Tickets example has separate filter blocks and explicitly enabled report filtering.


Report-specific filter responses replace the filter-level Apply to reports switch. In each chart/card Properties, Respond to filters lists filters linked to its source table. Select individual filters, Select all filters (including future matching filters), or Clear selection. Table rows still respond to all active linked filter blocks. Newly created reports default to no selected filters; older report configurations retain their previous filter behavior until explicitly changed. Filter captions and Clear buttons are optional and both are absent by default. Pan mode and board/header dragging prevent accidental browser text selection while normal text editing retains selection.


Layout and pagination: filters without caption/Clear can shrink to 80px in both resize handles and Height Properties (140px minimum width), with compact padding; optional caption/Clear raises the minimum. New filters start compact. Tables paginate by default at 10 records per page. Table Properties exposes Enable pagination and Records per page (1–200); page controls work in editor, published and Live modes. Pagination affects rendered rows only, never report calculations. Changing filters/page size resets to page 1; row actions retain original indexes. The home sample gallery now shows only Blank canvas, Team delivery, Budget review, and Employee onboarding; prior sample links remain available. Border color includes Transparent.


Border color now uses the same color input, custom hex field and preset swatches (including transparent) as Background. Table Properties → Pagination position offers Top right, Top left, Top middle, Bottom right, Bottom left and Bottom middle. The default remains Bottom right, and the chosen position is preserved in published and Live modes.


Block headers are hidden by default in both Live and published views. Enable Show header in Live / Publish in a block's Properties to show its name/header there. Editor headers remain available for editing and dragging (buttons retain their bare editor appearance). This also applies to blocks nested in tabs and sections.



### Collaboration and saved publications

New projects ask for a published audience: public, specific email addresses, or all signed-in MaiBoard accounts. Existing projects retain public-link behavior until their owner changes Sharing. Owners add editor emails in Sharing; invited users sign in and find the project in Shared. Editors can read and edit the entire working project, including all table data. A server-enforced 90-second lease permits one layout editor at a time and renews every 25 seconds. Closing a browser tab releases its stale lock after the lease expires; navigating back releases it immediately.

Published pages include Save project. Signed-out visitors sign in and the pending save completes automatically. Saved contains a link to the published project, and opens it in a new tab in publish mode. This is a bookmark, so unpublishing or revoking access makes the saved link unavailable.

Export JSON includes every view, block, connection and table value. Import JSON can replace the current canvas (with undo). Cloud source-file paths, row ownership metadata and team-write permissions do not transfer. Uploaded image URLs remain linked images; the JSON is not an image-file archive.

### Team tables and personal dashboards

For Specific emails projects, Table properties → Team & personal data enables team row submissions and deletion of a member’s own submissions. Ownership is enforced using the authenticated UID, while Created by displays the person’s name and Created on is an ordinary date column available to filters/reports. Editors manage all rows. Layout/column changes take effect for team submissions after republishing; if the published schema is stale, republish before accepting more data.

For personal dashboards, enable Each viewer sees only their own rows on **each sensitive table**, choose the identity column, and use recipient emails or an explicit email-to-column-value mapping for names. Every row needs a valid, unambiguous identity before publication. Use a signed-in audience. The publication layout contains no table rows or recipient mapping; Firestore sends only rows authorized for the signed-in account email. Charts/cards derive from those same authorized rows. Identity filters are locked in publish mode. Editors intentionally retain access to all rows. Do not put private per-person content in ordinary text/image blocks or a public table.

Publish uses immutable table snapshot generations, and team submissions are associated with a generation so republishing cannot expose stale rows under changed identity settings. Concurrent submissions made during republishing remain in the owner’s working dataset; republish again to include any submission that arrived after that publication started.

Deploy **firestore.rules**, **firestore.indexes.json** and **storage.rules** before deploying this version of the frontend. The composite entries index supports generation + visibleTo lookups. Firebase Storage editor access uses a Firestore membership lookup. Rules intentionally do not trust frontend-only filters for privacy. Existing published snapshots migrate to the new table storage format when republished.

Run `npm test` for board/data tests and `npm run test:rules` for Firestore permission tests (Java 21+ and the Firebase CLI are required). The rules suite uses only the disposable demo-maiboard emulator project.


### Manual saving and adjustable workspace

Project edits and Live table-data edits are staged until Save (or Ctrl/Cmd+S in the editor). Autosave and automatic recovery drafts are disabled. Publish requires saved changes. Leaving with unsaved changes shows Keep editing, Discard changes and leave, and Save and leave; closing or reloading uses the browser's standard unsaved-change prompt.

Drag the Layers/Properties outer border to resize a panel; these personal UI widths are remembered locally. Vertical tab navigation has a draggable separator and a Navigation width property. Its width is saved with the project, and child blocks stay inside the remaining content area. Every block has a Box shadow checkbox under Appearance.

Owners and invited editors can modify/delete anyone's table records in either Editor or Live mode, while original Created by metadata is retained. Live mode keeps board layout and column schema read-only and uses the same exclusive editor lease. Published viewers retain the configured own-row submission/deletion limits.

Email verification is no longer required anywhere, per the project owner's request. Access checks use the signed-in account's email and UID. All registered accounts can open All MaiBoard users shares. Email-based audience/editor/personal-row checks use the claimed account email without proof of mailbox ownership.


### Table entities and section grants

The home Tables tab defines reusable schemas only: field names, Text, Date, Number, Picklist (with options), and Boolean. It does not show or add records. Each entity has a generated unique key. Paste the key under a project table's Table entity properties to load its fields and records. Add/edit records in Editor or Live and click Save to write them to the entity; other projects load the latest records when opened or refreshed. Explicit entity editor emails control source-table access. Project owners who own the entity also grant their project editors source access when saving. Concurrent entity revisions are checked during an atomic project/entity save, preventing silent overwrites. Team submissions join the source entity when an editor saves the project. Published links remain snapshots and require republishing to refresh layout/base records.

Boolean fields render as checkboxes in Editor, Live and Publish. In Specific emails publications, team members may toggle Boolean fields on records they submitted; database rules preserve other fields and reject changes to other people's rows. Owners/editors can manage all records in Editor/Live. Project tables offer compact download-icon CSV controls and Clear data with confirmation; clear is staged until Save and is absent for published viewers.

Project type (Public, Specific emails, All MaiBoard users) is immutable after creation, enforced by Firestore. Owners may still manage invited viewer/editor emails. For Specific emails projects, Section properties lists recipient Grants; unchecked recipients do not receive that section, its descendants, connections, or reports/filters that directly reference excluded tables. Nested section grants intersect. Editing access remains available to owners/editors. Publish writes immutable per-recipient generations and enforces entry grants in Firestore. Republish after changing section grants or adding new viewers. Deploy the entries generation + tableId + visibleTo composite index with these rules.

Tabs use a short fade/slide transition with reduced-motion support. No entity Private property is included.


### Saved projects and personal additions

Invited viewers and editors appear automatically under Saved; editor invitations also remain in Shared for full editor access. Existing editor invitations resolve their publication ID when the dashboard loads. New viewer/editor invitations carry the publication ID after publication. Unpublished invitations show Awaiting publication. Manually saved public links remain bookmarks.

Saved cards offer two icon actions: Eye opens Published view; Pencil opens Edit my additions. This personal workspace loads only the publication data authorized for that user, freezes all original blocks/connections, and permits adding/editing personal blocks alongside them. Save writes only additions to users/{uid}/saved/{publicationId}/workspace/additions. It never saves the original project or source entities. Personal additions are private to the signed-in user, persist across visits, and are combined with the current publication when reopened. Revoked/unpublished source access prevents reopening the workspace. Connections from personal blocks to original blocks are supported. The entity Private property remains omitted.


Saved personal workspaces include a Live-mode (Play) icon. Save additions first, then open Live to see the current authorized publication plus personal blocks. Source blocks stay read-only; personal tables support staged record edits/add/delete with an explicit Save icon, persisted only to the user's additions. The Back-to-editor icon reopens the personal workspace with its saved values. Live opens in the same project tab so the old editor does not remain open with stale personal table data. Right-click block actions resolve the context's block explicitly, avoiding the previous out-of-scope variable error.


Entity owners can delete an entity using the red trash icon on its Tables card. A confirmation explains that the source entity and stored records are permanently removed, while published snapshots remain unchanged. Designated editors cannot delete an entity. A revision check rejects deletion if the source changed while the confirmation was open. Projects referencing a deleted entity remain openable: the missing source becomes a local table with its saved columns, no source records, and a notice prompting the user to link a replacement or save the local table.

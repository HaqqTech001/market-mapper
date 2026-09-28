# Market Mapper

**Internal Field Mapping Instrument for Nigerian Market Navigation & Commerce Intelligence**

Market Mapper is the internal operational field tool used by authorized mapping crews to digitize physical markets across Nigeria (including Alaba International, Balogun Market, Ariaria International, Bodija, and Computer Village).

The application captures structured ground-truth spatial and commercial data directly in dense, open-air, and multi-story commercial clusters:
- **Assigned Areas & Boundaries**: Market perimeters, zones, sections, lines, and pedestrian walkways.
- **Entrances & Gates**: Vehicular, pedestrian, formal gates, and perimeter access gaps.
- **Corridor Paths & Passages**: Primary pedestrian boulevards, covered alleys, service corridors, and stairwells.
- **Junctions & Branch Tracking**: Topological nodes (T-junctions, crossways, forks, bends, and dead ends) with top-down schematics, branch continuity tracking, and unmapped corridor alerts.
- **Landmarks & Facilities**: Mosques, churches, transformer banks, overhead tanks, restrooms, boreholes, waste bays, and security posts.
- **Businesses, Shops & Stalls**: Stalls, lockups, line attachments, table-tops, kiosks, open stands, and mobile carts with relative capture-heading positioning (Left/Right/Ahead).
- **Goods & Services (Offerings)**: Standardized offerings catalogue mapping without conflating category with inventory.
- **Revisits & Pending Verifications**: Flags for closed shops, missing trader details, unconfirmed names, or obscured numbers.
- **Field Issues & Hazards**: Blocked corridors, construction barriers, private gates, flood points, power hazards, and unsafe areas.
- **Missions & Team Coordination**: Field dispatch, team lead directives, fast handovers, and area reconciliations.

> **Operational Scope Clarification**: Market Mapper is **NOT** a consumer shopping application. It is an offline-first operational instrument designed for field mappers, team leads, and data supervisors. Verified data produced by Market Mapper feeds the broader Nigerian Market Navigation, Mapping & Commerce Intelligence Platform.

---

## 1. Core Operating Principles

> ### *«The system handles the complexity; the mapper sees simplicity.»*

Field mapping in crowded Nigerian markets is demanding. Mappers navigate tight alleyways, variable lighting, high ambient noise, intermittent cellular connectivity, and moving crowds.

Field mappers focus on:
1. **Walking** market corridors naturally without managing cumbersome software states.
2. **Observing** physical stall placards, landmarks, line markers, and gates.
3. **Engaging** with market traders respectfully to clarify business names and offerings.
4. **Capturing** points of interest and paths rapidly with minimal taps.
5. **Verifying** corridor connectivity and ground truth.

The application automatically handles coordinate provenance, movement filtering, stationary jitter suppression, offline outbox queuing, and schema normalization behind clean, daylight-optimized, high-contrast controls.

---

## 2. Approved Operational Vocabulary

To ensure consistency across the application, documentation, and field workflows, the following vocabulary is strictly enforced:

| Field Term | Meaning & Context | Avoid / Replaced Term |
|---|---|---|
| **Mapping Mission** | The operational dispatch order assigned to a field team. | *Survey, sweep, task, job* |
| **Mapper** | The field operator walking corridors and collecting data. | *Surveyor, agent, enumerator, user* |
| **Team Lead** | The operational supervisor overseeing a market mission. | *Manager, supervisor, admin (in field)* |
| **Assigned Area** | The designated market zone/polygon allocated to a mapper. | *Sector, sweep area, zone polygon* |
| **Mapping** | The active process of digitizing paths, stalls, and gates. | *Sweeping, surveying, auditing* |
| **Mapping Progress** | The percentage and count of mapped entities against targets. | *Sweep progress, survey completion* |
| **Path** | Continuous recorded pedestrian walkway or corridor geometry. | *Trail, track, sweep line, recorded trail* |
| **Business** | Commercial stall, shop, kiosk, or lockup trading in the market. | *Vendor, merchant, POI, target* |
| **Junction** | Topological node connecting two or more corridors. | *Intersection, waypoint, fork node* |
| **Handover** | Direct transfer of an area and continuation point between mappers. | *Shift handover, turnover, shift switch* |
| **Revisit** | Flagged business requiring follow-up inspection. | *Followup, re-survey, verification ticket* |
| **Field Issue** | Physical barrier, safety hazard, or mapping obstacle. | *Incident, blocker, survey ticket* |

*Exception*: If a physical market officially names a physical zone "Sector A" or "Zone B", that proper area name is preserved.

---

## 3. Current Project Status

| Phase | Description | Status |
|---|---|---|
| **Phase 1 — Foundation** | App architecture, design system, daylight theme tokens, touch targets (>=44px), local SQLite layer | **ACCEPTED / FROZEN** |
| **Phase 2 — Supabase Auth, Profiles, Roles & RLS Foundation** | Authentication workflows, RBAC (Mapper, Team Lead, Admin), Audit Logging, Supabase schema migration | **ACCEPTED / FROZEN FOR DEVELOPMENT** *(Live Supabase security validation required)* |
| **Phase 3 — Map Core, Location Engine & Path Recording** | Continuous path recording, stationary GPS jitter suppression, multi-segment tracking, coordinate recovery | **ACCEPTED / FROZEN FOR DEVELOPMENT** *(Physical-device/field GPS validation required)* |
| **Phase 4 — Business Capture, Goods/Services, Rapid Mapping & Media** | 4-step business entry, relative positioning (Left/Right/Ahead), photo staging, revisit queue | **ACCEPTED / FROZEN FOR DEVELOPMENT** *(Physical media/device validation required)* |
| **Phase 5 — Missions, Team Coordination, Notifications, Operational Chat & Role-Aware Field UX** | Mission assignment, Handover flows, field issue logging, operational chat, persistent notifications, Team Lead review | **ACCEPTED / FROZEN FOR DEVELOPMENT** |
| **Phase 5 Productionization — Junction Branch Tracking & Field Polish** | Topological branch tracking, unmapped branch badges, daylight theme completion, developer tool gating | **ACCEPTED & VERIFIED** |

*Phase 6 has **NOT** begun.*

---

## 4. Key Subsystems & Architecture

### A. Topological Junctions & Branch Tracking
- **Schematic Classifications**: Top-down visual schematics for 8 standard junction topologies (`T-Junction`, `Cross / 4-Way`, `Y-Junction / Fork`, `Irregular 3-Way`, `Multi-Way`, `Corner / Bend`, `Dead End`, and `Other`).
- **Branch Tracking Engine**: Each junction records outgoing corridor branches (`local_junction_branches`).
- **Unmapped Branch Alerting**: Junctions with pending branches render with a red notification badge on the map workspace indicating how many corridors remain unmapped.
- **Branch Blockage Management**: Mappers can flag branches as blocked (impassable stall, locked gate, or construction) directly from the map inspector without breaking junction topology.

### B. Map Workspace & Daylight Field Theme
- **Maximized Map Real Estate**: Map canvas occupies primary screen viewport with responsive collapsible bottom drawers and inspection sidebars.
- **Sunlight Readability (`src/theme/daylight.ts`)**:
  - High-contrast pure white (#ffffff) casing on dark lines to prevent visual blend under intense sunlight.
  - Distinctive entity colors: Recorded Paths (`#0f172a` core with `#ffffff` casing), Active Path (`#059669`), Junctions (`#d97706`), Businesses (`#059669` / `#7c3aed`), Field Issues (`#dc2626`).
  - Large touch targets (minimum 44px–48px) for accurate gloved or single-hand operation.
- **Development Tool Gating**: Simulators (Role switcher, device viewport preview, GPS diagnostics) are strictly gated behind `isDev` and never visible in production builds.

### C. Continuous Path Recording & Movement Filtering
- **Background Field Context**: Path recording runs persistently while the mapper concurrently enters businesses, logs landmarks, captures junctions, or reports field issues.
- **Stationary vs. Paused**:
  - Stopping to interview a trader or enter a business triggers the **Movement Detector**, which suppresses GPS jitter and accumulates exactly 0 meters.
  - Walking resumes distance calculation immediately.
  - Manual **Pause** allows taking breaks or exiting market boundaries intentionally.
- **Unfinished Path Recovery**: Active sessions write incrementally to SQLite. If the device reboots or the app is killed, the session is recovered with zero coordinate loss.

### D. Business Capture & Relative Positioning
- **4-Step Progressive Workflow**:
  1. *Business Identity*: Name, "No Visible Name" toggle, stall number, assigned area, line/row, floor level, stability.
  2. *Verification & Contact*: Verification state, optional trader contact (strictly optional, never blocking).
  3. *Offerings (Goods & Services)*: Standardized catalogue tags + custom offerings.
  4. *Photo & Finalization*: Storefront photo staging, relative side positioning, Save & Next (rapid mode), or Save & Finish.
- **Relative Positioning Engine**: Identifies stall side relative to the walking heading (`Left`, `Right`, `Ahead / End`, `Adjust on Map`, or `Unclear`), ensuring correct corridor sequences even when GPS drifts under metal roofs.

### E. Missions, Handovers & Team Dispatch
- **Assigned Areas**: Clear polygon and corridor boundaries assigned by Team Leads.
- **Recommended Starting Points**: Immutable briefing reference point preserved alongside the actual physical GPS start point.
- **Friction-Free Handover**: Mappers transfer an area and continuation junction in under 15 seconds with machine-calculated progress tallies.
- **Race Condition Protection**: If a Team Lead reassigns an area before a handover is accepted, the handover is automatically flagged `stale` to prevent stale supervisor overwrites.
- **Area Reconciliation**: Formal 6-stage lifecycle for mission completion, verification, and sign-off.

### F. Operational Chat & Authoritative Directives
- **Team Channels**: Mission-bound chat threads with role badges, offline caching, and search.
- **Rich Context Sharing**: Attach mapped business cards and field issue alerts directly into conversation bubbles.
- **Pinned Directives**: Authoritative Team Lead announcements pinned across chat headers and mission briefing screens.

---

## 5. Offline-First Architecture

```
+-------------------------------------------------------------------+
|                        React Native / Expo App                    |
|             (Daylight UI, Interactive Canvas, Capture Forms)      |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                  Expo SQLite Durable Field Database               |
|   (local_businesses, local_paths, local_junctions, outbox, etc.)  |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                     Sync & Outbox Queue Layer                     |
|           (Idempotent Mutations, Retry Loop, Conflict Handler)    |
+---------------------------------+---------------------------------+
                                  | (When Network Available)
                                  v
+-------------------------------------------------------------------+
|                    Supabase Cloud Infrastructure                  |
|    (PostgreSQL + PostGIS, Supabase Auth, Storage, Realtime)       |
+-------------------------------------------------------------------+
```

- **Local SQLite Persistence**: All operations write synchronously to on-device SQLite before acknowledging to the user.
- **Idempotent Outbox (`OutboxRepository`)**: Mutations queue with stable client UUIDs, status flags, and exponential retry backoff.
- **Media Upload Queue**: Photos are saved to local filesystem cache and queued in `local_media_upload_queue` until connected to high-bandwidth networks.

---

## 6. Technology Stack

| Layer | Technology | Repository Reference |
|---|---|---|
| **Framework** | React Native / Expo (React 19 / Vite Web Platform) | `app.json`, `package.json` |
| **Language** | TypeScript (Strict mode) | `tsconfig.json` |
| **Styling** | Tailwind CSS v4 | `src/index.css`, `@tailwindcss/vite` |
| **Local Database** | Expo SQLite (Storage Adapter for Web/Native) | `src/db/sqlite.ts`, `src/db/schema.ts` |
| **Cloud Backend** | Supabase (PostgreSQL, PostGIS, Auth, Storage) | `src/lib/supabase.ts`, `supabase/migrations` |
| **Icons** | Lucide React | `lucide-react` |
| **Animations** | Motion | `motion/react` |
| **Testing** | TSX, Node Test Runners | `package.json` |

---

## 7. Repository Structure

```
market-mapper/
├── .env.example                     # Reference environment variables
├── app.json                         # Expo configuration (permissions, plugins, schemes)
├── index.html                       # HTML entry point with metadata & viewport
├── metadata.json                    # Platform capabilities & permissions
├── package.json                     # Scripts, dependencies, and test definitions
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Vite build & Tailwind CSS plugin configuration
│
├── public/                          # Static assets and icons
│   └── favicon.svg
│
├── src/
│   ├── App.tsx                      # Root router & screen renderer
│   ├── main.tsx                     # DOM mount point
│   │
│   ├── config/                      # Environment flags & runtime detection
│   │   └── env.ts
│   │
│   ├── context/                     # Global state & operational context
│   │   ├── AppContext.tsx           # Offline mode, active mission, and sync states
│   │   └── AuthContext.tsx          # Supabase auth session, user profile, and roles
│   │
│   ├── db/                          # Offline-first SQLite database layer
│   │   ├── schema.ts                # DDL migrations (V1 through V6)
│   │   ├── sqlite.ts                # SQLite adapter, migrations runner, statistics
│   │   ├── index.ts                 # Central repository exports
│   │   ├── repositories/            # Domain-specific database repositories
│   │   │   ├── AnnouncementRepository.ts
│   │   │   ├── AuditRepository.ts
│   │   │   ├── BusinessRepository.ts
│   │   │   ├── CatalogueRepository.ts
│   │   │   ├── ChatRepository.ts
│   │   │   ├── FieldIssueRepository.ts
│   │   │   ├── HandoverRepository.ts
│   │   │   ├── MediaUploadRepository.ts
│   │   │   ├── MissionRepository.ts
│   │   │   ├── NotificationRepository.ts
│   │   │   ├── OutboxRepository.ts
│   │   │   ├── PathRepository.ts
│   │   │   ├── ReconciliationRepository.ts
│   │   │   └── RevisitRepository.ts
│   │   └── seed/                    # Initial seed data for offline preview
│   │       ├── catalogueSeed.ts
│   │       └── missionSeed.ts
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── usePathRecording.ts      # Continuous path recording & movement detector
│   │   └── useSync.ts               # Cloud sync & outbox processing
│   │
│   ├── lib/                         # Utilities and integration clients
│   │   ├── supabase.ts              # Singleton Supabase client & storage adapter
│   │   ├── auth/                    # Auth helper functions
│   │   ├── location/                # Movement detector & geometry calculations
│   │   ├── business/                # Relative positioning & stall sequencing
│   │   └── media/                   # Photo compression & storage staging
│   │
│   ├── theme/                       # Daylight palette & touch target tokens
│   │   └── daylight.ts
│   │
│   ├── types/                       # Domain models, entities, and enums
│   │   ├── domain.ts                # Complete spatial, commercial & mission models
│   │   └── index.ts                 # Type exports
│   │
│   ├── components/                  # Reusable UI & domain components
│   │   ├── ui/                      # Base buttons, cards, badges, modals
│   │   ├── layout/                  # Responsive shell, tablet sidebar, bottom nav
│   │   ├── map/                     # MapWorkspace, HUD, path review, layers
│   │   ├── capture/                 # 4-step BusinessCaptureModal
│   │   └── mapping/                 # JunctionSchematic, JunctionTypePickerModal
│   │
│   ├── screens/                     # Application screens
│   │   ├── auth/                    # Login, Register, Forgot Password screens
│   │   └── main/                    # Operational field screens
│   │       ├── HomeScreen.tsx       # Role-aware dashboard & quick actions
│   │       ├── MapScreen.tsx        # Map workspace, path recorder, business capture
│   │       ├── MissionsScreen.tsx   # Mission briefings, handovers, reconciliation
│   │       ├── ChatScreen.tsx       # Mission chat & directive announcements
│   │       ├── NotificationsScreen.tsx # Actionable notification feed
│   │       ├── RevisitsScreen.tsx   # Revisit & verification queue
│   │       ├── OfflineDataScreen.tsx# Local SQLite counts, sync logs, outbox status
│   │       ├── AdminScreen.tsx      # User management & audit trail (Admin only)
│   │       ├── FieldGuideScreen.tsx # Standardized mapping definitions & SOPs
│   │       └── ProfileScreen.tsx    # User profile & credentials
│   │
│   └── test/                        # Automated test suites & verification matrices
│       ├── movementAndGeometry.test.ts
│       ├── phase3Matrix.test.ts
│       ├── phase4Matrix.test.ts
│       ├── phase5Matrix.test.ts
│       ├── phase5Part2Matrix.test.ts
│       ├── phase5Part3Matrix.test.ts
│       ├── fieldWorkflowCorrection.test.ts
│       └── securityMatrix.test.ts
│
└── supabase/
    └── migrations/                  # Cloud PostgreSQL + PostGIS migrations
        └── 20260910000000_phase2_auth_profiles_roles_rls.sql
```

---

## 8. Installation & Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** (or `pnpm` / `bun`)
- **Android Studio** & **Android SDK** (for local native Android builds)
- **Java Development Kit (JDK)**: OpenJDK 17

### Clone & Install
```bash
# Clone repository
git clone <YOUR_REPOSITORY_URL>
cd market-mapper

# Install dependencies
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure the environment variables:
```env
# Google Maps API Key (for Android native build)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Supabase Client Configuration (Public/Anon ONLY)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here

# Runtime Environment
EXPO_PUBLIC_ENV=development
```

> ⚠️ **CRITICAL SECURITY DIRECTIVE**: Never put the `SUPABASE_SERVICE_ROLE_KEY` or database credentials in client-side code, `.env`, or mobile application binaries.

---

## 9. Available Scripts & Testing

All commands are defined in `package.json`:

```bash
# Start development server (binds to 0.0.0.0:3000)
npm run dev

# Build production assets for deployment
npm run build

# Preview production build locally
npm run preview

# Clean build artifacts
npm run clean

# Run TypeScript type verification
npm run lint

# Run all verification test suites (64+ invariant checks)
npm test

# Run individual targeted test suites:
npm run test:movement     # Movement detector & geometry calculations
npm run test:phase3       # Path recording & location engine matrix
npm run test:phase4       # Business capture & relative positioning matrix
npm run test:phase5       # Mission, coordination & notification matrix
npm run test:phase5part2  # Exhaustive Phase 5 Part 2 verification matrix
npm run test:phase5part3  # Invariant acceptance matrix
npm run test:workflow     # Concurrent field workflows (Path + Business entry)
npm run test:security     # Role authorization & security simulation
```

---

## 10. Local Native Android Build

Market Mapper supports **local native builds** without requiring cloud build credits.

### 1. Generate Android Native Project
```bash
npx expo prebuild
```
*Note: Do not run `expo prebuild --clean` unless you intend to discard custom changes in the `android/` directory.*

### 2. Run on Connected Android Device or Emulator
```bash
npx expo run:android
```
Alternatively, open the generated `android/` directory in **Android Studio** and build/run via Gradle.

---

## 11. Supabase Cloud Configuration

To connect Market Mapper to a live Supabase project:

1. Create a project in [Supabase](https://supabase.com).
2. Enable the **PostGIS** extension in Supabase SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Execute the migration file located at:
   `supabase/migrations/20260910000000_phase2_auth_profiles_roles_rls.sql`
4. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.
5. **Initial Admin Provisioning**: To assign the first Admin user safely, execute the following SQL in the Supabase SQL editor after creating your user account:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'your-admin-email@domain.com';
   ```

---

## 12. Local SQLite Migrations Reference

The SQLite durable persistence layer tracks and applies migrations automatically on startup (`src/db/schema.ts`):

- **V1 (`DDL_V1`)**: Core profiles, teams, markets, areas, places, paths, path points, businesses, offerings, and sync queues.
- **V2 (`DDL_V2`)**: Revisit tracking tables and verification state flags.
- **V3 (`DDL_V3`)**: Spatial indexing and path segment optimization.
- **V4 (`DDL_V4`)**: Mission dispatch, area assignments, handovers, field issues, reconciliations, chat messages, notifications, announcements, and audit logs.
- **V5 (`DDL_V5`)**: Junction topological types and business relative positioning coordinates.
- **V6 (`DDL_V6`)**: Junction branch tracking (`local_junction_branches`) and branch status indicators.

---

## 13. Physical Field Validation Checklist

The following checks must be completed during on-ground market validation before operational rollout:

- [ ] **Stationary GPS Drift**: Stand still inside a market stall for 5 minutes; confirm 0 meters added to active path distance.
- [ ] **Corridor Walking Distance**: Walk a measured 100-meter straight corridor; verify recorded path length matches within ±5m.
- [ ] **Walk-Stop-Walk Continuity**: Walk 20m, stop for 30s, walk 30m; confirm single continuous path geometry.
- [ ] **Concurrent Business Capture**: Add a business while a path is actively recording; confirm path recording continues uninterrupted upon saving.
- [ ] **Rapid Mapping (Save & Next)**: Log 3 consecutive stalls in rapid succession; confirm sequence order and coordinate tags.
- [ ] **Junction Geometry & Branch Capture**: Record a T-junction and Y-fork; verify schematic classification, branch tracking, and unmapped corridor alerts.
- [ ] **Field Issue Flagging**: Flag an obstructed walkway while recording a path; verify issue marker appears on map without stopping path.
- [ ] **Covered Metal Canopy Behavior**: Walk under a dense zinc roof section; test location recovery and degraded accuracy indicator.
- [ ] **Background Location Recording**: Lock device screen while walking a 200m corridor; unlock and verify path points were logged.
- [ ] **App Interruption / Crash Recovery**: Force kill the application during an active path recording; reopen and confirm session recovery.
- [ ] **Storefront Photo Capture**: Attach camera photo to business entry; verify offline thumbnail rendering and staging in upload queue.
- [ ] **Offline Field Session**: Complete a 30-minute survey in full Airplane mode; verify all records save to SQLite.
- [ ] **Reconnect & Outbox Sync**: Connect to network; confirm outbox drains successfully with zero duplication.
- [ ] **Two-Mapper Handover**: Mapper A initiates handover to Mapper B; Mapper B accepts on separate device; verify area assignment updates.
- [ ] **Sunlight Readability**: Test screen in direct midday sunlight in open market courtyard; confirm high-contrast daylight palette legibility.

---

## 14. Data Principles & Mapping Guidelines

1. **Category Does Not Dictate Inventory**: Assigning a shop to "Fashion" does not assume specific fabrics or brands. Mappers record verified observations, not assumptions.
2. **Many-to-Many Relationships**: One business offers many goods/services; one product/service is offered by multiple businesses.
3. **Unknown/Unconfirmed is Valid**: If a shop placard is missing or the business name is unconfirmed, use "No Visible Name" or flag for revisit. Never guess or fabricate trader names.
4. **Coordinate Provenance**: Every entity retains its original capture GPS, calculation method, and map adjustment record.
5. **No Fabricated Corridors**: Paths represent observed walking trajectories. Unwalked corridors must never be interpolated or guessed.
6. **Trader Privacy**: Personal trader phone numbers or names are strictly optional. Field mappers must never pressure traders for private information.
7. **No Pricing or Live Stock**: Market Mapper V1 is a structural and commercial discovery instrument; it does not track real-time stock levels or fluctuating prices.

---

## 15. Operational Safety & Maintenance

- ⚠️ **DO NOT casually clear application storage**: Local SQLite contains un-synced field work and photos. Clearing browser or app storage will permanently destroy uncommitted field records.
- ⚠️ **DO NOT automatically discard unfinished paths**: The application is built to recover active sessions after crashes or device restarts.
- ⚠️ **Database Maintenance Utility**: The "Reset Local Database" tool in the *Offline Data* screen is strictly for **DEVELOPMENT AND TESTING ONLY**. Never execute a reset on an active field mapper device.

---

## License & Operational Usage

Market Mapper is an internal operational instrument developed for authorized field mapping crews. All collected data, spatial schemas, and coordinate models are strictly governed by project data security and privacy guidelines.

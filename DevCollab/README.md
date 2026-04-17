# DevCollab

**A real-time collaboration platform built for developer teams** — group servers, text channels, threaded messaging, code snippet sharing with syntax highlighting, AI-powered developer tools, role-based access control, and live presence tracking.

---

## Overview

DevCollab is a full-stack web application where developers can create or join servers, organize conversations into channels, share and discuss code, and use built-in AI tools for tasks like standups, code reviews, and meeting notes — without leaving the chat interface.

The project was built end-to-end: custom JWT authentication, a Spring WebSocket (STOMP) real-time layer with HTTP REST fallbacks, a 3-tier server permission system, and an AI service layer that works both with the Groq API and a fully offline rule-based fallback.

---

## Features

### Fully Implemented

**Authentication**
- Register and login with username/email/password (BCrypt hashing)
- JWT-based stateless authentication (24-hour expiry)
- Token restored from `localStorage` on page load with a fresh `/me` profile sync
- Custom 401 interceptor that checks token expiry before triggering logout, preventing false-positive logouts from Spring Boot's error dispatch

**Servers**
- Create a server — automatically generates an 8-character invite code and a `#general` channel
- Join a server via invite code (duplicate membership guard enforced)
- Update server name, description, and icon (owner or admin)
- Delete a server (owner only)
- Leave a server (owner is blocked; must transfer or delete)
- Copyable invite link in the channel header

**Channels**
- Create, rename, and delete text channels (owner/admin only)
- Private channels — invisible and inaccessible to MEMBER-role users at 3 enforcement layers: REST filter, WebSocket subscribe interceptor, and message history API
- Lock icon to visually distinguish private channels

**Real-Time Messaging**
- Messages delivered via WebSocket (STOMP over SockJS) with automatic HTTP REST fallback when disconnected
- Reconnect logic with 5-second retry; "Reconnecting…" status badge shown during outage
- Edit and delete your own messages (both WebSocket and REST paths supported)
- Client-side deduplication prevents double-render when both WS broadcast and REST confirmation arrive
- Typing indicators broadcast to all channel members in real time

**Threaded Replies**
- Reply to any message; replies are stored with a `parentMessage` FK and displayed with a visual quote bar
- Reply author is notified automatically

**@Mention Notifications**
- `@username` mentions detected via regex on every message send
- Matched users receive a `MENTION` notification via both WebSocket push and persistent DB record
- Reply authors receive a `REPLY` notification

**Notifications Panel**
- Full notifications list ordered by recency
- Mark individual or all notifications as read
- Unread count badge on the bell icon

**Code Snippets**
- Toggle "Code" mode in the chat input
- Select from 13 languages: JavaScript, Python, Java, TypeScript, C, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin
- Snippets stored as a dedicated `CodeSnippet` entity linked to the message
- Rendered with Prism.js syntax highlighting
- Per-snippet AI toolbar: **Explain**, **Suggest Improvements**, **Code Review**

**AI Tools**
- 8 AI-powered endpoints integrated with the Groq API (`llama3-8b-8192`)
- 7 accessible directly from the chat UI:
  - Daily Standup Generator
  - Chat Summarizer
  - Meeting Notes Extractor
  - Bug Triage
  - Explain Code (per snippet)
  - Suggest Improvements (per snippet)
  - Code Review (per snippet)
- Full local rule-based fallback — works offline without an API key, using regex pattern matching, keyword extraction, and contributor name detection

**Markdown Rendering in Chat**
- All chat messages support Markdown formatting: `**bold**`, `_italic_`, `` `inline code` ``, `# headings`, `- lists`, `1. numbered lists`, `- [ ] checkboxes`
- Rendered with a zero-dependency inline parser (no external library required)
- Same renderer used for AI modal output

**Polls**
- Create polls with a custom question and 2–8 options directly in any channel
- Vote on options; clicking your voted option again toggles the vote off; switching options auto-removes the previous vote
- Real-time vote count updates via WebSocket (`/topic/channels/{id}/polls/votes`)
- Animated percentage bars show live vote distribution
- Poll creators, OWNER, and ADMIN roles can delete polls
- REST API: `GET/POST /api/channels/{channelId}/polls`, `POST /api/polls/{id}/vote`, `DELETE /api/polls/{id}`

**Role-Based Access Control (RBAC)**
- 3-tier server roles: OWNER, ADMIN, MEMBER
- Enforced across all controllers and the WebSocket interceptor
- OWNER: full control — delete server, kick/promote anyone, manage all channels
- ADMIN: create/manage/delete channels, kick MEMBERs, update server details
- MEMBER: read and message channels they have access to
- `canKick`, `canChangeRole`, `isSelf` flags computed server-side per profile fetch

**User Profiles**
- Edit bio, programming languages, GitHub, LinkedIn, portfolio URL, theme preference
- Avatar upload (multipart, up to 10 MB) — saved to `/uploads/avatars/`, served as static files
- Avatar also accepted via direct URL input
- Own-profile-only enforcement on all profile mutations

**Member Profile Modal**
- Click any username or avatar to open their profile
- Shows role badge, join date, bio, programming languages, social links
- 5 custom JPQL queries compute: total messages in server, total in current channel, replies posted, threads started, per-channel activity breakdown
- Kick and role-change actions rendered conditionally based on caller's permissions

**Real-Time Presence**
- STOMP CONNECT event sets user ONLINE; DISCONNECT sets OFFLINE
- Status broadcast to `/topic/presence`; member list updates in real time
- Members separated into Online and Offline sections with presence dots

**Global Search**
- Search across users (username, programming languages), servers (name, description), and channels (name) from a keyboard-accessible overlay
- Results organized in 3 sections; clicking a server or channel navigates directly

**Workspace Analytics**
- 3 live metrics per server: member count, channel count, messages in the past 7 days
- All backed by real database queries

**Invite Code System**
- UUID-based 8-character code auto-generated on server creation
- One-click copy from the channel header
- Join flow with duplicate membership guard

---

### In Progress / Partially Implemented

| Feature | Status |
|---|---|
| Emoji reactions | Entity, repository, and WebSocket broadcast implemented — persistence to DB not yet connected (reactions reset on page reload) |
| Per-day activity chart | Workspace analytics stat cards are real; the 7-bar activity chart uses placeholder proportions |
| Theme preference | Stored in DB and editable in the profile page — CSS application not yet wired |
| Global search scoping | Functional but searches all records, not scoped to the caller's server memberships |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router v7 |
| UI | Lucide React (icons), Prism.js (syntax highlighting) |
| HTTP client | Axios 1.x |
| WebSocket (client) | @stomp/stompjs 7.x, sockjs-client 1.x |
| Backend | Spring Boot 3.2.4, Java 17 |
| Security | Spring Security (stateless), JWT (jjwt 0.11.5), BCrypt |
| Real-time | Spring WebSocket, STOMP, SockJS |
| ORM / Database | Spring Data JPA, Hibernate, PostgreSQL 15 |
| AI | Groq API (`llama3-8b-8192`), local rule-based fallback |
| Build tool (backend) | Gradle 8 |
| Build tool (frontend) | Vite 8 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│  AuthContext  │  WebSocketContext  │  UserProfileContext          │
│  Pages: Login, Register                                          │
│  Components: Sidebar, ServerView, ChannelList, MessageList,      │
│              ChatInput, NotificationsPanel, ServerMembersList,   │
│              UserProfileModal, WorkspaceAnalytics, GlobalSearch  │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTP (Axios) + WebSocket (STOMP/SockJS)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Spring Boot (port 9090)                     │
│                                                                  │
│  JwtAuthenticationFilter  →  Spring Security filter chain        │
│  WebSocketAuthInterceptor →  STOMP CONNECT + SUBSCRIBE gates     │
│                                                                  │
│  Controllers:                                                    │
│    AuthController      /api/auth/**                              │
│    ServerController    /api/servers/**                           │
│    ChannelController   /api/servers/{id}/channels/**             │
│    MessageController   /api/channels | /api/messages             │
│    ChatController      @MessageMapping (WebSocket)               │
│    NotificationController /api/notifications/**                  │
│    SearchController    /api/search                               │
│    UserController      /api/users/**                             │
│    AiController        /api/ai/**                                │
│                                                                  │
│  Services: AiService (Groq API + local fallback)                 │
│  Repositories: 10 Spring Data JPA repositories                   │
└────────────────────────┬────────────────────────────────────────┘
                         │  JDBC
                         ▼
              PostgreSQL (localhost:5432/devcollab)
              11 tables, DDL auto-managed by Hibernate
```

### Authentication Flow

1. User POSTs credentials to `/api/auth/login`
2. Backend validates, returns signed JWT (HS256, 256-bit secret, 24hr expiry)
3. Frontend stores token in `localStorage`, adds it as `Authorization: Bearer <token>` on every Axios request
4. On app load, token is restored and `/api/auth/me` is called to hydrate fresh user data
5. A global Axios interceptor checks `jwt.exp` client-side before triggering logout on any 401 — expired tokens log out, non-expired 401s surface the error normally

### WebSocket Flow

1. After login, `WebSocketContext` connects to `/ws` via SockJS, passing the JWT in STOMP connect headers
2. `WebSocketAuthInterceptor` validates the JWT on CONNECT; validates MEMBER role on SUBSCRIBE to private-channel topics
3. Chat messages are sent to `/app/chat.sendMessage/{channelId}` and broadcast to all subscribers of `/topic/channels/{channelId}`
4. Each channel has 5 subscribed topics: messages, edits, deletes, typing, reactions
5. On CONNECT, `WebSocketEventListener` sets the user ONLINE and broadcasts to `/topic/presence`; on DISCONNECT, sets OFFLINE

### Messaging Flow (with fallback)

```
User sends message
      │
      ├─ WebSocket connected? ──YES──► STOMP /app/chat.sendMessage/{channelId}
      │                                      │
      │                               ChatController saves to DB
      │                               Broadcasts to /topic/channels/{channelId}
      │                               Generates @mention / REPLY notifications
      │
      └─ WebSocket disconnected? ──► POST /api/channels/{channelId}/messages
                                          │
                                    MessageController saves to DB
                                    Returns saved message via HTTP
```

### Role Enforcement

Every permission check is enforced server-side. The frontend reads the computed `canKick`, `canChangeRole` flags and the calling user's `ServerRole` from the `/my-role` endpoint to show or hide controls — no permission logic lives only in the client.

---

## Key Workflows

### Creating a Server
1. Click the "+" button in the sidebar
2. Enter server name and description
3. Server is created with an auto-generated 8-character invite code
4. A `#general` channel is automatically created
5. The creator is saved as OWNER

### Inviting Members
1. Open any channel — the server name header shows the invite code
2. Click the copy icon; share the code
3. New users enter the code in "Join Server" — duplicate membership is blocked

### Messaging
- Type in the chat input and press Enter (Shift+Enter for newlines)
- Type `/code` mode or click the code icon to switch to snippet mode with language selection
- Click Reply on any message to start a thread; an @mention triggers a notification to that user

### Using AI Tools
- Click the wand icon in the message input area to access: Standup, Summarize Chat, Meeting Notes, Bug Triage
- For code snippets: each snippet block has Explain / Suggest / Review buttons directly on it
- Results appear in a modal with markdown rendering (headers, bullets, bold, code spans, checkboxes)

### Managing Members
- Click any avatar or username to open their profile modal
- Profile shows engagement stats (messages, replies, threads, channel breakdown)
- Owners and admins see role-change and kick actions based on their permissions

---

## Screens / Modules

| Screen / Module | Description |
|---|---|
| Login / Register | Auth pages with form validation and error display |
| Sidebar | Server icon list, search, notifications bell (unread badge), user avatar, logout |
| Server View | Channel list, active channel, member list — loads on server select |
| Channel List | Shows channels; locks private channels for MEMBER role; displays invite code |
| Message List | Real-time chat, code blocks with syntax highlighting, AI toolbar, reply threads, typing indicators |
| Chat Input | Text mode, code snippet mode (13 languages), reply/edit banners, auto-resize |
| Member List | Online/Offline sections, real-time presence, click to open profile modal |
| Notifications Panel | Dropdown panel with unread indicator, individual and bulk mark-as-read |
| Global Search | Keyboard-accessible overlay — searches users, servers, channels |
| User Profile | Edit profile, upload avatar, manage social links |
| Member Profile Modal | Per-member stats, role badge, social links, admin actions |
| Workspace Analytics | Member count, channel count, 7-day message count |

---

## API Summary

```
Auth           POST /api/auth/register        POST /api/auth/login        GET /api/auth/me

Servers        GET/POST /api/servers
               GET/PUT/DELETE /api/servers/{id}
               POST /api/servers/{inviteCode}/join
               DELETE /api/servers/{id}/leave
               GET /api/servers/{id}/analytics
               GET /api/servers/{id}/members
               GET /api/servers/{id}/my-role
               GET /api/servers/{id}/members/{userId}/profile
               PATCH /api/servers/{id}/members/{userId}/role
               DELETE /api/servers/{id}/members/{userId}

Channels       GET/POST /api/servers/{id}/channels
               PUT/DELETE /api/servers/{id}/channels/{channelId}

Messages       GET /api/channels/{channelId}/messages   (paginated)
               POST /api/channels/{channelId}/messages
               PUT/DELETE /api/messages/{messageId}
               GET /api/messages/search?keyword=

Notifications  GET /api/notifications
               PUT /api/notifications/{id}/read
               PUT /api/notifications/readAll

Users          GET/PUT /api/users/{id}
               POST /api/users/{id}/avatar

Search         GET /api/search?query=

AI             POST /api/ai/explain          POST /api/ai/suggest
               POST /api/ai/code-review      POST /api/ai/summarize
               POST /api/ai/standup          POST /api/ai/bug-triage
               POST /api/ai/meeting-notes    POST /api/ai/smart-search

WebSocket      /app/chat.sendMessage/{channelId}
               /app/chat.editMessage/{channelId}
               /app/chat.deleteMessage/{channelId}
               /app/chat.typing/{channelId}
               /app/chat.react/{channelId}
```

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+ and npm
- PostgreSQL 14+
- (Optional) A [Groq API key](https://console.groq.com) for live AI responses

### 1. Clone the repository

```bash
git clone https://github.com/your-username/devcollab.git
cd devcollab
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE devcollab;
```

Hibernate will auto-create and manage all tables on first startup (`ddl-auto: update`). No migration files needed.

### 3. Backend Setup

```bash
cd backend
```

Create a `.env` file or export the following environment variables:

```bash
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
export JWT_SECRET=your_256bit_hex_secret   # See note below
export GROQ_API_KEY=your_groq_api_key      # Optional — app works without it
```

> **JWT_SECRET note:** Must be a 256-bit hex string (64 hex characters). Generate one with:
> `openssl rand -hex 32`
> If not set, the default from `application.yml` is used — fine for local dev, not for production.

Start the backend:

```bash
./gradlew bootRun
```

Backend runs at **http://localhost:9090**

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5180**

### 5. File Uploads

The backend writes avatar uploads to `./uploads/avatars/` relative to where the JAR is run. This directory is created automatically on first upload. Static file serving for `/uploads/**` is open (no auth required) so avatars load directly in the browser.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_USERNAME` | No | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | No | `postgres` | PostgreSQL password |
| `JWT_SECRET` | No* | 256-bit dev default | HS256 signing secret — **change this in any non-local environment** |
| `GROQ_API_KEY` | No | _(empty)_ | Groq API key for `llama3-8b-8192`. If absent, all AI endpoints use the local rule-based fallback |

*The default JWT secret in `application.yml` is sufficient for local development. Do not use it in production.

The database URL is hardcoded in `application.yml` as `jdbc:postgresql://localhost:5432/devcollab`. Override it by setting `SPRING_DATASOURCE_URL` if needed.

---

## Folder Structure

```
devcollab/
├── backend/
│   ├── src/main/java/com/devcollab/backend/
│   │   ├── controller/         # 8 REST controllers + 1 WebSocket controller
│   │   ├── entity/             # 11 JPA entities + 3 enums
│   │   ├── repository/         # 10 Spring Data JPA repositories
│   │   ├── service/            # AiService (Groq API + local fallback)
│   │   ├── security/           # WebSecurityConfig, JwtUtils, JwtAuthenticationFilter
│   │   │   └── websocket/      # WebSocketConfig, WebSocketAuthInterceptor, WebSocketEventListener
│   │   └── dto/                # Request/response DTOs
│   └── src/main/resources/
│       └── application.yml
│
├── frontend/
│   └── src/
│       ├── pages/              # Login, Register
│       ├── components/         # 11 components (MessageList, ChannelList, ChatInput, ...)
│       ├── context/            # AuthContext, WebSocketContext, UserProfileContext
│       └── App.jsx             # Route definitions
│
└── uploads/
    └── avatars/                # Uploaded user avatars (served as static files)
```

---

## Security & Permissions

### JWT Authentication
- All endpoints except `/api/auth/login`, `/api/auth/register`, `/ws/**`, `/uploads/**`, and `/error` require a valid Bearer token
- Tokens are validated in `JwtAuthenticationFilter` (Spring `OncePerRequestFilter`) on every request
- The frontend decodes the JWT payload client-side to check `exp` before acting on a 401, preventing false-positive logouts

### Server Role System (RBAC)

| Action | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| Delete server | ✅ | ❌ | ❌ |
| Update server | ✅ | ✅ | ❌ |
| Create / delete channels | ✅ | ✅ | ❌ |
| Access private channels | ✅ | ✅ | ❌ |
| Kick members | ✅ (anyone) | ✅ (MEMBER only) | ❌ |
| Change member role | ✅ | ❌ | ❌ |
| Leave server | ❌ (must delete) | ✅ | ✅ |
| Send messages | ✅ | ✅ | ✅ |

### Private Channel Enforcement (3 Layers)
1. **ChannelController** filters private channels out of the channel list response for MEMBER users
2. **WebSocketAuthInterceptor** blocks STOMP SUBSCRIBE frames to private channel topics for MEMBER users
3. **MessageController** validates the caller's role before returning message history for private channels

---

## Future Improvements

Based on infrastructure already present in the codebase:

- **Persist emoji reactions** — `Reaction` entity, repository, and WebSocket broadcast are fully built; the ChatController needs one line to save the reaction before broadcasting
- **Per-day analytics** — Replace placeholder chart proportions with a real `GROUP BY DATE` query
- **Apply theme preference** — `themePreference` is stored in the DB and sent by the profile editor; the frontend needs to read it from user context and toggle a CSS class
- **Saved messages** — Entity and repository with queries exist; needs a controller and UI to expose the feature
- **Scope global search to memberships** — SearchController currently uses `findAll()` across all DB records; filter results to the caller's servers/channels
- **Account management** — Password change and account deletion endpoints

---

## Why This Project

DevCollab covers a wide surface area of backend and frontend engineering in a single codebase:

- A production-style JWT + Spring Security setup with stateless sessions and a custom WS auth interceptor
- Dual-transport real-time messaging (WebSocket primary, REST fallback) with client-side resilience logic
- A proper permission model enforced server-side, not just in the UI — consistent across HTTP and WebSocket
- An AI service layer designed with an offline fallback, so it works in any environment
- Full user engagement stats backed by custom JPQL queries, not hardcoded mock data
- End-to-end file upload handling from multipart request through filesystem storage to static serving

The partially implemented features (emoji persistence, theme application, per-day analytics) are infrastructure-complete — the gaps are deliberate scope limits, not architectural dead ends.

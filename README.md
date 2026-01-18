# LocalAgent-LLM

LocalAgent-LLM is a full-stack TypeScript application designed as a powerful local AI assistant. It enables you to chat with a Large Language Model (LLM), execute code, manage files, and leverage custom tools. All from a clean, tabbed web interface.

<img width="1325" height="720" alt="01" src="https://github.com/user-attachments/assets/f903c9d6-66b0-4137-a52e-21c173caaf46" />

<a href="https://github.com/jaycrav3ns/LocalAgent-LLM/tree/main/screenshots">Additional screenshots</a> | <a href="https://github.com/jaycrav3ns/LocalAgent-LLM/wiki">Detailed overview</a>

---

## 🚀 Features

- **Next-gen UI**: Built with React, Vite, TailwindCSS, shadcn/ui, and Radix primitives for a beautiful, accessible, and modular interface.
- **Multi-Workspace Project Management**: Organize, browse, and control files and codebases.
- **Command/Chat/Memory Tools**: Integrated agent command log, memory, and quick commands.
- **Live Output**: Real-time rendering of LLM and system responses.
- **LLM Model Switching**: Easily switch between supported models (Ollama, Gemini and OpenRouter API Keys).
- **Authentication**: Local/passport or OIDC support (WIP).
- **Database**: PostgreSQL via Drizzle ORM, with schema in `/shared/schema.ts`.
- **Type-safe Sharing**: Shared types and schema between client and server.
- **API-first**: RESTful Express API with session management.
- **Component Aliasing**: Clean imports via Vite + tsconfig + shadcn/ui config.

---

## 🛠️ Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: TailwindCSS, shadcn/ui, Radix UI, framer-motion, Lucide, FontAwesome
- **Backend**: Express, TypeScript, REST API, ws (WebSockets)
- **Database**: PostgreSQL, Drizzle ORM, drizzle-kit migrations
- **Auth**: passport, passport-local
- **Other**: axios, zod, TanStack Query, embla-carousel, recharts, etc.

---

## 🗂️ Monorepo Structure

```
.
├── client/          # React frontend (Vite, Tailwind, shadcn/ui)
│   └── src/
├── server/          # Express backend (TypeScript)
├── shared/          # Shared types & DB schema (TypeScript)
├── drizzle/         # Drizzle ORM migration output
├── dist/            # Build output (production)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── ...etc
```

---

## ⚡️ Getting Started

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Configure DB & Environment**

- <a href="https://github.com/jaycrav3ns/LocalAgent-LLM/wiki/Configuring-PostgreSQL">How to setup PostgreSQL</a>

- Edit the `.env` for your database, LLM endpoints, API keys etc.

### 3. **Run Migrations**

```bash
npm run migrate
```

### 4. **Start Development**

Runs both backend and frontend using `concurrently` + `nodemon`:

```bash
npm run dev
```

- Backend: [http://localhost:5000](http://localhost:5000)
- Frontend: [http://localhost:5173](http://localhost:5173) (proxied API)

### 5. **Build for Production**

```bash
npm run build
npm start
```

---

## 🧩 Component Aliases

Import paths are aliased for DX:

- `@/components`, `@/lib`, `@/hooks`, etc. → `client/src/...`
- `@shared/*` → `shared/*`

Configured in `tsconfig.json`, `vite.config.ts`, and `components.json`.

---

## 🎨 Styling & UI

- **Tailwind**: Uses custom color variables for themes/dark mode.
- **shadcn/ui**: Modern UI kit (`components.json`).
- **Radix UI**: Accessible primitives.

---

## 🗃️ Database & ORM

- **Drizzle ORM**: Schema in `shared/schema.ts`
- **Migrations**: `drizzle-kit` CLI (`npm run migrate`)
- **Config**: See `drizzle.config.ts`

---

## 🏗️ Scripts

| Script            | Purpose                            |
|-------------------|------------------------------------|
| `dev`             | Run client & server in parallel    |
| `dev:client`      | Frontend only (Vite)              |
| `dev:server`      | Backend only (Nodemon+TSX)        |
| `build`           | Build frontend & bundle backend    |
| `start`           | Run production server              |
| `migrate`         | Run DB migrations                  |
| `check`           | TypeScript check                   |

---

## 🧑‍💻 Contributing

1. Fork & clone
2. `npm install`
3. PRs welcome!

---

## 📂 Related Configs

- **postcss.config.js**: Tailwind + autoprefixer
- **tailwind.config.ts**: Theme/colors, plugin setup
- **components.json**: shadcn/ui config
- **vite.config.ts**: Vite + aliases, proxy, etc.
- **tsconfig.json**: Paths, strictness, etc.
- **drizzle.config.ts**: DB config

---

## 🛡️ License

MIT

---

## 💬 Questions?

Open an [issue](https://github.com/jaycrav3ns/LocalAgent-LLM/issues) or [discussions](https://github.com/jaycrav3ns/LocalAgent-LLM/discussions).

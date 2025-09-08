# LocalAgent-LLM

LocalAgent-LLM is a full-stack TypeScript application designed as a powerful local AI assistant. It enables you to chat with a Large Language Model (LLM), execute code, manage files, and leverage custom tools—all from a clean, tabbed web interface.

<img width="1316" height="708" alt="00" src="https://github.com/user-attachments/assets/ffa0fce1-d438-4e0e-a291-6b87fc07b577" />

<a href="https://github.com/jaycrav3ns/LocalAgent-LLM/tree/main/screenshots">Additional screenshots here</a>

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Key Components](#key-components)
- [Getting Started](#getting-started)
- [Tool System Explained](#tool-system-explained)
- [Directory Structure](#directory-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Modern React SPA Frontend**
- **Node.js/Express Backend**
- **Integrated PostgreSQL database (via Drizzle ORM)**
- **Ollama LLM integration for local AI chat**
- **Tool system for code execution, file management, OCR, and more**
- **Secure authentication and user management**
- **Tabbed interface for Chat, History, Workspace, Commands, and Tools**

Detailed overview: <a href="https://github.com/jaycrav3ns/LocalAgent-LLM/wiki">HERE</a>

---

## Architecture

LocalAgent-LLM is composed of three main parts:

1. **Frontend (`client/`)**  
   Built with React and Vite for fast development and production-ready builds.

2. **Backend**  
   Node.js server handling API requests, authentication, database, and AI/tool orchestration.

3. **Shared Logic (`shared/`)**  
   TypeScript code shared between frontend and backend, including database schema definitions.

---

## How It Works

- **Frontend:**  
  The React SPA (in `client/`) communicates with the backend via REST API. Routing is handled by `wouter` and authentication via a custom hook. TanStack Query manages async data fetching and caching for a responsive UI.

- **Backend:**  
  Exposes REST endpoints for authentication, chat, command execution, and workspace management. Uses Drizzle ORM for safe, type-checked database operations on PostgreSQL.

- **AI Agent:**  
  The backend proxies requests to a locally running Ollama instance (`OLLAMA_URL` in `.env`). The agent can "think," use external tools, and incorporate outputs from shell scripts, OCR, and more into its chat responses.

---

## Key Components

### Tool System

The heart of LocalAgent-LLM is its extensible tool system:

- **Tool Manifest (`shared/toolTypes.ts`):**  
  Defines the structure of each tool (name, description, input/output schemas, handler).

- **Tool Implementations (`server/tools/*`):**  
  Actual logic for tools like filesystem access, OCR, and custom scripts.

- **Tool Registry (`server/tools/registry.ts`):**  
  Central list of all available tools, imported by orchestrator and API endpoints.

- **Tool Orchestrator (`server/orchestrator.ts`):**  
  Function for executing tools by name and returning results to the agent.

- **Tool API (`server/routes/tools.ts`):**  
  Endpoint for tool discovery (metadata only, not executable code).

- **Shell Scripts (`server/scripts/*`):**  
  Custom scripts dynamically registered as tools.

### Database (PostgreSQL & Drizzle)

- **Schema definitions** in TypeScript (`shared/schema.ts`)
- **Migrations** generated via Drizzle Kit (`drizzle/`)
- **Type-safe querying** in backend

### Ollama Integration

- **Local LLM model** for private, fast AI responses
- **Backend** acts as proxy and orchestrator for tool-augmented prompts

---

## Getting Started

> **Prerequisites:**  
> - Node.js
> - PostgreSQL
> - [Ollama](https://ollama.com/) running locally

1. **Clone the repository**
   ```sh
   git clone https://github.com/jaycrav3ns/LocalAgent-LLM.git
   cd LocalAgent-LLM
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Fill out your PostgreSQL and Ollama configuration

3. **Install dependencies**
   ```sh
   npm install
   cd client && npm install
   cd ..
   ```

4. **Run database migrations**
   ```sh
   npx drizzle-kit migrate:push
   ```

5. **Start the backend**
   ```sh
   npm run dev
   ```

6. **Start the frontend**
   ```sh
   cd client
   npm run dev
   ```

---

## Tool System Explained

The tool system allows the LLM agent to call external functions, such as shell commands, OCR, or custom scripts, as part of its reasoning. This is achieved through:

1. **Tool Registration:**  
   All tool manifests are imported and registered in the tool registry.

2. **Tool Discovery:**  
   The agent queries the `/tools` API for available tool descriptions and schemas.

3. **Tool Execution:**  
   The agent selects and invokes a tool by name via the orchestrator, receiving results for further reasoning.

4. **Security:**  
   Tools run in a sandboxed environment (with workspace root restrictions).

**Example:**  
The agent receives a prompt like `bash: ls -l`. The backend executes `ls -l` in a shell, captures the output, and returns it to the agent, which can then use it in its next response.

---

## Directory Structure

```
LocalAgent-LLM/
│
├── client/             # React frontend (Vite)
│   ├─ src/
│   ├─ public/
│   └─ ...
│
├── server/             # Node.js backend
│   ├─ tools/           # Tool implementations
│   ├─ routes/          # Express routes
│   ├─ orchestrator.ts  # Tool orchestrator
│   └─ ...
│
├── shared/             # Shared TypeScript logic (schemas, types)
│
├── drizzle/            # Database migrations
├── .env.example        # Sample environment config
└── README.md
```

---

## Contributing

Pull requests, issues, and suggestions are welcome! Please open an issue or PR and describe your proposed changes or bugfixes.

---

## License

CC (see LICENSE file)

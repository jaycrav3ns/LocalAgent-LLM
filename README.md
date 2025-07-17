# LocalAgent-LLM

**LocalAgent-LLM** is a front-end application for interacting with local Large Language Models (LLMs) via an Ollama endpoint. With LocalAgent-LLM, you can run local chat sessions, execute Bash and Python commands, chain multiple commands, and even search Google—all in a streamlined interface designed for privacy, extensibility, and power-user workflows.

<img width="1307" height="664" alt="01" src="https://github.com/user-attachments/assets/fc98d416-0eb6-401b-b620-aa20b65bb589" />

---

[screenshots/02.png](https://github.com/jaycrav3ns/LocalAgent-LLM/blob/main/screenshots/02.png) | [screenshots/03.png](https://github.com/jaycrav3ns/LocalAgent-LLM/blob/main/screenshots/03.png) | [screenshots/04.png](https://github.com/jaycrav3ns/LocalAgent-LLM/blob/main/screenshots/04.png) | [screenshots/05.png](https://github.com/jaycrav3ns/LocalAgent-LLM/blob/main/screenshots/05.png)

---

## Features

- **Local LLM Chat**: Connects to your local Ollama instance for private, fast, and cost-free AI chat.
- **Run Shell & Python Commands**: Execute Bash and Python directly from the chat, with output visible in your session.
- **Command Chaining**: Chain commands and instructions together for advanced scripting.
- **Google Search Integration**: Query Google and use results within your chat flow.
- **Multi-User Workspaces**: Simple cookie-based isolation so multiple users can work independently.
- **Dynamic Model Switching**: Detects available Ollama models and lets you switch models with a click.
- **Session Management**: Start new chats, save memory, and download chat logs with a single click.
- **Beta**: Actively developed, and open to feedback and improvements.

---

## Getting Started

### Prerequisites

- **Ollama**: A local LLM server is required. See [Ollama documentation](https://ollama.com/) for setup.
- **Node.js** and **npm** (for running the front-end)
- (Optional) Python and Bash environments for executing code

### Installation

```bash
git clone https://github.com/jaycrav3ns/LocalAgent-LLM.git
cd LocalAgent-LLM
npm install
```

### Running Locally

1. **Start your Ollama server** (see their documentation).
2. **Run the LocalAgent-LLM front-end:**

   ```bash
   npm start
   ```

3. Open your browser and go to `http://localhost:3000` (or the port listed in your console).

---

## Usage

- **Switch Models**: Click the chevron (`ˇ`) next to the model name.
- **New Chat**: Start a fresh session.
- **Save Memory**: Save your current conversation state.
- **Download Chat**: Export your chat log.

### Example Chat Flows

- Ask questions, run code snippets, chain commands, or search Google—all from one interface.

---

## Project Overview

This project is a fully functional beta application, purpose-built for [Ollama](https://ollama.com/). The primary technology stack is pure NodeJS, with supporting tools to run Python scripts—though Python is only used for tooling, not as a core part of the stack. The front-end leverages standard HTML, CSS, and JavaScript.

**Key external libraries:**
- **Font Awesome** (icons)
- **Tailwind CSS** (utility-first CSS framework)
- **jQuery** (DOM manipulation)
- **marked** (Markdown parsing)
- **SerpAPI** (search API integration)

### Inspiration

The project draws inspiration from [agenticSeek](https://github.com/agenticSeek/agenticseek). It was created as an alternative after encountering issues running agenticSeek without Docker (and a preference to avoid installing Docker). The core concept was refactored from agenticSeek’s codebase into a pure NodeJS implementation.

## Roadmap & Contributing

LocalAgent-LLM is in beta and welcomes feedback, feature requests, and contributions. To get involved:

- Open an issue or feature request
- Fork the repo and submit a pull request
- Discuss improvements or ideas

---

## License

This project is licensed under the [CC0 1.0 Universal License](LICENSE).

---

## Acknowledgments

- Powered by [Ollama](https://ollama.com/)
- Inspired by open-source AI and agentic workflows

---

## Author

[Jay Crav3ns](https://github.com/jaycrav3ns)

---

*LocalAgent-LLM: Fast, local, and extensible AI chat at your fingertips.*

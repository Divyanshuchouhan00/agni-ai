# AGNI MCP Inspector

AGNI is a powerful, production-ready developer tool for inspecting, testing, and debugging Model Context Protocol (MCP) servers. Inspired by modern developer tools like Postman and Chrome DevTools, AGNI provides an intuitive interface to seamlessly interact with your AI agent's backend infrastructure.

![AGNI Header Interface Placeholder](assets/header-placeholder.jpg)

## Features

- **🔌 Seamless Connection**: Plug directly into any local or remote HTTP-based MCP server.
- **🧰 Tools Explorer**: Automatically parse and interact with your registered tools natively.
- **▶️ Execution Workspace**: Dynamically generate JSON inputs for tools, execute requests, and view pretty-json formatted responses.
- **📚 Resources & Prompts Viewing**: Explore contexts and prompts exported by your MCP server.
- **🐞 System Logs Panel**: Track request latency and payloads via the built-in auto-scrolling log tailer.
- **🌙 Developer Theme**: Hand-crafted sleek Dark Mode defaults.

## Project Structure

```bash
/agni-mcp-inspector
  /src
    /app            # Next.js 14 App Router, Global CSS, and API Proxies
    /components     # Core UI components (Sidebar, Workspace, BottomPanel)
    /context        # React global state management (McpContext)

/mock-mcp-server
  index.js          # Express-based simulated standard MCP server
```

## Getting Started

### 1. Setup the Mock MCP Server

If you want to test the Inspector without a real MCP server, start the mock server:
```bash
cd mock-mcp-server
npm install
npm start
```
*The mock server runs on `http://localhost:3001` and listens at the `/mcp` endpoint.*

### 2. Run AGNI MCP Inspector

Now, start the front-end application:
```bash
cd agni-mcp-inspector
npm install
npm run dev
```

### 3. Usage Guide

1. Open your browser to `http://localhost:3000`.
2. In the top connection bar, enter your MCP server URL (e.g., `http://localhost:3001/mcp`).
3. Click "Connect". 
4. The sidebar will populate with available tools, resources, and prompts. Select a tool to auto-generate the JSON arguments template and execute.

## Tech Stack
- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **Icons**: Lucide React
- **Backend/Proxy**: Node.js, Next API Routes

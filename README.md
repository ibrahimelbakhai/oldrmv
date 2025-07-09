# Maestro Orchestrator (React Frontend)

This project is a React frontend application, "Maestro Orchestrator," designed to assist with orchestrating AI agents and various tasks using the Google Gemini API. It provides a central Maestro agent for planning and agent design, an agent management dashboard, and a suite of SEO tools as examples of worker agents.

## Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- A Google Gemini API Key

## Gemini API Key Configuration

This application requires a Google Gemini API Key to function. The API key **must** be available as `process.env.API_KEY` in the JavaScript execution environment (i.e., in the browser).

**Important:** Unlike some frameworks (like Create React App with `REACT_APP_` prefixes or Vite with `VITE_` prefixes), simply creating a `.env` file in the project root will **not** automatically make `process.env.API_KEY` available to the client-side code without a specific build tool or server-side mechanism to inject it. The application code strictly uses `process.env.API_KEY` as per requirements. Individual agent steps can optionally have their own API key specified in the Agent Management UI, which would override the global key for that specific step.

**How to ensure `process.env.API_KEY` is available (for the global key):**

1.  **Using a Build Tool (e.g., Vite, Webpack):**
    (Details for Vite and Webpack remain the same as previous version - ensure `API_KEY` is exposed).

2.  **Server-Side Injection (for custom server setups):**
    (Details remain the same).

3.  **Deployment Platform Environment Variables:**
    (Details remain the same).

**Local Development (without a configured build tool for env vars):**
(Details remain the same - temporary console definition is not recommended for regular use).

**Security:**
Always keep your API keys secure. Do not commit them directly into your version control system.

## Setup (After API Key Configuration)

1.  **Clone the repository (or download the files).**
2.  **Install dependencies:**
    If using a build tool like Vite, run `npm install` or `yarn install`.

## Running the Application

Once the global API key is correctly configured and dependencies are installed:
```bash
npm start
# or
# yarn start
```
This typically starts a development server.

## Features

The application is organized into several sections accessible via a sidebar:

*   **Maestro Orchestrator:** The central tool for interacting with the Maestro Agent.
    *   **Orchestrate Plan Tab:** Define a high-level goal and have the Maestro generate a multi-step plan using available worker agents.
    *   **Chat with Maestro / Build Agent Tab:** Conversationally interact with the Maestro to get help designing new agents or refining ideas.
    *   **Advanced Prompt Tab:** Submit detailed, custom prompts directly to the Maestro agent.
*   **Agent Management:** Create, view, edit, and delete custom AI agents. Define their names, descriptions, global instructions, documentation, and multi-step workflows (each step with its own prompt, model, and configurations, including optional step-specific API keys).
*   **SEO Tools (Example Worker Agents):**
    *   **Keyword Researcher:** Enter a topic to generate related keywords.
    *   **Content Planner:** Provide a topic or keyword to get a content outline.
    *   **Content Writer:** Input a topic or specific instructions to draft a piece of content.
    *   **Meta Tag Generator:** Describe your webpage content to generate SEO-friendly meta titles and descriptions.

## How to Use

1.  Navigate to the application in your browser.
2.  Use the sidebar to select the desired tool or section.
3.  For the Maestro Orchestrator, choose a tab based on your interaction type.
4.  For Agent Management, create or edit agents and their steps.
5.  For SEO Tools, provide inputs and generate results.

## Important Notes

*   **API Key Security:** Re-iterating: ensure your API keys are managed securely.
*   **Gemini API Usage:** Be mindful of your Gemini API usage limits and billing.
*   **Error Handling:** The application includes error handling. Check the browser's developer console for detailed messages.

## Technologies Used

*   React 19 (via esm.sh)
*   TypeScript
*   Tailwind CSS (via CDN)
*   Google Gemini API (`@google/genai` via esm.sh)
*   Marked (for Markdown rendering, via esm.sh)

This application provides a powerful interface to define, manage, and orchestrate AI agents for various tasks.

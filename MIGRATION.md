
# Migration to ADK-Aligned Architecture (v2)

This document outlines the significant architectural changes introduced in version 2 of the Maestro Orchestrator application, moving towards a more modular and "Agent Development Kit" (ADK) like structure.

## Key Changes:

1.  **Manifest-Driven Agent Loading (`manifest.json`):**
    *   Previously, `adkService.ts` had hardcoded knowledge of some agents or specific loading logic.
    *   **Now:** `manifest.json` is the single source of truth for discovering available agent classes. It contains entries for each agent, specifying:
        *   `agentId`: A unique identifier for the agent. This ID should match the `id` field in the agent's `AgentDefinition` stored in `localStorage` for configuration.
        *   `name`: A human-readable name for the agent.
        *   `description`: A brief description.
        *   `entryPoint`: The relative path to the agent's TypeScript class file (e.g., `./agents/KeywordResearchAgent.ts`).
        *   `className`: The name of the class to be instantiated from the `entryPoint` file (e.g., `KeywordResearchAgent`).
    *   The `adkService` now dynamically imports and instantiates agents based on this manifest.

2.  **`BaseAgent.ts` Class:**
    *   A new abstract class `BaseAgent` has been introduced in `agents/BaseAgent.ts`.
    *   All agent classes (e.g., `KeywordResearchAgent`, `ContentPlannerAgent`) **must** extend `BaseAgent`.
    *   `BaseAgent` constructors accept an `AgentDefinition` (for configuration, loaded from `localStorage`) and an `AgentManifestEntry` (from `manifest.json`).
    *   It defines an abstract method `invokeAction(actionName: string, params: any, callingAgentId?: string): Promise<any>`, which each concrete agent class must implement to handle specific actions.

3.  **Agent Class Implementation:**
    *   Agent-specific logic (previously in `llmService.ts` wrappers or directly in UI components) is now encapsulated within their respective agent classes located in the `/agents` directory.
    *   Each agent's `invokeAction` method typically uses a `switch` statement on `actionName` to route to private methods that perform the actual work, often culminating in a call to `llmService.generateContentInternal`.

4.  **`adkService.ts` Refactoring:**
    *   The `adkService` no longer holds direct properties for each agent (e.g., `adkService.keywordResearcher`).
    *   It now maintains a private `agents: Map<string, BaseAgent>` storing all dynamically loaded agent instances.
    *   A new public method `invokeAgentAction(agentId: string, actionName: string, params: any): Promise<any>` is the **primary way** UI components and other services should interact with agents.
    *   It continues to load `AgentDefinition` configurations from `localStorage` to pass to agent constructors.

5.  **UI Component Decoupling:**
    *   UI tool components (e.g., `KeywordResearchTool.tsx`, `ContentPlannerTool.tsx`) now use `adkService.invokeAgentAction(agentId, actionName, params)` to trigger agent functionalities.
    *   They still retrieve their `AgentDefinition` from `localStorage` to get their `agentId` (to pass to `invokeAgentAction`) and any UI-specific configuration.

6.  **`llmService.ts` Simplification:**
    *   Agent-specific wrapper functions (e.g., `generateKeywords`, `generateContentOutline`) have been removed from `llmService.ts`. Their logic now resides within the corresponding agent classes.
    *   `llmService.ts` primarily provides the generic `generateContentInternal` function for making LLM API calls.

7.  **Adding New Agents:**
    *   Create your new agent class file (e.g., `MyNewAgent.ts`) in the `/agents` directory, ensuring it extends `BaseAgent` and implements `invokeAction`.
    *   Add an entry for your agent in `manifest.json` with the correct `agentId`, `entryPoint`, and `className`.
    *   Define the agent's configuration (prompts, models, steps etc.) via the "Agent Management" dashboard. The `agentId` in the manifest **must match** the `id` of the `AgentDefinition` saved by the dashboard.
    *   The `adkService` will automatically discover and load your new agent on application startup or when `adkService.reloadAgents()` is called.

## Benefits of this Architecture:

*   **Modularity:** Agents are self-contained units.
*   **Extensibility:** Adding new agents is significantly simplified.
*   **Decoupling:** UI components are decoupled from direct knowledge of agent implementations, interacting through a standardized service layer.
*   **Maintainability:** Clearer separation of concerns.

## Migration Steps for Developers:

*   When creating new agents, follow the pattern of extending `BaseAgent` and implementing `invokeAction`.
*   Ensure any new agent is registered in `manifest.json`.
*   Update UI components that need to interact with agents to use `adkService.invokeAgentAction`.
*   Agent configurations (prompts, models, etc.) are still managed via the "Agent Management" UI, which saves to `localStorage` under an `id` that should match the `agentId` in `manifest.json`.

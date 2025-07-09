
import { AgentDefinition, AgentManifestEntry } from '../types';
import { GEMINI_AGENT_DEFINITIONS_LS_KEY } from '../constants';
import { BaseAgent } from '../agents/BaseAgent';
// Agent classes are now dynamically imported, so no direct static imports here.

class AdkService {
  private agents: Map<string, BaseAgent> = new Map();
  private agentDefinitions: Map<string, AgentDefinition> = new Map();
  private manifestEntries: AgentManifestEntry[] = [];
  private static instance: AdkService;
  private isInitialized = false;

  private constructor() {
    // Initialization is now deferred to an async method
  }

  public static getInstance(): AdkService {
    if (!AdkService.instance) {
      AdkService.instance = new AdkService();
    }
    return AdkService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    console.log("ADK Service: Initializing...");
    await this.loadManifest();
    this.loadAgentDefinitionsFromStorage();
    await this.loadAgentsFromManifest();
    this.isInitialized = true;
    console.log("ADK Service: Initialization complete. Loaded agents:", Array.from(this.agents.keys()));
  }
  
  private async loadManifest(): Promise<void> {
    try {
      const response = await fetch('/manifest.json'); // manifest.json is at the root
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest.json: ${response.statusText}`);
      }
      const manifest = await response.json();
      if (manifest && Array.isArray(manifest.agents)) {
        this.manifestEntries = manifest.agents;
      } else {
        console.error("Invalid manifest.json format. Expected an object with an 'agents' array.", manifest);
        this.manifestEntries = [];
      }
    } catch (error) {
      console.error("Failed to load or parse manifest.json:", error);
      this.manifestEntries = [];
    }
  }
  
  private loadAgentDefinitionsFromStorage(): void {
    this.agentDefinitions.clear();
    try {
      const storedAgentsString = localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY);
      if (storedAgentsString) {
        const definitions: AgentDefinition[] = JSON.parse(storedAgentsString);
        definitions.forEach(def => this.agentDefinitions.set(def.id, def));
      }
    } catch (error) {
      console.error("Failed to parse agent definitions from localStorage:", error);
    }
  }

  private async loadAgentsFromManifest(): Promise<void> {
    this.agents.clear();
    for (const manifestEntry of this.manifestEntries) {
      const definition = this.agentDefinitions.get(manifestEntry.agentId);
      if (!definition) {
        console.warn(`ADK Service: AgentDefinition for agentId "${manifestEntry.agentId}" (${manifestEntry.name}) not found in localStorage. This agent may not function correctly or use default prompts.`);
      }

      try {
        // Construct an absolute path from the root for the import.
        // entryPoint from manifest.json is like "agents/KeywordResearchAgent.ts"
        const modulePath = manifestEntry.entryPoint.startsWith('/') 
          ? manifestEntry.entryPoint 
          : `/${manifestEntry.entryPoint}`;
        
        const agentModule = await import(/* @vite-ignore */ modulePath);
        const AgentClass = agentModule[manifestEntry.className];

        if (AgentClass && typeof AgentClass === 'function') {
           const effectiveDefinition = definition || this.createFallbackDefinition(manifestEntry);

          const agentInstance = new AgentClass(effectiveDefinition, manifestEntry) as BaseAgent;
          this.agents.set(manifestEntry.agentId, agentInstance);
          console.log(`ADK Service: Successfully loaded agent "${manifestEntry.name}" (ID: ${manifestEntry.agentId}) from ${modulePath}`);
        } else {
          console.error(`ADK Service: Class "${manifestEntry.className}" not found or not a constructor in module "${modulePath}" for agent "${manifestEntry.name}".`);
        }
      } catch (error) {
        console.error(`ADK Service: Failed to load or instantiate agent "${manifestEntry.name}" (ID: ${manifestEntry.agentId}) from "${manifestEntry.entryPoint}":`, error);
      }
    }
  }
  
  private createFallbackDefinition(manifestEntry: AgentManifestEntry): AgentDefinition {
    console.warn(`Creating fallback definition for agentId "${manifestEntry.agentId}". Configuration should be managed in Agent Management.`);
    return {
      id: manifestEntry.agentId,
      name: manifestEntry.name,
      description: manifestEntry.description,
      steps: [{ 
        id: `${manifestEntry.agentId}_default_step`,
        name: 'Default Action',
        instruction: `This is a fallback instruction for ${manifestEntry.name}. Please configure this agent in Agent Management. Action: {{actionName}}, Params: {{params}}`,
        model: 'gemini-2.5-flash-preview-04-17',
        providerType: 'google_gemini',
      }],
      isPredefined: !!manifestEntry.agentId.startsWith('predef_'),
    };
  }


  public async reloadAgentsAndDefinitions(): Promise<void> {
    console.log("ADK Service: Reloading all agents and definitions...");
    this.isInitialized = false; 
    await this.initialize();
  }

  public getAgent(agentId: string): BaseAgent | undefined {
    if (!this.isInitialized) {
        console.warn("ADK Service not initialized. Call initialize() first.");
        return undefined;
    }
    return this.agents.get(agentId);
  }

  public getAllAgentManifests(): AgentManifestEntry[] {
    if (!this.isInitialized) {
        console.warn("ADK Service not initialized. Call initialize() first.");
        return [];
    }
    return [...this.manifestEntries];
  }
  
  public getAllAgentDefinitions(): AgentDefinition[] {
    if (!this.isInitialized) {
        console.warn("ADK Service not initialized. Call initialize() first.");
        return [];
    }
    return Array.from(this.agentDefinitions.values());
  }
  
  public getAgentDefinition(agentId: string): AgentDefinition | undefined {
    if (!this.isInitialized) {
        console.warn("ADK Service not initialized. Call initialize() first.");
        return undefined;
    }
    return this.agentDefinitions.get(agentId);
  }


  public async invokeAgentAction(agentId: string, actionName: string, params: any, callingAgentId?: string, planId?: string): Promise<any> {
    if (!this.isInitialized) {
        const errorMsg = "ADK Service not initialized. Cannot invoke agent action.";
        console.error(errorMsg);
        return { error: errorMsg };
    }
    const agent = this.agents.get(agentId);
    if (!agent) {
      const errorMsg = `ADK Service: Agent with ID "${agentId}" not found. Cannot invoke action "${actionName}".`;
      console.error(errorMsg);
      return { error: errorMsg };
    }
    try {
      return await agent.invokeAction(actionName, params, callingAgentId, planId);
    } catch (error: any) {
      const errorMsg = `ADK Service: Error invoking action "${actionName}" on agent "${agentId}": ${error.message}`;
      console.error(errorMsg, error);
      return { error: errorMsg, details: error };
    }
  }
}

const adkService = AdkService.getInstance();
export default adkService;

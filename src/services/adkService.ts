
import { AgentDefinition, AgentManifestEntry } from '../types';
import { GEMINI_AGENT_DEFINITIONS_LS_KEY, GEMINI_TEXT_MODEL } from '../constants';
import { BaseAgent } from '../agents/BaseAgent'; // Ensure BaseAgent.ts is at src/agents/BaseAgent.ts

// Vite's import.meta.glob to import all .ts files from src/agents/
// Using a path relative to this file (src/services/adkService.ts) to target src/agents/
const agentModuleLoaders: Record<string, () => Promise<any>> = (import.meta as any).glob('../agents/*.ts');

class AdkService {
  private agents: Map<string, BaseAgent> = new Map();
  private agentDefinitions: Map<string, AgentDefinition> = new Map();
  private manifestEntries: AgentManifestEntry[] = [];
  private static instance: AdkService;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Initialization is deferred to an async method
  }

  public static getInstance(): AdkService {
    if (!AdkService.instance) {
      AdkService.instance = new AdkService();
    }
    return AdkService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("ADK Service: Already initialized.");
      return;
    }
    if (this.initializationPromise) {
      console.log("ADK Service: Initialization already in progress.");
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      console.log("ADK Service: Initializing...");
      await this.loadManifest();
      this.loadAgentDefinitionsFromStorage();
      await this.loadAgentsFromManifest();
      this.isInitialized = true;
      console.log("ADK Service: Initialization complete. Loaded agents:", Array.from(this.agents.keys()));
      if (this.agents.size === 0 && this.manifestEntries.length > 0) {
          console.warn("ADK Service: No agents were successfully loaded, but manifest entries exist. Check agent file paths in 'src/agents/', manifest.json 'entryPoint' values (e.g., 'agents/AgentName.ts'), and the glob pattern '../agents/*.ts' relative to adkService.ts.");
          console.log("Available module loader keys from import.meta.glob:", Object.keys(agentModuleLoaders));
      }
      this.initializationPromise = null; 
    })();
    return this.initializationPromise;
  }
  
  private async loadManifest(): Promise<void> {
    try {
      const response = await fetch('/manifest.json'); 
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest.json: ${response.statusText}`);
      }
      const manifest = await response.json();
      if (manifest && Array.isArray(manifest.agents)) {
        this.manifestEntries = manifest.agents;
      } else {
        console.error("ADK Service: Invalid manifest.json format. Expected an object with an 'agents' array.", manifest);
        this.manifestEntries = [];
      }
    } catch (error) {
      console.error("ADK Service: Failed to load or parse manifest.json:", error);
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
      console.error("ADK Service: Failed to parse agent definitions from localStorage:", error);
    }
  }

  private async loadAgentsFromManifest(): Promise<void> {
    this.agents.clear();
    // console.log("ADK Service: Attempting to load agents based on manifest entries:", this.manifestEntries);
    // console.log("ADK Service: Available module loaders from import.meta.glob (relative):", agentModuleLoaders);

    for (const manifestEntry of this.manifestEntries) {
      const definition = this.agentDefinitions.get(manifestEntry.agentId);
      
      // Construct the key for the agentModuleLoaders map.
      // manifestEntry.entryPoint is like "agents/KeywordResearchAgent.ts" (relative to src/)
      // The keys in agentModuleLoaders (from glob('../agents/*.ts')) will be like "../agents/KeywordResearchAgent.ts"
      const moduleKey = `../${manifestEntry.entryPoint}`;
      
      const moduleLoader = agentModuleLoaders[moduleKey];

      if (moduleLoader) {
        try {
          // console.log(`ADK Service: Found module loader for key "${moduleKey}". Attempting to load module for agent "${manifestEntry.name}".`);
          const agentModule = await moduleLoader(); 
          const AgentClass = agentModule[manifestEntry.className];

          if (AgentClass && typeof AgentClass === 'function') {
            const effectiveDefinition = definition || this.createFallbackDefinition(manifestEntry);
            if (!definition) {
                 console.warn(`ADK Service: AgentDefinition for agentId "${manifestEntry.agentId}" (${manifestEntry.name}) not found in localStorage. Using fallback definition.`);
            }

            const agentInstance = new AgentClass(effectiveDefinition, manifestEntry) as BaseAgent;
            this.agents.set(manifestEntry.agentId, agentInstance);
            // console.log(`ADK Service: Successfully loaded and instantiated agent "${manifestEntry.name}" (ID: ${manifestEntry.agentId}) using class ${manifestEntry.className} from module key ${moduleKey}`);
          } else {
            console.error(`ADK Service: Class "${manifestEntry.className}" not found or not a constructor in module loaded via key "${moduleKey}" for agent "${manifestEntry.name}". Module content:`, agentModule);
          }
        } catch (error) {
          console.error(`ADK Service: Failed to load module or instantiate agent "${manifestEntry.name}" (ID: ${manifestEntry.agentId}) from entryPoint "${manifestEntry.entryPoint}" (resolved to key ${moduleKey}):`, error);
        }
      } else {
         console.error(`ADK Service: No module loader found for key "${moduleKey}" (derived from manifest entryPoint "../${manifestEntry.entryPoint}") for agent "${manifestEntry.name}". 
         Ensure:
         1. Agent file exists at 'src/${manifestEntry.entryPoint}'.
         2. 'manifest.json' entryPoint is correct (e.g., 'agents/AgentName.ts').
         3. The glob pattern in adkService.ts ('../agents/*.ts') correctly targets 'src/agents/' from 'src/services/'.
         Available glob keys: ${Object.keys(agentModuleLoaders).join(', ')}`);
      }
    }
  }
  
  private createFallbackDefinition(manifestEntry: AgentManifestEntry): AgentDefinition {
    return {
      id: manifestEntry.agentId,
      name: manifestEntry.name,
      description: manifestEntry.description,
      steps: [{ 
        id: `${manifestEntry.agentId}_default_step`,
        name: 'Default Action',
        instruction: `This is a fallback instruction for ${manifestEntry.name}. Please configure this agent in Agent Management. Action: {{actionName}}, Params: {{params}}`,
        model: GEMINI_TEXT_MODEL, 
        providerType: 'google_gemini',
      }],
      isPredefined: !!manifestEntry.agentId.startsWith('predef_'),
    };
  }

  public async reloadAgentsAndDefinitions(): Promise<void> {
    console.log("ADK Service: Reloading all agents and definitions...");
    this.isInitialized = false; 
    this.initializationPromise = null; 
    this.agents.clear();
    this.agentDefinitions.clear();
    this.manifestEntries = [];
    await this.initialize();
  }

  public getAgent(agentId: string): BaseAgent | undefined {
    if (!this.isInitialized) {
        console.warn("ADK Service: getAgent called before initialization completed. Consider awaiting initialize().");
        return undefined;
    }
    return this.agents.get(agentId);
  }

  public getAllAgentManifests(): AgentManifestEntry[] {
    if (!this.isInitialized) {
         console.warn("ADK Service: getAllAgentManifests called before initialization completed.");
        return [];
    }
    return [...this.manifestEntries];
  }
  
  public getAllAgentDefinitions(): AgentDefinition[] {
    if (!this.isInitialized) {
        console.warn("ADK Service: getAllAgentDefinitions called before initialization completed.");
        return [];
    }
    const allDefs = new Map<string, AgentDefinition>();
    this.agentDefinitions.forEach((value, key) => allDefs.set(key, value));
    
    this.manifestEntries.forEach(entry => {
      if (!allDefs.has(entry.agentId)) {
        allDefs.set(entry.agentId, this.createFallbackDefinition(entry));
      }
    });
    return Array.from(allDefs.values());
  }
  
  public getAgentDefinition(agentId: string): AgentDefinition | undefined {
     if (!this.isInitialized) {
        console.warn("ADK Service: getAgentDefinition called before initialization completed.");
        const manifestEntry = this.manifestEntries.find(entry => entry.agentId === agentId);
        return manifestEntry ? this.createFallbackDefinition(manifestEntry) : undefined;
    }
    let definition = this.agentDefinitions.get(agentId);
    if (!definition) {
        const manifestEntry = this.manifestEntries.find(entry => entry.agentId === agentId);
        if (manifestEntry) {
            return this.createFallbackDefinition(manifestEntry);
        }
    }
    return definition;
  }

  public async invokeAgentAction(agentId: string, actionName: string, params: any, callingAgentId?: string, planId?: string): Promise<any> {
    if (!this.isInitialized) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      } else { 
        await this.initialize();
      }
    }
    
    if (!this.isInitialized) { 
       const errorMsg = "ADK Service: Initialization failed or did not complete. Cannot invoke agent action.";
       console.error(errorMsg);
       return { error: errorMsg };
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      const errorMsg = `ADK Service: Agent with ID "${agentId}" not found after initialization. Cannot invoke action "${actionName}". Available agents: ${Array.from(this.agents.keys()).join(', ')}`;
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

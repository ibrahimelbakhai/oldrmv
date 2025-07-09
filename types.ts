
export enum ActiveTool {
  KEYWORD_RESEARCH = 'Keyword Researcher',
  CONTENT_PLANNER = 'Content Planner',
  CONTENT_WRITER = 'Content Writer',
  META_TAG_GENERATOR = 'Meta Tag Generator',
  AGENT_MANAGEMENT = 'Agent Management',
  MAESTRO_ORCHESTRATOR = 'Maestro Orchestrator',
  AGENT_ANALYTICS = 'Agent Analytics',
  PROJECT_MANAGEMENT = 'Project Management',
  SOCIAL_MEDIA_MANAGER = 'Social Media AI',
  PROJECT_CONTROL_PANEL = 'Project Control Panel', // New Tool
}

export interface MetaTags {
  title: string;
  description: string;
}

export interface GroundingChunkWeb {
  uri?: string;
  title?: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface GeminiCandidate {
  groundingMetadata?: GroundingMetadata;
}

export interface AgentStepConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  isJsonOutput?: boolean;
  disableThinking?: boolean;
}

export interface AgentStep extends AgentStepConfig {
  id: string;
  name: string;
  instruction: string;
  model: string; // Model name specific to the provider
  apiKey?: string; // API key for the specific provider/endpoint
  providerType: 'google_gemini' | 'generic_rest'; // LLM Provider
  apiEndpoint?: string; // API endpoint, primarily for 'generic_rest'
}

// --- RAG and Tool Definitions for Agents ---
export interface RagResource {
  id:string;
  name: string;
  type: 'text_content' | 'web_url'; // web_url is conceptual for now
  content?: string; // For text_content
  url?: string;     // For web_url
  description?: string; // How AI should interpret/use this resource
  lastModified: string;
}

export interface AgentToolParameter {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
}

export interface AgentToolCredential {
  id: string;
  keyName: string; // e.g., 'API_KEY', 'Authorization' (Header Name)
  keyValuePlaceholder: string; // User inputs a placeholder or actual value (with warnings)
  credentialType: 'header' | 'query_param' | 'body_placeholder'; // How to include it
}

export interface AgentTool {
  id: string;
  name: string; // e.g., searchGoogle, getStockPrice
  description: string; // For LLM to understand tool's purpose
  apiEndpoint?: string; // URL for the tool's API
  method?: 'GET' | 'POST'; // HTTP method
  parameters?: AgentToolParameter[]; // Parameters the tool expects
  credentials?: AgentToolCredential[]; // Conceptual credentials
  requestBodySchema?: string; // JSON schema string for POST body
  responseSchema?: string; // JSON schema string for expected response for LLM to parse
  lastModified: string;
}

export interface AgentDefinition {
  id: string; // This ID should match agentId in manifest.json for discoverable agents
  name: string;
  description: string;
  globalSystemInstruction?: string;
  steps: AgentStep[];
  isPredefined?: boolean;
  documentationPurpose?: string;
  documentationWorkflow?: string;
  documentationOutputExample?: string;
  ragResources?: RagResource[];
  tools?: AgentTool[];
}

export enum PlanStatus {
  DRAFT = 'Draft',
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  RUNNING = 'Running',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  CANCELLED = 'Cancelled',
}

export enum OrchestrationStepStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  SKIPPED = 'Skipped',
  CANCELLED = 'Cancelled',
}

export interface OrchestrationStepExecutionDetails {
  taskRecordId?: string;
}


export interface OrchestrationStep {
  id: string;
  planId: string;
  originalMarkdownLines: string[];
  taskName: string;
  taskDescription?: string;
  assignedAgentName?: string; // Name of the agent from its definition
  assignedAgentId?: string; // ID of the agent from its definition/manifest
  assignedAgentStepName?: string; // Name of the step from agent's definition
  actionName?: string; // Action to invoke on the agent (e.g. primary action for the step)
  inputSummary?: string;
  inputPayload?: any; // Actual payload to pass to agent's invokeAction
  outputSummary?: string;
  status: OrchestrationStepStatus;
  serialNumber: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: string | any;
  logs?: string[];
  error?: string;
  executionDetails?: OrchestrationStepExecutionDetails;
}

export interface OrchestrationPlan {
  id: string;
  userGoal: string;
  rawMaestroPlanMarkdown: string;
  parsedSteps: OrchestrationStep[];
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  currentStepIndexToExecute: number;
  overallProgress?: number;
  error?: string;
}

export enum AgentTaskStatus {
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  IN_PROGRESS = 'In Progress',
}

export interface AgentTaskExecutionRecord {
  id: string;
  agentId: string; // ID of the agent definition
  agentName: string;
  stepId: string; // ID of the step within the agent definition
  stepName: string;
  actionName?: string; // If applicable, the specific action invoked
  planId?: string;
  status: AgentTaskStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  inputSummary: string;
  outputSummary?: string;
  error?: string;
  approxInputTokens?: number;
  approxOutputTokens?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  createdAt: string;
}

export enum ProjectTaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  REVIEW = 'Review',
  COMPLETED = 'Completed',
  BLOCKED = 'Blocked',
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  status: ProjectTaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Social Media Manager Types ---
export enum SocialPlatform {
  TWITTER = 'Twitter / X',
  LINKEDIN = 'LinkedIn',
  FACEBOOK = 'Facebook',
  INSTAGRAM = 'Instagram',
  THREADS = 'Threads',
  PINTEREST = 'Pinterest',
  TIKTOK = 'TikTok',
  YOUTUBE = 'YouTube',
}

export interface PlatformCredential {
  id: string; 
  platform: SocialPlatform;
  displayName: string; 
  handleOrProfileId?: string; 
  apiKeyPlaceholder?: string; 
  apiSecretPlaceholder?: string;
  accessTokenPlaceholder?: string;
  notes?: string; 
  lastUpdated: string;
}

export enum SocialPostStatus {
  DRAFT = 'Draft',
  READY_FOR_REVIEW = 'Ready for Review',
  ARCHIVED = 'Archived',
}

export interface SocialPostDraft {
  id: string;
  platform: SocialPlatform;
  credentialId?: string; 
  content: string;
  mediaIdeas?: string[]; 
  hashtags?: string[];
  notes?: string; 
  status: SocialPostStatus;
  createdAt: string;
  updatedAt: string;
  aiGeneratedBy?: { 
    agentId: string;
    agentName: string;
    stepId: string; // Step ID from AgentDefinition
    stepName: string; // Step Name from AgentDefinition
    actionName?: string; // Specific action invoked on the agent
    taskRecordId?: string;
  };
}

// ADK Manifest Entry Type
export interface AgentManifestEntry {
  agentId: string; // Unique ID, must match AgentDefinition.id for config loading
  name: string;
  description: string;
  entryPoint: string; // Path to the agent class file (e.g., "./agents/KeywordResearchAgent.ts")
  className: string; // Name of the class to instantiate (e.g., "KeywordResearchAgent")
  version?: string;
  supportedActions?: { name: string; description?: string; inputSchema?: any; outputSchema?: any }[]; // Optional: describe actions
}

// --- Project Control Panel Types ---
export interface PCPCompany {
  id: string;
  name: string;
}

export interface PCPProject {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  agentRunConfigs: PCPAgentRunConfiguration[]; // Holds multiple agent run configurations for this project
}

export interface PCPAgentRunConfiguration {
  id: string; // Unique ID for this run configuration within the project
  baseAgentId: string; // ID of the AgentDefinition this is based on
  configName: string; // User-defined name for this specific configuration (e.g., "Keyword Research for Blog X")
  
  projectApiKey?: string; 
  projectModel?: string;

  workflowSteps: AgentStep[]; 

  outputPath?: string; 
  lastRunStatus?: 'success' | 'failed' | 'running' | 'idle';
  lastRunLog?: PCPExecutionLogEntry[];
  lastRunOutputLink?: string;
}

export interface PCPExecutionLogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'step_start' | 'step_end' | 'debug';
  stepName?: string;
}

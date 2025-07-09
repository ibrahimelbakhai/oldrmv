
import { AgentDefinition, AgentManifestEntry, AgentTaskExecutionRecord, AgentTaskStatus } from '../types';
import { generateContentInternal, GenerateContentOptionsInternal, LLMServiceResponse } from '../services/llmService';
import { saveTaskExecutionRecord, calculateApproxTokens } from '../services/analyticsService';

export abstract class BaseAgent {
  protected agentDefinition: AgentDefinition;
  protected manifestEntry: AgentManifestEntry;

  constructor(definition: AgentDefinition, manifestEntry: AgentManifestEntry) {
    if (definition.id !== manifestEntry.agentId) {
      console.warn(`AgentDefinition ID "${definition.id}" does not match AgentManifestEntry agentId "${manifestEntry.agentId}" for agent "${manifestEntry.name}". This may cause issues in configuration loading or invocation.`);
    }
    this.agentDefinition = definition;
    this.manifestEntry = manifestEntry;
  }

  public getId(): string {
    return this.manifestEntry.agentId;
  }

  public getName(): string {
    return this.manifestEntry.name;
  }

  public getDefinition(): AgentDefinition {
    return this.agentDefinition;
  }

  public getManifestEntry(): AgentManifestEntry {
    return this.manifestEntry;
  }

  /**
   * Invokes a specific action on the agent.
   * Derived classes must implement this method to handle their specific actions.
   * @param actionName The name of the action to invoke.
   * @param params Parameters for the action.
   * @param callingAgentId Optional ID of the agent that initiated this action (e.g., Maestro).
   * @returns A promise that resolves with the result of the action, typically an LLMServiceResponse or custom data.
   */
  abstract invokeAction(actionName: string, params: any, callingAgentId?: string, planId?: string): Promise<LLMServiceResponse | any>;


  /**
   * Helper method for derived classes to easily call the LLM service
   * and automatically handle task execution recording.
   */
  protected async callLlMAndRecord(
    stepName: string,
    prompt: string,
    params: any, // Original params passed to invokeAction, for logging inputSummary
    planId?: string
  ): Promise<LLMServiceResponse> {
    const stepDefinition = this.agentDefinition.steps.find(s => s.name === stepName);

    if (!stepDefinition) {
      const errorMsg = `Step "${stepName}" not found in agent definition for "${this.agentDefinition.name}".`;
      console.error(errorMsg);
      // Log a failed task record even if step definition is missing
      saveTaskExecutionRecord({
        agentId: this.agentDefinition.id,
        agentName: this.agentDefinition.name,
        stepId: 'unknown_step_definition',
        stepName: stepName,
        actionName: stepName, // Assuming actionName corresponds to stepName here
        planId,
        status: AgentTaskStatus.FAILED,
        startedAt: new Date().toISOString(),
        inputSummary: `Params: ${JSON.stringify(params).substring(0,150)}... (Step definition missing)`,
        error: errorMsg,
      });
      return { text: null, error: errorMsg };
    }

    const options: GenerateContentOptionsInternal = {
      prompt,
      model: stepDefinition.model,
      providerType: stepDefinition.providerType,
      apiEndpoint: stepDefinition.apiEndpoint,
      apiKey: stepDefinition.apiKey,
      systemInstruction: this.agentDefinition.globalSystemInstruction,
      temperature: stepDefinition.temperature,
      topK: stepDefinition.topK,
      topP: stepDefinition.topP,
      isJsonOutput: stepDefinition.isJsonOutput,
      disableThinking: stepDefinition.disableThinking,
      agentId: this.agentDefinition.id,
      stepId: stepDefinition.id,
      planId, // Pass planId for analytics if available
    };

    const startedAt = new Date().toISOString();
    const response = await generateContentInternal(options);

    const approxInputTokens = calculateApproxTokens(prompt);
    const approxOutputTokens = calculateApproxTokens(response.text || "");
    let taskStatus = AgentTaskStatus.COMPLETED;
    let taskError: string | undefined;

    if (response.error) {
      taskStatus = AgentTaskStatus.FAILED;
      taskError = response.error;
    } else if (!response.text && !stepDefinition.isJsonOutput) { // Allow empty text for successful JSON output
      // Consider if !response.text should always be an error if not JSON.
      // For now, let it pass as completed but with no text.
    }
    
    saveTaskExecutionRecord({
      agentId: this.agentDefinition.id,
      agentName: this.agentDefinition.name,
      stepId: stepDefinition.id,
      stepName: stepDefinition.name,
      actionName: stepName, // Assuming actionName matches stepName
      planId,
      status: taskStatus,
      startedAt,
      completedAt: new Date().toISOString(),
      inputSummary: `Params: ${JSON.stringify(params).substring(0,150)}... Prompt snippet: ${prompt.substring(0,100)}...`,
      outputSummary: response.text ? response.text.substring(0, 200) + (response.text.length > 200 ? "..." : "") : (response.error ? undefined : "No text output"),
      error: taskError,
      approxInputTokens,
      approxOutputTokens,
    });

    return response;
  }
}

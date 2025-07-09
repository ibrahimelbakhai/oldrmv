
import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class MaestroOrchestratorAgent extends BaseAgent {
  constructor(definition: AgentDefinition, manifestEntry: AgentManifestEntry) {
    super(definition, manifestEntry);
    if (!this.agentDefinition.steps || this.agentDefinition.steps.length === 0) {
      console.warn(`${this.manifestEntry.className} (ID: ${this.agentDefinition.id}) has no steps defined.`);
    }
  }

  public async invokeAction(actionName: string, params: any, callingAgentId?: string, planId?: string): Promise<LLMServiceResponse | any> {
    console.log(`${this.manifestEntry.className} invoked with action: ${actionName}, params:`, params);
    
    const stepToExecute = this.agentDefinition.steps.find(s => s.name.toLowerCase().includes(actionName.toLowerCase())) || this.agentDefinition.steps[0];


    if (!stepToExecute) {
      return { text: null, error: `${this.manifestEntry.className}: No suitable step found for action "${actionName}" and no default step available.` };
    }

    // Maestro prompt construction is more complex and often handled by the UI/service calling it.
    // The params might directly contain the full prompt content or specific parts.
    let prompt = stepToExecute.instruction;
    if (params && params.user_goal_or_chat_input_or_advanced_prompt) {
        prompt = prompt.replace("{{user_goal_or_chat_input_or_advanced_prompt}}", params.user_goal_or_chat_input_or_advanced_prompt);
    }
    if (params && params.available_agents_json_summary) {
        prompt = prompt.replace("{{available_agents_json_summary}}", params.available_agents_json_summary);
    } else {
        prompt = prompt.replace("{{available_agents_json_summary}}", "[]"); // Default if not provided
    }
    
    return this.callLlMAndRecord(stepToExecute.name, prompt, params, planId);
  }
}
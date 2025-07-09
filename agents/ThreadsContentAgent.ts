
import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class ThreadsContentAgent extends BaseAgent {
  constructor(definition: AgentDefinition, manifestEntry: AgentManifestEntry) {
    super(definition, manifestEntry);
    if (!this.agentDefinition.steps || this.agentDefinition.steps.length === 0) {
      console.warn(`${this.manifestEntry.className} (ID: ${this.agentDefinition.id}) has no steps defined.`);
    }
  }

  public async invokeAction(actionName: string, params: any, callingAgentId?: string, planId?: string): Promise<LLMServiceResponse | any> {
    console.log(`${this.manifestEntry.className} invoked with action: ${actionName}, params:`, params);
    
    const stepToExecute = this.agentDefinition.steps.find(s => s.name.toLowerCase() === actionName.toLowerCase()) || this.agentDefinition.steps[0];

    if (!stepToExecute) {
      return { text: null, error: `${this.manifestEntry.className}: No suitable step found for action "${actionName}" and no default step available.` };
    }

    let prompt = stepToExecute.instruction;
    if (params) {
        if (params.userInput_thought_or_topic) prompt = prompt.replace(new RegExp(`{{userInput_thought_or_topic}}`, 'g'), params.userInput_thought_or_topic);
        if (params.userInput_original_post_text) prompt = prompt.replace(new RegExp(`{{userInput_original_post_text}}`, 'g'), params.userInput_original_post_text);
        if (params.userInput_reply_angle_or_topic) prompt = prompt.replace(new RegExp(`{{userInput_reply_angle_or_topic}}`, 'g'), params.userInput_reply_angle_or_topic);
        if (params.threads_profile_context) prompt = prompt.replace(new RegExp(`{{threads_profile_context}}`, 'g'), params.threads_profile_context);
        else prompt = prompt.replace(new RegExp(`{{threads_profile_context}}`, 'g'), "the user's Threads profile");
    }
    
    return this.callLlMAndRecord(stepToExecute.name, prompt, params, planId);
  }
}
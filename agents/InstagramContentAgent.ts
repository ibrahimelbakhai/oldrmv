
import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class InstagramContentAgent extends BaseAgent {
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
        if (params.userInput_visual_theme_or_topic) prompt = prompt.replace(new RegExp(`{{userInput_visual_theme_or_topic}}`, 'g'), params.userInput_visual_theme_or_topic);
        if (params.userInput_topic_or_product) prompt = prompt.replace(new RegExp(`{{userInput_topic_or_product}}`, 'g'), params.userInput_topic_or_product);
        if (params.userInput_topic_or_event) prompt = prompt.replace(new RegExp(`{{userInput_topic_or_event}}`, 'g'), params.userInput_topic_or_event);
        if (params.userInput_topic) prompt = prompt.replace(new RegExp(`{{userInput_topic}}`, 'g'), params.userInput_topic);
        if (params.instagram_profile_context) prompt = prompt.replace(new RegExp(`{{instagram_profile_context}}`, 'g'), params.instagram_profile_context);
        else prompt = prompt.replace(new RegExp(`{{instagram_profile_context}}`, 'g'), "the user's Instagram profile");
    }
    
    return this.callLlMAndRecord(stepToExecute.name, prompt, params, planId);
  }
}

import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class SocialMediaStrategistAgent extends BaseAgent {
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
        // Specific placeholder replacement based on Social Media Strategist step instructions
        if (params.userInput_campaignGoals) prompt = prompt.replace(new RegExp(`{{userInput_campaignGoals}}`, 'g'), params.userInput_campaignGoals);
        if (params.userInput_targetAudience) prompt = prompt.replace(new RegExp(`{{userInput_targetAudience}}`, 'g'), params.userInput_targetAudience);
        if (params.userInput_keyMessages) prompt = prompt.replace(new RegExp(`{{userInput_keyMessages}}`, 'g'), params.userInput_keyMessages);
        if (params.userInput_themes_or_brief) prompt = prompt.replace(new RegExp(`{{userInput_themes_or_brief}}`, 'g'), params.userInput_themes_or_brief);
        if (params.userInput_duration) prompt = prompt.replace(new RegExp(`{{userInput_duration}}`, 'g'), params.userInput_duration);
        if (params.userInput_query) prompt = prompt.replace(new RegExp(`{{userInput_query}}`, 'g'), params.userInput_query);
        // Generic fallback
        for (const key in params) {
            if (!prompt.includes(`{{${key}}}`)) continue; // Avoid replacing if not explicitly in template for these specific params
            prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
        }
    }
    
    return this.callLlMAndRecord(stepToExecute.name, prompt, params, planId);
  }
}
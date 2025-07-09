
import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class LinkedInContentAgent extends BaseAgent {
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
        // Expected params like userInput_topic_or_achievement, userInput_topic, linkedin_profile_context
        if (params.userInput_topic_or_achievement) prompt = prompt.replace(new RegExp(`{{userInput_topic_or_achievement}}`, 'g'), params.userInput_topic_or_achievement);
        if (params.userInput_topic) prompt = prompt.replace(new RegExp(`{{userInput_topic}}`, 'g'), params.userInput_topic);
        if (params.userInput_topic_or_industry) prompt = prompt.replace(new RegExp(`{{userInput_topic_or_industry}}`, 'g'), params.userInput_topic_or_industry);
        if (params.linkedin_profile_context) prompt = prompt.replace(new RegExp(`{{linkedin_profile_context}}`, 'g'), params.linkedin_profile_context);
        else prompt = prompt.replace(new RegExp(`{{linkedin_profile_context}}`, 'g'), "the user's professional context");
        if (params.user_comment_text) prompt = prompt.replace(new RegExp(`{{user_comment_text}}`, 'g'), params.user_comment_text);
        if (params.original_post_topic) prompt = prompt.replace(new RegExp(`{{original_post_topic}}`, 'g'), params.original_post_topic);
    }
    
    return this.callLlMAndRecord(stepToExecute.name, prompt, params, planId);
  }
}

import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class TikTokContentAgent extends BaseAgent {
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
        if (params.userInput_topic_or_theme) prompt = prompt.replace(new RegExp(`{{userInput_topic_or_theme}}`, 'g'), params.userInput_topic_or_theme);
        if (params.userInput_trending_sound_or_challenge_placeholder) prompt = prompt.replace(new RegExp(`{{userInput_trending_sound_or_challenge_placeholder}}`, 'g'), params.userInput_trending_sound_or_challenge_placeholder);
        else prompt = prompt.replace(new RegExp(`{{userInput_trending_sound_or_challenge_placeholder}}`, 'g'), "[TRENDING_SOUND_OR_CHALLENGE]");
        if (params.userInput_video_description) prompt = prompt.replace(new RegExp(`{{userInput_video_description}}`, 'g'), params.userInput_video_description);
        if (params.tiktok_profile_context) prompt = prompt.replace(new RegExp(`{{tiktok_profile_context}}`, 'g'), params.tiktok_profile_context);
        else prompt = prompt.replace(new RegExp(`{{tiktok_profile_context}}`, 'g'), "the user's TikTok profile");
    }
    
    return this.callLlMAndRecord(stepToExecute.name, prompt, params, planId);
  }
}

import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class YouTubeContentAgent extends BaseAgent {
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
        if (params.userInput_video_topic) prompt = prompt.replace(new RegExp(`{{userInput_video_topic}}`, 'g'), params.userInput_video_topic);
        if (params.userInput_video_title) prompt = prompt.replace(new RegExp(`{{userInput_video_title}}`, 'g'), params.userInput_video_title);
        if (params.youtube_channel_context) prompt = prompt.replace(new RegExp(`{{youtube_channel_context}}`, 'g'), params.youtube_channel_context);
        else prompt = prompt.replace(new RegExp(`{{youtube_channel_context}}`, 'g'), "the user's YouTube channel");
    }
    
    return this.callLlMAndRecord(stepToExecute.name, prompt, params, planId);
  }
}
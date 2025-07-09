
import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class ContentWriterAgent extends BaseAgent {
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
        for (const key in params) {
            prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
        }
    }
     // Default action "writeContent" might expect 'topic', 'contentType', 'length'
    if (actionName === 'writeContent' && (!params || typeof params.topic !== 'string')) {
      return { text: null, error: "Missing or invalid 'topic' parameter for writeContent action." };
    }
    
    return this.callLlMAndRecord(stepToExecute.name, prompt, params, planId);
  }
}
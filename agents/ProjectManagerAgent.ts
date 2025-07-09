
import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class ProjectManagerAgent extends BaseAgent {
  constructor(definition: AgentDefinition, manifestEntry: AgentManifestEntry) {
    super(definition, manifestEntry);
     if (!this.agentDefinition.steps || this.agentDefinition.steps.length === 0) {
      console.warn(`${this.manifestEntry.className} (ID: ${this.agentDefinition.id}) has no steps defined.`);
    }
  }

  public async invokeAction(actionName: string, params: any, callingAgentId?: string, planId?: string): Promise<LLMServiceResponse | any> {
    console.log(`${this.manifestEntry.className} invoked with action: ${actionName}, params:`, params);
    
    // PM Agent might have many steps, find one that matches actionName or a general "processCommand"
    const stepToExecute = this.agentDefinition.steps.find(s => s.name.toLowerCase() === actionName.toLowerCase()) || 
                          this.agentDefinition.steps.find(s => s.name.toLowerCase() === 'processcommand') ||
                          this.agentDefinition.steps[0];


    if (!stepToExecute) {
      return { text: null, error: `${this.manifestEntry.className}: No suitable step found for action "${actionName}" and no default step available.` };
    }

    let prompt = stepToExecute.instruction;
    if (params && params.userInput) { // Common param for PM agent
        prompt = prompt.replace(new RegExp(`{{userInput}}`, 'g'), params.userInput);
    } else if (params && typeof params === 'string') { // If params is just the command string
        prompt = prompt.replace(new RegExp(`{{userInput}}`, 'g'), params);
    } else if (params) { // Fallback for other param structures
         for (const key in params) {
            prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
        }
    }
    
    return this.callLlMAndRecord(stepToExecute.name, prompt, params, planId);
  }
}
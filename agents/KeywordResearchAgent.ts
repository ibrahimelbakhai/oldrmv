
import { AgentDefinition, AgentManifestEntry } from '../types';
import { LLMServiceResponse } from '../services/llmService';
import { BaseAgent } from './BaseAgent';

export class KeywordResearchAgent extends BaseAgent {
  constructor(definition: AgentDefinition, manifestEntry: AgentManifestEntry) {
    super(definition, manifestEntry);
    if (!this.agentDefinition.steps || this.agentDefinition.steps.length === 0) {
      throw new Error(`KeywordResearchAgent (ID: ${this.agentDefinition.id}) requires at least one step in its definition.`);
    }
  }

  public async invokeAction(actionName: string, params: any, callingAgentId?: string, planId?: string): Promise<LLMServiceResponse> {
    switch (actionName) {
      case 'generateKeywords':
        if (!params || typeof params.topic !== 'string') {
          return { text: null, error: "Missing or invalid 'topic' parameter for generateKeywords action." };
        }
        return this.generateKeywordsInternal(params.topic, planId);
      default:
        return { text: null, error: `Action "${actionName}" not supported by KeywordResearchAgent.` };
    }
  }

  private async generateKeywordsInternal(topic: string, planId?: string): Promise<LLMServiceResponse> {
    // The primary step for this agent is assumed to be the first one in its definition.
    const primaryStep = this.agentDefinition.steps[0];
    if (!primaryStep) {
        const errorMsg = "Primary step for keyword generation is not defined.";
        return { text: null, error: errorMsg };
    }

    // Example instruction from predef_keyword_researcher_step_1:
    // "Generate 10-15 relevant SEO keywords for the topic: \"{{topic}}\".\nReturn the keywords as a comma-separated list. Do not include numbers or bullet points, just the list.\nExample: keyword one, keyword two, keyword three"
    const prompt = primaryStep.instruction.replace("{{topic}}", topic);

    return this.callLlMAndRecord(primaryStep.name, prompt, { topic }, planId);
  }
}

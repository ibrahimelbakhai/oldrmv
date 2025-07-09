
import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters as GeminiGenerateContentParameters } from "@google/genai";
import { GEMINI_TEXT_MODEL, DEFAULT_ERROR_MESSAGE } from '../constants';
import { MetaTags, GroundingMetadata, AgentStepConfig, AgentStep } from '../types';

if (!process.env.API_KEY) {
  console.warn("Global Google Gemini API key (process.env.API_KEY) is missing. Steps configured for 'google_gemini' provider without their own key will fail if this is not set. Refer to README.md for global configuration.");
}
const globalGeminiAI = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;


export interface GenerateContentOptionsInternal extends AgentStepConfig {
  prompt: string;
  model: string; 
  providerType: AgentStep['providerType'];
  apiEndpoint?: string; 
  systemInstruction?: string;
  apiKey?: string; 

  agentId?: string;
  stepId?: string;
  planId?: string;
}

export interface LLMServiceResponse {
  text: string | null;
  error: string | null;
  groundingMetadata?: GroundingMetadata;
  requestOptions?: GenerateContentOptionsInternal; // For debugging or analytics
}

// Interface to correctly type the merged step config with global instruction
interface EffectiveStepConfigForService extends AgentStep {
  globalSystemInstruction?: string;
}

export const generateContentInternal = async (options: GenerateContentOptionsInternal): Promise<LLMServiceResponse> => {
  if (!options.providerType) {
    return { text: null, error: "LLM Provider type not specified in agent step.", requestOptions: options };
  }
  if (!options.model) {
    return { text: null, error: "LLM Model not specified in agent step.", requestOptions: options };
  }

  if (options.providerType === 'google_gemini') {
    return generateContentGemini(options);
  } else if (options.providerType === 'generic_rest') {
    return generateContentGenericRest(options);
  } else {
    return { text: null, error: `Unsupported LLM provider type: ${options.providerType}`, requestOptions: options };
  }
};

const generateContentGemini = async (options: GenerateContentOptionsInternal): Promise<LLMServiceResponse> => {
  const resolvedApiKey = options.apiKey || process.env.API_KEY;

  if (!resolvedApiKey) {
    return { text: null, error: "Google Gemini API key is not configured for this step and no global key (process.env.API_KEY) is set.", requestOptions: options };
  }

  let currentAI: GoogleGenAI;
  if (options.apiKey && options.apiKey !== process.env.API_KEY) {
    try {
      currentAI = new GoogleGenAI({ apiKey: options.apiKey });
    } catch (e:any) {
       console.error("Failed to initialize GoogleGenAI with step-specific API key:", e);
       return { text: null, error: `Invalid step-specific API key for Gemini: ${e.message}`, requestOptions: options };
    }
  } else if (globalGeminiAI) {
    currentAI = globalGeminiAI;
  } else {
     return { text: null, error: "Google Gemini API key not available (global key missing or invalid).", requestOptions: options };
  }

  try {
    const requestParams: GeminiGenerateContentParameters = {
      model: options.model,
      contents: options.prompt,
      config: {},
    };

    if (requestParams.config) {
        if (options.systemInstruction) {
            requestParams.config.systemInstruction = options.systemInstruction;
        }
        if (options.isJsonOutput) {
            requestParams.config.responseMimeType = "application/json";
        }
        if (options.disableThinking && (options.model === GEMINI_TEXT_MODEL || options.model?.toLowerCase().includes('flash'))) {
            requestParams.config.thinkingConfig = { thinkingBudget: 0 };
        }
        if (options.temperature !== undefined) requestParams.config.temperature = options.temperature;
        if (options.topK !== undefined) requestParams.config.topK = options.topK;
        if (options.topP !== undefined) requestParams.config.topP = options.topP;
    }

    const response: GenerateContentResponse = await currentAI.models.generateContent(requestParams);
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return { text: response.text, error: null, groundingMetadata, requestOptions: options };

  } catch (error: any) {
    console.error("Google Gemini API call failed:", error);
    const message = error.message || DEFAULT_ERROR_MESSAGE;
    if (message.toLowerCase().includes("api key not valid") || message.toLowerCase().includes("permission denied") || message.toLowerCase().includes("invalid api key")) {
        return { text: null, error: `Gemini API Error: Invalid API Key or insufficient permissions. Ensure the key is correct and activated.`, requestOptions: options };
    }
    return { text: null, error: `Gemini API Error: ${message}`, requestOptions: options };
  }
};

const generateContentGenericRest = async (options: GenerateContentOptionsInternal): Promise<LLMServiceResponse> => {
  if (!options.apiEndpoint) {
    return { text: null, error: "API Endpoint is not configured for 'generic_rest' provider step.", requestOptions: options };
  }

  const requestBody: any = {
    model: options.model,
    prompt: options.prompt, 
  };
  if (options.systemInstruction) requestBody.system_instruction = options.systemInstruction;
  if (options.temperature !== undefined) requestBody.temperature = options.temperature;
  if (options.topK !== undefined) requestBody.top_k = options.topK;
  if (options.topP !== undefined) requestBody.top_p = options.topP;
  if (options.isJsonOutput) requestBody.response_format = { type: "json_object" }; 

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (options.apiKey) {
    headers['Authorization'] = `Bearer ${options.apiKey}`;
  }

  try {
    const response = await fetch(options.apiEndpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorBodyText = "Could not retrieve error body.";
      try { errorBodyText = await response.text(); } catch (e) { /* ignore */ }
      console.error(`Generic REST API Error (${response.status}): ${errorBodyText}`);
      return { text: null, error: `Generic REST API Error (${response.status}): ${response.statusText}. Details: ${errorBodyText.substring(0, 150)}...`, requestOptions: options };
    }

    const responseData = await response.json();
    let extractedText: string | null = null;

    if (typeof responseData.text === 'string') extractedText = responseData.text;
    else if (typeof responseData.response === 'string') extractedText = responseData.response;
    else if (typeof responseData.generated_text === 'string') extractedText = responseData.generated_text;
    else if (responseData.choices && Array.isArray(responseData.choices) && responseData.choices.length > 0) {
      if (responseData.choices[0].text && typeof responseData.choices[0].text === 'string') extractedText = responseData.choices[0].text;
      else if (responseData.choices[0].message && responseData.choices[0].message.content && typeof responseData.choices[0].message.content === 'string') extractedText = responseData.choices[0].message.content;
    } else if (typeof responseData === 'string') {
        extractedText = responseData;
    }
    
    if (extractedText === null && options.isJsonOutput && typeof responseData === 'object') {
      try {
        extractedText = JSON.stringify(responseData, null, 2);
      } catch (e) {
        console.warn("Failed to stringify JSON object for generic REST response:", e);
         extractedText = "Received complex object, failed to stringify.";
      }
    }

    if (extractedText === null) {
        console.warn("Could not extract text from generic REST API response. Response data:", responseData);
        return { text: null, error: "Could not extract meaningful text from generic REST API response.", requestOptions: options };
    }

    return { text: extractedText, error: null, requestOptions: options };

  } catch (error: any) {
    console.error("Generic REST API call failed (network or parsing error):", error);
    return { text: null, error: `Generic REST API Network/Parsing Error: ${error.message}`, requestOptions: options };
  }
};


// --- Wrapper functions for specific SEO tools ---
// These are being refactored into their respective Agent classes.
// They are kept here temporarily if other components still rely on them directly,
// but the goal is to phase them out from direct use by UI components.

export const generateContentOutline = async (
  topic: string,
  agentId: string,
  stepId: string,
  effectiveStepConfig: EffectiveStepConfigForService
): Promise<LLMServiceResponse> => {
  const prompt = effectiveStepConfig.instruction.replace("{{topic}}", topic); // Assuming placeholder replacement
  return generateContentInternal({
    prompt, agentId, stepId,
    model: effectiveStepConfig.model,
    providerType: effectiveStepConfig.providerType,
    apiEndpoint: effectiveStepConfig.apiEndpoint,
    apiKey: effectiveStepConfig.apiKey,
    temperature: effectiveStepConfig.temperature,
    topK: effectiveStepConfig.topK,
    topP: effectiveStepConfig.topP,
    isJsonOutput: effectiveStepConfig.isJsonOutput,
    disableThinking: effectiveStepConfig.disableThinking,
    systemInstruction: effectiveStepConfig.globalSystemInstruction, // Pass agent's global instruction
  });
};

export const writeContentPiece = async (
  topic: string, 
  contentType: string = "an introductory paragraph", 
  length: string = "approximately 100 words", 
  agentId: string, 
  stepId: string, 
  effectiveStepConfig: EffectiveStepConfigForService
): Promise<LLMServiceResponse> => {
  // Assuming effectiveStepConfig.instruction is like: "Write {{contentType}} about \"{{topic}}\".\nThe content should be {{length}}."
  const prompt = effectiveStepConfig.instruction
    .replace("{{contentType}}", contentType)
    .replace("{{topic}}", topic)
    .replace("{{length}}", length);
    
  return generateContentInternal({
    prompt, agentId, stepId,
    model: effectiveStepConfig.model,
    providerType: effectiveStepConfig.providerType,
    apiEndpoint: effectiveStepConfig.apiEndpoint,
    apiKey: effectiveStepConfig.apiKey,
    temperature: effectiveStepConfig.temperature,
    topK: effectiveStepConfig.topK,
    topP: effectiveStepConfig.topP,
    isJsonOutput: effectiveStepConfig.isJsonOutput,
    disableThinking: effectiveStepConfig.disableThinking,
    systemInstruction: effectiveStepConfig.globalSystemInstruction,
  });
};

export const generateMetaTags = async (
  contentSummary: string, 
  agentId: string, 
  stepId: string, 
  effectiveStepConfig: EffectiveStepConfigForService
): Promise<{ tags: MetaTags | null; error: string | null, requestOptions?: GenerateContentOptionsInternal }> => {
  // Assuming effectiveStepConfig.instruction is like: "Generate an SEO-friendly meta title... for content summary:\n\"{{contentSummary}}\"\n\nRespond strictly in JSON..."
  const prompt = effectiveStepConfig.instruction.replace("{{contentSummary}}", contentSummary);
  
  const response = await generateContentInternal({
    prompt, agentId, stepId,
    model: effectiveStepConfig.model,
    providerType: effectiveStepConfig.providerType,
    apiEndpoint: effectiveStepConfig.apiEndpoint,
    apiKey: effectiveStepConfig.apiKey,
    temperature: effectiveStepConfig.temperature,
    topK: effectiveStepConfig.topK,
    topP: effectiveStepConfig.topP,
    isJsonOutput: true, // Meta tags specifically request JSON output
    disableThinking: effectiveStepConfig.disableThinking,
    systemInstruction: effectiveStepConfig.globalSystemInstruction,
  });

  if (response.error) {
    return { tags: null, error: response.error, requestOptions: response.requestOptions };
  }
  if (!response.text) {
    return { tags: null, error: "No content received from API for meta tags.", requestOptions: response.requestOptions };
  }

  try {
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    if (parsed.title && parsed.description) {
      return { tags: parsed as MetaTags, error: null, requestOptions: response.requestOptions };
    }
    return { tags: null, error: "Invalid JSON structure received for meta tags. Expected 'title' and 'description' keys.", requestOptions: response.requestOptions };
  } catch (e) {
    console.error("Failed to parse meta tags JSON:", e, "Raw text:", response.text);
    return { tags: null, error: "Failed to parse JSON response for meta tags. Ensure the AI is returning valid JSON.", requestOptions: response.requestOptions };
  }
};

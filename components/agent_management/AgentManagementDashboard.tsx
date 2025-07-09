
import React, { useState, useEffect, useCallback } from 'react';
import { AgentDefinition, AgentStep } from '../../types';
import { GEMINI_AGENT_DEFINITIONS_LS_KEY, GEMINI_TEXT_MODEL } from '../../constants';
import SectionCard from '../shared/SectionCard';
import AgentList from './AgentList';
import AgentForm from './AgentForm';

const generateId = () => `id_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to ensure all necessary fields are present on an agent step
const sanitizeAgentStep = (step: Partial<AgentStep>): AgentStep => {
  return {
    id: step.id || generateId(),
    name: step.name || 'Untitled Step',
    instruction: step.instruction || '',
    model: step.model || GEMINI_TEXT_MODEL,
    providerType: step.providerType || 'google_gemini',
    apiEndpoint: step.apiEndpoint || '',
    apiKey: step.apiKey || '', 
    temperature: step.temperature,
    topK: step.topK,
    topP: step.topP,
    isJsonOutput: !!step.isJsonOutput,
    disableThinking: !!step.disableThinking,
  };
};

// Helper to ensure all necessary fields are present on an agent definition
const sanitizeAgentDefinition = (agent: Partial<AgentDefinition>): AgentDefinition => {
  const now = new Date().toISOString();
  return {
    id: agent.id || generateId(),
    name: agent.name || 'Untitled Agent',
    description: agent.description || '',
    globalSystemInstruction: agent.globalSystemInstruction || '',
    steps: (agent.steps || []).map(sanitizeAgentStep),
    isPredefined: !!agent.isPredefined,
    documentationPurpose: agent.documentationPurpose || '',
    documentationWorkflow: agent.documentationWorkflow || '',
    documentationOutputExample: agent.documentationOutputExample || '',
    ragResources: (agent.ragResources || []).map(r => ({
        ...r,
        id: r.id || generateId(),
        name: r.name || 'Untitled Resource',
        type: r.type || 'text_content',
        lastModified: r.lastModified || now,
    })),
    tools: (agent.tools || []).map(t => ({
        ...t,
        id: t.id || generateId(),
        name: t.name || 'Untitled Tool',
        description: t.description || '',
        method: t.method || 'GET',
        parameters: (t.parameters || []).map(p => ({...p, id: p.id || generateId()})),
        credentials: (t.credentials || []).map(c => ({...c, id: c.id || generateId()})),
        lastModified: t.lastModified || now,
    })),
  };
};


const predefinedAgentsRaw: Partial<AgentDefinition>[] = [
  {
    id: 'predef_keyword_researcher',
    name: 'Keyword Researcher Agent',
    description: "Generates a list of SEO keywords based on a main topic.",
    globalSystemInstruction: "You are an expert SEO keyword analyst. Your goal is to provide comprehensive and relevant keyword lists.",
    isPredefined: true,
    documentationPurpose: "To quickly generate a list of relevant SEO keywords for a given topic, aiding in content strategy and optimization.",
    documentationWorkflow: "The agent takes a user-supplied topic. It then uses a single step to prompt the Gemini model to generate 10-15 keywords related to that topic. The output is expected as a comma-separated list. The instruction includes `{{topic}}` as a placeholder for dynamic input if an execution engine were built.",
    documentationOutputExample: `Example for topic "sustainable gardening":\nsustainable gardening tips, organic vegetable gardening, companion planting, permaculture design, soil health for gardening, water conservation in gardens, non-toxic pest control, composting at home, urban gardening ideas, eco-friendly garden tools`,
    steps: [
      {
        id: 'predef_keyword_researcher_step_1',
        name: 'Generate Keywords',
        instruction: `Generate 10-15 relevant SEO keywords for the topic: "{{topic}}".\nReturn the keywords as a comma-separated list. Do not include numbers or bullet points, just the list.\nExample: keyword one, keyword two, keyword three`,
        model: GEMINI_TEXT_MODEL,
        providerType: 'google_gemini',
      },
    ],
  },
  {
    id: 'predef_content_planner',
    name: 'Content Planner Agent',
    description: "Creates a structured content outline for a given topic.",
    globalSystemInstruction: "You are a strategic content planner. You excel at creating well-structured and comprehensive outlines that guide content creation.",
    isPredefined: true,
    documentationPurpose: "To generate a structured blog post outline (title, introduction, main sections with sub-points, conclusion) based on a user-provided topic. This helps in organizing content creation.",
    documentationWorkflow: "The agent receives a topic from the user. A single step then instructs the Gemini model to create a detailed outline, specifying the required components like title, intro, main sections, and conclusion. The instruction uses `{{topic}}` as a placeholder.",
    documentationOutputExample: `For topic "benefits of AI in marketing":\n\nTitle: Unlocking Growth: The Transformative Benefits of AI in Modern Marketing\n\nIntroduction: This post will explore how Artificial Intelligence (AI) is revolutionizing marketing strategies, enhancing customer engagement, and driving business growth.\n\nMain Sections:\n1.  Personalization at Scale\n    *   AI-driven customer segmentation\n    *   Tailored content and product recommendations\n    *   Dynamic pricing strategies\n2.  Enhanced Customer Insights\n    *   Predictive analytics for consumer behavior\n    *   Sentiment analysis from social media and reviews\n    *   Improved market research capabilities\n3.  Optimized Marketing Campaigns\n    *   Automated ad bidding and targeting\n    *   AI-powered content creation and curation\n    *   Performance analysis and real-time adjustments\n4.  Improved Customer Service\n    *   AI chatbots for instant support\n    *   Personalized communication automation\n    *   Efficient handling of customer queries\n\nConclusion: Integrating AI into marketing is no longer a luxury but a necessity for businesses aiming to stay competitive and achieve significant ROI through smarter, data-driven strategies.`,
    steps: [
      {
        id: 'predef_content_planner_step_1',
        name: 'Generate Content Outline',
        instruction: `Create a comprehensive blog post outline for the topic: "{{topic}}".\nThe outline should include:\n1. A compelling Title.\n2. A brief Introduction (1-2 sentences describing what it will cover).\n3. At least 3-5 Main Sections, each with 2-3 descriptive sub-points.\n4. A brief Conclusion (1-2 sentences summarizing key takeaways).\nFormat the response clearly.`,
        model: GEMINI_TEXT_MODEL,
        providerType: 'google_gemini',
      },
    ],
  },
  {
    id: 'predef_content_writer',
    name: 'Content Writer Agent',
    description: "Drafts a specific piece of content based on topic, type, and length.",
    globalSystemInstruction: "You are a versatile and skilled content writer. You can adapt your style and tone to fit the requested content type and topic.",
    isPredefined: true,
    documentationPurpose: "To generate a piece of written content (e.g., introductory paragraph, blog section) based on user-defined topic, content type, and desired length.",
    documentationWorkflow: "The agent uses placeholders `{{topic}}`, `{{contentType}}`, and `{{length}}` in its step instruction. An execution engine would fill these. The single step prompts Gemini to write the content according to these parameters, focusing on an informative and engaging tone.",
    documentationOutputExample: `If {{contentType}} is 'an introductory paragraph', {{topic}} is 'the future of AI', and {{length}} is 'approximately 100 words':\n\nThe artificial intelligence (AI) landscape is evolving at an unprecedented pace, promising a future where intelligent systems are deeply integrated into every facet of our lives. From revolutionizing industries like healthcare and transportation to transforming how we work, learn, and interact, AI's potential is immense. However, this rapid advancement also brings forth complex challenges and ethical considerations that we must navigate. This exploration delves into the anticipated trajectory of AI, examining both its groundbreaking opportunities and the critical questions it poses for society, aiming to paint a clearer picture of what the future powered by artificial intelligence might hold.`,
    steps: [
      {
        id: 'predef_content_writer_step_1',
        name: 'Write Content Piece',
        instruction: `Write {{contentType}} about "{{topic}}".\nThe content should be {{length}}.\nEnsure the tone is informative and engaging.\n\n---\nExample of how to fill in placeholders if running this step:\nIf {{contentType}} is 'an introductory paragraph', {{topic}} is 'the future of AI', and {{length}} is 'approximately 100 words',\nthe effective instruction becomes:\nWrite an introductory paragraph about "the future of AI".\nThe content should be approximately 100 words.\nEnsure the tone is informative and engaging.\n---`,
        model: GEMINI_TEXT_MODEL,
        providerType: 'google_gemini',
      },
    ],
  },
  {
    id: 'predef_meta_tag_generator',
    name: 'Meta Tag Generator Agent',
    description: "Generates SEO-friendly meta titles and descriptions (JSON output).",
    globalSystemInstruction: "You are an SEO optimization specialist focusing on creating compelling and effective meta tags.",
    isPredefined: true,
    documentationPurpose: "To generate an SEO-friendly meta title (under 60 characters) and meta description (under 160 characters) for a webpage, based on a summary of its content. The output is in JSON format.",
    documentationWorkflow: "The agent takes a `{{contentSummary}}` as input (placeholder). Its single step instructs Gemini to produce a JSON object containing 'title' and 'description' keys, adhering to character limits for SEO best practices. The step is configured for JSON output mode.",
    documentationOutputExample: `For content summary: "A comprehensive guide to baking sourdough bread at home, covering starters, kneading techniques, and baking schedules."\n\n{\n  "title": "Ultimate Sourdough Bread Baking Guide for Beginners",\n  "description": "Learn to bake delicious sourdough bread at home! Our guide covers starters, kneading, proofing, and baking schedules for the perfect loaf."\n}`,
    steps: [
      {
        id: 'predef_meta_tag_generator_step_1',
        name: 'Generate Meta Tags (JSON)',
        instruction: `Generate an SEO-friendly meta title (under 60 characters) and meta description (under 160 characters) for a webpage with the following content summary:\n"{{contentSummary}}"\n\nRespond strictly in JSON format with two keys: "title" and "description".\nExample:\n{\n  "title": "Example Meta Title",\n  "description": "This is an example meta description for the webpage."\n}`,
        model: GEMINI_TEXT_MODEL,
        isJsonOutput: true,
        providerType: 'google_gemini',
      },
    ],
  },
  {
    id: 'predef_maestro_orchestrator',
    name: 'Maestro Orchestrator Agent',
    description: 'A master agent that analyzes user goals, orchestrates plans using other worker agents, and assists in designing new agents through conversation.',
    globalSystemInstruction: `You are a "Maestro Orchestrator AI". Your capabilities are:
1.  **Orchestrate Execution Plans:** Analyze a high-level user goal and a provided JSON summary of "Worker Agents". Devise a comprehensive, step-by-step execution plan.
    **CRITICALLY IMPORTANT: Output your plan in the following STRICT Markdown format:**
    \`\`\`markdown
    ## Maestro Orchestration Plan
    **User Goal:** [The User's Goal Clearly Stated Here]
    ---
    **Plan Step 1: [Concise Task Name for Step 1]**
    *   **Task Description:** [A brief, clear description of what this step aims to achieve.]
    *   **Assigned Agent:** \`[Exact Name of the Worker Agent to Use]\`
    *   **Assigned Agent Step:** \`[Exact Name of the Step within the Assigned Agent]\`
    *   **Input:** [Details of the input required for this step. If it depends on a previous plan step's output, state clearly, e.g., "Output from Plan Step X: <description of expected data>". If user input is needed, specify "User-provided: <description of what user needs to provide>".]
    *   **Output:** [A clear description of the expected output or outcome of this step.]
    ---
    **Plan Step 2: [Concise Task Name for Step 2]**
    *   **Task Description:** [Description for step 2...]
    *   **Assigned Agent:** \`[Agent Name]\`
    *   **Assigned Agent Step:** \`[Step Name]\`
    *   **Input:** [Input for step 2...]
    *   **Output:** [Output for step 2...]
    ---
    (Continue with more steps as needed, following the EXACT format above for each step. Ensure "---" separators between steps.)
    \`\`\`
    *   If a Worker Agent's step is close but needs adaptation, note the original instruction of that worker's step AND suggest the minor adaptation WITHIN the 'Input' or 'Task Description' of YOUR plan step.
    *   If NO existing Worker Agent or step is suitable for a crucial task, explicitly state in a step:
        *   **Task Description:** CRITICAL GAP: NEW AGENT/STEP REQUIRED - [Describe the required capability].
        *   **Assigned Agent:** \`N/A (New Capability Needed)\`
        *   **Input:** [What this new capability would need as input.]
        *   **Output:** [What this new capability should produce.]

2.  **Design New Agents:** Based on a user's conversational request, define a new agent. Present this agent definition in a structured Markdown format (using ### New Agent Design, **Agent Name:**, **Description:**, **Global System Instruction:**, **Documentation:**, **Steps:** with sub-bullets for Instruction, Model, Config Notes).

3.  **Engage Conversationally:** Respond to user queries about your capabilities, refine requests, or provide information related to agent orchestration and design.

You will be provided with the User Goal/Request and, when relevant for orchestration, a JSON summary of all available Worker Agents. Base ALL your assignments and reasoning on the provided Worker Agent details. Do not invent agents or capabilities not listed unless explicitly designing a new one or identifying a CRITICAL GAP during planning.
`,
    isPredefined: true,
    documentationPurpose: `To act as a high-level AI planner and assistant.
    1.  **Orchestration:** Given a user's objective and a list of all available 'Worker Agents', the Maestro designs a workflow. It breaks down the objective into tasks, assigns tasks to appropriate Worker Agents/steps, and outlines the sequence, including data handoffs.
    2.  **Agent Design:** Through conversational interaction, helps users design new AI agents by providing structured definitions (name, description, system instruction, documentation, steps with prompts, etc.).`,
    documentationWorkflow: `**For Orchestration:**
1.  User provides a high-level goal (e.g., "Develop and optimize a complete blog post about 'the future of renewable energy'.").
2.  The Maestro tool internally gathers details of ALL other defined agents and provides this as a JSON summary to the Maestro Agent's core LLM call.
3.  The Maestro Agent processes the goal and agent summary, outputting a Markdown plan in a **strict, parsable format**.

**For Agent Design (via Chat):**
1.  User chats with Maestro, requesting a new agent (e.g., "Can you help me build an agent that translates text?").
2.  Maestro asks clarifying questions if needed, then provides a structured agent definition in Markdown.
3.  User can copy this definition to create the new agent in the "Agent Management" section.`,
    documentationOutputExample: `**Example Orchestration Plan Snippet (Strict Format):**
\`\`\`markdown
## Maestro Orchestration Plan
**User Goal:** Develop and optimize a complete blog post about 'the future of renewable energy'.
---
**Plan Step 1: Keyword Research for Renewable Energy**
*   **Task Description:** Identify primary and long-tail keywords related to 'the future of renewable energy'.
*   **Assigned Agent:** \`Keyword Researcher Agent\`
*   **Assigned Agent Step:** \`Generate Keywords\`
*   **Input:** User-provided: Main topic "the future of renewable energy".
*   **Output:** Comma-separated list of 10-15 relevant keywords.
---
**Plan Step 2: Create Content Outline**
*   **Task Description:** Develop a comprehensive blog post outline using the keywords from the previous step.
*   **Assigned Agent:** \`Content Planner Agent\`
*   **Assigned Agent Step:** \`Generate Content Outline\`
*   **Input:** Output from Plan Step 1: Keyword List. User-provided: Main topic "the future of renewable energy".
*   **Output:** A structured blog post outline (Title, Intro, Main Sections, Conclusion).
---
\`\`\`

**Example New Agent Design Output Snippet (from Chat):**
### New Agent Design
**Agent Name:** Quick Translator Agent
**Description:** Translates text between specified source and target languages.
**Global System Instruction:** You are a precise and efficient translation assistant.
**Documentation:**
    *   **Purpose:** To provide quick translations of text snippets.
    *   **Workflow:** User provides text, source language, and target language. The agent uses a single step to call the LLM for translation.
    *   **Output Example:** If input is "Hello" (English to Spanish), output is "Hola".
**Steps:**
    1.  **Step Name:** Perform Translation
        *   **Instruction:** "Translate the following text from {{source_language}} to {{target_language}}:\n\n{{text_to_translate}}"
        *   **Model:** gemini-2.5-flash-preview-04-17
        *   **Config Notes:** Default temperature.
`,
    steps: [
      {
        id: 'predef_maestro_orchestrator_step_1',
        name: 'Process User Request (Plan, Chat, or Design)', 
        instruction: `User Goal/Request (this will be filled by the UI based on context - orchestration, chat, or advanced prompt):\n{{user_goal_or_chat_input_or_advanced_prompt}}\n\nAvailable Worker Agents (JSON Summary, provided if relevant for orchestration or context):\n{{available_agents_json_summary}}\n---\nBased on your global system instruction and the user's input above, process the request.
If the request is for an orchestration plan, generate it in the STICTLY DEFINED Markdown format.
If the request is a chat message or a request to design an agent, respond conversationally and provide the agent design in the specified structured Markdown format if applicable.
If this is an advanced prompt, respond directly to it.`,
        model: GEMINI_TEXT_MODEL,
        providerType: 'google_gemini',
      },
    ],
  },
  {
    id: 'predef_project_manager_ai',
    name: 'Project Manager AI Agent',
    description: 'Manages projects, tasks, and team members through conversational commands.',
    isPredefined: true,
    globalSystemInstruction: `You are an AI Project Manager. Your role is to help users manage their projects, tasks, and team members.
When a user asks you to perform an action, respond clearly and confirm the action. Try to provide a hint of structured data in your confirmation if possible, so the application can understand it.

Examples of how you should respond:
- If creating a project: "Project '[Project Name]' has been CREATED. You can now add tasks to it."
- If adding a task: "Task '[Task Title]' has been ADDED to project '[Project Name]'."
- If updating task status: "Task '[Task Title]' status has been UPDATED to '[New Status]'."
- If adding a member: "Team member '[Member Name]' has been ADDED."
- If listing items: Provide a clear, bulleted list. Example for projects:
  "Here are your projects:
  * Project Alpha (ID: P1)
  * Project Beta (ID: P2)"
- If an operation fails or details are missing, politely ask for clarification or state what went wrong.

Available actions (steps you have): CreateProject, AddTaskToProject, UpdateTaskStatus, AssignTaskToMember, AddTeamMember, ListProjects, ListTasksForProject, ListTeamMembers.
Use these step names internally to understand the user's intent if they are not explicit.
You are interacting with a system that will try to parse your confirmations to update a real data store.
    `,
    documentationPurpose: `To assist users in managing software projects, including tracking tasks, assigning them to team members, and monitoring progress. This agent acts as a conversational interface to a simplified project management system.`,
    documentationWorkflow: `
1.  User interacts with the agent via a chat-like UI in the "Project Management" tool.
2.  User issues commands like "Create a project named 'Q3 Marketing Campaign'", "Add task 'Draft blog post' to 'Q3 Marketing Campaign'", "Set task 'Draft blog post' to 'In Progress'", "List all my projects".
3.  The UI sends this command to the appropriate step of the "Project Manager AI Agent".
4.  The AI agent processes the command based on its system instruction and step instructions.
5.  The AI responds with a confirmation (e.g., "Project 'Q3 Marketing Campaign' has been CREATED.").
6.  The UI attempts to parse this confirmation and, if successful, updates the actual project data (stored in localStorage) via the 'projectDataService'.
7.  The UI then refreshes to show the updated list of projects, tasks, or members.
    `,
    documentationOutputExample: `
User: Create a new project called "App Launch Prep"
AI: Project "App Launch Prep" has been CREATED. You can now add tasks to it.

User: Add task "Finalize UI designs" to project "App Launch Prep"
AI: Task "Finalize UI designs" has been ADDED to project "App Launch Prep".

User: What are my projects?
AI: Here are your projects:
* App Launch Prep (ID: project_167...)
* Website Redesign (ID: project_166...)

User: Update task "Finalize UI designs" to Completed
AI: Task "Finalize UI designs" status has been UPDATED to "Completed".
    `,
    steps: [
      { id: 'pm_step_create_project', name: 'CreateProject', instruction: "User wants to create a new project. User input: {{userInput}}. Extract project name and optional description. Confirm creation with 'Project \"[Name]\" has been CREATED.'", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'pm_step_add_task', name: 'AddTaskToProject', instruction: "User wants to add a task. User input: {{userInput}}. Extract task title, target project name, and optional description, assignee, due date. Confirm with 'Task \"[Title]\" has been ADDED to project \"[ProjectName]\".'", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'pm_step_update_status', name: 'UpdateTaskStatus', instruction: "User wants to update a task's status. User input: {{userInput}}. Extract task title/ID and the new status. Confirm with 'Task \"[Title]\" status has been UPDATED to \"[NewStatus]\".'", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'pm_step_assign_task', name: 'AssignTaskToMember', instruction: "User wants to assign a task. User input: {{userInput}}. Extract task title/ID and member name. Confirm with 'Task \"[Title]\" has been ASSIGNED to \"[MemberName]\".'", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'pm_step_add_member', name: 'AddTeamMember', instruction: "User wants to add a team member. User input: {{userInput}}. Extract member name and optional role. Confirm with 'Team member \"[Name]\" has been ADDED.'", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'pm_step_list_projects', name: 'ListProjects', instruction: "User wants to list projects. Respond with 'Here are your projects:' followed by a bulleted list: '* [Project Name] (ID: [ID_Placeholder])'", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'pm_step_list_tasks', name: 'ListTasksForProject', instruction: "User wants to list tasks for a project. User input: {{userInput}}. Extract project name/ID and optional status filter. Respond with 'Tasks for project \"[ProjectName]\":' followed by a bulleted list: '* [Task Title] (Status: [Status], Assignee: [Name])'", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'pm_step_list_members', name: 'ListTeamMembers', instruction: "User wants to list team members. Respond with 'Here are your team members:' followed by a bulleted list: '* [Member Name] (Role: [Role])'", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  // --- Social Media Agents START ---
  {
    id: 'predef_social_media_strategist',
    name: 'Social Media Strategist AI',
    description: 'Develops overall social media strategies, plans campaigns, and generates content calendars. Delegates specific content creation.',
    isPredefined: true,
    globalSystemInstruction: `You are an expert Social Media Strategist AI. Your role is to help users define their social media goals, identify target audiences, develop campaign concepts, and create high-level content calendars. You should understand the nuances of different platforms and guide users on best practices. When asked for specific content, you should suggest which platform-specific AI (like Twitter Content AI or LinkedIn AI) would be best suited to draft it. You do not draft individual posts unless specifically asked to generate an example as part of a strategy. Your output for strategies and calendars should be clear, actionable, and well-structured.`,
    documentationPurpose: `To assist users in planning and strategizing their social media presence across various platforms. It helps create campaign briefs, content calendars, and provides high-level guidance.`,
    documentationWorkflow: `1. User provides goals, target audience, key messages, or campaign themes.
2. The Strategist AI processes this input through its steps (e.g., DevelopCampaignBrief, GenerateContentCalendar).
3. It outputs strategic documents, content ideas, and suggests which specialized AI agents should draft the actual posts.
4. Users can take these strategies and content ideas to the Content Creation tab to generate drafts using platform-specific AIs.`,
    documentationOutputExample: `**Campaign Brief Example:**
    *   **Campaign Title:** "Sustainable Futures Initiative Q3"
    *   **Goal:** Increase awareness of our eco-friendly product line by 20%.
    *   **Target Audience:** Eco-conscious millennials, aged 25-40, interested in sustainable living.
    *   **Key Message:** "Live sustainably without compromising on quality."
    *   **Platforms:** Instagram (visuals), Twitter (quick updates & engagement), LinkedIn (thought leadership).
    *   **Content Pillars:** Product showcases, educational tips on sustainability, user-generated content features.

    **Content Calendar Snippet (Conceptual):**
    *   **Week 1, Mon (Twitter):** Teaser about new eco-product. (Assign to: Twitter Content AI - DraftTweet)
    *   **Week 1, Wed (LinkedIn):** Article idea: "The Future of Sustainable Packaging". (Assign to: LinkedIn AI - DraftLinkedInArticleIdea)
    *   **Week 1, Fri (Instagram):** High-quality image of product in use. (Suggest: Generate image idea, then pass to user for creation)
    `,
    steps: [
      { id: 'sm_strat_step_campaign', name: 'DevelopCampaignBrief', instruction: "Based on the user's input: {{userInput_campaignGoals}}, {{userInput_targetAudience}}, {{userInput_keyMessages}}, develop a comprehensive social media campaign brief. Include sections for Campaign Title, Goal, Target Audience, Key Message(s), Suggested Platforms, and Content Pillars. Be specific and actionable.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_strat_step_calendar', name: 'GenerateContentCalendar', instruction: "Given a campaign brief or general themes: {{userInput_themes_or_brief}}, and a duration (e.g., '1 month', '1 week'): {{userInput_duration}}, generate a high-level content calendar. For each suggested post, specify the target platform, a brief content idea/theme, and optionally suggest which type of AI agent (e.g., 'Twitter AI', 'LinkedIn AI') or action (e.g., 'User to create image') would be best for creating the content. Focus on a diverse mix of content types suitable for the platforms.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_strat_step_advice', name: 'GetGeneralStrategyAdvice', instruction: "The user is asking for general social media strategy advice: {{userInput_query}}. Provide clear, actionable advice, potentially citing best practices or platform-specific considerations. If the query is very broad, try to narrow it down or offer different angles.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  {
    id: 'predef_twitter_content_ai',
    name: 'Twitter / X Content AI',
    description: 'Specializes in drafting engaging tweets, generating relevant hashtags, and suggesting image/video ideas for Twitter / X.',
    isPredefined: true,
    globalSystemInstruction: `You are an expert Twitter / X Content AI. You excel at crafting concise, impactful, and engaging tweets (within character limits). You understand how to use hashtags effectively, call to actions, and what kind of visuals work well on Twitter / X. Your tone should be adaptable but generally conversational and current. If a Twitter handle is provided as {{twitter_handle}}, incorporate it naturally if relevant (e.g., for mentions, or to refer to the account).`,
    documentationPurpose: `To generate content specifically tailored for Twitter / X, including drafting tweets, brainstorming hashtags, and suggesting visual content ideas.`,
    documentationWorkflow: `1. User provides a topic, key message, link, or instruction for a tweet.
2. The AI uses one of its steps (e.g., DraftTweet, GenerateTwitterHashtags) to generate the content.
3. The output can be used to create a social post draft in the application.
4. It can conceptually use a provided Twitter handle (e.g., from 'Platform Credentials') for context.`,
    documentationOutputExample: `**Draft Tweet Input:** "New blog post about AI in marketing: [link]"
**AI Output (Tweet Draft):** "Unlocking marketing's future! 🚀 Our latest blog post explores how AI is transforming strategies and driving growth. Read it here: [link] #AIMarketing #DigitalTransformation #FutureTech"
**AI Output (Hashtag Suggestion):** #AI, #MarketingStrategy, #TechNews, #Innovation
**AI Output (Image Idea):** "A futuristic graphic with interconnected nodes representing AI and marketing channels."
    `,
    steps: [
      { id: 'sm_twitter_step_draft', name: 'DraftTweet', instruction: "Draft an engaging and concise tweet (max 280 characters) about: {{userInput_topic_or_message}}. If a link is provided: {{userInput_link}}, include it. Use 2-3 relevant hashtags. If a Twitter handle {{twitter_handle}} is provided, you can use it for context or as the presumed authoring account. Focus on clarity and a strong call to action if appropriate.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_twitter_step_hashtags', name: 'GenerateTwitterHashtags', instruction: "Generate 5-7 relevant and effective Twitter hashtags for a post about: {{userInput_topic}}. Include a mix of general and niche hashtags.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_twitter_step_visual_idea', name: 'SuggestTweetVisualIdea', instruction: "Suggest a compelling image or short video idea for a tweet about: {{userInput_topic}}. Describe the visual concept briefly.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_twitter_step_thread_idea', name: 'BrainstormTweetThreadIdea', instruction: "Brainstorm a 3-5 tweet thread idea on the topic: {{userInput_topic}}. Provide the main point for each tweet in the thread.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  {
    id: 'predef_linkedin_content_ai',
    name: 'LinkedIn Professional Post AI',
    description: 'Specializes in writing professional, insightful content for LinkedIn, including article ideas, status updates, and engagement strategies.',
    isPredefined: true,
    globalSystemInstruction: `You are an expert LinkedIn Content AI. You focus on creating professional, insightful, and value-driven content suitable for a LinkedIn audience. This includes drafting compelling status updates, brainstorming article ideas, and suggesting ways to engage with a professional network. Your tone should be authoritative yet approachable. If a LinkedIn profile/company name {{linkedin_profile_context}} is provided, use it as context for the content's perspective.`,
    documentationPurpose: `To generate professional content for LinkedIn, such as article outlines, status updates, and strategies for network engagement.`,
    documentationWorkflow: `1. User provides a topic, professional achievement, industry insight, or a question for their network.
2. The AI uses its steps (e.g., DraftLinkedInUpdate, DraftLinkedInArticleIdea) to generate relevant content.
3. Output is suitable for creating drafts for LinkedIn within the application.`,
    documentationOutputExample: `**Draft LinkedIn Update Input:** "Attended a great webinar on future of work."
**AI Output (Update Draft):** "Just attended an insightful webinar on the #FutureOfWork! Key takeaways: the increasing importance of adaptability, continuous learning, and human-centric AI integration. How are you preparing your teams for these shifts? Would love to hear your thoughts. #RemoteWork #Leadership #Upskilling"

**Draft LinkedIn Article Idea Input:** "Topic: AI Ethics in Business"
**AI Output (Article Idea):**
    *   **Title:** Navigating the Maze: A Practical Framework for AI Ethics in Modern Business
    *   **Key Sections:**
        1.  Introduction: Why AI Ethics Matters More Than Ever.
        2.  Core Ethical Principles: Transparency, Fairness, Accountability, Privacy.
        3.  Real-World Case Studies: Successes and Failures.
        4.  Building an Ethical AI Framework: Practical Steps for Organizations.
        5.  The Future: Evolving Challenges and the Role of Regulation.
        6.  Conclusion: Embedding Ethics into Your AI DNA.
    `,
    steps: [
      { id: 'sm_linkedin_step_update', name: 'DraftLinkedInUpdate', instruction: "Draft a professional LinkedIn status update about: {{userInput_topic_or_achievement}}. Aim for engagement by asking a question or sharing a key insight. Include 2-3 relevant professional hashtags. Context: {{linkedin_profile_context}}", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_linkedin_step_article_idea', name: 'DraftLinkedInArticleIdea', instruction: "Brainstorm a compelling LinkedIn article idea (Title and 3-5 key talking points/sections) on the topic: {{userInput_topic}}. Context: {{linkedin_profile_context}}", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_linkedin_step_engagement', name: 'SuggestLinkedInEngagementStrategy', instruction: "Suggest 2-3 actionable ways to increase engagement on LinkedIn related to the topic/industry: {{userInput_topic_or_industry}}. Context: {{linkedin_profile_context}}", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_linkedin_step_comment_response_idea', name: 'GenerateProfessionalCommentResponseIdea', instruction: "A user received this comment on their LinkedIn post: '{{user_comment_text}}'. The original post was about: '{{original_post_topic}}'. Draft a professional and engaging response idea to this comment. Context: {{linkedin_profile_context}}", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  {
    id: 'predef_facebook_content_ai',
    name: 'Facebook Content AI',
    description: 'Creates versatile content for Facebook, including text posts, image/video ideas, and community engagement prompts.',
    isPredefined: true,
    globalSystemInstruction: `You are a Facebook Content AI. You understand how to create engaging content for a diverse Facebook audience. This includes text posts of varying lengths, ideas for compelling images and videos, and prompts to encourage community interaction (questions, polls). Adapt your tone based on the {{facebook_page_context}} if provided.`,
    documentationPurpose: `To generate a variety of content suitable for Facebook, from simple text updates to more elaborate visual content ideas and engagement strategies.`,
    documentationWorkflow: `User provides a topic, event, or general message. The AI uses its steps (DraftFacebookPost, SuggestFacebookVisual, CreateEngagementPrompt) to generate content tailored for Facebook.`,
    documentationOutputExample: `**Draft Facebook Post Input:** "Company picnic next Saturday! Details: [link to details]"
**AI Output (Post Draft):** "Get ready for some fun in the sun! ☀️ Our annual company picnic is happening next Saturday! Expect great food, games, and amazing company. Check out all the details and RSVP here: [link to details]. Can't wait to see you all there! #CompanyCulture #TeamBuilding #SummerFun"
**AI Output (Engagement Prompt):** "What's your favorite potluck dish to bring to a picnic? Share your ideas below! 👇 #CommunityFood"`,
    steps: [
      { id: 'sm_facebook_step_draft_post', name: 'DraftFacebookPost', instruction: "Draft an engaging Facebook post about: {{userInput_topic_or_event}}. If a link is provided: {{userInput_link}}, incorporate it. Use 2-3 relevant hashtags. Context: {{facebook_page_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_facebook_step_visual_idea', name: 'SuggestFacebookVisualIdea', instruction: "Suggest a compelling image or video idea for a Facebook post about: {{userInput_topic}}. Describe the visual, its purpose (e.g., eye-catching, informative), and any text overlay ideas. Context: {{facebook_page_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_facebook_step_engagement_prompt', name: 'CreateFacebookEngagementPrompt', instruction: "Create an engaging question, poll idea, or call-to-action prompt for Facebook related to: {{userInput_topic_or_theme}}. Aim to spark discussion or user interaction. Context: {{facebook_page_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  {
    id: 'predef_instagram_content_ai',
    name: 'Instagram Content AI',
    description: 'Focuses on visual storytelling for Instagram, generating captions, Reels/Stories ideas, and relevant hashtags.',
    isPredefined: true,
    globalSystemInstruction: `You are an Instagram Content AI. You specialize in visual storytelling. Your outputs should include captivating captions, creative ideas for Reels and Stories, and effective hashtag strategies for Instagram. Assume content is primarily visual. Context: {{instagram_profile_context}}.`,
    documentationPurpose: `To generate engaging captions, creative ideas for Instagram Reels and Stories, and discover relevant hashtags to enhance visual content.`,
    documentationWorkflow: `User provides a visual theme, product, or story idea. The AI generates corresponding captions, suggests dynamic Reel/Story concepts, and provides a list of hashtags.`,
    documentationOutputExample: `**Input Topic:** "Launching a new sustainable coffee blend."
**AI Output (Caption):** "Sip sustainably! ☕✨ Our new 'EarthLoom Blend' is here, crafted with 100% organic beans and a whole lotta love for our planet. Discover rich flavor that feels good. Link in bio to taste the difference! #SustainableCoffee #OrganicBeans #EthicalSourcing #NewBlend #CoffeeLover"
**AI Output (Reel Idea):** "Fast-paced montage: Bean sourcing, roasting process, brewing the coffee, a satisfying pour, someone enjoying it. Upbeat, trendy audio. Text overlays: 'From Bean', 'To Brew', 'To You'."
**AI Output (Story Idea):** "Interactive poll: 'How do you take your sustainable coffee? Black / With Milk / Fancy'. Follow up with a 'Did You Know?' fact about the blend's origin."`,
    steps: [
      { id: 'sm_instagram_step_caption', name: 'DraftInstagramCaption', instruction: "Draft a captivating Instagram caption for a post about: {{userInput_visual_theme_or_topic}}. Include a call-to-action and 3-5 relevant hashtags. Context: {{instagram_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_instagram_step_reel_idea', name: 'SuggestInstagramReelIdea', instruction: "Suggest a creative and engaging Instagram Reel idea for: {{userInput_topic_or_product}}. Describe the visual sequence, potential audio, and any text overlays. Context: {{instagram_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_instagram_step_story_idea', name: 'SuggestInstagramStoryIdea', instruction: "Suggest an interactive Instagram Story idea (e.g., poll, quiz, Q&A, behind-the-scenes) related to: {{userInput_topic_or_event}}. Context: {{instagram_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_instagram_step_hashtags', name: 'GenerateInstagramHashtags', instruction: "Generate 10-15 relevant Instagram hashtags for a post about: {{userInput_topic}}. Include a mix of popular, niche, and community-specific hashtags.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  {
    id: 'predef_threads_content_ai',
    name: 'Threads App Content AI',
    description: 'Crafts short, text-based updates and engaging replies suitable for Threads by Instagram.',
    isPredefined: true,
    globalSystemInstruction: `You are a Threads App Content AI. You create concise, text-focused updates and replies ideal for quick conversations and sharing ideas on Threads. Keep posts relatively short and encourage interaction. Assume a more informal, conversational tone. Context: {{threads_profile_context}}.`,
    documentationPurpose: `To generate short, text-centric posts and replies suitable for the Threads app, fostering quick engagement.`,
    documentationWorkflow: `User provides a thought, question, or an existing Thread to reply to. The AI drafts a suitable text-based response or a new Thread post.`,
    documentationOutputExample: `**Input Topic:** "Thoughts on the latest AI news."
**AI Output (New Thread Post):** "Anyone else mind-blown by the latest AI advancements? 🤯 Seems like things are moving faster than ever. What's one AI development that's really caught your eye recently? Let's discuss! 👇 #AI #TechNews #FutureIsNow"
**AI Output (Reply Idea to a comment 'AI is scary'):** "I hear you! It's definitely a lot to take in, and there are valid concerns. I think focusing on ethical development and understanding the tech better can help demystify some of the scary parts. What specifically worries you most?"`,
    steps: [
      { id: 'sm_threads_step_draft_post', name: 'DraftThreadsPost', instruction: "Draft a concise (1-3 sentences typically) Threads post about: {{userInput_thought_or_topic}}. Aim for a conversational tone and consider adding a question to engage. Context: {{threads_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_threads_step_reply_idea', name: 'SuggestThreadsReply', instruction: "Suggest an engaging reply to this Threads post/comment: '{{userInput_original_post_text}}'. The reply should be about: {{userInput_reply_angle_or_topic}}. Context: {{threads_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  {
    id: 'predef_youtube_content_ai',
    name: 'YouTube Content AI',
    description: 'Assists with YouTube video content: generating titles, descriptions, script outlines, keywords, and thumbnail ideas.',
    isPredefined: true,
    globalSystemInstruction: `You are a YouTube Content AI. You help creators optimize their videos for discovery and engagement. You can generate compelling video titles, SEO-friendly descriptions, script outlines, relevant keywords/tags, and ideas for clickable thumbnails. Context: {{youtube_channel_context}}.`,
    documentationPurpose: `To help YouTube creators with various aspects of video production and optimization, from ideation to metadata.`,
    documentationWorkflow: `User provides a video topic or existing video details. The AI generates titles, descriptions, script points, keywords, or thumbnail concepts based on the selected step.`,
    documentationOutputExample: `**Input Topic:** "Tutorial: Beginner's Guide to Python Programming"
**AI Output (Title Idea):** "Python for Beginners: Your First Steps to Coding (Easy Tutorial!)"
**AI Output (Description Snippet):** "🐍 New to Python? This beginner-friendly tutorial walks you through the absolute basics of Python programming... What you'll learn: Variables, Data Types, Loops, Functions... #Python #Programming #BeginnerCoding #LearnToCode"
**AI Output (Script Outline Point):** "Section 3: Understanding Variables - Explain what variables are, common data types (integers, strings, booleans), show examples of declaring and using variables."
**AI Output (Thumbnail Idea):** "Split screen: Left side - Python logo and 'PYTHON FOR BEGINNERS'. Right side - Friendly person smiling next to a simple code snippet on a screen."`,
    steps: [
      { id: 'sm_youtube_step_title', name: 'GenerateYouTubeVideoTitle', instruction: "Generate 5 catchy and SEO-friendly YouTube video titles for a video about: {{userInput_video_topic}}. Context: {{youtube_channel_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_youtube_step_description', name: 'DraftYouTubeVideoDescription', instruction: "Draft a comprehensive YouTube video description for a video titled '{{userInput_video_title}}' about {{userInput_video_topic}}. Include a summary, timestamps (if applicable, use placeholders like [00:00] Intro), relevant links (use placeholder [LINK]), and 5-10 keywords/tags. Context: {{youtube_channel_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_youtube_step_script_outline', name: 'OutlineYouTubeVideoScript', instruction: "Create a script outline (key sections and talking points) for a YouTube video about: {{userInput_video_topic}}. Include an intro hook, main content sections, and a call to action. Context: {{youtube_channel_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_youtube_step_keywords', name: 'SuggestYouTubeKeywordsTags', instruction: "Suggest 10-15 relevant keywords and tags for a YouTube video about: {{userInput_video_topic}}. Context: {{youtube_channel_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_youtube_step_thumbnail_idea', name: 'SuggestYouTubeThumbnailIdea', instruction: "Describe 2-3 compelling thumbnail ideas for a YouTube video about: {{userInput_video_topic}}. Focus on clarity, emotion, and clickability. Context: {{youtube_channel_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  {
    id: 'predef_tiktok_content_ai',
    name: 'TikTok Content AI',
    description: 'Generates ideas for short TikTok videos, including concepts, trending sounds/challenges, captions, and hashtags.',
    isPredefined: true,
    globalSystemInstruction: `You are a TikTok Content AI. You're tapped into TikTok trends and know how to create short, engaging video concepts. You suggest video ideas, relevant trending sounds/challenges (use placeholders like '[Trending Sound Name]' or '[Current Challenge Name]'), catchy captions, and popular hashtags. Context: {{tiktok_profile_context}}.`,
    documentationPurpose: `To brainstorm creative and trend-aware content ideas for TikTok, including video concepts, sound suggestions, captions, and hashtags.`,
    documentationWorkflow: `User provides a niche, product, or general theme. The AI generates TikTok video ideas, suggests incorporating trends, and drafts captions/hashtags.`,
    documentationOutputExample: `**Input Topic:** "Easy 1-minute recipes"
**AI Output (Video Concept):** "Quick 3-clip video: 1. Show all ingredients laid out. 2. Fast-motion of assembling the dish. 3. Final dish with a satisfying bite. Use [Trending Upbeat Sound Name]. Text overlay: '1-Min Snack Hack!'"
**AI Output (Caption Idea):** "This literally takes 60 seconds. You HAVE to try it! 🤯 #TikTokFood #EasyRecipe #SnackHack #1MinRecipe #[CurrentFoodChallengeName]"`,
    steps: [
      { id: 'sm_tiktok_step_video_idea', name: 'GenerateTikTokVideoIdea', instruction: "Generate 2-3 creative TikTok video ideas for: {{userInput_topic_or_theme}}. Include concept, potential use of {{userInput_trending_sound_or_challenge_placeholder}}, and visual style. Context: {{tiktok_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_tiktok_step_caption_hashtags', name: 'DraftTikTokCaptionHashtags', instruction: "Draft a catchy TikTok caption (short and punchy) and 3-5 relevant/trending hashtags for a video about: {{userInput_video_description}}. Context: {{tiktok_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  {
    id: 'predef_pinterest_content_ai',
    name: 'Pinterest Content AI',
    description: 'Helps create content for Pinterest, focusing on Pin titles, descriptions, board ideas, and visually appealing concepts.',
    isPredefined: true,
    globalSystemInstruction: `You are a Pinterest Content AI. You understand what makes a Pin discoverable and engaging on Pinterest. You generate optimized Pin titles, detailed descriptions with keywords, ideas for new boards, and concepts for visually appealing Pins (images/videos). Context: {{pinterest_profile_context}}.`,
    documentationPurpose: `To assist in creating optimized content for Pinterest, including Pin titles, descriptions, board organization, and visual ideas to drive engagement and discovery.`,
    documentationWorkflow: `User provides a topic, product, or visual idea. The AI generates SEO-friendly Pin titles and descriptions, suggests relevant board names, and describes visual concepts for Pins.`,
    documentationOutputExample: `**Input Topic:** "DIY home organization hacks"
**AI Output (Pin Title):** "10 Genius DIY Home Organization Hacks You Need to Try!"
**AI Output (Pin Description):** "Transform your space with these easy and budget-friendly DIY home organization ideas! From clever storage solutions for small spaces to decluttering tips, get inspired to create a tidy and beautiful home. #DIYHomeDecor #OrganizationHacks #HomeOrganization #Declutter"
**AI Output (Board Idea):** "Smart Home Solutions & DIY Organization"
**AI Output (Visual Idea for Pin):** "A visually appealing collage of 3-4 before-and-after shots of small spaces (drawer, shelf, under-sink) organized using DIY hacks. Bright, clean aesthetic."`,
    steps: [
      { id: 'sm_pinterest_step_pin_content', name: 'DraftPinterestPinContent', instruction: "Draft an optimized Pin title (max 100 chars) and a detailed Pin description (200-500 chars, include keywords) for a Pin about: {{userInput_pin_topic_or_product}}. Context: {{pinterest_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_pinterest_step_board_idea', name: 'SuggestPinterestBoardIdea', instruction: "Suggest 2-3 creative and relevant Pinterest board names for a user focusing on: {{userInput_overall_theme_or_niche}}. Context: {{pinterest_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
      { id: 'sm_pinterest_step_visual_concept', name: 'DescribePinterestVisualConcept', instruction: "Describe a visually appealing concept for a Pinterest Pin (image or short video) related to: {{userInput_topic}}. Focus on aesthetics that perform well on Pinterest. Context: {{pinterest_profile_context}}.", model: GEMINI_TEXT_MODEL, providerType: 'google_gemini' },
    ],
  },
  // --- Social Media Agents END ---
];

const fullyProcessedPredefinedAgents: AgentDefinition[] = predefinedAgentsRaw.map(agent => sanitizeAgentDefinition({ ...agent, id: agent.id || generateId() }));


const AgentManagementDashboard: React.FC = () => {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [editingAgent, setEditingAgent] = useState<AgentDefinition | null | undefined>(undefined); 

  useEffect(() => {
    try {
      const storedAgents = localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY);
      if (storedAgents) {
        const parsedAgents: Partial<AgentDefinition>[] = JSON.parse(storedAgents);
        const updatedAgentList: AgentDefinition[] = [];
        const predefinedIds = new Set(fullyProcessedPredefinedAgents.map(p => p.id));

        fullyProcessedPredefinedAgents.forEach(predef => {
            const existingUserVersion = parsedAgents.find(p => p.id === predef.id);
            if (existingUserVersion && !existingUserVersion.isPredefined) { 
                updatedAgentList.push(sanitizeAgentDefinition(existingUserVersion));
            } else { 
                updatedAgentList.push(predef); 
            }
        });

        parsedAgents.forEach(parsed => {
            if (!predefinedIds.has(parsed.id!)) { 
                updatedAgentList.push(sanitizeAgentDefinition(parsed));
            }
        });
        
        const finalAgentMap = new Map<string, AgentDefinition>();
        updatedAgentList.forEach(agent => finalAgentMap.set(agent.id, agent));
        setAgents(Array.from(finalAgentMap.values()));

      } else { 
        setAgents(fullyProcessedPredefinedAgents);
      }
    } catch (error) {
        console.error("Failed to load agents from localStorage:", error);
        localStorage.removeItem(GEMINI_AGENT_DEFINITIONS_LS_KEY); 
        setAgents(fullyProcessedPredefinedAgents);
    }
  }, []);

  useEffect(() => {
    if (agents.length > 0 || localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY)) {
        try {
            localStorage.setItem(GEMINI_AGENT_DEFINITIONS_LS_KEY, JSON.stringify(agents.map(sanitizeAgentDefinition)));
        } catch (error) {
            console.error("Failed to save agents to localStorage:", error);
        }
    }
  }, [agents]);

  const handleCreateAgent = () => {
    setEditingAgent(null); 
  };

  const handleEditAgent = (agentId: string) => {
    const agentToEdit = agents.find(a => a.id === agentId);
    if (agentToEdit) {
      const agentCopy = JSON.parse(JSON.stringify(agentToEdit)); 
      setEditingAgent(sanitizeAgentDefinition(agentCopy)); 
    }
  };

  const handleDeleteAgent = (agentId: string) => {
    setAgents(prevAgents => prevAgents.filter(a => a.id !== agentId));
  };

  const handleSaveAgent = (agentToSave: AgentDefinition) => {
    const cleanedAgentToSave = sanitizeAgentDefinition(agentToSave); 
    
    setAgents(prevAgents => {
      const existingIndex = prevAgents.findIndex(a => a.id === cleanedAgentToSave.id);
      if (existingIndex > -1) {
        const updatedAgents = [...prevAgents];
        const originalAgent = prevAgents[existingIndex];
        updatedAgents[existingIndex] = {
            ...cleanedAgentToSave, 
            isPredefined: originalAgent.isPredefined && cleanedAgentToSave.id === originalAgent.id 
                           && !!predefinedAgentsRaw.find(p => p.id === cleanedAgentToSave.id)
        };
        return updatedAgents;
      } else {
        return [...prevAgents, {...cleanedAgentToSave, isPredefined: false}]; 
      }
    });
    setEditingAgent(undefined); 
  };

  const handleCancelEdit = () => {
    setEditingAgent(undefined); 
  };

  return (
    <SectionCard title="AI Agent Management">
      {editingAgent === undefined ? ( 
        <>
          <AgentList
            agents={agents}
            onEditAgent={handleEditAgent}
            onDeleteAgent={handleDeleteAgent}
            onCreateAgent={handleCreateAgent}
          />
          <div className="mt-8 p-4 bg-slate-100 rounded-lg text-sm text-slate-600">
            <h4 className="font-semibold text-slate-700 mb-2">About AI Agents:</h4>
            <p className="mb-1">
              Define AI agents with steps, instructions, models (from various providers), and documentation.
              The "Maestro Orchestrator Agent" can use these definitions to plan tasks or help you design new agents.
            </p>
             <p className="mb-1">
              You can copy agent designs suggested by the Maestro (from its Chat/Build tab) and paste relevant parts here to create new agents.
            </p>
             <p className="mb-1">
              Define conceptual "Knowledge Resources" (for RAG context) and "External Tools" (for planning agents that could use APIs).
            </p>
          </div>
        </>
      ) : (
        <AgentForm
          agent={editingAgent} 
          onSave={handleSaveAgent}
          onCancel={handleCancelEdit}
        />
      )}
    </SectionCard>
  );
};

export default AgentManagementDashboard;

// AI Agent 타입 정의
export const AgentType = {
  GPT: 'gpt',
  GEMINI: 'gemini'
};

// 메시지 타입
export const MessageType = {
  AGENT: 'agent',
  USER: 'user',
  SYSTEM: 'system'
};

// 대화 상태
export const ConversationStatus = {
  SETUP: 'setup',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPED: 'stopped'
};

// Agent 설정
export class AgentConfig {
  constructor(name, persona, type, apiKey) {
    this.name = name;
    this.persona = persona;
    this.type = type; // AgentType.GPT or AgentType.GEMINI
    this.apiKey = apiKey;
  }
}

// 메시지 객체
export class Message {
  constructor(type, content, agentName = null, timestamp = new Date()) {
    this.type = type; // MessageType
    this.content = content;
    this.agentName = agentName;
    this.timestamp = timestamp;
  }
}

// 대화 설정
export class ConversationConfig {
  constructor(topic, agents, openaiApiKey, geminiApiKey) {
    this.topic = topic;
    this.agents = agents; // AgentConfig 배열
    this.openaiApiKey = openaiApiKey;
    this.geminiApiKey = geminiApiKey;
  }
}





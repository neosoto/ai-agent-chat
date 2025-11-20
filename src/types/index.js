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
  constructor(name, persona, type, apiKey, model = null) {
    this.name = name;
    this.persona = persona;
    this.type = type; // AgentType.GPT or AgentType.GEMINI
    this.apiKey = apiKey;
    this.model = model; // 선택된 모델 이름 (예: "gpt-4", "gemini-pro")
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
  constructor(topic, agents, openaiApiKey, geminiApiKey, systemPrompt = null, maxConversationCount = null) {
    this.topic = topic;
    this.agents = agents; // AgentConfig 배열
    this.openaiApiKey = openaiApiKey;
    this.geminiApiKey = geminiApiKey;
    this.systemPrompt = systemPrompt; // 공통 시스템 프롬프트
    this.maxConversationCount = maxConversationCount; // Agent당 최대 대화 횟수
  }
}





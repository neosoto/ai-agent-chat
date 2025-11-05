import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentType } from '../types/index.js';
import { getOpenAIKey, getGeminiKey, setOpenAIKey, setGeminiKey } from '../utils/apiKeyStorage.js';

class AIService {
  constructor() {
    this.openai = null;
    this.gemini = null;
    this.initializeFromStorage();
  }

  // localStorage에서 API 키 초기화
  initializeFromStorage() {
    const openaiKey = getOpenAIKey();
    const geminiKey = getGeminiKey();

    console.log('localStorage에서 API 키 로딩 상태:');
    console.log('OpenAI API 키:', openaiKey ? '설정됨' : '설정되지 않음');
    console.log('Gemini API 키:', geminiKey ? '설정됨' : '설정되지 않음');

    if (openaiKey) {
      this.initializeOpenAI(openaiKey);
    }

    if (geminiKey) {
      this.initializeGemini(geminiKey);
    }
  }

  // 런타임에 API 키 설정
  setApiKeys(openaiKey, geminiKey) {
    if (openaiKey) {
      setOpenAIKey(openaiKey);
      this.initializeOpenAI(openaiKey);
    }
    
    if (geminiKey) {
      setGeminiKey(geminiKey);
      this.initializeGemini(geminiKey);
    }
  }

  // OpenAI 클라이언트 초기화
  initializeOpenAI(apiKey) {
    // API 키 정리 (공백, 줄바꿈 제거)
    const cleanApiKey = apiKey?.trim().replace(/\s/g, '');
    
    // API 키 형식 검증
    if (!cleanApiKey || (!cleanApiKey.startsWith('sk-') && !cleanApiKey.startsWith('sk-proj-'))) {
      throw new Error('올바른 OpenAI API 키를 입력해주세요. (sk- 또는 sk-proj-로 시작해야 합니다)');
    }
    
    // API 키 길이 검증 (최소 50자)
    if (cleanApiKey.length < 50) {
      throw new Error('API 키가 너무 짧습니다. 올바른 API 키를 확인해주세요.');
    }
    
    console.log('OpenAI API 키 초기화:', cleanApiKey.substring(0, 10) + '...');
    
    this.openai = new OpenAI({
      apiKey: cleanApiKey,
      dangerouslyAllowBrowser: true
    });
  }

  // Gemini 클라이언트 초기화
  initializeGemini(apiKey) {
    // API 키 정리 (공백, 줄바꿈 제거)
    const cleanApiKey = apiKey?.trim().replace(/\s/g, '');
    
    // API 키 형식 검증
    if (!cleanApiKey || cleanApiKey.length < 20) {
      throw new Error('올바른 Google Gemini API 키를 입력해주세요.');
    }
    
    console.log('Gemini API 키 초기화:', cleanApiKey.substring(0, 10) + '...');
    
    // Gemini API 키를 직접 전달하여 초기화
    this.gemini = new GoogleGenerativeAI(cleanApiKey);
  }

  // 진행 Agent (GPT)가 다음 발언자 선택
  async selectNextSpeaker(conversationHistory, agents, topic) {
    if (!this.openai) {
      throw new Error('OpenAI API가 초기화되지 않았습니다.');
    }

    const systemPrompt = `당신은 AI Agent들의 대화를 진행하는 사회자입니다.
주제: ${topic}

참여 Agent들:
${agents.map(agent => `- ${agent.name} (${agent.type === AgentType.GPT ? 'GPT' : 'Gemini'}): ${agent.persona}`).join('\n')}

대화 기록:
${conversationHistory.map(msg => `${msg.agentName || '시스템'}: ${msg.content}`).join('\n')}

다음 발언자를 선택해주세요. 다음 형식으로만 응답하세요:
다음 발언자: [Agent 이름]`;

    try {
      // GPT-5 API 사용
      const response = await this.openai.responses.create({
        model: "gpt-5",
        input: systemPrompt
      });

      // 응답 텍스트 추출 (새로운 응답 구조에 맞게 수정)
      let responseText = '';
      if (response.output && response.output.length > 0) {
        const messageOutput = response.output.find(item => item.type === 'message');
        if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
          responseText = messageOutput.content[0].text;
        }
      }
      
      console.log('다음 발언자 선택 응답:', responseText);
      const match = responseText.match(/다음 발언자:\s*(.+)/);
      
      if (match) {
        const selectedAgentName = match[1].trim();
        return agents.find(agent => agent.name === selectedAgentName);
      }
      
      // 매칭되지 않으면 첫 번째 Agent 반환
      return agents[0];
    } catch (error) {
      console.error('다음 발언자 선택 중 오류:', error);
      return agents[0];
    }
  }

  // GPT Agent 응답 생성
  async generateGPTResponse(agent, conversationHistory, topic) {
    if (!this.openai) {
      throw new Error('OpenAI API가 초기화되지 않았습니다.');
    }

    const systemPrompt = `당신은 "${agent.name}"라는 AI Agent입니다.
페르소나: ${agent.persona}

현재 대화 주제: ${topic}

이전 대화 내용:
${conversationHistory.map(msg => `${msg.agentName || '사용자'}: ${msg.content}`).join('\n')}

위의 대화 맥락을 고려하여 주제에 대해 당신의 페르소나에 맞게 응답해주세요.`;

    try {
      // GPT-5 API 사용
      const response = await this.openai.responses.create({
        model: "gpt-5",
        input: systemPrompt
      });

      // 응답 텍스트 추출 (새로운 응답 구조에 맞게 수정)
      let responseText = '';
      if (response.output && response.output.length > 0) {
        const messageOutput = response.output.find(item => item.type === 'message');
        if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
          responseText = messageOutput.content[0].text;
        }
      }
      
      console.log('GPT 응답 생성 결과:', responseText);
      return responseText;
    } catch (error) {
      console.error('GPT 응답 생성 중 오류:', error);
      throw error;
    }
  }

  // Gemini Agent 응답 생성
  async generateGeminiResponse(agent, conversationHistory, topic) {
    if (!this.gemini) {
      throw new Error('Gemini API가 초기화되지 않았습니다.');
    }

    const prompt = `당신은 "${agent.name}"라는 AI Agent입니다.
페르소나: ${agent.persona}

현재 대화 주제: ${topic}

이전 대화 내용:
${conversationHistory.map(msg => `${msg.agentName || '사용자'}: ${msg.content}`).join('\n')}

위의 대화 맥락을 고려하여 주제에 대해 당신의 페르소나에 맞게 응답해주세요.`;

    try {
      // Gemini-2.5 Pro API 사용
      const model = this.gemini.getGenerativeModel({ model: "gemini-2.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return response.text();
    } catch (error) {
      console.error('Gemini 응답 생성 중 오류:', error);
      throw error;
    }
  }

  // Agent 응답 생성 (타입에 따라 자동 선택)
  async generateAgentResponse(agent, conversationHistory, topic) {
    if (agent.type === AgentType.GPT) {
      return await this.generateGPTResponse(agent, conversationHistory, topic);
    } else if (agent.type === AgentType.GEMINI) {
      return await this.generateGeminiResponse(agent, conversationHistory, topic);
    } else {
      throw new Error(`지원하지 않는 Agent 타입: ${agent.type}`);
    }
  }

  // API 키 테스트
  async testOpenAIKey(apiKey) {
    try {
      // API 키 정리
      const cleanApiKey = apiKey?.trim().replace(/\s/g, '');
      
      // API 키 형식 검증
      if (!cleanApiKey || (!cleanApiKey.startsWith('sk-') && !cleanApiKey.startsWith('sk-proj-'))) {
        return { 
          success: false, 
          message: 'API 키 형식이 올바르지 않습니다. (sk- 또는 sk-proj-로 시작해야 합니다)' 
        };
      }

      // API 키 길이 검증
      if (cleanApiKey.length < 50) {
        return {
          success: false,
          message: 'API 키가 너무 짧습니다. 올바른 API 키를 확인해주세요.'
        };
      }

      console.log('API 키 테스트 시작:', cleanApiKey.substring(0, 10) + '...');

      const testClient = new OpenAI({
        apiKey: cleanApiKey,
        dangerouslyAllowBrowser: true
      });
      
      // GPT-5 API 테스트
      const response = await testClient.responses.create({
        model: "gpt-5",
        input: "Hello"
      });
      
      return { success: true, message: "OpenAI GPT-5 API 키가 유효합니다." };
    } catch (error) {
      console.error('API 키 테스트 오류:', error);
      let errorMessage = error.message;
      
      if (error.status === 401) {
        errorMessage = "API 키가 올바르지 않거나 만료되었습니다. https://platform.openai.com/account/api-keys 에서 새 키를 생성하세요.";
      } else if (error.status === 429) {
        errorMessage = "API 사용량 한도에 도달했습니다. 잠시 후 다시 시도하세요.";
      } else if (error.status === 403) {
        errorMessage = "API 키에 권한이 없습니다. 계정 설정을 확인하세요.";
      } else if (error.status === 400) {
        errorMessage = "잘못된 요청입니다. API 키나 모델 설정을 확인하세요.";
      }
      
      return { 
        success: false, 
        message: `OpenAI API 오류: ${errorMessage}` 
      };
    }
  }

  async testGeminiKey(apiKey) {
    try {
      // API 키 정리
      const cleanApiKey = apiKey?.trim().replace(/\s/g, '');
      
      // API 키 형식 검증
      if (!cleanApiKey || cleanApiKey.length < 20) {
        return {
          success: false,
          message: 'API 키가 너무 짧습니다. 올바른 API 키를 확인해주세요.'
        };
      }
      
      // Gemini API 키를 직접 전달하여 테스트
      const testGemini = new GoogleGenerativeAI(cleanApiKey);
      
      // Gemini-2.5 Pro API 테스트
      const model = testGemini.getGenerativeModel({ model: "gemini-2.5-pro" });
      const result = await model.generateContent("Hello");
      const response = await result.response;
      
      return { success: true, message: "Gemini API 키가 유효합니다." };
    } catch (error) {
      console.error('Gemini API 키 테스트 오류:', error);
      return { 
        success: false, 
        message: `Gemini API 오류: ${error.message}` 
      };
    }
  }
}

export default new AIService();




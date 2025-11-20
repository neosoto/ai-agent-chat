import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentType } from '../types/index.js';
import { getOpenAIKey, getGeminiKey, setOpenAIKey, setGeminiKey } from '../utils/apiKeyStorage.js';

class AIService {
  constructor() {
    this.openai = null;
    this.gemini = null;
    this.geminiApiKey = null;
    this.availableGeminiModels = null; // 캐시된 사용 가능한 모델 리스트
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
    
    // Gemini API 키 저장
    this.geminiApiKey = cleanApiKey;
    
    // Gemini API 키를 직접 전달하여 초기화
    this.gemini = new GoogleGenerativeAI(cleanApiKey);
    
    // 모델 리스트 캐시 초기화 (새로운 키로 변경되었으므로)
    this.availableGeminiModels = null;
  }

  // Gemini 사용 가능한 모델 리스트 가져오기
  async getAvailableGeminiModels() {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }

    // 캐시된 모델 리스트가 있으면 반환
    if (this.availableGeminiModels) {
      return this.availableGeminiModels;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.geminiApiKey}`
      );

      if (!response.ok) {
        throw new Error(`모델 리스트 조회 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // generateContent를 지원하는 모델만 필터링
      const availableModels = (data.models || [])
        .filter(model => {
          // supportedGenerationMethods에 generateContent가 포함되어 있는지 확인
          return model.supportedGenerationMethods?.includes('generateContent') || 
                 model.supportedMethods?.includes('generateContent');
        })
        .map(model => model.name.replace('models/', '')) // "models/gemini-pro" -> "gemini-pro"
        .sort(); // 알파벳 순으로 정렬

      console.log('사용 가능한 Gemini 모델:', availableModels);
      
      // 캐시에 저장
      this.availableGeminiModels = availableModels;
      
      return availableModels;
    } catch (error) {
      console.error('Gemini 모델 리스트 조회 오류:', error);
      // 오류 발생 시 기본 모델 리스트 반환
      return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    }
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
      // OpenAI Chat Completions API 사용
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt }
        ],
        temperature: 0.7,
        max_completion_tokens: 200
      });

      // 응답 텍스트 추출
      const responseText = response.choices[0]?.message?.content || '';
      
      console.log('다음 발언자 선택 응답:', responseText);
      const match = responseText.match(/다음 발언자:\s*(.+)/);
      
      if (match) {
        const selectedAgentName = match[1].trim();
        const foundAgent = agents.find(agent => agent.name === selectedAgentName);
        if (foundAgent) {
          return foundAgent;
        }
      }
      
      // 매칭되지 않으면 첫 번째 Agent 반환
      return agents[0];
    } catch (error) {
      console.error('다음 발언자 선택 중 오류:', error);
      // 오류 발생 시 첫 번째 Agent 반환
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

위의 대화 맥락을 고려하여 주제에 대해 당신의 페르소나에 맞게 300자 이내로 응답해주세요.`;

    // 선택된 모델 사용, 없으면 기본값 gpt-4
    const modelName = agent.model || "gpt-4";
    
    try {
      // OpenAI Chat Completions API 사용
      const response = await this.openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt }
        ],
        temperature: 0.8,
        max_completion_tokens: 600
      });

      // 응답 구조 확인 및 디버깅
      console.log('API 응답 전체:', JSON.stringify(response, null, 2));
      console.log('응답 choices:', response.choices);
      
      // 응답 텍스트 추출
      let responseText = '';
      
      if (response.choices && response.choices.length > 0) {
        const firstChoice = response.choices[0];
        console.log('첫 번째 choice:', firstChoice);
        console.log('finish_reason:', firstChoice?.finish_reason);
        
        // 다양한 응답 구조 시도
        if (firstChoice.message) {
          responseText = firstChoice.message.content || 
                        firstChoice.message.text ||
                        '';
        }
        
        // message가 없는 경우 다른 경로 시도
        if (!responseText) {
          responseText = firstChoice?.delta?.content || 
                        firstChoice?.text ||
                        firstChoice?.content ||
                        '';
        }
      }
      
      console.log('추출된 응답 텍스트:', responseText);
      console.log('응답 텍스트 길이:', responseText?.length || 0);
      
      // finish_reason이 length인 경우 응답이 잘렸지만 생성은 되었으므로 허용
      const finishReason = response.choices?.[0]?.finish_reason;
      if (finishReason === 'length') {
        // 응답이 잘렸지만 내용이 있으면 반환 (정상적인 경우)
        if (responseText && responseText.trim() !== '') {
          console.log('응답이 토큰 제한으로 잘렸지만 내용은 정상적으로 생성되었습니다. (finish_reason: length)');
          return responseText;
        }
        // 응답이 비어있으면 에러
        throw new Error(`모델 "${modelName}"에서 응답이 토큰 제한으로 잘렸지만 내용을 추출할 수 없습니다.`);
      }
      
      if (!responseText || (typeof responseText === 'string' && responseText.trim() === '')) {
        console.error('응답이 비어있습니다.');
        console.error('응답 구조:', JSON.stringify(response, null, 2));
        console.error('모델:', modelName);
        
        // finish_reason이 있는 경우 추가 정보 제공
        if (finishReason) {
          throw new Error(`모델 "${modelName}"에서 응답을 받지 못했습니다. (finish_reason: ${finishReason})`);
        }
        
        throw new Error(`모델 "${modelName}"에서 응답을 받지 못했습니다. 응답 구조를 확인해주세요.`);
      }
      
      return responseText;
    } catch (error) {
      console.error('GPT 응답 생성 중 오류:', error);
      
      // 모델이 chat/completions를 지원하지 않는 경우
      if (error.status === 404 && (error.message?.includes('chat/completions') || error.message?.includes('responses'))) {
        throw new Error(`모델 "${modelName}"은 chat/completions를 지원하지 않습니다. 다른 모델을 선택해주세요.`);
      }
      
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

    // 선택된 모델이 있으면 해당 모델 사용
    if (agent.model) {
      try {
        const model = this.gemini.getGenerativeModel({ model: agent.model });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        console.log(`Gemini 모델 ${agent.model} 사용 성공`);
        return response.text();
      } catch (error) {
        console.warn(`선택된 Gemini 모델 ${agent.model} 실패:`, error.message);
        // 선택된 모델이 실패하면 사용 가능한 모델로 폴백
      }
    }

    // 선택된 모델이 없거나 실패한 경우, 사용 가능한 모델 리스트 가져오기
    const availableModels = await this.getAvailableGeminiModels();
    
    if (availableModels.length === 0) {
      throw new Error('사용 가능한 Gemini 모델을 찾을 수 없습니다.');
    }

    let lastError = null;
    
    // 사용 가능한 모델들을 순서대로 시도
    for (const modelName of availableModels) {
      // 이미 시도한 모델은 건너뛰기
      if (agent.model && modelName === agent.model) {
        continue;
      }
      
      try {
        const model = this.gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        console.log(`Gemini 모델 ${modelName} 사용 성공 (폴백)`);
        return response.text();
      } catch (error) {
        console.warn(`Gemini 모델 ${modelName} 실패:`, error.message);
        lastError = error;
        // 다음 모델 시도
        continue;
      }
    }
    
    // 모든 모델이 실패한 경우
    console.error('모든 Gemini 모델 시도 실패');
    throw lastError || new Error('Gemini API 호출에 실패했습니다.');
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
      
      // OpenAI Chat Completions API 테스트
      const response = await testClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "user", content: "Hello" }
        ],
        max_completion_tokens: 10
      });
      
      return { success: true, message: "OpenAI API 키가 유효합니다." };
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
      
      // API로 사용 가능한 모델 리스트 가져오기
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanApiKey}`
        );

        if (!response.ok) {
          throw new Error(`모델 리스트 조회 실패: ${response.status}`);
        }

        const data = await response.json();
        
        // generateContent를 지원하는 모델만 필터링
        const availableModels = (data.models || [])
          .filter(model => {
            return model.supportedGenerationMethods?.includes('generateContent') || 
                   model.supportedMethods?.includes('generateContent');
          })
          .map(model => model.name.replace('models/', ''));

        if (availableModels.length === 0) {
          throw new Error('사용 가능한 Gemini 모델을 찾을 수 없습니다.');
        }

        // 첫 번째 사용 가능한 모델로 테스트
        const testModel = availableModels[0];
        const model = testGemini.getGenerativeModel({ model: testModel });
        const result = await model.generateContent("Hello");
        await result.response;
        
        return { 
          success: true, 
          message: `Gemini API 키가 유효합니다.` 
        };
      } catch (error) {
        // 모델 리스트 조회 실패 시 기본 모델로 테스트 시도
        console.warn('모델 리스트 조회 실패, 기본 모델로 테스트:', error);
        
        const fallbackModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        let lastError = null;
        
        for (const modelName of fallbackModels) {
          try {
            const model = testGemini.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello");
            await result.response;
            return { 
              success: true, 
              message: `Gemini API 키가 유효합니다. (모델: ${modelName})` 
            };
          } catch (testError) {
            lastError = testError;
            continue;
          }
        }
        
        throw lastError || error;
      }
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




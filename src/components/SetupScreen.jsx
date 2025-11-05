import React, { useState, useEffect } from 'react';
import { AgentConfig, AgentType, ConversationConfig } from '../types/index.js';
import aiService from '../services/aiService.js';
import { getOpenAIKey, getGeminiKey, setOpenAIKey, setGeminiKey, hasStoredKeys, validateApiKey } from '../utils/apiKeyStorage.js';
import './SetupScreen.css';

const SetupScreen = ({ onStart }) => {
  const [topic, setTopic] = useState('');
  const [agentCount, setAgentCount] = useState(2);
  const [agents, setAgents] = useState([]);
  const [testingKeys, setTestingKeys] = useState({ openai: false, gemini: false });
  const [keyTestResults, setKeyTestResults] = useState({ openai: null, gemini: null });
  const [apiKeys, setApiKeys] = useState({ openai: '', gemini: '' });
  const [keysLoaded, setKeysLoaded] = useState(false);

  // localStorage에서 API 키 로드
  useEffect(() => {
    const openaiKey = getOpenAIKey();
    const geminiKey = getGeminiKey();
    
    setApiKeys({ openai: openaiKey || '', gemini: geminiKey || '' });
    
    if (openaiKey) {
      setKeyTestResults(prev => ({ 
        ...prev, 
        openai: { success: true, message: "저장된 OpenAI API 키를 찾았습니다." } 
      }));
    }
    
    if (geminiKey) {
      setKeyTestResults(prev => ({ 
        ...prev, 
        gemini: { success: true, message: "저장된 Gemini API 키를 찾았습니다." } 
      }));
    }
    
    setKeysLoaded(true);
  }, []);

  // Agent 개수 변경 시 agents 배열 업데이트
  React.useEffect(() => {
    const newAgents = [];
    for (let i = 0; i < agentCount; i++) {
      if (agents[i]) {
        newAgents.push(agents[i]);
      } else {
        newAgents.push({
          name: `Agent ${i + 1}`,
          persona: '',
          type: AgentType.GPT,
          apiKey: ''
        });
      }
    }
    setAgents(newAgents);
  }, [agentCount]);

  // Agent 설정 업데이트
  const updateAgent = (index, field, value) => {
    const updatedAgents = [...agents];
    updatedAgents[index] = { ...updatedAgents[index], [field]: value };
    setAgents(updatedAgents);
  };

  // API 키 입력 핸들러
  const handleApiKeyChange = (type, value) => {
    setApiKeys(prev => ({ ...prev, [type]: value }));
    // 입력 시 기존 테스트 결과 초기화
    setKeyTestResults(prev => ({ ...prev, [type]: null }));
  };

  // API 키 저장
  const saveApiKeys = () => {
    const { openai, gemini } = apiKeys;
    
    if (openai.trim()) {
      setOpenAIKey(openai);
    }
    
    if (gemini.trim()) {
      setGeminiKey(gemini);
    }
    
    // AIService에 새로운 키 설정
    aiService.setApiKeys(openai, gemini);
    
    alert('API 키가 저장되었습니다.');
  };

  // OpenAI API 키 테스트
  const testOpenAIKey = async () => {
    const openaiKey = apiKeys.openai;
    
    if (!openaiKey || openaiKey.trim() === '') {
      setKeyTestResults(prev => ({ 
        ...prev, 
        openai: { success: false, message: "OpenAI API 키를 입력해주세요." } 
      }));
      return;
    }
    
    if (!validateApiKey(openaiKey, 'openai')) {
      setKeyTestResults(prev => ({ 
        ...prev, 
        openai: { success: false, message: "올바른 OpenAI API 키 형식이 아닙니다. (sk- 또는 sk-proj-로 시작해야 합니다)" } 
      }));
      return;
    }

    setTestingKeys(prev => ({ ...prev, openai: true }));
    try {
      const result = await aiService.testOpenAIKey(openaiKey);
      setKeyTestResults(prev => ({ ...prev, openai: result }));
    } catch (error) {
      setKeyTestResults(prev => ({ 
        ...prev, 
        openai: { success: false, message: error.message } 
      }));
    } finally {
      setTestingKeys(prev => ({ ...prev, openai: false }));
    }
  };

  // Gemini API 키 테스트
  const testGeminiKey = async () => {
    const geminiKey = apiKeys.gemini;
    
    if (!geminiKey || geminiKey.trim() === '') {
      setKeyTestResults(prev => ({ 
        ...prev, 
        gemini: { success: false, message: "Gemini API 키를 입력해주세요." } 
      }));
      return;
    }
    
    if (!validateApiKey(geminiKey, 'gemini')) {
      setKeyTestResults(prev => ({ 
        ...prev, 
        gemini: { success: false, message: "올바른 Gemini API 키 형식이 아닙니다." } 
      }));
      return;
    }

    setTestingKeys(prev => ({ ...prev, gemini: true }));
    try {
      const result = await aiService.testGeminiKey(geminiKey);
      setKeyTestResults(prev => ({ ...prev, gemini: result }));
    } catch (error) {
      setKeyTestResults(prev => ({ 
        ...prev, 
        gemini: { success: false, message: error.message } 
      }));
    } finally {
      setTestingKeys(prev => ({ ...prev, gemini: false }));
    }
  };

  // 폼 제출 처리
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const { openai, gemini } = apiKeys;
    
    // 유효성 검사
    if (!openai || openai.trim() === '') {
      alert('OpenAI API 키를 입력해주세요.');
      return;
    }
    
    if (!gemini || gemini.trim() === '') {
      alert('Gemini API 키를 입력해주세요.');
      return;
    }
    
    if (!topic.trim()) {
      alert('주제를 입력해주세요.');
      return;
    }
    
    if (agents.some(agent => !agent.name.trim() || !agent.persona.trim())) {
      alert('모든 Agent의 이름과 페르소나를 입력해주세요.');
      return;
    }

    // AgentConfig 객체 생성
    const agentConfigs = agents.map(agent => 
      new AgentConfig(agent.name, agent.persona, agent.type, '')
    );

    // ConversationConfig 생성
    const conversationConfig = new ConversationConfig(
      topic,
      agentConfigs,
      openai,
      gemini
    );

    onStart(conversationConfig);
  };

  return (
    <div className="setup-screen">
      <div className="setup-container">
        <h1>AI Agent 대화 설정</h1>
        
        <form onSubmit={handleSubmit} className="setup-form">
          {/* API 키 설정 */}
          <div className="form-section">
            <h2>API 키 설정</h2>
            <div className="api-key-info">
              <p>AI Agent들이 사용할 API 키를 입력하세요. 키는 브라우저에 안전하게 저장됩니다.</p>
              <div className="security-notice">
                <strong>보안 안내:</strong> API 키는 브라우저의 localStorage에 저장됩니다. 
                공용 컴퓨터에서는 사용 후 반드시 삭제하세요.
              </div>
            </div>
            
            <div className="input-group">
              <label htmlFor="openai-key">OpenAI API 키:</label>
              <div className="input-with-button">
                <input
                  id="openai-key"
                  type="password"
                  value={apiKeys.openai}
                  onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                  placeholder="sk- 또는 sk-proj-로 시작하는 OpenAI API 키"
                  className="api-key-input"
                />
                <button 
                  type="button" 
                  onClick={testOpenAIKey}
                  disabled={testingKeys.openai}
                  className="test-button"
                >
                  {testingKeys.openai ? '테스트 중...' : '테스트'}
                </button>
              </div>
              {keyTestResults.openai && (
                <div className={`test-result ${keyTestResults.openai.success ? 'success' : 'error'}`}>
                  {keyTestResults.openai.message}
                </div>
              )}
            </div>
            
            <div className="input-group">
              <label htmlFor="gemini-key">Gemini API 키:</label>
              <div className="input-with-button">
                <input
                  id="gemini-key"
                  type="password"
                  value={apiKeys.gemini}
                  onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
                  placeholder="AIza로 시작하는 Gemini API 키"
                  className="api-key-input"
                />
                <button 
                  type="button" 
                  onClick={testGeminiKey}
                  disabled={testingKeys.gemini}
                  className="test-button"
                >
                  {testingKeys.gemini ? '테스트 중...' : '테스트'}
                </button>
              </div>
              {keyTestResults.gemini && (
                <div className={`test-result ${keyTestResults.gemini.success ? 'success' : 'error'}`}>
                  {keyTestResults.gemini.message}
                </div>
              )}
            </div>
            
            <div className="api-key-actions">
              <button 
                type="button" 
                onClick={saveApiKeys}
                className="save-keys-button"
              >
                API 키 저장
              </button>
            </div>
          </div>

          {/* 주제 설정 */}
          <div className="form-section">
            <h2>대화 주제</h2>
            <div className="input-group">
              <label htmlFor="topic">주제:</label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 인공지능의 미래"
                required
              />
            </div>
          </div>

          {/* Agent 개수 설정 */}
          <div className="form-section">
            <h2>AI Agent 설정</h2>
            <div className="input-group">
              <label htmlFor="agent-count">Agent 개수 (2-10개):</label>
              <input
                type="number"
                id="agent-count"
                min="2"
                max="10"
                value={agentCount}
                onChange={(e) => setAgentCount(parseInt(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Agent 상세 설정 */}
          <div className="form-section">
            <h2>Agent 상세 설정</h2>
            {agents.map((agent, index) => (
              <div key={index} className="agent-config">
                <h3>Agent {index + 1}</h3>
                <div className="input-group">
                  <label>이름:</label>
                  <input
                    type="text"
                    value={agent.name}
                    onChange={(e) => updateAgent(index, 'name', e.target.value)}
                    placeholder={`Agent ${index + 1}`}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>페르소나:</label>
                  <textarea
                    value={agent.persona}
                    onChange={(e) => updateAgent(index, 'persona', e.target.value)}
                    placeholder="이 Agent의 성격, 전문 분야, 말투 등을 설명해주세요."
                    rows="3"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>AI 모델:</label>
                  <select
                    value={agent.type}
                    onChange={(e) => updateAgent(index, 'type', e.target.value)}
                  >
                    <option value={AgentType.GPT}>GPT (OpenAI)</option>
                    <option value={AgentType.GEMINI}>Gemini (Google)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="start-button">
            대화 시작
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupScreen;




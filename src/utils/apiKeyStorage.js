// API 키 저장소 유틸리티
// localStorage를 사용하여 API 키를 안전하게 관리합니다.

const STORAGE_KEYS = {
  OPENAI: 'ai_agent_openai_api_key',
  GEMINI: 'ai_agent_gemini_api_key',
  AGENT_SETTINGS: 'ai_agent_settings'
};

/**
 * OpenAI API 키를 localStorage에서 가져옵니다.
 * @returns {string|null} API 키 또는 null
 */
export const getOpenAIKey = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.OPENAI);
  } catch (error) {
    console.error('OpenAI API 키를 가져오는 중 오류:', error);
    return null;
  }
};

/**
 * Gemini API 키를 localStorage에서 가져옵니다.
 * @returns {string|null} API 키 또는 null
 */
export const getGeminiKey = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.GEMINI);
  } catch (error) {
    console.error('Gemini API 키를 가져오는 중 오류:', error);
    return null;
  }
};

/**
 * OpenAI API 키를 localStorage에 저장합니다.
 * @param {string} key - API 키
 * @returns {boolean} 저장 성공 여부
 */
export const setOpenAIKey = (key) => {
  try {
    if (!key || key.trim() === '') {
      localStorage.removeItem(STORAGE_KEYS.OPENAI);
      return true;
    }
    localStorage.setItem(STORAGE_KEYS.OPENAI, key.trim());
    return true;
  } catch (error) {
    console.error('OpenAI API 키를 저장하는 중 오류:', error);
    return false;
  }
};

/**
 * Gemini API 키를 localStorage에 저장합니다.
 * @param {string} key - API 키
 * @returns {boolean} 저장 성공 여부
 */
export const setGeminiKey = (key) => {
  try {
    if (!key || key.trim() === '') {
      localStorage.removeItem(STORAGE_KEYS.GEMINI);
      return true;
    }
    localStorage.setItem(STORAGE_KEYS.GEMINI, key.trim());
    return true;
  } catch (error) {
    console.error('Gemini API 키를 저장하는 중 오류:', error);
    return false;
  }
};

/**
 * 모든 API 키를 삭제합니다.
 * @returns {boolean} 삭제 성공 여부
 */
export const clearKeys = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.OPENAI);
    localStorage.removeItem(STORAGE_KEYS.GEMINI);
    return true;
  } catch (error) {
    console.error('API 키를 삭제하는 중 오류:', error);
    return false;
  }
};

/**
 * 저장된 API 키가 있는지 확인합니다.
 * @returns {object} API 키 존재 여부
 */
export const hasStoredKeys = () => {
  const openaiKey = getOpenAIKey();
  const geminiKey = getGeminiKey();
  
  return {
    openai: !!openaiKey,
    gemini: !!geminiKey,
    any: !!(openaiKey || geminiKey)
  };
};

/**
 * API 키 유효성을 검사합니다.
 * @param {string} key - API 키
 * @param {string} type - 키 타입 ('openai' 또는 'gemini')
 * @returns {boolean} 유효성 여부
 */
export const validateApiKey = (key, type) => {
  if (!key || key.trim() === '') {
    return false;
  }
  
  const trimmedKey = key.trim();
  
  if (type === 'openai') {
    return trimmedKey.startsWith('sk-') || trimmedKey.startsWith('sk-proj-');
  }
  
  if (type === 'gemini') {
    return trimmedKey.length >= 20 && trimmedKey.startsWith('AIza');
  }
  
  return false;
};

/**
 * Agent 설정을 localStorage에 저장합니다.
 * @param {object} settings - 저장할 설정 (topic, agentCount, agents)
 * @returns {boolean} 저장 성공 여부
 */
export const saveAgentSettings = (settings) => {
  try {
    const settingsToSave = {
      topic: settings.topic || '',
      agentCount: settings.agentCount || 2,
      agents: settings.agents || []
    };
    localStorage.setItem(STORAGE_KEYS.AGENT_SETTINGS, JSON.stringify(settingsToSave));
    return true;
  } catch (error) {
    console.error('Agent 설정을 저장하는 중 오류:', error);
    return false;
  }
};

/**
 * 저장된 Agent 설정을 localStorage에서 가져옵니다.
 * @returns {object|null} 저장된 설정 또는 null
 */
export const loadAgentSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.AGENT_SETTINGS);
    if (!saved) {
      return null;
    }
    return JSON.parse(saved);
  } catch (error) {
    console.error('Agent 설정을 불러오는 중 오류:', error);
    return null;
  }
};

/**
 * 저장된 Agent 설정을 삭제합니다.
 * @returns {boolean} 삭제 성공 여부
 */
export const clearAgentSettings = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.AGENT_SETTINGS);
    return true;
  } catch (error) {
    console.error('Agent 설정을 삭제하는 중 오류:', error);
    return false;
  }
};

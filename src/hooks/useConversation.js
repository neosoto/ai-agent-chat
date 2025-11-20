import { useState, useCallback, useRef } from 'react';
import { Message, MessageType, ConversationStatus } from '../types/index.js';
import aiService from '../services/aiService.js';

export const useConversation = () => {
  const [status, setStatus] = useState(ConversationStatus.SETUP);
  const [messages, setMessages] = useState([]);
  const [config, setConfig] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const intervalRef = useRef(null);
  
  // ref로 최신 상태 추적 (클로저 문제 해결)
  const statusRef = useRef(status);
  const messagesRef = useRef(messages);
  const configRef = useRef(config);
  const isProcessingRef = useRef(isProcessing);

  // ref 동기화 함수
  const updateRefs = useCallback(() => {
    statusRef.current = status;
    messagesRef.current = messages;
    configRef.current = config;
    isProcessingRef.current = isProcessing;
  }, [status, messages, config, isProcessing]);

  // 대화 설정 초기화
  const initializeConversation = useCallback((conversationConfig) => {
    setConfig(conversationConfig);
    setMessages([]);
    setStatus(ConversationStatus.RUNNING);
    
    // ref 업데이트
    configRef.current = conversationConfig;
    messagesRef.current = [];
    statusRef.current = ConversationStatus.RUNNING;
    
    // API 클라이언트 초기화 (AIService의 setApiKeys 메서드 사용)
    aiService.setApiKeys(conversationConfig.openaiApiKey, conversationConfig.geminiApiKey);
    
    // 첫 번째 시스템 메시지 추가
    const systemMessage = new Message(
      MessageType.SYSTEM,
      `주제: ${conversationConfig.topic}\n\nAI Agent들이 대화를 시작합니다.`
    );
    setMessages([systemMessage]);
    messagesRef.current = [systemMessage];
  }, []);

  // 다음 발언자 선택 및 응답 생성
  const generateNextResponse = useCallback(async () => {
    // ref를 사용하여 최신 상태 확인 (클로저 문제 해결)
    if (!configRef.current || isProcessingRef.current) {
      console.log('대화 생성 건너뜀:', { config: !!configRef.current, isProcessing: isProcessingRef.current });
      return;
    }

    console.log('다음 응답 생성 시작...');
    setIsProcessing(true);
    isProcessingRef.current = true;
    
    try {
      // 진행 Agent가 다음 발언자 선택
      console.log('다음 발언자 선택 중...');
      const nextAgent = await aiService.selectNextSpeaker(
        messagesRef.current,
        configRef.current.agents,
        configRef.current.topic
      );

      if (!nextAgent) {
        console.error('다음 발언자를 선택할 수 없습니다.');
        setIsProcessing(false);
        isProcessingRef.current = false;
        return;
      }

      console.log('선택된 Agent:', nextAgent.name);

      // 선택된 Agent의 응답 생성
      console.log('Agent 응답 생성 중...');
      const response = await aiService.generateAgentResponse(
        nextAgent,
        messagesRef.current,
        configRef.current.topic,
        configRef.current.systemPrompt
      );

      console.log('생성된 응답:', response.substring(0, 100) + '...');

      // 새로운 메시지 추가 (함수형 업데이트 사용)
      const newMessage = new Message(
        MessageType.AGENT,
        response,
        nextAgent.name
      );

      setMessages(prev => {
        const newMessages = [...prev, newMessage];
        messagesRef.current = newMessages;
        return newMessages;
      });
      console.log('메시지 추가 완료');
    } catch (error) {
      console.error('응답 생성 중 오류:', error);
      const errorMessage = new Message(
        MessageType.SYSTEM,
        `오류가 발생했습니다: ${error.message}`
      );
      setMessages(prev => {
        const newMessages = [...prev, errorMessage];
        messagesRef.current = newMessages;
        return newMessages;
      });
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, []); // 의존성 배열을 비워서 재생성 방지

  // 자동 대화 시작
  const startAutoConversation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      // ref를 사용하여 최신 상태 확인 (클로저 문제 해결)
      if (statusRef.current === ConversationStatus.RUNNING && !isProcessingRef.current) {
        generateNextResponse();
      }
    }, 3000); // 3초마다 다음 응답 생성
  }, [generateNextResponse]); // generateNextResponse만 의존성에 포함

  // 자동 대화 중지
  const stopAutoConversation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 대화 상태 변경
  const pauseConversation = useCallback(() => {
    setStatus(ConversationStatus.PAUSED);
    statusRef.current = ConversationStatus.PAUSED;
    stopAutoConversation();
  }, [stopAutoConversation]);

  const resumeConversation = useCallback(() => {
    setStatus(ConversationStatus.RUNNING);
    statusRef.current = ConversationStatus.RUNNING;
    startAutoConversation();
  }, [startAutoConversation]);

  const stopConversation = useCallback(() => {
    setStatus(ConversationStatus.STOPPED);
    statusRef.current = ConversationStatus.STOPPED;
    stopAutoConversation();
  }, [stopAutoConversation]);

  // 사용자 메시지 추가
  const addUserMessage = useCallback((content) => {
    const userMessage = new Message(MessageType.USER, content);
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      messagesRef.current = newMessages;
      return newMessages;
    });
  }, []);

  // 명령어 처리
  const handleCommand = useCallback((command) => {
    switch (command) {
      case '/중단':
        pauseConversation();
        return true;
      case '/재개':
        resumeConversation();
        return true;
      default:
        return false;
    }
  }, [pauseConversation, resumeConversation]);

  // 대화 시작
  const startConversation = useCallback(() => {
    if (configRef.current && statusRef.current === ConversationStatus.RUNNING) {
      // 즉시 첫 번째 응답 생성
      generateNextResponse();
      // 그 후 자동 대화 시작
      startAutoConversation();
    }
  }, [generateNextResponse, startAutoConversation]); // ref 사용으로 의존성 최소화

  // 정리 함수
  const cleanup = useCallback(() => {
    stopAutoConversation();
  }, [stopAutoConversation]);

  return {
    status,
    messages,
    config,
    isProcessing,
    initializeConversation,
    generateNextResponse,
    startConversation,
    pauseConversation,
    resumeConversation,
    stopConversation,
    addUserMessage,
    handleCommand,
    cleanup
  };
};





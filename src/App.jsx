import React, { useState, useEffect } from 'react';
import { ConversationStatus } from './types/index.js';
import { useConversation } from './hooks/useConversation.js';
import SetupScreen from './components/SetupScreen.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('setup');
  const {
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
  } = useConversation();

  // 대화 시작 처리
  const handleStartConversation = (conversationConfig) => {
    initializeConversation(conversationConfig);
    setCurrentScreen('chat');
  };

  // 사용자 메시지 처리
  const handleUserMessage = (message) => {
    addUserMessage(message);
  };

  // 명령어 처리
  const handleUserCommand = (command) => {
    return handleCommand(command);
  };

  // 대화 중단 처리
  const handleStopConversation = () => {
    stopConversation();
    setCurrentScreen('setup');
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 대화가 시작되면 자동으로 첫 번째 응답 생성
  useEffect(() => {
    if (currentScreen === 'chat' && status === ConversationStatus.RUNNING && messages.length === 1) {
      // 첫 번째 시스템 메시지 후 자동으로 대화 시작
      setTimeout(() => {
        startConversation();
      }, 1000);
    }
  }, [currentScreen, status, messages.length, startConversation]);

  return (
    <div className="app">
      {currentScreen === 'setup' ? (
        <SetupScreen onStart={handleStartConversation} />
      ) : (
        <ChatScreen
          messages={messages}
          status={status}
          isProcessing={isProcessing}
          onUserMessage={handleUserMessage}
          onCommand={handleUserCommand}
          onPause={pauseConversation}
          onResume={resumeConversation}
          onStop={handleStopConversation}
        />
      )}
    </div>
  );
}

export default App;





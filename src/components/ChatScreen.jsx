import React, { useState, useRef, useEffect } from 'react';
import { MessageType, ConversationStatus } from '../types/index.js';
import ReactMarkdown from 'react-markdown';
import './ChatScreen.css';

const ChatScreen = ({ 
  messages, 
  status, 
  isProcessing, 
  onUserMessage, 
  onCommand,
  onPause,
  onResume,
  onStop 
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 메시지 목록 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 입력창 포커스
  useEffect(() => {
    if (status === ConversationStatus.RUNNING) {
      inputRef.current?.focus();
    }
  }, [status]);

  // 메시지 전송 처리
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const message = inputValue.trim();
    
    // 명령어 처리
    if (message.startsWith('/')) {
      const handled = onCommand(message);
      if (handled) {
        setInputValue('');
        return;
      }
    }

    // 일반 메시지로 처리
    onUserMessage(message);
    setInputValue('');
  };

  // 메시지 타입에 따른 스타일 클래스 반환
  const getMessageClass = (message) => {
    switch (message.type) {
      case MessageType.USER:
        return 'message user-message';
      case MessageType.AGENT:
        return 'message agent-message';
      case MessageType.SYSTEM:
        return 'message system-message';
      default:
        return 'message';
    }
  };

  // Agent 이름에 따른 색상 반환
  const getAgentColor = (agentName) => {
    if (!agentName) return '#666';
    
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    const hash = agentName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // 상태에 따른 버튼 텍스트 반환
  const getStatusText = () => {
    switch (status) {
      case ConversationStatus.RUNNING:
        return isProcessing ? '생성 중...' : '대화 진행 중';
      case ConversationStatus.PAUSED:
        return '일시 정지됨';
      case ConversationStatus.STOPPED:
        return '중단됨';
      default:
        return '대기 중';
    }
  };

  return (
    <div className="chat-screen">
      {/* 헤더 */}
      <div className="chat-header">
        <h2>AI Agent 대화</h2>
        <div className="status-controls">
          <span className={`status ${status.toLowerCase()}`}>
            {getStatusText()}
          </span>
          <div className="control-buttons">
            {status === ConversationStatus.RUNNING && (
              <button onClick={onPause} className="control-btn pause-btn">
                일시정지
              </button>
            )}
            {status === ConversationStatus.PAUSED && (
              <button onClick={onResume} className="control-btn resume-btn">
                재개
              </button>
            )}
            <button onClick={onStop} className="control-btn stop-btn">
              중단
            </button>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={getMessageClass(message)}>
            {message.type === MessageType.AGENT && (
              <div 
                className="agent-avatar"
                style={{ backgroundColor: getAgentColor(message.agentName) }}
              >
                {message.agentName?.charAt(0) || 'A'}
              </div>
            )}
            <div className="message-content">
              {message.type === MessageType.AGENT && (
                <div className="agent-name">{message.agentName}</div>
              )}
              <div className="message-text">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              <div className="message-time">
                {message.timestamp instanceof Date 
                  ? message.timestamp.toLocaleTimeString() 
                  : new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="input-form">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              status === ConversationStatus.RUNNING 
                ? "메시지를 입력하거나 /중단, /재개 명령을 사용하세요..."
                : "대화가 중단되었습니다."
            }
            disabled={status === ConversationStatus.STOPPED}
            className="message-input"
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || status === ConversationStatus.STOPPED}
            className="send-button"
          >
            전송
          </button>
        </form>
        <div className="command-hint">
          명령어: /중단 (대화 일시정지), /재개 (대화 재개)
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;





import { useState, useCallback } from 'react';
import { SUBJECT_TRACKER_DATA, AI_CHAT_RESPONSES } from '../constants/subjectData';

export const useSubjectTracker = () => {
  const [data, setData] = useState(SUBJECT_TRACKER_DATA);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      type: 'ai',
      message: "Hi! I'm here to help explain any topic from your syllabus. What would you like to learn about?",
      timestamp: new Date(),
    },
  ]);

  const toggleSubject = useCallback((subjectId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  }, []);

  const toggleUnit = useCallback((unitId) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  }, []);

  const toggleAiChat = useCallback(() => {
    setAiChatVisible(prev => !prev);
  }, []);

  const sendAiMessage = useCallback((message) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      message,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        message: AI_CHAT_RESPONSES.topics[message] || AI_CHAT_RESPONSES.default,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  }, []);

  const explainTopic = useCallback((topicName) => {
    toggleAiChat();
    setTimeout(() => {
      sendAiMessage(topicName);
    }, 300);
  }, [toggleAiChat, sendAiMessage]);

  return {
    data,
    expandedSubjects,
    expandedUnits,
    aiChatVisible,
    chatMessages,
    toggleSubject,
    toggleUnit,
    toggleAiChat,
    sendAiMessage,
    explainTopic,
  };
};

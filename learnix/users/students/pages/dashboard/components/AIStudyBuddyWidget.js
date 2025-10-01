import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';

// Professional AI icon component
const AIIcon = () => (
  <View style={styles.aiIcon}>
    <View style={styles.aiHead}>
      <View style={styles.aiEyes}>
        <View style={styles.aiEye} />
        <View style={styles.aiEye} />
      </View>
      <View style={styles.aiMouth} />
    </View>
  </View>
);

// Professional send icon component
const SendIcon = ({ isTyping }) => (
  <View style={styles.sendIcon}>
    {isTyping ? (
      <View style={styles.typingIndicator}>
        <View style={styles.typingDot} />
        <View style={styles.typingDot} />
        <View style={styles.typingDot} />
      </View>
    ) : (
      <View style={styles.arrowContainer}>
        <View style={styles.arrowHead} />
        <View style={styles.arrowBody} />
      </View>
    )}
  </View>
);

export default function AIStudyBuddyWidget({ aiData, onSendMessage }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulse animation for AI icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      setIsTyping(true);
      
      // Simulate AI response
      setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Study Buddy</Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <AIIcon />
        </Animated.View>
      </View>

      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{aiData.message}</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={aiData.placeholder}
          placeholderTextColor="#9ca3af"
          value={message}
          onChangeText={setMessage}
          multiline={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!message.trim() || isTyping) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || isTyping}
        >
          <SendIcon isTyping={isTyping} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  aiIcon: {
    width: 24,
    height: 24,
  },
  aiHead: {
    width: 24,
    height: 24,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    position: 'relative',
  },
  aiEyes: {
    position: 'absolute',
    top: 6,
    left: 4.5,
    right: 4.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aiEye: {
    width: 3,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  aiMouth: {
    position: 'absolute',
    bottom: 6,
    left: 7.5,
    right: 7.5,
    height: 1.5,
    backgroundColor: 'white',
    borderRadius: 0.75,
  },
  messageContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#1f2937',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 8,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendIcon: {
    width: 16,
    height: 16,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
  },
  typingDot: {
    width: 3,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  arrowContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
    transform: [{ rotate: '90deg' }],
  },
  arrowBody: {
    position: 'absolute',
    left: 6,
    width: 3,
    height: 6,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
});

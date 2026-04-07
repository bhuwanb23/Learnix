import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';

export default function AIStudyBuddyChat({ aiData, onSendMessage }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  const sparkleAnim = React.useRef(new Animated.Value(1)).current;

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

    // Sparkle animation
    const sparkle = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    sparkle.start();

    return () => sparkle.stop();
  }, []);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      setIsTyping(true);
      
      setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Sparkle backgrounds */}
      <View style={styles.sparkle1} />
      <View style={styles.sparkle2} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.aiIconContainer}>
              <Text style={styles.aiIcon}>🤖</Text>
            </View>
            <View>
              <Text style={styles.aiTitle}>AI Study Buddy</Text>
              <Text style={styles.aiStatus}>Online & Thinking</Text>
            </View>
          </View>
        </View>

        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>{aiData.message}</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={aiData.placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={message}
            onChangeText={setMessage}
            multiline={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton, 
              (!message.trim() || isTyping) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!message.trim() || isTyping}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#2c2f31',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sparkle1: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 80, 212, 0.2)',
  },
  sparkle2: {
    position: 'absolute',
    left: -20,
    bottom: -20,
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: 'rgba(123, 156, 255, 0.15)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIconContainer: {
    backgroundColor: 'rgba(0, 80, 212, 0.2)',
    padding: 8,
    borderRadius: 10,
  },
  aiIcon: {
    fontSize: 22,
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 20,
    fontFamily: 'Plus Jakarta Sans',
  },
  aiStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7b9cff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Manrope',
  },
  messageBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 19,
    fontStyle: 'italic',
    fontFamily: 'Manrope',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 11,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontFamily: 'Manrope',
  },
  sendButton: {
    backgroundColor: '#0050d4',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sendIcon: {
    fontSize: 15,
    color: '#ffffff',
  },
});

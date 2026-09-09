import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * SearchBar — debounced search input with clear button.
 *
 * Usage:
 * <SearchBar placeholder="Search routes..." onSearch={setQuery} />
 */
export default function SearchBar({ placeholder = 'Search...', onSearch, style }) {
  const [text, setText] = useState('');
  const clearAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(clearAnim, {
      toValue: text.length > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [text]);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(text.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const handleClear = () => {
    setText('');
    onSearch?.('');
  };

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="search-outline" size={18} color="#94a3b8" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={text}
        onChangeText={setText}
        returnKeyType="search"
        autoCorrect={false}
      />
      <Animated.View style={{ opacity: clearAnim }}>
        {text.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: '#0f172a',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
});

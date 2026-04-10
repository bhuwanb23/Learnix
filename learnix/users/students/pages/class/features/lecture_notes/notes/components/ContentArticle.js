import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NOTES_COLORS } from '../constants/notesData';

export default function ContentArticle({ section }) {
  const renderSection = () => {
    if (section.id === 1) {
      return (
        <>
          {section.title && <Text style={styles.sectionTitle}>{section.title}</Text>}
          <Text style={styles.content}>{section.content}</Text>
          {section.imageUrl && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: section.imageUrl }} 
                style={styles.image}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageCaption}>{section.imageCaption}</Text>
              </View>
            </View>
          )}
        </>
      );
    }

    if (section.id === 2 && section.cards) {
      return (
        <>
          {section.title && <Text style={styles.sectionTitle}>{section.title}</Text>}
          <View style={styles.cardsGrid}>
            {section.cards.map((card, index) => (
              <View key={index} style={styles.card}>
                <Text style={[styles.cardTitle, { color: card.color }]}>{card.type}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>
            ))}
          </View>
        </>
      );
    }

    if (section.hasCode) {
      return (
        <>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{section.title}</Text>
            <Ionicons name="code-slash" size={24} color={NOTES_COLORS.primary} />
          </View>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>{section.code}</Text>
          </View>
        </>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {renderSection()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: NOTES_COLORS.surfaceContainerLowest,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${NOTES_COLORS.outlineVariant}1A`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: NOTES_COLORS.onSurface,
    marginBottom: 16,
  },
  content: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: NOTES_COLORS.onSurfaceVariant,
    lineHeight: 28,
    marginBottom: 24,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    aspectRatio: 16 / 9,
    backgroundColor: NOTES_COLORS.surfaceContainerLow,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  imageCaption: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: '#ffffff',
  },
  cardsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: NOTES_COLORS.surfaceContainerLow,
    padding: 16,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: NOTES_COLORS.onSurfaceVariant,
  },
  codeBlock: {
    backgroundColor: NOTES_COLORS.onSurface,
    padding: 20,
    borderRadius: 8,
  },
  code: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: NOTES_COLORS.surfaceContainerLowest,
    lineHeight: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});

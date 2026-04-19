import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NOTES_COLORS, NOTES_DATA } from './constants/notesData';
import NotesHeader from './components/NotesHeader';
import NotesHeroHeader from './components/NotesHeroHeader';
import TabNavigation from './components/TabNavigation';
import ContentArticle from './components/ContentArticle';
import SidePanel from './components/SidePanel';

const { width } = Dimensions.get('window');

export default function NotesPage({ navigation, topic }) {
    const [activeTab, setActiveTab] = useState('summary');

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleTabPress = (tab) => {
        setActiveTab(tab);
    };

    const renderContent = () => {
        if (activeTab === 'summary') {
            return (
                <View style={styles.contentContainer}>
                    {/* Main Content Articles */}
                    {NOTES_DATA.sections.map((section) => (
                        <ContentArticle key={section.id} section={section} />
                    ))}

                    {/* Side Panel - Below Content */}
                    <View style={styles.sidePanel}>
                        <SidePanel data={NOTES_DATA} />
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.tabPlaceholder}>
                <Ionicons name="construct-outline" size={48} color={NOTES_COLORS.onSurfaceVariant} />
                <Text style={styles.tabPlaceholderText}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tab Coming Soon</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={NOTES_COLORS.surface} />

            <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
                <NotesHeader title={NOTES_DATA.subject} onBack={handleBack} />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <NotesHeroHeader data={NOTES_DATA} />

                    <TabNavigation
                        tabs={NOTES_DATA.tabs}
                        activeTab={activeTab}
                        onTabPress={handleTabPress}
                    />

                    {renderContent()}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NOTES_COLORS.surface,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 100,
    },
    contentContainer: {
        gap: 16,
    },
    sidePanel: {
        marginTop: 8,
    },
    tabPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        gap: 12,
    },
    tabPlaceholderText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Manrope-SemiBold',
        color: NOTES_COLORS.onSurfaceVariant,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    bottomNavContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 16,
        width: '90%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: NOTES_COLORS.onSurface,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 8,
    },
    navItem: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeNavItem: {
        backgroundColor: NOTES_COLORS.primary,
        transform: [{ scale: 1.1 }, { translateY: -4 }],
        shadowColor: NOTES_COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
});

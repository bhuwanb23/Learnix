import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UPCOMING_ASSIGNMENT_COLORS, UPCOMING_ASSIGNMENT_DATA } from './constants/upcomingAssignmentData';
import HeroSection from './components/HeroSection';
import DescriptionCard from './components/DescriptionCard';
import InstructionsCard from './components/InstructionsCard';
import AttachedFilesCard from './components/AttachedFilesCard';
import BottomActionBar from './components/BottomActionBar';

export default function UpcomingAssignmentPage({ navigation, route }) {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isDesktop = width >= 1024;
    const headerTopPad = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);

    // Get assignment data from route params and merge with default data
    const clickedAssignment = route?.params?.assignment || {};

    // Merge clicked assignment with default data to ensure all fields exist
    const assignmentData = {
        ...UPCOMING_ASSIGNMENT_DATA,
        ...clickedAssignment,
    };

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleStartAssignment = () => {
        console.log('Start assignment pressed');
        // Add navigation to assignment work page
    };

    const handlePreviewAssignment = () => {
        console.log('Preview assignment pressed');
        // Add preview functionality
    };

    const handleSetReminder = () => {
        console.log('Set reminder pressed');
        // Add reminder functionality
    };

    return (
        <View style={styles.container}>
            {/* <StatusBar barStyle="dark-content" backgroundColor={UPCOMING_ASSIGNMENT_COLORS.surface} /> */}
            <StatusBar style="light" backgroundColor="#0050d4" translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: headerTopPad }]}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7} hitSlop={12}>
                    <Ionicons name="arrow-back" size={22} color={UPCOMING_ASSIGNMENT_COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
                    {assignmentData.title || 'Assignment details'}
                </Text>
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.7} hitSlop={12}>
                    <Ionicons name="ellipsis-vertical" size={22} color={UPCOMING_ASSIGNMENT_COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={isDesktop ? styles.desktopContainer : null}>
                    {/* Hero Section */}
                    <View style={styles.heroContainer}>
                        <View style={isDesktop ? styles.heroGrid : null}>
                            <View style={isDesktop ? styles.heroMain : null}>
                                <HeroSection data={assignmentData} />
                            </View>
                        </View>
                    </View>

                    {/* Main Content Area */}
                    <View style={isDesktop ? styles.contentGrid : null}>
                        {/* Left Column - Description & Instructions */}
                        <View style={isDesktop ? styles.leftColumn : null}>
                            <View style={styles.section}>
                                <DescriptionCard description={assignmentData.description} />
                            </View>

                            <View style={styles.section}>
                                <InstructionsCard instructions={assignmentData.instructions} />
                            </View>
                        </View>

                        {/* Right Column - Files & Visual */}
                        <View style={isDesktop ? styles.rightColumn : null}>
                            <View style={styles.section}>
                                <AttachedFilesCard files={assignmentData.attachedFiles} />
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <BottomActionBar
                onReminder={handleSetReminder}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: UPCOMING_ASSIGNMENT_COLORS.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 10,
        backgroundColor: UPCOMING_ASSIGNMENT_COLORS.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0, 80, 212, 0.12)',
        gap: 8,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans-Bold',
        color: UPCOMING_ASSIGNMENT_COLORS.onSurface,
        letterSpacing: -0.2,
        lineHeight: 21,
        textAlign: 'center',
        marginHorizontal: 4,
    },
    moreButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    desktopContainer: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
    },
    heroContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
    },
    heroGrid: {
        flexDirection: 'row',
        gap: 24,
    },
    heroMain: {
        flex: 2,
    },
    contentGrid: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        gap: 16,
    },
    leftColumn: {
        flex: 2,
    },
    rightColumn: {
        flex: 1,
    },
    section: {
        marginBottom: 16,
    },
});

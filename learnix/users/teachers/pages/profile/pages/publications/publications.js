import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '../../components/PageHeader';
import PublicationCard from './components/PublicationCard';
import { PUBLICATIONS } from '../../constants/profileData';

export default function Publications({ route, navigation }) {
    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <PageHeader
                title="Publications"
                subtitle={`${PUBLICATIONS.length} featured works`}
                onBack={handleBack}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.list}>
                    {PUBLICATIONS.map((publication) => (
                        <PublicationCard key={publication.id} publication={publication} />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    list: {
        paddingHorizontal: 20,
    },
});
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function EditQuestionsHeader({ onBack, quizTitle }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={24} color="#595c5e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Question Bank</Text>
            </View>
            <View style={styles.headerRight}>
                <View style={styles.profileContainer}>
                    <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmSZq5wrzKqDbw3nhxD9eUNTAadrU7_CKodfavwZptdqyMY-P7JNs0kFyir1FIe6rnk-K5j8c3ndJlqK_thLZBkFTpCu8Uu0kQBlwZm-X3B0kvhdcWMuIaK5o0Ge4RsALtS5lyjnok0xV_1Mv8aoeXJ4Zkwk6jOimOdsScXtPgp7gGPkTRF4gFVuEcS6MKle9qce0yK6s4JGz_Czr2SURO_hbNj4EqDo9gzfENaU5HbsVbZn6LJtDfLZ00bETH6wmMEvTEIW__R-U' }}
                        style={styles.profileImage}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#f5f7f9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 24,
        fontWeight: '700',
        color: '#0050d4',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#7b9cff',
    },
    profileImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
});

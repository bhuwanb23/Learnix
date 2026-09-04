import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';

export default function VisualAssetCard({ asset }) {
    return (
        <View style={styles.card}>
            <ImageBackground source={{ uri: asset.image }} style={styles.image} imageStyle={styles.imageStyle}>
                <View style={styles.imageOverlay} />
            </ImageBackground>
            <View style={styles.text}>
                <View style={styles.titleRow}>
                    <Text style={styles.eyebrow}>{asset.eyebrow}</Text>
                    <Text style={styles.fileName}>{asset.fileName}</Text>
                </View>
                <Text style={styles.caption}>{asset.caption}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: '#eef1f3',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    image: {
        width: 112,
        height: 96,
        borderRadius: 12,
        overflow: 'hidden',
    },
    imageStyle: {
        borderRadius: 12,
    },
    imageOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 80, 212, 0.15)',
    },
    text: {
        flex: 1,
        minWidth: 0,
    },
    titleRow: {
        marginBottom: 4,
    },
    eyebrow: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#0050d4',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    fileName: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    caption: {
        fontFamily: 'Manrope',
        fontSize: 12,
        color: '#595c5e',
        lineHeight: 17,
    },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { SkeletonCard } from '../../../../../../components/ui';
import { ReceiptView } from '../../components/ReceiptView';
import { fmtDateTime } from '../../donationsMeta';

/**
 * A digital receipt, rendered rather than downloaded.
 *
 * Why on-screen instead of a PDF: there is no PDF library in this app, and a
 * stored document would be a second copy of the truth that goes stale the moment
 * a payment is reversed. This assembles the receipt from live data every time it
 * opens, and the Share action sends the same text — so a donor forwarding it
 * cannot forward a superseded version.
 *
 * The endpoint returns 404 for "not yours" as well as "does not exist", because a
 * 403 would confirm the donation exists.
 */
export default function ReceiptScreen({ donationId, navigation }) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setReceipt(await alumniApi.donationReceipt(donationId));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [donationId]);

  useEffect(() => {
    load();
  }, [load]);

  const onShare = async () => {
    try {
      // The Share module from react-native core — no extra dependency, and it
      // raises the real OS share sheet rather than pretending to copy a link.
      const { Share } = require('react-native');
      const { receiptShareText } = require('../../donationsMeta');
      await Share.share({ message: receiptShareText(receipt) });
    } catch {
      Alert.alert('Cannot share', 'Sharing is not available on this device.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Receipt" />
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error || !receipt) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Receipt" />
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error ?? 'Receipt not available'}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Receipt" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <ReceiptView receipt={receipt} />

        {/* A voided receipt is shown, not hidden. A donor holding an old copy of
            this document needs to see why it stopped being valid. */}
        {receipt.isVoid ? (
          <View style={styles.voidBox}>
            <Ionicons name="warning-outline" size={16} color="#dc2626" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.voidTitle}>This receipt has been voided</Text>
              {receipt.voidReason ? <Text style={styles.voidText}>{receipt.voidReason}</Text> : null}
              <Text style={styles.voidHint}>It is kept as a record but is not proof of a live payment.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.taxBox}>
          <Ionicons name="information-circle-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.taxText}>{receipt.tax.note}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
            <Ionicons name="share-social-outline" size={15} color="#fff" />
            <Text style={styles.shareText}>Share receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={load}>
            <Ionicons name="refresh-outline" size={15} color="#2563eb" />
          </TouchableOpacity>
        </View>

        <Text style={styles.footNote}>Issued {fmtDateTime(receipt.issuedAt)}</Text>
      </ScrollView>
    </View>
  );
}

function Header({ navigation, title }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
        <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { marginTop: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', lineHeight: 18 },
  retry: { marginTop: 14, backgroundColor: '#2563eb', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  headerTitle: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  list: { padding: 16, paddingBottom: 28 },
  voidBox: { flexDirection: 'row', backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', padding: 12, marginTop: 12 },
  voidTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#991b1b' },
  voidText: { fontSize: 10, fontFamily: 'Manrope-Medium', color: '#991b1b', marginTop: 3 },
  voidHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: '#b91c1c', marginTop: 4, lineHeight: 13 },
  taxBox: { flexDirection: 'row', gap: 7, backgroundColor: '#fff', borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, padding: 11, marginTop: 12 },
  taxText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 15 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 16 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12 },
  shareText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  refreshBtn: { width: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: '#fff' },
  footNote: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 14 },
});

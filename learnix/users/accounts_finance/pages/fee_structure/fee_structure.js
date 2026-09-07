import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function FeeStructureModule({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.feeStructure();
      setData(result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleRevision = async (fs) => {
    Alert.alert('Request Revision', `Request fee revision for ${fs.program}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Request',
        onPress: async () => {
          try {
            await accountsApi.requestRevision(fs.id);
            fetchData();
            Alert.alert('Requested', 'Fee revision submitted for admin approval.');
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading fee structures…</Text></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      <Text style={styles.hint}>Annual fee structure per program. Tap to expand. Changes need admin approval.</Text>
      {data.length === 0 ? (
        <View style={styles.emptyState}><Text style={styles.emptyText}>No fee structures</Text></View>
      ) : (
        data.map((fs) => {
          const expanded = expandedId === fs.id;
          return (
            <View key={fs.id} style={styles.programCard}>
              <TouchableOpacity style={styles.programHeader} activeOpacity={0.8} onPress={() => setExpandedId(expanded ? null : fs.id)}>
                <View style={[styles.programIcon, { backgroundColor: '#2563eb14' }]}><Ionicons name="school-outline" size={18} color="#2563eb" /></View>
                <View style={styles.programInfo}>
                  <Text style={styles.programName}>{fs.program}</Text>
                  <Text style={styles.programTotal}>₹{fs.totalRupees.toLocaleString()} / year • {fs.academicYear}</Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
              </TouchableOpacity>
              {expanded && (
                <>
                  <View style={styles.componentsBox}>
                    <View style={styles.compRow}><Text style={styles.compLabel}>Tuition</Text><Text style={styles.compAmount}>₹{fs.tuitionRupees.toLocaleString()}</Text></View>
                    <View style={styles.compRow}><Text style={styles.compLabel}>Other Charges</Text><Text style={styles.compAmount}>₹{fs.otherRupees.toLocaleString()}</Text></View>
                    <View style={styles.compTotalRow}>
                      <Text style={styles.compTotalLabel}>Total per year</Text>
                      <Text style={styles.compTotalAmount}>₹{fs.totalRupees.toLocaleString()}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleRevision(fs)} activeOpacity={0.85}>
                    <Ionicons name="create-outline" size={15} color="#2563eb" />
                    <Text style={styles.editBtnText}>Request Revision</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  hint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  programCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  programHeader: { flexDirection: 'row', alignItems: 'center' },
  programIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  programInfo: { flex: 1 },
  programName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  programTotal: { fontSize: 12, color: '#2563eb', fontFamily: 'Manrope-Bold', marginTop: 1 },
  componentsBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 12 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  compLabel: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Regular' },
  compAmount: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  compTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 },
  compTotalLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  compTotalAmount: { fontSize: 13, fontWeight: '800', color: '#2563eb', fontFamily: 'PlusJakartaSans-Bold' },
  editBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, paddingVertical: 10, marginTop: 12 },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },
});

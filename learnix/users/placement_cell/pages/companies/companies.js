import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COMPANY_STATS, COMPANIES } from './constants/companiesData';
import CompanyDetail from './pages/company_detail/company_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function CompaniesModule({ navigation }) {
  const [tab, setTab] = useState('list');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [sectorFilter, setSectorFilter] = useState('all');
  const [form, setForm] = useState({
    name: '',
    sector: '',
    poc: '',
    pocRole: '',
  });

  if (selectedCompany) {
    return <CompanyDetail company={selectedCompany} onBack={() => setSelectedCompany(null)} />;
  }

  const sectors = ['all', ...new Set(COMPANIES.map((c) => c.sector))];
  const filteredCompanies = sectorFilter === 'all' ? COMPANIES : COMPANIES.filter((c) => c.sector === sectorFilter);

  const handleAddCompany = () => {
    if (!form.name.trim()) {
      Alert.alert('Missing Fields', 'Please enter the company name.');
      return;
    }
    Alert.alert(
      'Add Company',
      `Add ${form.name} as a partner company?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => {
            setForm({ name: '', sector: '', poc: '', pocRole: '' });
            setTab('list');
            Alert.alert('Company Added', `${form.name} added to the partner directory.`);
          },
        },
      ]
    );
  };

  const handleContactPoc = (company) => {
    Alert.alert(
      'Contact POC',
      `${company.poc} (${company.pocRole}) at ${company.name}.\nEmail and phone shared via contact card.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message', onPress: () => Alert.alert('Message', `Opening chat with ${company.poc}...`) },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {COMPANY_STATS.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'list', label: 'Directory' },
          { id: 'add', label: 'Add Company' },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.activeTab]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'list' ? (
        <>
          {/* Sector filters */}
          <View style={styles.filterRow}>
            {sectors.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, sectorFilter === s && styles.filterChipActive]}
                onPress={() => setSectorFilter(s)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, sectorFilter === s && styles.filterTextActive]}>
                  {s === 'all' ? 'All' : s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredCompanies.map((company) => (
            <TouchableOpacity
              key={company.id}
              style={styles.companyCard}
              activeOpacity={0.8}
              onPress={() => setSelectedCompany(company)}
            >
              <View style={[styles.companyIcon, { backgroundColor: company.color + '14' }]}>
                <Text style={[styles.companyInitial, { color: company.color }]}>{company.name.charAt(0)}</Text>
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.companyMeta}>{company.sector} • {company.jobs} jobs • {company.hires} hires</Text>
                <View style={styles.companyChips}>
                  <View style={[styles.pocChip, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[styles.pocText, { color: '#2563eb' }]}>{company.poc}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.companyRight}>
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => handleContactPoc(company)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#2563eb" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.formHint}>Add a new partner company to the placement directory.</Text>

          <Text style={styles.fieldLabel}>Company Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="e.g. Zoho Corporation"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Sector</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.sector}
              onChangeText={(v) => setForm((p) => ({ ...p, sector: v }))}
              placeholder="e.g. SaaS / IT Services"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Point of Contact</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.poc}
              onChangeText={(v) => setForm((p) => ({ ...p, poc: v }))}
              placeholder="e.g. S. Nair"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>POC Role</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.pocRole}
              onChangeText={(v) => setForm((p) => ({ ...p, pocRole: v }))}
              placeholder="e.g. Campus Hiring Manager"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleAddCompany} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Add Company</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#eef2f7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#2563eb',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  companyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyInitial: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  companyMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  companyChips: {
    flexDirection: 'row',
    marginTop: 6,
  },
  pocChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pocText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  companyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formHint: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'Manrope-Bold',
    marginBottom: 6,
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: {
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
  },
  createBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
});
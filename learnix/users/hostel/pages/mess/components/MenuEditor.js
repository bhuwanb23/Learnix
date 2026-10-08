/**
 * Menu editor: change what is served for one meal on one weekday.
 *
 * `isVeg` IS EDITABLE HERE, WHICH IT NEVER WAS
 * --------------------------------------------
 * `MessMenuItem.isVeg` has existed since the model was written, but `upsertMenuItem` only ever wrote
 * `itemsJson` - the flag was whatever the seeder happened to say and could not be corrected from
 * the app. The old screen's menu had a literal edit affordance behind an `Alert.alert` that said
 * "Menu editor opens here".
 *
 * The server now writes the flag AND cross-checks it: `setMessMenu` refuses a meal flagged
 * vegetarian that lists chicken, mutton, beef, pork, fish, egg or prawn. A flag the cook cannot
 * trust is worse than no flag, so a menu that contradicts itself is rejected with a 422 rather
 * than saved as a lie. The toggle here is therefore advisory - if it disagrees with the dishes, the
 * server says so.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { DAY_NAMES, mealLabel, MEAL_META } from '../messMeta';

/** Kept in step with the server's `setMessMenu` check, so the warning appears before the 422. */
const NON_VEG = /\b(chicken|mutton|beef|pork|fish|egg|prawn)\b/i;

export default function MenuEditor({ visible, editing, onClose, onSave }) {
  const [items, setItems] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !editing) return;
    setItems((editing.items ?? []).join(', '));
    setIsVeg(editing.isVeg ?? true);
  }, [visible, editing]);

  if (!editing) return null;

  const parsed = items
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Advisory only. The server enforces this; doing it here just saves a round trip and explains why.
  const contradiction = isVeg && parsed.some((i) => NON_VEG.test(i));

  const submit = async () => {
    if (parsed.length === 0) {
      Alert.alert('Nothing to serve', 'Add at least one dish.');
      return;
    }
    if (parsed.length > 12) {
      Alert.alert('That is a long menu', 'Keep it to 12 dishes or fewer.');
      return;
    }
    try {
      setSaving(true);
      await onSave(editing.dayOfWeek, editing.meal, parsed, isVeg);
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {mealLabel(editing.meal)} · {DAY_NAMES[editing.dayOfWeek]}
            </Text>
            <Text style={styles.subtitle}>Comma-separated, up to 12 dishes</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.pad}>
          <View style={styles.mealIconRow}>
            <View
              style={[
                styles.mealIcon,
                { backgroundColor: `${MEAL_META[editing.meal]?.color ?? '#64748b'}1a` },
              ]}
            >
              <Ionicons
                name={MEAL_META[editing.meal]?.icon ?? 'restaurant-outline'}
                size={17}
                color={MEAL_META[editing.meal]?.color ?? '#64748b'}
              />
            </View>
            <Text style={styles.mealName}>{mealLabel(editing.meal)}</Text>
          </View>

          <TextInput
            style={styles.input}
            value={items}
            onChangeText={setItems}
            placeholder="Chapati, Dal Tadka, Rice"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            autoCorrect={false}
          />

          {parsed.length > 0 && (
            <View style={styles.chips}>
              {parsed.map((dish, i) => (
                <View key={`${dish}-${i}`} style={styles.chip}>
                  <Text style={styles.chipText}>{dish}</Text>
                  <TouchableOpacity
                    onPress={() => setItems(parsed.filter((_, j) => j !== i).join(', '))}
                  >
                    <Ionicons name="close-circle" size={13} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsVeg((v) => !v)}
          >
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Vegetarian</Text>
              <Text style={styles.toggleHint}>
                {isVeg ? 'No meat, fish or egg on this meal' : 'Contains meat, fish or egg'}
              </Text>
            </View>
            <View style={[styles.checkbox, isVeg && styles.checkboxOn]}>
              {isVeg && <Ionicons name="leaf" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>

          {contradiction && (
            <View style={styles.warn}>
              <Ionicons name="warning-outline" size={15} color="#b45309" />
              <Text style={styles.warnText}>
                This is marked vegetarian but lists a non-veg dish. The server will refuse it — either
                remove the dish or turn the flag off.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, (saving || contradiction) && styles.saveBtnIdle]}
            onPress={submit}
            disabled={saving || contradiction}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save this meal</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: { padding: 6 },
  pad: { paddingHorizontal: 16 },
  mealIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealName: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    minHeight: 74,
    textAlignVertical: 'top',
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  chipText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginTop: 14,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  toggleHint: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  warn: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  warnText: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Medium', color: '#b45309' },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  saveBtnIdle: { backgroundColor: theme.colors.textMuted },
  saveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});
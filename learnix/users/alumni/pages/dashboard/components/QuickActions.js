/**
 * Quick Actions — Join Event, Find Mentor, Connect, Donate.
 *
 * WHY THE TARGETS ARE SHALLOW
 * ---------------------------
 * The app's router is a tab + module switch in `alumni.js`, not a navigation stack. It can
 * switch a bottom-nav tab (`switchTab`) or push one of three registered feature modules
 * (`openModule`). There is nothing finer.
 *
 * So "Connect" opens the Alumni tab and "Donate" opens the Funds tab, rather than landing
 * on the Connections inbox or the Give form. Both of those screens exist and work — the
 * Connections inbox is local state inside `pages/alumni/alumni.js` and the Give screen is
 * local state inside `donations.js`, so neither is addressable from outside its parent.
 * Wiring them properly is a change to those two files' state model, not to this card, and
 * inventing a deep-link that lands somewhere unhelpful would be worse than one extra tap.
 *
 * The card therefore stores `kind` rather than a route name, so promoting an action to a
 * real deep link later is a change in this one file.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { QUICK_ACTIONS, tint } from '../dashboardMeta';

export default function QuickActions({ navigation }) {
  /**
   * Resolved here rather than passed in, so the hub does not have to know the shape of the
   * navigation object it is given — it already differs per screen in this app, which is
   * how the old dashboard's `switchTab` call ended up reaching a no-op on one tab.
   */
  const go = (action) => {
    const nav = navigation ?? {};
    if (action.kind === 'tab') {
      if (typeof nav.switchTab === 'function') nav.switchTab(action.target);
      else if (typeof nav.navigate === 'function') nav.navigate(action.target);
      return;
    }
    if (typeof nav.openModule === 'function') nav.openModule(action.target);
    else if (typeof nav.navigate === 'function') nav.navigate(action.target);
  };

  return (
    <View style={styles.wrap}>
      {QUICK_ACTIONS.map((action) => (
        <TouchableOpacity
          key={action.key}
          onPress={() => go(action)}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityHint={action.caption}
          activeOpacity={0.85}
          style={styles.tile}
        >
          <View style={[styles.iconWrap, { backgroundColor: tint(action.accent) }]}>
            <Ionicons name={action.icon} size={17} color={action.accent} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {action.label}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {action.caption}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    // Two per row with an 8px gap: 48% + 48% + gap overflows on narrow phones, which is
    // what pushed the third tile onto its own line at 360dp.
    width: '48.6%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 11,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  caption: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
});
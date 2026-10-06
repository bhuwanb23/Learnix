/**
 * Broadcast page (office only).
 *
 * A thin shell around BroadcastComposer. It exists as a separate file so the hub
 * does not carry the composer's 300 lines, and so the office-only tab is a route the
 * hub can simply decline to render for a graduate — rather than something the
 * composer has to decide to hide from inside.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import BroadcastComposer from '../../components/BroadcastComposer';

export default function BroadcastPage({ onSent }) {
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <BroadcastComposer onSent={onSent} />
    </ScrollView>
  );
}
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { inrExact, fmtDate, lookup, METHODS } from '../donationsMeta';

/**
 * The receipt document.
 *
 * A pure presentational component so the same rendering can be used on the
 * receipt screen and inline in a donor's history row without duplicating the
 * layout. Everything it prints comes from the server's receipt payload — it
 * computes nothing, because a receipt that calculates its own figures is a
 * receipt that can disagree with the ledger.
 */
export function ReceiptView({ receipt }) {
  const method = lookup(METHODS, receipt.payment.method, receipt.payment.methodLabel);
  const d = receipt.donation;

  return (
    <View style={styles.paper}>
      <View style={styles.head}>
        <View style={styles.seal}>
          <Ionicons name="school" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.inst}>Learnix Institute</Text>
          <Text style={styles.instSub}>Alumni Relations · Gift acknowledgement</Text>
        </View>
        <View style={styles.noBox}>
          <Text style={styles.noLabel}>Receipt</Text>
          <Text style={styles.noValue}>{receipt.receiptNo}</Text>
        </View>
      </View>

      <View style={styles.dash} />

      <Text style={styles.amount}>{inrExact(d.amountRupees)}</Text>
      <Text style={styles.amountLabel}>Received with thanks</Text>

      <View style={styles.rows}>
        <Row label="Received from" value={receipt.donor.name + (receipt.donor.batch ? ` · Batch ${receipt.donor.batch}` : '')} />
        {/* Anonymity is stated on the document. A donor who gave anonymously but
            holds a receipt naming them would reasonably think the receipt had been
            published. */}
        {receipt.donor.isAnonymous ? (
          <Row label="Public ledger" value="Shown as Anonymous" icon="eye-off-outline" />
        ) : null}
        <Row label="Towards" value={d.campaign} />
        <Row label="Fund" value={d.fundLabel} />
        {d.isRecurring ? <Row label="Standing gift" value="One instalment" icon="repeat-outline" /> : null}
        <Row label="Payment" value={`${receipt.payment.referenceNo} · ${method.label}`} icon={method.icon} />
        <Row label="Date received" value={fmtDate(d.receivedAt)} />
        <Row label="Issued" value={fmtDate(receipt.issuedAt)} />
      </View>

      {d.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Donor dedication</Text>
          <Text style={styles.noteText}>“{d.note}”</Text>
        </View>
      ) : null}

      <View style={styles.foot}>
        <Ionicons name="finger-print-outline" size={13} color={theme.colors.textMuted} />
        <Text style={styles.footText}>
          Quote {receipt.receiptNo} to verify. A receipt is issued only once the money is recorded against the college.
        </Text>
      </View>
    </View>
  );
}

function Row({ label, value, icon }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        {icon ? <Ionicons name={icon} size={11} color={theme.colors.textMuted} /> : null}
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  seal: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  inst: { fontSize: 13, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  instSub: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  noBox: { alignItems: 'flex-end' },
  noLabel: { fontSize: 8, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  noValue: { fontSize: 11, fontFamily: 'Manrope-ExtraBold', color: '#2563eb', marginTop: 2 },

  dash: { height: 1, backgroundColor: theme.colors.border, marginVertical: 14 },

  amount: { fontSize: 26, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text, textAlign: 'center' },
  amountLabel: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 2, marginBottom: 16 },

  rows: { gap: 9 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  rowLabel: { width: 108, fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  rowValueWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text },

  noteBox: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 11, marginTop: 14 },
  noteLabel: { fontSize: 8, fontFamily: 'Manrope-Bold', color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.4 },
  noteText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#78350f', marginTop: 3, fontStyle: 'italic', lineHeight: 16 },

  foot: { flexDirection: 'row', gap: 6, marginTop: 16, alignItems: 'flex-start' },
  footText: { flex: 1, fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 14 },
});

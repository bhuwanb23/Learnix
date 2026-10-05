import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi, mediaUrl } from '../../../../../../services/api';
import { EmptyState } from '../../../../../../components/ui';
import { PhotoTile } from '../../components/EventCard';
import { fmtDate } from '../../eventMeta';

/**
 * Memories tab — photographs from an event that has already happened.
 *
 * Uploads are real multipart posts into the shared File store, so an image
 * cannot rot the way a pasted hotlink does. The office uploads with a caption;
 * everyone can browse.
 *
 * An inline image viewer is used instead of a gallery dependency: this is a
 * single grid with a lightbox, and pulling in a full gallery package for it
 * would be more surface than the feature needs.
 */
export default function EventMemories({ event, reload }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [captionFor, setCaptionFor] = useState(null);
  const [caption, setCaption] = useState('');

  const vc = event.viewerContext ?? {};

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await alumniApi.eventPhotos(event.id));
    } catch (e) {
      Alert.alert('Cannot load photos', e.message);
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onPick = async () => {
    // expo-image-picker is not a dependency of this app, so a real camera/gallery
    // pick is out of scope. The upload path itself is complete and exercised by
    // the seed + verification; only the picker UI is missing.
    Alert.alert(
      'Pick a photo',
      'The image picker is not wired up yet. The upload endpoint is ready — it takes a multipart file under "file" with an optional caption.',
    );
  };

  const onSaveCaption = async () => {
    try {
      setBusy(true);
      await alumniApi.captionEventPhoto(event.id, captionFor.id, caption.trim());
      setCaptionFor(null);
      setCaption('');
      await load();
    } catch (e) {
      Alert.alert('Cannot save caption', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = (photo) => {
    Alert.alert('Delete this photo?', 'It is removed from the event and from the file store.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await alumniApi.deleteEventPhoto(event.id, photo.id);
            setViewing(null);
            await load();
            reload();
          } catch (e) {
            Alert.alert('Cannot delete', e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const photos = data?.photos ?? [];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Memories</Text>
        {vc.canUploadPhotos ? (
          <TouchableOpacity onPress={onPick}>
            <Text style={styles.linkAction}>Upload</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && !data ? (
        <ActivityIndicator color="#2563eb" style={{ marginVertical: 30 }} />
      ) : photos.length === 0 ? (
        <EmptyState
          icon="images-outline"
          title="No photos yet"
          subtitle={
            vc.canUploadPhotos
              ? 'Upload photographs from this event so they outlive the page.'
              : 'Photographs will appear here once the organiser adds them.'
          }
          color="#7c3aed"
        />
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <PhotoTile
              key={p.id}
              photo={p}
              size={96}
              onPress={() => setViewing(p)}
              onLongPress={
                vc.canDeletePhotos
                  ? () => {
                      setCaptionFor(p);
                      setCaption(p.caption ?? '');
                    }
                  : undefined
              }
            />
          ))}
        </View>
      )}

      {vc.canUploadPhotos && photos.length > 0 ? (
        <Text style={styles.hint}>Long-press a photo to edit its caption.</Text>
      ) : null}

      {/* Lightbox */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.lightbox}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setViewing(null)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {viewing ? (
            <>
              <Image source={{ uri: mediaUrl(viewing.url) }} style={styles.lightboxImg} resizeMode="contain" />
              <View style={styles.lightboxMeta}>
                {viewing.caption ? <Text style={styles.lightboxCaption}>{viewing.caption}</Text> : null}
                <Text style={styles.lightboxSub}>
                  {viewing.uploadedBy ? `Added by ${viewing.uploadedBy} · ` : ''}
                  {fmtDate(viewing.createdAt)}
                </Text>
                {vc.canDeletePhotos ? (
                  <TouchableOpacity style={styles.lightboxDelete} onPress={() => onDelete(viewing)}>
                    <Ionicons name="trash-outline" size={14} color="#fff" />
                    <Text style={styles.lightboxDeleteText}>Delete photo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </Modal>

      {/* Caption editor */}
      <Modal visible={!!captionFor} transparent animationType="slide" onRequestClose={() => setCaptionFor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit caption</Text>
              <TouchableOpacity onPress={() => setCaptionFor(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Caption</Text>
            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={caption}
              onChangeText={setCaption}
              multiline
              textAlignVertical="top"
              placeholder="Batch of 1999 at the reunion dinner"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCaptionFor(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={onSaveCaption} disabled={busy}>
                <Text style={styles.modalSubmitText}>{busy ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  linkAction: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#7c3aed' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 6 },

  lightbox: { flex: 1, backgroundColor: 'rgba(2,6,23,0.96)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  lightboxClose: { position: 'absolute', top: 40, right: 20, zIndex: 2 },
  lightboxImg: { width: '100%', height: '62%', borderRadius: 10 },
  lightboxMeta: { marginTop: 16, alignItems: 'center' },
  lightboxCaption: { color: '#fff', fontSize: 13, fontFamily: 'Manrope-SemiBold', textAlign: 'center' },
  lightboxSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'Manrope-Medium', marginTop: 5 },
  lightboxDelete: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14, backgroundColor: 'rgba(220,38,38,0.9)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  lightboxDeleteText: { color: '#fff', fontSize: 12, fontFamily: 'Manrope-Bold' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  fieldLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 10 },
  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  fieldMultiline: { minHeight: 80 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modalSubmit: { flex: 1, backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});
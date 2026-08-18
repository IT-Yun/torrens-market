import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarClock, MapPin, X } from 'lucide-react-native';
import i18n from '../lib/i18n';
import { fetchMeetup, proposeMeetup, setMeetupStatus, type Meetup } from '../lib/meetups';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';

function defaultProposalTime(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  return d;
}

function formatWhen(iso: string): string {
  const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'zh' ? 'zh-CN' : 'en-AU';
  return new Date(iso).toLocaleString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Pinned meetup area for a chat room (ADR 009): shows the room's active
 * meetup with contextual actions, or a "schedule pickup" entry point.
 */
export function MeetupCard({
  roomId,
  myId,
  defaultPlace,
}: {
  roomId: string;
  myId: string;
  defaultPlace: string;
}) {
  const { t } = useTranslation();
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [when, setWhen] = useState<Date>(defaultProposalTime);
  const [place, setPlace] = useState(defaultPlace);
  const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchMeetup(roomId).then(setMeetup).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`meetups-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetups', filter: `room_id=eq.${roomId}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, roomId]);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      load();
    } finally {
      setBusy(false);
    }
  }

  const mine = meetup?.proposer_id === myId;

  return (
    <View>
      {meetup ? (
        <View style={styles.card}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.row}>
              <CalendarClock size={15} color={colors.primary} />
              <Text style={styles.when}>{formatWhen(meetup.scheduled_at)}</Text>
              <View
                style={[
                  styles.statusChip,
                  meetup.status === 'accepted' && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    meetup.status === 'accepted' && { color: colors.white },
                  ]}
                >
                  {t(meetup.status === 'accepted' ? 'meetup.statusAccepted' : 'meetup.statusProposed')}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <MapPin size={13} color={colors.textSecondary} />
              <Text style={styles.place} numberOfLines={1}>
                {meetup.place}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            {meetup.status === 'proposed' && !mine && (
              <>
                <Pressable
                  style={styles.acceptBtn}
                  disabled={busy}
                  onPress={() => act(() => setMeetupStatus(meetup.id, 'accepted'))}
                >
                  <Text style={styles.acceptText}>{t('meetup.accept')}</Text>
                </Pressable>
                <Pressable
                  style={styles.declineBtn}
                  disabled={busy}
                  onPress={() => act(() => setMeetupStatus(meetup.id, 'declined'))}
                >
                  <Text style={styles.declineText}>{t('meetup.decline')}</Text>
                </Pressable>
              </>
            )}
            {(meetup.status === 'accepted' || (meetup.status === 'proposed' && mine)) && (
              <Pressable
                style={styles.declineBtn}
                disabled={busy}
                onPress={() => act(() => setMeetupStatus(meetup.id, 'cancelled'))}
              >
                <Text style={styles.declineText}>{t('meetup.cancel')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <Pressable style={styles.scheduleBtn} onPress={() => setModalOpen(true)}>
          <CalendarClock size={15} color={colors.primary} />
          <Text style={styles.scheduleText}>{t('meetup.schedule')}</Text>
        </Pressable>
      )}

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('meetup.title')}</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                <X size={20} color={colors.text} />
              </Pressable>
            </View>

            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={when}
                mode="datetime"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_, date) => date && setWhen(date)}
              />
            ) : (
              <View style={{ gap: spacing.sm }}>
                <Pressable style={styles.androidPick} onPress={() => setAndroidStep('date')}>
                  <CalendarClock size={15} color={colors.primary} />
                  <Text style={styles.androidPickText}>{formatWhen(when.toISOString())}</Text>
                </Pressable>
                {androidStep && (
                  <DateTimePicker
                    value={when}
                    mode={androidStep}
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      if (event.type !== 'set' || !date) {
                        setAndroidStep(null);
                        return;
                      }
                      setWhen(date);
                      setAndroidStep(androidStep === 'date' ? 'time' : null);
                    }}
                  />
                )}
              </View>
            )}

            <TextInput
              style={styles.placeInput}
              placeholder={t('meetup.placePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={place}
              onChangeText={setPlace}
            />

            <Pressable
              style={[styles.proposeBtn, (!place.trim() || busy) && { opacity: 0.5 }]}
              disabled={!place.trim() || busy}
              onPress={() =>
                act(async () => {
                  await proposeMeetup(roomId, myId, when, place);
                  setModalOpen(false);
                })
              }
            >
              <Text style={styles.proposeText}>{t('meetup.propose')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  when: { fontSize: 14, fontWeight: '700', color: colors.text },
  place: { fontSize: 13, color: colors.textSecondary, flexShrink: 1 },
  statusChip: {
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  actions: { gap: 6 },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
  },
  acceptText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  declineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  declineText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  scheduleText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  androidPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.white,
  },
  androidPickText: { fontSize: 15, color: colors.text },
  placeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  proposeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  proposeText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});

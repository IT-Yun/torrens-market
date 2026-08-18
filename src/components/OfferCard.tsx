import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { HandCoins, X } from 'lucide-react-native';
import { formatPrice } from '../lib/format';
import { fetchOffer, proposeOffer, setOfferStatus, type Offer } from '../lib/offers';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';

/**
 * Pinned price-offer area for a chat room (ADR 011): shows the open or
 * accepted offer with contextual actions, or a "make offer" entry point.
 */
export function OfferCard({ roomId, myId }: { roomId: string; myId: string }) {
  const { t } = useTranslation();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchOffer(roomId).then(setOffer).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`offers-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `room_id=eq.${roomId}` },
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

  const mine = offer?.proposer_id === myId;

  return (
    <View>
      {offer ? (
        <View style={styles.card}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.row}>
              <HandCoins size={15} color={colors.primary} />
              <Text style={styles.amount}>{formatPrice(offer.price_cents)}</Text>
              <View
                style={[
                  styles.statusChip,
                  offer.status === 'accepted' && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    offer.status === 'accepted' && { color: colors.white },
                  ]}
                >
                  {t(offer.status === 'accepted' ? 'offer.statusAccepted' : 'offer.statusProposed')}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.actions}>
            {offer.status === 'proposed' && !mine && (
              <>
                <Pressable
                  style={styles.acceptBtn}
                  disabled={busy}
                  onPress={() => act(() => setOfferStatus(offer.id, 'accepted'))}
                >
                  <Text style={styles.acceptText}>{t('offer.accept')}</Text>
                </Pressable>
                <Pressable
                  style={styles.declineBtn}
                  disabled={busy}
                  onPress={() => act(() => setOfferStatus(offer.id, 'declined'))}
                >
                  <Text style={styles.declineText}>{t('offer.decline')}</Text>
                </Pressable>
              </>
            )}
            {offer.status === 'proposed' && mine && (
              <Pressable
                style={styles.declineBtn}
                disabled={busy}
                onPress={() => act(() => setOfferStatus(offer.id, 'withdrawn'))}
              >
                <Text style={styles.declineText}>{t('offer.withdraw')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <Pressable style={styles.makeBtn} onPress={() => setModalOpen(true)}>
          <HandCoins size={15} color={colors.primary} />
          <Text style={styles.makeText}>{t('offer.make')}</Text>
        </Pressable>
      )}

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('offer.title')}</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                <X size={20} color={colors.text} />
              </Pressable>
            </View>
            <TextInput
              style={styles.priceInput}
              placeholder={t('offer.pricePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
              autoFocus
            />
            <Pressable
              style={[styles.sendBtn, (!price.trim() || busy) && { opacity: 0.5 }]}
              disabled={!price.trim() || busy}
              onPress={() =>
                act(async () => {
                  await proposeOffer(roomId, myId, Math.round(parseFloat(price) * 100));
                  setPrice('');
                  setModalOpen(false);
                })
              }
            >
              <Text style={styles.sendText}>{t('offer.send')}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amount: { fontSize: 16, fontWeight: '800', color: colors.text },
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
  makeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  makeText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
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
  priceInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.white,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  sendText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});

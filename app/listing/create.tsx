import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Linking,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button, Field } from '../../src/components/ui';
import i18n from '../../src/lib/i18n';
import {
  createListing,
  fetchCategories,
  fetchListing,
  captureImages,
  ensureCameraPermission,
  pickImages,
  updateListing,
  type Category,
  type FieldDef,
} from '../../src/lib/listings';
import { GuestCta } from '../../src/components/GuestCta';
import { usePromptSheet } from '../../src/components/PromptSheet';
import { useAppConfig } from '../../src/lib/appConfig';
import { useSession } from '../../src/lib/session';
import { supabase } from '../../src/lib/supabase';
import { Camera, ChevronLeft, ChevronRight, MapPin, ShieldCheck, Sparkles, X } from 'lucide-react-native';
import { SuburbField } from '../../src/components/SuburbField';
import { suggestCategorySlug } from '../../src/lib/categorize';
import { getApproxPosition } from '../../src/lib/location';
import { colors, radius, spacing } from '../../src/theme';

const MAX_PHOTOS = 10;
const CONDITIONS = ['new', 'like_new', 'good', 'worn', 'defective'];
const PICKUP_MODES = ['pickup_only', 'seller_delivers', 'buyer_collects'];
const PAYMENT_METHODS = ['any', 'cash_only', 'bank_transfer'];

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function CustomField({
  def,
  value,
  onChange,
  lang,
}: {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  lang: string;
}) {
  const { t } = useTranslation();
  const baseLabel = def.label_i18n[lang] ?? def.label_i18n.en ?? def.key;
  const label = def.required ? `${baseLabel} *` : baseLabel;

  if (def.type === 'boolean') {
    return (
      <View style={styles.switchRow}>
        <Text style={styles.label}>{label}</Text>
        <Switch
          value={Boolean(value)}
          onValueChange={onChange}
          trackColor={{ true: colors.primary }}
        />
      </View>
    );
  }
  // dimensions / date / number / text / photo all render as a text field for MVP;
  // photo-type receipt uploads join the main photo set.
  return (
    <Field
      label={def.unit ? `${label} (${def.unit})` : label}
      keyboardType={def.type === 'number' ? 'numeric' : 'default'}
      placeholder={def.type === 'date' ? 'YYYY-MM' : def.type === 'dimensions' ? '120×80×75' : ''}
      value={value == null ? '' : String(value)}
      onChangeText={(text) => onChange(def.type === 'number' ? text.replace(/[^0-9.]/g, '') : text)}
    />
  );
}

export default function CreateListingScreen() {
  const { t } = useTranslation();
  const { session, profile, refreshProfile } = useSession();
  const { maintenanceMode, uploadsEnabled } = useAppConfig();
  const sheet = usePromptSheet();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  // App Store 1.2 / Play UGC: terms acceptance gate before the first post.
  const needsTos = !editId && !!profile && !profile.tos_accepted_at;

  async function acceptTos() {
    if (!session) return;
    const { error } = await supabase
      .from('profiles')
      .update({ tos_accepted_at: new Date().toISOString() })
      .eq('id', session.user.id);
    if (error) {
      Alert.alert(error.message);
      return;
    }
    await refreshProfile();
  }
  const lang = i18n.language;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<ImagePickerAsset[]>(() => {
    // Dev-only: preload sample photos for simulator screenshots (EXPO_PUBLIC_QA_PHOTOS = JSON array of
    // {uri,width,height,assetId}). Inlined at bundle time; never set in EAS builds, __DEV__ false in release.
    if (__DEV__ && process.env.EXPO_PUBLIC_QA_PHOTOS) {
      try {
        return JSON.parse(process.env.EXPO_PUBLIC_QA_PHOTOS) as ImagePickerAsset[];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('good');
  const [pickupMode, setPickupMode] = useState('pickup_only');
  const [paymentMethod, setPaymentMethod] = useState('any');
  const [offersEnabled, setOffersEnabled] = useState(true);
  const [suburb, setSuburb] = useState(profile?.suburb ?? '');
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [flawShots, setFlawShots] = useState<ImagePickerAsset[]>([]);
  const [flawNote, setFlawNote] = useState('');
  const [uploadProgress, setUploadProgress] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!editId) return;
    fetchListing(editId)
      .then((l) => {
        if (!l) return;
        setCategoryId(l.category_id);
        setTitle(l.title);
        setPrice(l.price_cents === 0 ? '0' : String(l.price_cents / 100));
        setDescription(l.description);
        setCondition(l.condition);
        setFlawNote(l.flaw_note ?? '');
        setPickupMode(l.pickup_mode);
        setPaymentMethod(l.payment_method ?? 'any');
        setOffersEnabled(l.offers_enabled ?? true);
        setSuburb(l.suburb);
        setAttributes(l.attributes ?? {});
      })
      .catch(() => {});
  }, [editId]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const requiredFieldsFilled = (selectedCategory?.field_template ?? [])
    .filter((f) => f.required && f.type !== 'photo')
    .every((f) => {
      const v = attributes[f.key];
      return f.type === 'boolean' ? v != null : v != null && String(v).trim() !== '';
    });

  const canPost =
    !!session &&
    categoryId != null &&
    title.trim() !== '' &&
    price.trim() !== '' &&
    suburb.trim() !== '' &&
    (editId != null || photos.length > 0) &&
    requiredFieldsFilled;

  async function post() {
    if (!session || categoryId == null) return;
    setBusy(true);
    try {
      if (editId) {
        await updateListing(editId, {
          category_id: categoryId,
          title: title.trim(),
          description: description.trim(),
          price_cents: Math.round(parseFloat(price || '0') * 100),
          condition,
          flaw_note: flawNote.trim() || null,
          pickup_mode: pickupMode,
          payment_method: paymentMethod,
          offers_enabled: offersEnabled,
          suburb: suburb.trim(),
          attributes,
        });
        Alert.alert(t('listingCreate.updated'));
        router.back();
        return;
      }
      const approx = await getApproxPosition();
      const id = await createListing(
        {
          sellerId: session.user.id,
          categoryId,
          title: title.trim(),
          description: description.trim(),
          priceCents: Math.round(parseFloat(price || '0') * 100),
          condition,
          flawNote: flawNote.trim() || null,
          flawPhotos: flawShots,
          pickupMode,
          paymentMethod,
          offersEnabled: price.trim() === '0' ? false : offersEnabled,
          suburb: suburb.trim(),
          lat: approx?.lat,
          lng: approx?.lng,
          attributes,
          photos,
        },
        (uploaded, total) => setUploadProgress([uploaded, total]),
      );
      Alert.alert(t('listingCreate.posted'));
      router.replace(`/listing/${id}`);
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (/row-level security|banned/i.test(msg)) Alert.alert(t('common.restricted'));
      else Alert.alert(msg);
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }


  if (!session) return <GuestCta emoji="📦" />;

  if (maintenanceMode)
    return (
      <GuestCtaMaintenance />
    );
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <X size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {t(editId ? 'listingCreate.editTitle' : 'listingCreate.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* photos (unchanged in edit mode) */}
        {!editId && (
          <>
        <Text style={styles.sectionTitle}>
          {t('listingCreate.photos')} ({photos.length}/{MAX_PHOTOS})
        </Text>
        <Text style={styles.photoTip}>{t('listingCreate.photoTip')}</Text>
        {photos.length > 1 && <Text style={styles.photoTip}>{t('listingCreate.photoOrderTip')}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photoRow}>
            <Pressable
              style={[styles.addPhoto, !uploadsEnabled && { opacity: 0.4 }]}
              disabled={!uploadsEnabled}
              onPress={() => {
                const remaining = MAX_PHOTOS - photos.length;
                sheet.showConfirm(t('listingCreate.addPhotos'), undefined, [
                  {
                    label: t('photoSource.camera'),
                    variant: 'primary',
                    onPress: async () => {
                      if (!(await ensureCameraPermission())) {
                        sheet.showConfirm(t('photoSource.cameraDenied'), t('photoSource.cameraDeniedBody'), [
                          {
                            label: t('photoSource.openSettings'),
                            variant: 'primary',
                            onPress: () => Linking.openSettings(),
                          },
                        ]);
                        return;
                      }
                      await captureImages(remaining, (asset, taken) => {
                        setPhotos((prev) => [...prev, asset]);
                        sheet.showToast(t('photoSource.shotAdded', { n: taken, total: remaining }));
                      });
                    },
                  },
                  {
                    label: t('photoSource.library'),
                    variant: 'secondary',
                    onPress: async () => {
                      const assets = await pickImages(remaining);
                      if (assets.length) setPhotos((prev) => [...prev, ...assets]);
                    },
                  },
                ]);
              }}
              onLongPress={async () => {
                const assets = await pickImages(MAX_PHOTOS - photos.length);
                setPhotos((prev) => [...prev, ...assets].slice(0, MAX_PHOTOS));
              }}
            >
              <Camera size={24} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.addPhotoText}>{t('listingCreate.addPhotos')}</Text>
            </Pressable>
            {/* Photo order = upload order = what buyers see. Index 0 is the cover.
                Tap = make cover, arrows = move one step, X = remove. */}
            {photos.map((p, idx) => (
              <View key={p.assetId ?? p.uri} style={styles.photoCell}>
                <Pressable
                  onPress={() =>
                    setPhotos((prev) => (idx === 0 ? prev : [prev[idx], ...prev.filter((_, i) => i !== idx)]))
                  }
                >
                  <Image source={{ uri: p.uri }} style={[styles.photo, idx === 0 && styles.photoCover]} />
                  <View style={[styles.photoIndex, idx === 0 && styles.photoIndexCover]}>
                    <Text style={styles.photoIndexText}>{idx === 0 ? t('listingCreate.cover') : idx + 1}</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={styles.photoRemove}
                  hitSlop={6}
                  onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <X size={12} color={colors.white} strokeWidth={2.5} />
                </Pressable>
                <View style={styles.photoMoveRow}>
                  <Pressable
                    style={[styles.photoMove, idx === 0 && styles.photoMoveDisabled]}
                    disabled={idx === 0}
                    hitSlop={4}
                    onPress={() =>
                      setPhotos((prev) => {
                        const next = [...prev];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        return next;
                      })
                    }
                  >
                    <ChevronLeft size={14} color={colors.text} strokeWidth={2.5} />
                  </Pressable>
                  <Pressable
                    style={[styles.photoMove, idx === photos.length - 1 && styles.photoMoveDisabled]}
                    disabled={idx === photos.length - 1}
                    hitSlop={4}
                    onPress={() =>
                      setPhotos((prev) => {
                        const next = [...prev];
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        return next;
                      })
                    }
                  >
                    <ChevronRight size={14} color={colors.text} strokeWidth={2.5} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
          </>
        )}

        {!editId && (
          <>
            <Text style={styles.sectionTitle}>
              {t('flaws.addLabel')} ({flawShots.length}/5)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                <Pressable
                  style={[styles.addPhoto, !uploadsEnabled && { opacity: 0.4 }]}
                  disabled={!uploadsEnabled || flawShots.length >= 5}
                  onPress={() => {
                    const remaining = 5 - flawShots.length;
                    sheet.showConfirm(t('flaws.addLabel'), undefined, [
                      {
                        label: t('photoSource.camera'),
                        variant: 'primary',
                        onPress: async () => {
                          if (!(await ensureCameraPermission())) return;
                          await captureImages(remaining, (asset) => {
                            setFlawShots((prev) => [...prev, asset]);
                          });
                        },
                      },
                      {
                        label: t('photoSource.library'),
                        variant: 'secondary',
                        onPress: async () => {
                          const assets = await pickImages(remaining);
                          if (assets.length) setFlawShots((prev) => [...prev, ...assets]);
                        },
                      },
                    ]);
                  }}
                >
                  <Camera size={22} color={colors.textSecondary} />
                  <Text style={styles.addPhotoText}>{t('flaws.addLabel')}</Text>
                </Pressable>
                {flawShots.map((p, idx) => (
                  <View key={p.assetId ?? p.uri} style={styles.photoCell}>
                    <Image source={{ uri: p.uri }} style={styles.photo} />
                    <Pressable
                      style={styles.photoRemove}
                      hitSlop={6}
                      onPress={() => setFlawShots((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <X size={12} color={colors.white} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
            {condition === 'defective' && flawShots.length === 0 && !flawNote.trim() && (
              <Text style={styles.flawNudge}>{t('flaws.defectiveNudge')}</Text>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>{t('flaws.noteLabel')}</Text>
        <TextInput
          style={styles.flawNoteInput}
          placeholder={t('flaws.notePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={flawNote}
          onChangeText={setFlawNote}
          maxLength={500}
          multiline
        />

        {/* category */}
        <Text style={styles.sectionTitle}>{t('listingCreate.category')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name_i18n[lang] ?? c.slug}
              selected={categoryId === c.id}
              onPress={() => {
                setCategoryId(c.id);
                setAttributes({});
              }}
            />
          ))}
        </ScrollView>

        <Field label={t('listingCreate.listingTitle')} value={title} onChangeText={setTitle} />
        {(() => {
          const slug = suggestCategorySlug(title);
          const suggested = slug ? categories.find((c) => c.slug === slug) : null;
          if (!suggested || suggested.id === categoryId) return null;
          return (
            <Pressable
              style={styles.suggestChip}
              onPress={() => {
                setCategoryId(suggested.id);
                setAttributes({});
              }}
              accessibilityRole="button"
            >
              <Sparkles size={13} color={colors.primary} />
              <Text style={styles.suggestText}>
                {t('listingCreate.suggestedCategory', {
                  name: suggested.name_i18n[lang] ?? suggested.slug,
                })}
              </Text>
            </Pressable>
          );
        })()}
        <Field
          label={t('listingCreate.price')}
          placeholder={t('listingCreate.priceFree')}
          keyboardType="decimal-pad"
          value={price}
          onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
        />
        <Field
          label={t('listingCreate.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* category-specific fields — the differentiator */}
        {selectedCategory && selectedCategory.field_template.length > 0 && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>{t('listingCreate.details')}</Text>
            {selectedCategory.field_template
              .filter((f) => f.type !== 'photo')
              .map((f) => (
                <CustomField
                  key={f.key}
                  def={f}
                  value={attributes[f.key]}
                  lang={lang}
                  onChange={(v) => setAttributes((prev) => ({ ...prev, [f.key]: v }))}
                />
              ))}
            <Text style={styles.requiredHint}>{t('listingCreate.requiredHint')}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('listingCreate.condition')}</Text>
        <View style={styles.chipWrap}>
          {CONDITIONS.map((c) => (
            <Chip
              key={c}
              label={t(`conditions.${c}`)}
              selected={condition === c}
              onPress={() => setCondition(c)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('listingCreate.pickupMode')}</Text>
        <View style={styles.chipWrap}>
          {PICKUP_MODES.map((m) => (
            <Chip
              key={m}
              label={t(`pickupModes.${m}`)}
              selected={pickupMode === m}
              onPress={() => setPickupMode(m)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('listingCreate.paymentMethod')}</Text>
        <View style={styles.chipWrap}>
          {PAYMENT_METHODS.map((m) => (
            <Chip
              key={m}
              label={t(`paymentMethods.${m}`)}
              selected={paymentMethod === m}
              onPress={() => setPaymentMethod(m)}
            />
          ))}
        </View>

        <SuburbField label={t('listingCreate.suburb')} value={suburb} onChangeText={setSuburb} />
        <View style={styles.locationNote}>
          <MapPin size={13} color={colors.textSecondary} />
          <Text style={styles.locationNoteText}>{t('listingCreate.locationNote')}</Text>
        </View>

        {busy && uploadProgress && (
          <Text style={styles.uploadProgress}>
            {t('listingCreate.uploading', {
              done: Math.min(uploadProgress[0] + 1, uploadProgress[1]),
              total: uploadProgress[1],
            })}
          </Text>
        )}
        <Button
          title={t(editId ? 'listingCreate.save' : 'listingCreate.post')}
          loading={busy}
          disabled={!canPost}
          onPress={post}
        />
      </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={needsTos} transparent animationType="fade">
        <View style={styles.tosBackdrop}>
          <View style={styles.tosCard}>
            <ShieldCheck size={32} color={colors.primary} />
            <Text style={styles.tosTitle}>{t('terms.title')}</Text>
            <Text style={styles.tosBody}>{t('terms.intro')}</Text>
            {['rule1', 'rule2', 'rule3', 'rule4'].map((key) => (
              <Text key={key} style={styles.tosRule}>
                · {t(`terms.${key}`)}
              </Text>
            ))}
            <View style={{ gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.md }}>
              <Button title={t('terms.accept')} onPress={acceptTos} />
              <Button title={t('terms.decline')} variant="secondary" onPress={() => router.back()} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flawNudge: { fontSize: 12, color: '#9A6B00', marginTop: -4 },
  flawNoteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    minHeight: 70,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
  },
  tosBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  tosCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  tosTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  tosBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  tosRule: { fontSize: 13, color: colors.text, alignSelf: 'flex-start' },
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  close: { fontSize: 20, color: colors.text, width: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  locationNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -6 },
  locationNoteText: { fontSize: 12, color: colors.textSecondary },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F3F1',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: -6,
  },
  suggestText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  photoTip: { fontSize: 12, color: colors.textSecondary, marginTop: -6 },
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  addPhoto: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  photo: { width: 84, height: 84, borderRadius: radius.md },
  photoCover: { borderWidth: 2, borderColor: colors.primary },
  photoCell: { width: 84, gap: 4 },
  photoIndex: {
    position: 'absolute',
    left: 4,
    top: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndexCover: { backgroundColor: colors.primary },
  photoIndexText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  photoRemove: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMoveRow: { flexDirection: 'row', justifyContent: 'space-between' },
  photoMove: {
    width: 40,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMoveDisabled: { opacity: 0.3 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipScroll: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  requiredHint: { fontSize: 11, color: colors.textSecondary },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  uploadProgress: { textAlign: 'center', fontSize: 13, color: colors.textSecondary },
  offersHint: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});


function GuestCtaMaintenance() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
        <Text style={{ fontSize: 44 }}>🛠️</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
          {t('config.maintenanceTitle')}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          {t('config.maintenanceBody')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button, Field } from '../../src/components/ui';
import i18n from '../../src/lib/i18n';
import {
  createListing,
  fetchCategories,
  pickImages,
  type Category,
  type FieldDef,
} from '../../src/lib/listings';
import { useSession } from '../../src/lib/session';
import { colors, radius, spacing } from '../../src/theme';

const MAX_PHOTOS = 10;
const CONDITIONS = ['used', 'like_new', 'new'];
const PICKUP_MODES = ['pickup_only', 'seller_delivers', 'buyer_collects'];

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
  const label = def.label_i18n[lang] ?? def.label_i18n.en ?? def.key;

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
  const { session, profile } = useSession();
  const lang = i18n.language;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<ImagePickerAsset[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('used');
  const [pickupMode, setPickupMode] = useState('pickup_only');
  const [suburb, setSuburb] = useState(profile?.suburb ?? '');
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<[number, number] | null>(null);

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
    photos.length > 0 &&
    requiredFieldsFilled;

  async function post() {
    if (!session || categoryId == null) return;
    setBusy(true);
    try {
      const id = await createListing(
        {
          sellerId: session.user.id,
          categoryId,
          title: title.trim(),
          description: description.trim(),
          priceCents: Math.round(parseFloat(price || '0') * 100),
          condition,
          pickupMode,
          suburb: suburb.trim(),
          attributes,
          photos,
        },
        (uploaded, total) => setUploadProgress([uploaded, total]),
      );
      Alert.alert(t('listingCreate.posted'));
      router.replace(`/listing/${id}`);
    } catch (e) {
      Alert.alert((e as Error).message);
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('listingCreate.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* photos */}
        <Text style={styles.sectionTitle}>
          {t('listingCreate.photos')} ({photos.length}/{MAX_PHOTOS})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photoRow}>
            <Pressable
              style={styles.addPhoto}
              onPress={async () => {
                const assets = await pickImages(MAX_PHOTOS - photos.length);
                setPhotos((prev) => [...prev, ...assets].slice(0, MAX_PHOTOS));
              }}
            >
              <Text style={{ fontSize: 24 }}>📷</Text>
              <Text style={styles.addPhotoText}>{t('listingCreate.addPhotos')}</Text>
            </Pressable>
            {photos.map((p, idx) => (
              <Pressable
                key={p.assetId ?? p.uri}
                onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Image source={{ uri: p.uri }} style={styles.photo} />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* category */}
        <Text style={styles.sectionTitle}>{t('listingCreate.category')}</Text>
        <View style={styles.chipWrap}>
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
        </View>

        <Field label={t('listingCreate.listingTitle')} value={title} onChangeText={setTitle} />
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
          <>
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
          </>
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

        <Field label={t('listingCreate.suburb')} value={suburb} onChangeText={setSuburb} />

        {busy && uploadProgress && (
          <Text style={styles.uploadProgress}>
            {t('listingCreate.uploading', {
              done: Math.min(uploadProgress[0] + 1, uploadProgress[1]),
              total: uploadProgress[1],
            })}
          </Text>
        )}
        <Button title={t('listingCreate.post')} loading={busy} disabled={!canPost} onPress={post} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
});

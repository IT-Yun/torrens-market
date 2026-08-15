-- Torrens Market — category seed (docs/categories.md)
-- field_template: [{key, type, label_i18n, required, unit?}]
-- types: text | number | date | boolean | dimensions | photo

insert into public.categories (slug, name_i18n, field_template, sort_order) values
(
  'furniture',
  '{"ko": "가구", "en": "Furniture", "zh": "家具"}',
  '[
    {"key": "dimensions", "type": "dimensions", "unit": "cm", "required": false,
     "label_i18n": {"ko": "치수 (가로×세로×높이)", "en": "Dimensions (W×D×H)", "zh": "尺寸 (宽×深×高)"}}
  ]',
  1
),
(
  'electronics',
  '{"ko": "전자제품", "en": "Electronics", "zh": "电子产品"}',
  '[
    {"key": "brand_model", "type": "text", "required": false,
     "label_i18n": {"ko": "브랜드/모델명", "en": "Brand / model", "zh": "品牌/型号"}},
    {"key": "purchase_date", "type": "date", "required": false,
     "label_i18n": {"ko": "구매 시기", "en": "Purchase date", "zh": "购买日期"}},
    {"key": "warranty", "type": "boolean", "required": false,
     "label_i18n": {"ko": "보증 기간 남음", "en": "Warranty remaining", "zh": "保修期内"}}
  ]',
  2
),
(
  'luxury',
  '{"ko": "명품/패션잡화", "en": "Luxury & accessories", "zh": "奢侈品/时尚配饰"}',
  '[
    {"key": "brand", "type": "text", "required": false,
     "label_i18n": {"ko": "브랜드", "en": "Brand", "zh": "品牌"}},
    {"key": "purchase_date", "type": "date", "required": false,
     "label_i18n": {"ko": "구매일", "en": "Purchase date", "zh": "购买日期"}},
    {"key": "receipt_photo", "type": "photo", "required": false,
     "label_i18n": {"ko": "영수증/정품 인증 사진", "en": "Receipt / authenticity photo", "zh": "收据/正品凭证照片"}}
  ]',
  3
),
(
  'cosmetics',
  '{"ko": "화장품/뷰티", "en": "Cosmetics & beauty", "zh": "化妆品/美妆"}',
  '[
    {"key": "expiry_date", "type": "date", "required": true,
     "label_i18n": {"ko": "유효기간", "en": "Expiry date", "zh": "有效期"}},
    {"key": "opened", "type": "boolean", "required": true,
     "label_i18n": {"ko": "개봉 여부", "en": "Opened", "zh": "是否已开封"}}
  ]',
  4
),
(
  'clothing',
  '{"ko": "의류", "en": "Clothing", "zh": "服装"}',
  '[
    {"key": "size", "type": "text", "required": false,
     "label_i18n": {"ko": "사이즈", "en": "Size", "zh": "尺码"}},
    {"key": "gender", "type": "text", "required": false,
     "label_i18n": {"ko": "성별", "en": "Gender", "zh": "性别"}}
  ]',
  5
),
(
  'home_kitchen',
  '{"ko": "생활용품/주방", "en": "Home & kitchen", "zh": "生活用品/厨房"}',
  '[]',
  6
),
(
  'books',
  '{"ko": "도서/교재", "en": "Books & textbooks", "zh": "图书/教材"}',
  '[
    {"key": "isbn_course", "type": "text", "required": false,
     "label_i18n": {"ko": "ISBN 또는 과목 코드", "en": "ISBN or course code", "zh": "ISBN或课程代码"}}
  ]',
  7
),
(
  'cars_bikes',
  '{"ko": "자동차/자전거", "en": "Cars & bikes", "zh": "汽车/自行车"}',
  '[
    {"key": "year", "type": "number", "required": false,
     "label_i18n": {"ko": "연식", "en": "Year", "zh": "年款"}},
    {"key": "purchase_date", "type": "date", "required": false,
     "label_i18n": {"ko": "구매 시기", "en": "Purchase date", "zh": "购买日期"}},
    {"key": "odometer_km", "type": "number", "unit": "km", "required": false,
     "label_i18n": {"ko": "주행거리", "en": "Odometer", "zh": "里程"}},
    {"key": "rego_expiry", "type": "date", "required": false,
     "label_i18n": {"ko": "rego 만료일", "en": "Rego expiry", "zh": "注册(rego)到期日"}},
    {"key": "service_history", "type": "text", "required": false,
     "label_i18n": {"ko": "소모품/정비 이력 (타이어, 오일, 브레이크 등)", "en": "Service history (tyres, oil, brakes...)", "zh": "保养记录 (轮胎、机油、刹车等)"}}
  ]',
  8
),
(
  'food',
  '{"ko": "식품", "en": "Food & groceries", "zh": "食品"}',
  '[
    {"key": "best_before", "type": "date", "required": true,
     "label_i18n": {"ko": "유통기한", "en": "Best before", "zh": "保质期至"}}
  ]',
  9
),
(
  'other',
  '{"ko": "기타", "en": "Other", "zh": "其他"}',
  '[]',
  10
);

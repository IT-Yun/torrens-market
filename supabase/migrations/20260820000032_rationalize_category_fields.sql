-- Declutter + rationalize category custom fields (Sean's request 2026-08-20).
-- Principle: each category keeps only decision-critical fields; the single most
-- important one per category is REQUIRED, the rest optional. Drop low-signal
-- fields (purchase_date — for secondhand, condition/age matters more than the
-- exact purchase date). Cars trimmed 5→4 fields; the categories where structured
-- data matters most (electronics, luxury, cars) now require their key identifier,
-- matching cosmetics/food which already required their safety field.
-- Enforced client-side by create.tsx (required flag); does not affect existing rows.

-- electronics: brand_model now REQUIRED; drop purchase_date; keep warranty optional.
update public.categories set field_template = '[
  {"key":"brand_model","type":"text","required":true,"label_i18n":{"en":"Brand / model","ko":"브랜드/모델명","zh":"品牌/型号"}},
  {"key":"warranty","type":"boolean","required":false,"label_i18n":{"en":"Warranty remaining","ko":"보증 기간 남음","zh":"保修期内"}}
]'::jsonb where slug = 'electronics';

-- luxury: brand now REQUIRED; drop purchase_date; keep receipt/authenticity photo optional.
update public.categories set field_template = '[
  {"key":"brand","type":"text","required":true,"label_i18n":{"en":"Brand","ko":"브랜드","zh":"品牌"}},
  {"key":"receipt_photo","type":"photo","required":false,"label_i18n":{"en":"Receipt / authenticity photo","ko":"영수증/정품 인증 사진","zh":"收据/正品凭证照片"}}
]'::jsonb where slug = 'luxury';

-- clothing: size now REQUIRED (buyers must know it); gender optional.
update public.categories set field_template = '[
  {"key":"size","type":"text","required":true,"label_i18n":{"en":"Size","ko":"사이즈","zh":"尺码"}},
  {"key":"gender","type":"text","required":false,"label_i18n":{"en":"Gender","ko":"성별","zh":"性别"}}
]'::jsonb where slug = 'clothing';

-- cars_bikes: trim 5→4; year + odometer now REQUIRED; drop purchase_date; rego + service history optional.
update public.categories set field_template = '[
  {"key":"year","type":"number","required":true,"label_i18n":{"en":"Year","ko":"연식","zh":"年款"}},
  {"key":"odometer_km","type":"number","unit":"km","required":true,"label_i18n":{"en":"Odometer","ko":"주행거리","zh":"里程"}},
  {"key":"rego_expiry","type":"date","required":false,"label_i18n":{"en":"Rego expiry","ko":"rego 만료일","zh":"注册(rego)到期日"}},
  {"key":"service_history","type":"text","required":false,"label_i18n":{"en":"Service history (tyres, oil, brakes...)","ko":"소모품/정비 이력 (타이어, 오일, 브레이크 등)","zh":"保养记录 (轮胎、机油、刹车等)"}}
]'::jsonb where slug = 'cars_bikes';

-- Unchanged (already sensible): furniture (dimensions optional), cosmetics
-- (expiry+opened required — safety), food (best_before required), books
-- (isbn optional), home_kitchen/other/sports/baby_kids (no custom fields).

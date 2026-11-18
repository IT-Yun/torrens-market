-- Fill category gaps vs major platforms (Karrot, Bunjang, Gumtree AU, FB Marketplace)
-- + make cosmetics expiry flexible and add PAO (period-after-opening) — the detail
-- resellers actually care about (Sean's request 2026-08-20).

-- 1) New categories (appended before "Other"). Field-light to avoid clutter;
--    a field only where it genuinely helps (tickets validity date).
insert into public.categories (slug, name_i18n, field_template, sort_order) values
  ('pets',
   '{"en":"Pet supplies","ko":"반려동물용품","zh":"宠物用品"}'::jsonb,
   '[]'::jsonb, 12),
  ('hobby_games',
   '{"en":"Hobbies & games","ko":"취미/게임","zh":"兴趣/游戏"}'::jsonb,
   '[{"key":"platform","type":"text","required":false,"label_i18n":{"en":"Platform / type (e.g. PS5, board game, guitar)","ko":"플랫폼/종류 (예: PS5, 보드게임, 기타)","zh":"平台/类型 (如 PS5、桌游、吉他)"}}]'::jsonb, 13),
  ('garden_tools',
   '{"en":"Garden, tools & plants","ko":"정원/공구/식물","zh":"园艺/工具/植物"}'::jsonb,
   '[]'::jsonb, 14),
  ('tickets',
   '{"en":"Tickets & vouchers","ko":"티켓/쿠폰","zh":"票券/优惠券"}'::jsonb,
   '[{"key":"valid_until","type":"date","required":false,"label_i18n":{"en":"Valid until / event date","ko":"사용기한/공연일","zh":"有效期/演出日期"}}]'::jsonb, 15);

-- keep "Other" last
update public.categories set sort_order = 16 where slug = 'other';

-- 2) Cosmetics: expiry_date now OPTIONAL (자율 — set if known), keep "opened",
--    and ADD "period after opening" (PAO, the "12M/6M" jar symbol) — the reseller
--    sense Sean asked for. Opened stays required (always knowable).
update public.categories set field_template = '[
  {"key":"opened","type":"boolean","required":true,"label_i18n":{"en":"Opened","ko":"개봉 여부","zh":"是否已开封"}},
  {"key":"expiry_date","type":"date","required":false,"label_i18n":{"en":"Expiry date","ko":"유효기간","zh":"有效期"}},
  {"key":"pao_months","type":"number","unit":"M","required":false,"label_i18n":{"en":"Use within after opening (PAO)","ko":"개봉 후 사용기간","zh":"开封后使用期限"}}
]'::jsonb where slug = 'cosmetics';

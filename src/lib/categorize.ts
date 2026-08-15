/**
 * Title-based category suggestion (Gumtree pattern, ADR 007).
 * Trilingual keyword heuristic over our flat 12-category taxonomy —
 * suggestion only, never auto-assigned. Order encodes priority
 * (e.g. 'motorbike' must hit cars_bikes before sports sees 'bike').
 */
const KEYWORDS: [slug: string, words: string[]][] = [
  ['luxury', ['gucci', 'chanel', 'louis vuitton', 'prada', 'rolex', 'hermes', 'burberry', '명품', '샤넬', '구찌', '루이비통', '롤렉스', '奢侈品', '香奈儿', '古驰', '劳力士']],
  ['cars_bikes', ['motorbike', 'motorcycle', 'scooter', 'car', 'ute', 'sedan', 'suv', 'hatchback', 'toyota', 'mazda', 'hyundai', 'bicycle', 'bike', '자동차', '오토바이', '스쿠터', '자전거', '중고차', '汽车', '摩托', '踏板车', '自行车', '电动车']],
  ['sports', ['tennis', 'golf', 'gym', 'dumbbell', 'weights', 'surfboard', 'skateboard', 'camping', 'tent', 'kayak', '골프', '테니스', '덤벨', '헬스', '캠핑', '텐트', '서핑', '高尔夫', '网球', '哑铃', '露营', '帐篷', '冲浪']],
  ['baby_kids', ['pram', 'stroller', 'crib', 'cot', 'baby', 'kids', 'toddler', 'lego', 'toy', '유모차', '아기', '아동', '장난감', '레고', '婴儿', '儿童', '玩具', '乐高', '童车']],
  ['electronics', ['iphone', 'ipad', 'macbook', 'laptop', 'monitor', 'tv', 'samsung', 'galaxy', 'ps5', 'xbox', 'switch', 'airpods', 'camera', 'fridge', 'washing machine', '노트북', '모니터', '아이폰', '갤럭시', '냉장고', '세탁기', '카메라', '텔레비전', '手机', '电脑', '笔记本', '显示器', '冰箱', '洗衣机', '相机', '电视']],
  ['furniture', ['sofa', 'couch', 'desk', 'table', 'chair', 'bed frame', 'bed', 'mattress', 'shelf', 'bookcase', 'wardrobe', 'drawer', '소파', '책상', '침대', '매트리스', '의자', '옷장', '서랍장', '책장', '테이블', '沙发', '书桌', '桌子', '椅子', '床垫', '床', '衣柜', '书架']],
  ['cosmetics', ['serum', 'lipstick', 'perfume', 'skincare', 'sunscreen', 'foundation', '화장품', '립스틱', '향수', '선크림', '파운데이션', '스킨케어', '口红', '香水', '防晒', '粉底', '护肤']],
  ['books', ['textbook', 'isbn', 'book', 'novel', '교재', '전공책', '책', '소설', '课本', '教材', '小说', '书']],
  ['clothing', ['jacket', 'hoodie', 'dress', 'jeans', 'coat', 'sneakers', 'shirt', '자켓', '후드티', '원피스', '청바지', '코트', '운동화', '外套', '连衣裙', '牛仔裤', '卫衣', '运动鞋']],
  ['home_kitchen', ['air fryer', 'rice cooker', 'kettle', 'pot', 'pan', 'vacuum', 'blender', '에어프라이어', '밥솥', '냄비', '후라이팬', '청소기', '믹서기', '空气炸锅', '电饭煲', '锅', '吸尘器', '搅拌机']],
];

/** Suggest a category slug for a listing title, or null if nothing matches. */
export function suggestCategorySlug(title: string): string | null {
  const q = title.toLowerCase();
  if (q.trim().length < 2) return null;
  for (const [slug, words] of KEYWORDS) {
    if (words.some((w) => q.includes(w))) return slug;
  }
  return null;
}

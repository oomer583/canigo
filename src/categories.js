// "I want a coffee": search by what you need, not by a name.
// tags: OpenStreetMap amenity/shop/tourism values (also used by accessibility.cloud categories).
export const CATEGORIES = [
  { id: 'coffee', label: 'Coffee', tags: ['cafe', 'coffee'], words: ['coffee', 'cafe', 'café', 'kafe', 'kofe', 'qəhvə', 'qehve', 'kahve', 'кофе', 'кафе'] },
  { id: 'food', label: 'Food', tags: ['restaurant', 'fast_food', 'food_court'], words: ['food', 'restaurant', 'eat', 'yemek', 'restoran', 'yemək', 'ресторан', 'еда'] },
  { id: 'pharmacy', label: 'Pharmacy', tags: ['pharmacy', 'chemist'], words: ['pharmacy', 'apteka', 'aptek', 'eczane', 'аптека'] },
  { id: 'toilet', label: 'Toilet', tags: ['toilets'], words: ['toilet', 'toilets', 'wc', 'tualet', 'tuvalet', 'туалет'] },
  { id: 'shop', label: 'Groceries', tags: ['supermarket', 'convenience', 'grocery'], words: ['supermarket', 'market', 'grocery', 'groceries', 'bazar', 'magaza', 'mağaza', 'магазин', 'супермаркет'] },
  { id: 'museum', label: 'Museum', tags: ['museum', 'gallery'], words: ['museum', 'muzey', 'müze', 'музей'] }
]

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim()

// A whole query that is just a need ("coffee", "kofe near me") -> that category.
export function detectCategory(query) {
  const q = norm(query).replace(/\b(near me|nearby|yaxınlıqda|yakınımda|рядом)\b/g, '').trim()
  if (!q) return null
  return CATEGORIES.find((c) => c.words.some((w) => norm(w) === q)) || null
}

// Amsterdam "coffeeshops" sell cannabis; never list them as coffee.
const CANNABIS = /cannabis|marihuana|marijuana|coffeeshop/i

export function inCategory(place, category) {
  const c = place.category ? String(place.category).toLowerCase() : ''
  if (CANNABIS.test(c) || CANNABIS.test(place.shop || '') || CANNABIS.test(place.name || '')) return false
  return category.tags.includes(c)
}

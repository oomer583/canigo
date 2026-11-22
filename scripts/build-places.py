"""Overture Maps places for one city -> public/packs/<city>-places.json

These are places that exist (cafes, pharmacies...) but usually have no entrance
information. CanIGo lists them as "Not checked yet" so people can ask or add.

Licence: Overture places are CDLA Permissive 2.0, except Foursquare-sourced
records (Apache 2.0); we drop those to keep one licence.
Usage: python scripts/build-places.py <cityId> <overture.geojsonseq>
"""
import json
import sys
from collections import Counter

# Overture category -> CanIGo category tag (see src/categories.js)
CATEGORY = {
    'cafe': 'cafe', 'coffee_shop': 'cafe', 'coffee_roastery': 'cafe', 'tea_room': 'cafe', 'bakery': 'cafe',
    'restaurant': 'restaurant', 'fast_food_restaurant': 'fast_food', 'food_court': 'food_court',
    'pharmacy': 'pharmacy', 'drugstore': 'pharmacy', 'pharmacy_or_drugstore': 'pharmacy', 'chemist': 'pharmacy',
    'supermarket': 'supermarket', 'grocery_store': 'supermarket', 'grocery': 'supermarket', 'convenience_store': 'convenience',
    'museum': 'museum', 'art_museum': 'museum', 'history_museum': 'museum', 'art_gallery': 'gallery',
    'public_toilet': 'toilets', 'restroom': 'toilets', 'toilet': 'toilets',
}


def category_of(p):
    tax = p.get('taxonomy') or {}
    keys = [p.get('basic_category'), (p.get('categories') or {}).get('primary'), tax.get('primary')]
    keys += list(reversed(tax.get('hierarchy') or []))
    keys += (p.get('categories') or {}).get('alternate') or []
    for key in keys:
        if key and key in CATEGORY:
            return CATEGORY[key]
    return None


def main(city, path):
    out, seen, cats, skipped, unmatched = [], set(), Counter(), Counter(), Counter()
    with open(path, encoding='utf-8') as f:
        for i, line in enumerate(f):
            line = line.strip().lstrip('\x1e')
            if not line:
                continue
            feat = json.loads(line)
            p = feat.get('properties') or {}
            if i < 2:
                print('sample properties keys:', sorted(p.keys()))
            sources = p.get('sources') or []
            if any(str(s.get('dataset', '')).lower().startswith('foursquare') for s in sources):
                skipped['foursquare'] += 1
                continue
            if (p.get('operating_status') or 'open') not in ('open', None):
                skipped['closed'] += 1
                continue
            if (p.get('confidence') or 0) < 0.6:
                skipped['low-confidence'] += 1
                continue
            cat = category_of(p)
            if not cat:
                unmatched[p.get('basic_category')] += 1
                continue
            name = ((p.get('names') or {}).get('primary') or '').strip()
            coords = (feat.get('geometry') or {}).get('coordinates') or []
            if not name or len(coords) < 2:
                continue
            lng, lat = round(coords[0], 6), round(coords[1], 6)
            key = (name.lower(), round(lat, 4), round(lng, 4))
            if key in seen:
                continue
            seen.add(key)
            cats[cat] += 1
            out.append([name, lat, lng, cat])
    with open(f'public/packs/{city}-places.json', 'w', encoding='utf-8') as f:
        json.dump({'city': city, 'source': 'Overture Maps Foundation (CDLA Permissive 2.0)', 'places': out}, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{city}: {len(out)} places', dict(cats), 'skipped', dict(skipped))
    print(f'{city} top unmatched basic categories:', unmatched.most_common(40))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

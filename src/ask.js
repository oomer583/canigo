// "Ask them before you go": a ready message in the language the place speaks.

const AID = {
  en: {
    manual: 'a manual wheelchair', power: 'a power wheelchair', wide: 'a wide wheelchair',
    walker: 'a walker (gait trainer)', stroller: 'a stroller', 'steps-hard': null, crutches: 'crutches'
  },
  az: {
    manual: 'əl ilə idarə olunan əlil arabasından', power: 'elektrikli əlil arabasından', wide: 'geniş əlil arabasından',
    walker: 'yeriş aparatından (walker)', stroller: 'uşaq arabasından', 'steps-hard': null, crutches: 'qoltuq ağacından'
  },
  ru: {
    manual: 'механической инвалидной коляской', power: 'электрической инвалидной коляской', wide: 'широкой инвалидной коляской',
    walker: 'ходунками', stroller: 'детской коляской', 'steps-hard': null, crutches: 'костылями'
  }
}

export const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'az', label: 'Azərbaycanca' },
  { id: 'ru', label: 'Русский' }
]

export function defaultLang(city) {
  return city?.id === 'baku' ? 'az' : 'en'
}

export function askText(profile, placeName, lang = 'en') {
  const aid = AID[lang]?.[profile.id]
  const n = profile.steps
  const w = profile.widthCm
  if (lang === 'az') {
    const who = aid ? `Mən ${aid} istifadə edirəm və qapının eni ən azı ${w} sm olmalıdır.` : `Pilləkənə çıxmaqda çətinlik çəkirəm, qapının eni ən azı ${w} sm olmalıdır.`
    const steps = n === 0 ? 'Pilləkəndən istifadə edə bilmirəm.' : `Ən çoxu ${n} pilləkən qalxa bilirəm.`
    return `Salam. ${placeName} ünvanına gəlmək istəyirəm. ${who} ${steps} Girişinizdə pilləkən varmı və qapının eni nə qədərdir? Təşəkkür edirəm.`
  }
  if (lang === 'ru') {
    const who = aid ? `Я пользуюсь ${aid}, мне нужна дверь шириной не менее ${w} см.` : `Мне трудно подниматься по ступенькам, нужна дверь шириной не менее ${w} см.`
    const steps = n === 0 ? 'Я не могу подниматься по ступенькам.' : `Я могу подняться максимум на ${n} ${n === 1 ? 'ступеньку' : 'ступеньки'}.`
    return `Здравствуйте. Я хочу посетить ${placeName}. ${who} ${steps} Есть ли у вас вход без ступенек и какая ширина двери? Спасибо!`
  }
  const who = aid ? `I use ${aid} and need a door at least ${w} cm wide.` : `Steps are hard for me, and I need a door at least ${w} cm wide.`
  const steps = n === 0 ? 'I cannot use steps.' : `I can manage up to ${n} step${n > 1 ? 's' : ''}.`
  return `Hello! I would like to visit ${placeName}. ${who} ${steps} Is your entrance step-free, and how wide is the door? Thank you!`
}

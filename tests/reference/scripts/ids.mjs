// Stable IDs used in tests/reference/expected/*.json (D-063: IDs, never English names).
//
//   Signs        1–12   (1 = Aries … 12 = Pisces)
//   Nakshatras   1–27   (1 = Ashwini … 27 = Revati)
//   Bodies       fixed codes: La (Lagna), Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke
//   Weekday      1–7    (1 = Sunday … 7 = Saturday)
//   Tithi        1–30   (1–15 = Shukla Pratipada … Purnima, 16–30 = Krishna Pratipada … Amavasya)
//   Yoga         1–27   (1 = Vishkambha … 27 = Vaidhriti)
//   Karana       1–11   (1 = Bava … 7 = Vishti, 8 = Shakuni, 9 = Chatushpada, 10 = Naga, 11 = Kimstughna)
//   Lunar month  1–12   (1 = Chaitra … 12 = Phalguna)
//   Samvatsara   1–60   (1 = Prabhava … 60 = Akshaya)
//
// The name lists below are JHora's own spellings, used only to read the PDFs.

export const BODIES = ['La', 'Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];

/** Vimshottari order and years (dasha lords use the same body codes). */
export const VIMSHOTTARI = ['Ke', 'Ve', 'Su', 'Mo', 'Ma', 'Ra', 'Ju', 'Sa', 'Me'];
export const VIMSHOTTARI_YEARS = { Ke: 7, Ve: 20, Su: 6, Mo: 10, Ma: 7, Ra: 18, Ju: 16, Sa: 19, Me: 17 };

/** Two-letter sign abbreviations as printed by JHora. */
export const SIGN_ABBR = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];

/** Table row names (before " - AK" etc.) → body code. */
export const TABLE_BODY = {
  Lagna: 'La', Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

/** Chart-grid labels → body code (others such as Md, Gk, HL, AL, A2 are ignored). */
export const CHART_BODY = {
  As: 'La', Su: 'Su', Mo: 'Mo', Ma: 'Ma', Me: 'Me', Ju: 'Ju', Ve: 'Ve', Sa: 'Sa', Ra: 'Ra', Ke: 'Ke',
};
export const CHART_IGNORED = /^(Md|Gk|HL|GL|BB|PP|SL|BL|AL|UL|A\d{1,2})$/;

/** Dasha lord names as printed (PDF table and pratyantar .txt files). */
export const DASHA_LORD = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Merc: 'Me', Jup: 'Ju', Ven: 'Ve', Sat: 'Sa', Rah: 'Ra', Ket: 'Ke',
};

/** Hora lord names as printed ("Venus Hora"). */
export const HORA_LORD = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa',
};

/** Nakshatra abbreviations in the position table, index = ID − 1. */
export const NAKSHATRA_ABBR = [
  ['Aswi'], ['Bhar'], ['Krit'], ['Rohi'], ['Mrig'], ['Ardr'], ['Puna'], ['Push'], ['Asre'],
  ['Magh'], ['PPha'], ['UPha'], ['Hast'], ['Chit'], ['Swat', 'Swa', 'Swati'], ['Visa'], ['Anu', 'Anur'], ['Jye', 'Jyes'],
  ['Mool', 'Mula'], ['PSha'], ['USha'], ['Srav'], ['Dhan'], ['Sata'], ['PBha'], ['UBha'], ['Reva'],
];

/** Nakshatra full names in the panchanga block (compared without spaces/case). */
export const NAKSHATRA_FULL = [
  ['Aswini', 'Ashwini'], ['Bharani'], ['Krittika', 'Kritika'], ['Rohini'], ['Mrigasira', 'Mrigashira'],
  ['Aardra', 'Ardra'], ['Punarvasu'], ['Pushyami', 'Pushya'], ['Aasresha', 'Aslesha', 'Ashlesha'],
  ['Makha', 'Magha'], ['PoorvaPhalguni', 'PurvaPhalguni'], ['UttaraPhalguni'], ['Hastha', 'Hasta'],
  ['Chitra'], ['Swaati', 'Swati'], ['Visakha', 'Vishakha'], ['Anuraadha', 'Anuradha'], ['Jyeshtha'],
  ['Moola', 'Mula'], ['Poorvashadha', 'PoorvaAshadha', 'Purvashadha'], ['Uttarashadha', 'UttaraAshadha'],
  ['Sravanam', 'Sravana', 'Shravana'], ['Dhanishtha', 'Dhanishta'], ['Satabhishak', 'Satabhisha', 'Shatabhisha'],
  ['Poorvabhadra', 'PoorvaBhadrapada', 'Purvabhadra'], ['Uttarabhadra', 'UttaraBhadrapada'], ['Revati'],
];

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TITHI_NAMES = [
  ['Pratipat', 'Pratipada', 'Prathama'], ['Dwitiya', 'Dvitiya'], ['Tritiya', 'Thritiya'], ['Chaturthi', 'Chavithi'],
  ['Panchami'], ['Shashthi', 'Shashti', 'Sashti'], ['Saptami'], ['Ashtami'], ['Navami'], ['Dasami', 'Dashami'],
  ['Ekadasi', 'Ekadashi'], ['Dwadasi', 'Dwadashi'], ['Trayodasi', 'Trayodashi'], ['Chaturdasi', 'Chaturdashi'],
];
export const PURNIMA = ['Pournimasya', 'Purnima', 'Pournami'];
export const AMAVASYA = ['Amavasya', 'Amavasya'];

export const YOGAS = [
  ['Vishkambha', 'Vishkumbha'], ['Priti', 'Preeti'], ['Ayushman'], ['Soubhagya', 'Saubhagya'], ['Sobhana', 'Shobhana'],
  ['Atiganda'], ['Sukarma'], ['Dhriti'], ['Soola', 'Sula', 'Shula'], ['Ganda'], ['Vriddhi'], ['Dhruva'],
  ['Vyaghata'], ['Harshana'], ['Vajra'], ['Siddhi'], ['Vyatipata'], ['Variyan', 'Vareeyan'], ['Parigha'],
  ['Siva', 'Shiva'], ['Siddha'], ['Sadhya'], ['Subha', 'Shubha'], ['Sukla', 'Shukla'], ['Brahma'], ['Indra'],
  ['Vaidhriti'],
];

export const KARANAS = [
  ['Bava'], ['Balava'], ['Kaulava'], ['Taitula', 'Taitila'], ['Garija', 'Gara'], ['Vanija'], ['Vishti'],
  ['Sakuna', 'Shakuni'], ['Chatushpada'], ['Naga', 'Nagava'], ['Kimstughna'],
];

export const LUNAR_MONTHS = [
  ['Chaitra'], ['Vaisakha', 'Vaishakha'], ['Jyeshtha'], ['Ashadha', 'Aashaadha'], ['Sravana', 'Shravana'],
  ['Bhadrapada'], ['Aswayuja', 'Ashvayuja', 'Ashwin'], ['Karthika', 'Kartika'], ['Margasira', 'Margashirsha'],
  ['Pushya', 'Pausha'], ['Magha'], ['Phalguna'],
];

export const SAMVATSARAS = [
  ['Prabhava'], ['Vibhava'], ['Sukla', 'Shukla'], ['Pramoda', 'Pramodoota', 'Pramodaduta'], ['Prajotpatti', 'Prajapati'],
  ['Angirasa'], ['Srimukha', 'Shrimukha'], ['Bhava'], ['Yuva'], ['Dhaata', 'Dhata'], ['Eeswara', 'Ishvara'],
  ['Bahudhanya'], ['Pramathi'], ['Vikrama'], ['Vrisha', 'Vrusha'], ['Chitrabhanu'], ['Subhanu', 'Svabhanu'],
  ['Tarana', 'Tharana'], ['Parthiva'], ['Vyaya'], ['Sarvajit', 'Sarvajith'], ['Sarvadhari'], ['Virodhi'],
  ['Vikriti', 'Vikruti'], ['Khara'], ['Nandana'], ['Vijaya'], ['Jaya'], ['Manmatha'], ['Durmukhi', 'Durmukha'],
  ['Hevilambi', 'Hemalambi'], ['Vilamba', 'Vilambi'], ['Vikari'], ['Sharvari', 'Sarvari'], ['Plava'],
  ['Subhakrit', 'Shubhakrit'], ['Sobhakrit', 'Shobhakrit'], ['Krodhi'], ['Viswavasu', 'Vishvavasu'],
  ['Parabhava'], ['Plavanga'], ['Keelaka', 'Kilaka'], ['Saumya', 'Sowmya'], ['Sadharana'],
  ['Virodhikrit', 'Virodhikruth'], ['Paridhavi'], ['Pramadicha', 'Pramadi'], ['Ananda'], ['Rakshasa'],
  ['Nala', 'Anala'], ['Pingala'], ['Kalayukti', 'Kalayukta'], ['Siddharthi', 'Siddarthi'], ['Raudri', 'Roudri'],
  ['Durmati'], ['Dundubhi'], ['Rudhirodgari'], ['Raktakshi', 'Raktaaksha', 'Raktaakshi'], ['Krodhana'],
  ['Akshaya', 'Kshaya'],
];

const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

/** Look up a printed name in a list of alias arrays; returns 1-based ID or throws. */
export function idOf(list, printed, what) {
  const n = norm(printed);
  const i = list.findIndex((aliases) => aliases.some((a) => norm(a) === n));
  if (i < 0) throw new Error(`Unknown ${what}: "${printed}"`);
  return i + 1;
}

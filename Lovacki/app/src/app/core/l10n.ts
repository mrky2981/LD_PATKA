import { Animal, AppLang } from './models';

export function format(template: string, ...args: Array<string | number>): string {
  let index = 0;
  return template.replace(/%[sd]/g, () => String(args[index++] ?? ''));
}

export interface Strings {
  appName: string;
  pinchZoom: string;
  free: string;
  taken: string;
  feed: string;
  map: string;
  stands: string;
  sightings: string;
  club: string;
  resetEveryDay: string;
  filterAll: string;
  filterAvailable: string;
  filterTaken: string;
  filterFeeding: string;
  feedingStand: string;
  feedingLarge: string;
  feedingSmall: string;
  huntingStand: string;
  takenBy: string;
  available: string;
  takenByYou: string;
  feedingNotClaimed: string;
  takeStand: string;
  leaveStand: string;
  logSighting: string;
  whatSpotted: string;
  count: string;
  noteOptional: string;
  saveSighting: string;
  savedAddAnother: string;
  noSightings: string;
  delete: string;
  dailyReset: string;
  dailyResetBody: string;
  legend: string;
  legendBody: string;
  legendFree: string;
  legendTaken: string;
  legendFeeding: string;
  legendFeedingLarge: string;
  legendFeedingSmall: string;
  legendTapHint: string;
  legendHidden: string;
  legendMinimize: string;
  language: string;
  login: string;
  register: string;
  username: string;
  loginIdentifier: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  licenseNumber: string;
  continueBtn: string;
  createAccount: string;
  haveAccount: string;
  noAccount: string;
  logout: string;
  loggedInAs: string;
  roleAdmin: string;
  roleMember: string;
  roleKeeper: string;
  adminCode: string;
  adminCodeHint: string;
  errorBlank: string;
  errorShortPassword: string;
  errorPasswordMatch: string;
  errorUserTaken: string;
  errorBadLogin: string;
  errorBadAdminCode: string;
  errorLicenseBlank: string;
  errorLicenseShort: string;
  errorLicenseTaken: string;
  splashClub: string;
  addHunting: string;
  addFeeding: string;
  addFeedingLarge: string;
  addFeedingSmall: string;
  cancelPlace: string;
  tapToPlace: string;
  newStandTitle: string;
  standCode: string;
  saveStand: string;
  deleteStand: string;
  customStand: string;
  adminTools: string;
  adminToolsBody: string;
  seedHint: string;
  history: string;
  historyEmpty: string;
  historyClaim: string;
  historyChange: string;
  searchStands: string;
  searchHint: string;
  noSearchResults: string;
  showOnMap: string;
  notesPrivate: string;
  duckHunt: string;
  duckHuntBody: string;
  duckHuntJoin: string;
  duckHuntLeave: string;
  duckHuntEmpty: string;
  duckHuntCount: string;
  duckHuntTourist: string;
  members: string;
  membersBody: string;
  takeForTourist: string;
  touristTakenBy: string;
  leaveTouristStand: string;
  historyTourist: string;
  historyLeave: string;
  historyTouristLeave: string;
  historyDuck: string;
  historyDuckLeave: string;
  historyDuckTourist: string;
  downloadMap: string;
  downloadingMap: string;
  downloadMapFailed: string;
  addShortcut: string;
  shortcutTitle: string;
  shortcutBody: string;
  shortcutIosBody: string;
  shortcutAndroidBody: string;
  shortcutDesktopBody: string;
  shortcutInstalled: string;
  shortcutOk: string;
  animalWildBoar: string;
  animalRoeDeer: string;
  animalRedDeer: string;
  animalFox: string;
  animalHare: string;
  animalPheasant: string;
  animalDuck: string;
  animalJackal: string;
  animalBadger: string;
  animalMarten: string;
  animalOther: string;
}

const EN: Strings = {
  appName: 'LD Patka',
  pinchZoom: 'Scroll, pinch or drag · click a stand',
  free: 'free',
  taken: 'taken',
  feed: 'Feed',
  map: 'Map',
  stands: 'Stands',
  sightings: 'Notes',
  club: 'Club',
  resetEveryDay: 'Reset every day at 12:00',
  filterAll: 'All',
  filterAvailable: 'Available',
  filterTaken: 'Taken',
  filterFeeding: 'Feeding',
  feedingStand: 'Feeding stand',
  feedingLarge: 'Large-game feeder',
  feedingSmall: 'Small-game feeder',
  huntingStand: 'Stand',
  takenBy: 'Taken by',
  available: 'Available',
  takenByYou: 'Taken by you',
  feedingNotClaimed: 'Feeding stand · not claimed',
  takeStand: 'Take this stand',
  leaveStand: 'Leave stand',
  logSighting: 'Personal note',
  whatSpotted: 'What did you see from this stand? Only you can see this.',
  count: 'Count',
  noteOptional: 'Note (optional)',
  saveSighting: 'Save note',
  savedAddAnother: 'Saved · add another',
  noSightings: 'No personal notes yet. Open a stand and log what you saw.',
  delete: 'Delete',
  dailyReset: 'Daily reset',
  dailyResetBody: 'Hunting stands go back to available every day at 12:00 (Europe/Zagreb). Next reset: %s.',
  legend: 'Legend',
  legendBody:
    'Green = free stands. Red = taken stands. Gold diamond = large-game feeder. Orange trough = small-game feeder. On the map, tap a legend item to hide or show it.',
  legendFree: 'Free stands',
  legendTaken: 'Taken stands',
  legendFeeding: 'Feeding stands',
  legendFeedingLarge: 'Large-game feeders',
  legendFeedingSmall: 'Small-game feeders',
  legendTapHint: 'Tap a color to show or hide it on the map',
  legendHidden: 'Hidden',
  legendMinimize: 'Minimize',
  language: 'Language',
  login: 'Log in',
  register: 'Register',
  username: 'Username',
  loginIdentifier: 'Username or hunting license number',
  password: 'Password',
  confirmPassword: 'Confirm password',
  displayName: 'Your name',
  licenseNumber: 'Hunting license number',
  continueBtn: 'Continue',
  createAccount: 'Create account',
  haveAccount: 'I already have an account',
  noAccount: 'Create a club account',
  logout: 'Log out',
  loggedInAs: 'Logged in as',
  roleAdmin: 'Club admin',
  roleMember: 'Member',
  roleKeeper: 'Gamekeeper',
  adminCode: 'Admin code (optional)',
  adminCodeHint: 'Enter the club admin code to register as admin.',
  errorBlank: 'Fill in all fields.',
  errorShortPassword: 'Password must be at least 4 characters.',
  errorPasswordMatch: 'Passwords do not match.',
  errorUserTaken: 'That username is already taken.',
  errorBadLogin: 'Wrong username or password.',
  errorBadAdminCode: 'Wrong admin code.',
  errorLicenseBlank: 'Enter your hunting license number.',
  errorLicenseShort: 'License number must be at least 3 characters.',
  errorLicenseTaken: 'That hunting license is already registered.',
  splashClub: 'Hunting club Patka',
  addHunting: 'Add hunting stand',
  addFeeding: 'Add feeding stand',
  addFeedingLarge: 'Add large-game feeder',
  addFeedingSmall: 'Add small-game feeder',
  cancelPlace: 'Cancel',
  tapToPlace: 'Tap the map to place the new stand',
  newStandTitle: 'New stand',
  standCode: 'Number / code',
  saveStand: 'Save stand',
  deleteStand: 'Remove stand',
  customStand: 'Added by admin',
  adminTools: 'Admin tools',
  adminToolsBody:
    'On the map, use Add hunting stand or add a large-game or small-game feeder, then tap the location. Below, set who is a gamekeeper so they can book stands for tourists.',
  seedHint: 'Default admin: admin / patka1946',
  history: 'History',
  historyEmpty: 'No stand claims yet.',
  historyClaim: '%s claimed stand %s',
  historyChange: '%s — stand change %s to stand %s',
  searchStands: 'Search stands',
  searchHint: 'Number or code',
  noSearchResults: 'No stands match that search.',
  showOnMap: 'Show on map',
  notesPrivate: 'Only you can see these notes.',
  duckHunt: 'Wild duck hunt',
  duckHuntBody:
    'Say if you are going duck hunting today. There is no place on the map — just the list of who is going. Resets at 12:00.',
  duckHuntJoin: 'I am going duck hunting',
  duckHuntLeave: 'I am not going',
  duckHuntEmpty: 'Nobody has signed up yet.',
  duckHuntCount: 'Going today: %d',
  duckHuntTourist: 'Tourist · booked by %s',
  members: 'Hunters',
  membersBody: 'Set a hunter as gamekeeper so they can book stands for tourists.',
  takeForTourist: 'Book for tourist',
  touristTakenBy: 'Tourist · booked by %s',
  leaveTouristStand: 'Release tourist stand',
  historyTourist: '%s booked stand %s for a tourist',
  historyLeave: '%s left stand %s',
  historyTouristLeave: '%s released tourist stand %s',
  historyDuck: '%s signed up for the wild duck hunt',
  historyDuckLeave: '%s left the wild duck hunt',
  historyDuckTourist: '%s booked a tourist for the wild duck hunt',
  downloadMap: 'Download map',
  downloadingMap: 'Preparing map…',
  downloadMapFailed: 'Could not download the map.',
  addShortcut: 'Add shortcut',
  shortcutTitle: 'Add to this device',
  shortcutBody: 'Add LD Patka to your phone’s home screen or your computer’s desktop.',
  shortcutIosBody: 'On iPhone or iPad: tap Share, then Add to Home Screen.',
  shortcutAndroidBody: 'Open the browser menu (three dots) and choose Add to Home screen or Install app.',
  shortcutDesktopBody: 'A shortcut file was downloaded. Open it or move it to your desktop.',
  shortcutInstalled: 'LD Patka is already installed on this device.',
  shortcutOk: 'OK',
  animalWildBoar: 'Wild boar',
  animalRoeDeer: 'Roe deer',
  animalRedDeer: 'Red deer',
  animalFox: 'Fox',
  animalHare: 'Hare',
  animalPheasant: 'Pheasant',
  animalDuck: 'Duck',
  animalJackal: 'Jackal',
  animalBadger: 'Badger',
  animalMarten: 'Marten',
  animalOther: 'Other',
};

const HR: Strings = {
  appName: 'LD Patka',
  pinchZoom: 'Kotačić, prsti ili povuci · klikni čeku',
  free: 'slobodno',
  taken: 'zauzeto',
  feed: 'Hranilište',
  map: 'Karta',
  stands: 'Čeke',
  sightings: 'Bilješke',
  club: 'Društvo',
  resetEveryDay: 'Reset svaki dan u 12:00',
  filterAll: 'Sve',
  filterAvailable: 'Slobodno',
  filterTaken: 'Zauzeto',
  filterFeeding: 'Hranilišta',
  feedingStand: 'Hranilište',
  feedingLarge: 'Hranilište krupna divljač',
  feedingSmall: 'Hranilište sitna divljač',
  huntingStand: 'Čeka',
  takenBy: 'Zauzeo/la',
  available: 'Slobodna',
  takenByYou: 'Zauzeo/la si je',
  feedingNotClaimed: 'Hranilište · ne zauzima se',
  takeStand: 'Zauzmi čeku',
  leaveStand: 'Napusti čeku',
  logSighting: 'Osobna bilješka',
  whatSpotted: 'Što si vidio/la s čeke? Ovo vidiš samo ti.',
  count: 'Broj',
  noteOptional: 'Bilješka (nije obavezno)',
  saveSighting: 'Spremi bilješku',
  savedAddAnother: 'Spremljeno · dodaj još',
  noSightings: 'Još nema osobnih bilješki. Otvori čeku i zabilježi što si vidio/la.',
  delete: 'Obriši',
  dailyReset: 'Dnevni reset',
  dailyResetBody:
    'Čeke se svaki dan u 12:00 (Europa/Zagreb) vraćaju na slobodne. Sljedeći reset: %s.',
  legend: 'Legenda',
  legendBody:
    'Zeleno = slobodne čeke. Crveno = zauzete. Zlatni dijamant = hranilište krupne divljači. Narančasto korito = hranilište sitne divljači. Na karti dodirni stavku legende da je sakriješ ili pokažeš.',
  legendFree: 'Slobodne čeke',
  legendTaken: 'Zauzete čeke',
  legendFeeding: 'Hranilišta',
  legendFeedingLarge: 'Hranilišta krupna divljač',
  legendFeedingSmall: 'Hranilišta sitna divljač',
  legendTapHint: 'Dodirni boju da je pokažeš ili sakriješ na karti',
  legendHidden: 'Skriveno',
  legendMinimize: 'Smanji',
  language: 'Jezik',
  login: 'Prijava',
  register: 'Registracija',
  username: 'Korisničko ime',
  loginIdentifier: 'Korisničko ime ili broj iskaznice',
  password: 'Lozinka',
  confirmPassword: 'Potvrdi lozinku',
  displayName: 'Tvoje ime',
  licenseNumber: 'Broj lovačke iskaznice',
  continueBtn: 'Nastavi',
  createAccount: 'Stvori račun',
  haveAccount: 'Već imam račun',
  noAccount: 'Stvori račun društva',
  logout: 'Odjava',
  loggedInAs: 'Prijavljen/a kao',
  roleAdmin: 'Administrator',
  roleMember: 'Član',
  roleKeeper: 'Lovnik',
  adminCode: 'Admin kod (nije obavezno)',
  adminCodeHint: 'Unesi admin kod društva da se registriraš kao administrator.',
  errorBlank: 'Ispuni sva polja.',
  errorShortPassword: 'Lozinka mora imati najmanje 4 znaka.',
  errorPasswordMatch: 'Lozinke se ne podudaraju.',
  errorUserTaken: 'To korisničko ime je zauzeto.',
  errorBadLogin: 'Pogrešno korisničko ime ili lozinka.',
  errorBadAdminCode: 'Pogrešan admin kod.',
  errorLicenseBlank: 'Unesi broj lovačke iskaznice.',
  errorLicenseShort: 'Broj iskaznice mora imati najmanje 3 znaka.',
  errorLicenseTaken: 'Ta lovačka iskaznica je već registrirana.',
  splashClub: 'Lovačko društvo Patka',
  addHunting: 'Dodaj čeku',
  addFeeding: 'Dodaj hranilište',
  addFeedingLarge: 'Dodaj hranilište krupna',
  addFeedingSmall: 'Dodaj hranilište sitna',
  cancelPlace: 'Odustani',
  tapToPlace: 'Dodirni kartu da postaviš novo mjesto',
  newStandTitle: 'Novo mjesto',
  standCode: 'Broj / oznaka',
  saveStand: 'Spremi',
  deleteStand: 'Ukloni s karte',
  customStand: 'Dodao administrator',
  adminTools: 'Admin alati',
  adminToolsBody:
    'Na karti odaberi Dodaj čeku ili dodaj hranilište krupne ili sitne divljači, zatim dodirni lokaciju. Dolje odredi tko je lovnik da može prijavljivati čeke za turiste.',
  seedHint: 'Početni admin: admin / patka1946',
  history: 'Povijest',
  historyEmpty: 'Još nema prijava na čeke.',
  historyClaim: '%s zauzeo/la čeku %s',
  historyChange: '%s — promjena čeke %s na čeku %s',
  searchStands: 'Traži čeku',
  searchHint: 'Broj ili oznaka',
  noSearchResults: 'Nema čeke za taj upit.',
  showOnMap: 'Prikaži na karti',
  notesPrivate: 'Ove bilješke vidiš samo ti.',
  duckHunt: 'Prijava na divlje patke',
  duckHuntBody:
    'Javi se ako ideš danas u lov na patke. Nema mjesta na karti — samo popis tko ide. Reset u 12:00.',
  duckHuntJoin: 'Idem u lov na patke',
  duckHuntLeave: 'Ne idem',
  duckHuntEmpty: 'Još se nitko nije prijavio.',
  duckHuntCount: 'Danas ide: %d',
  duckHuntTourist: 'Turist · prijavio/la %s',
  members: 'Lovci',
  membersBody: 'Postavi lovnika da može prijavljivati čeke za turiste.',
  takeForTourist: 'Prijava turista',
  touristTakenBy: 'Turist · prijavio/la %s',
  leaveTouristStand: 'Oslobodi čeku turista',
  historyTourist: '%s prijavio/la čeku %s za turista',
  historyLeave: '%s napustio/la čeku %s',
  historyTouristLeave: '%s oslobodio/la turističku čeku %s',
  historyDuck: '%s se prijavio/la na lov na divlje patke',
  historyDuckLeave: '%s odustao/la od lova na patke',
  historyDuckTourist: '%s prijavio/la turista na lov na patke',
  downloadMap: 'Preuzmi kartu',
  downloadingMap: 'Pripremam kartu…',
  downloadMapFailed: 'Kartu nije moguće preuzeti.',
  addShortcut: 'Dodaj prečac',
  shortcutTitle: 'Dodaj na ovaj uređaj',
  shortcutBody: 'Dodaj LD Patka na početni zaslon mobitela ili na radnu površinu računala.',
  shortcutIosBody: 'Na iPhoneu ili iPadu: dodirni Dijeli, zatim Dodaj na početni zaslon.',
  shortcutAndroidBody: 'Otvori izbornik preglednika (tri točke) i odaberi Dodaj na početni zaslon ili Instaliraj aplikaciju.',
  shortcutDesktopBody: 'Preuzeta je datoteka prečaca. Otvori je ili je premjesti na radnu površinu.',
  shortcutInstalled: 'LD Patka je već dodan na ovaj uređaj.',
  shortcutOk: 'U redu',
  animalWildBoar: 'Divlja svinja',
  animalRoeDeer: 'Srna',
  animalRedDeer: 'Jelen',
  animalFox: 'Lisica',
  animalHare: 'Zec',
  animalPheasant: 'Fazan',
  animalDuck: 'Patka',
  animalJackal: 'Šakal',
  animalBadger: 'Jazavac',
  animalMarten: 'Kuna',
  animalOther: 'Ostalo',
};

export function stringsFor(lang: AppLang): Strings {
  return lang === 'hr' ? HR : EN;
}

export function animalLabel(strings: Strings, id: string): string {
  switch (id) {
    case 'wild-boar':
      return strings.animalWildBoar;
    case 'roe-deer':
      return strings.animalRoeDeer;
    case 'red-deer':
      return strings.animalRedDeer;
    case 'fox':
      return strings.animalFox;
    case 'hare':
      return strings.animalHare;
    case 'pheasant':
      return strings.animalPheasant;
    case 'duck':
      return strings.animalDuck;
    case 'jackal':
      return strings.animalJackal;
    case 'badger':
      return strings.animalBadger;
    case 'marten':
      return strings.animalMarten;
    default:
      return strings.animalOther;
  }
}

export function animals(strings: Strings): Animal[] {
  return [
    { id: 'wild-boar', label: strings.animalWildBoar, emoji: '🐗' },
    { id: 'roe-deer', label: strings.animalRoeDeer, emoji: '🦌' },
    { id: 'red-deer', label: strings.animalRedDeer, emoji: '🦌' },
    { id: 'fox', label: strings.animalFox, emoji: '🦊' },
    { id: 'hare', label: strings.animalHare, emoji: '🐇' },
    { id: 'pheasant', label: strings.animalPheasant, emoji: '🪶' },
    { id: 'duck', label: strings.animalDuck, emoji: '🦆' },
    { id: 'jackal', label: strings.animalJackal, emoji: '🐺' },
    { id: 'badger', label: strings.animalBadger, emoji: '🦡' },
    { id: 'marten', label: strings.animalMarten, emoji: '🐾' },
    { id: 'other', label: strings.animalOther, emoji: '•' },
  ];
}

export function standDisplayName(
  strings: Strings,
  code: string,
  type: string,
  feedingKind?: string | null,
): string {
  if (type === 'feeding') {
    const kind = feedingKind === 'small' ? strings.feedingSmall : strings.feedingLarge;
    return `${kind} ${code}`;
  }
  return `${strings.huntingStand} ${code}`;
}

export function occupancyLabel(
  strings: Strings,
  occ: { standId: string; hunterName: string; bookedByName?: string },
  tourist: boolean,
  mine: boolean,
): string {
  if (tourist) {
    return format(strings.touristTakenBy, occ.bookedByName || '—');
  }
  if (mine) {
    return strings.takenByYou;
  }
  return `${strings.takenBy} ${occ.hunterName}`;
}

export function statusLabel(strings: Strings, admin: boolean, keeper: boolean): string {
  const parts: string[] = [];
  if (admin) {
    parts.push(strings.roleAdmin);
  }
  if (keeper) {
    parts.push(strings.roleKeeper);
  }
  if (!admin && !keeper) {
    parts.push(strings.roleMember);
  }
  return parts.join(' · ');
}

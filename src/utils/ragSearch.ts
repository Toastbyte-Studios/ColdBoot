import emergencyData from '../data/emergency.json';
import healthData from '../data/health.json';
import roadsideData from '../data/roadside.json';
import scenarioCardsData from '../data/scenarioCards.json';
import survivalData from '../data/survival.json';
import toolsData from '../data/tools.json';
import weatherData from '../data/weather.json';
import ReferenceEntryType, { ScenarioCardType } from '../types/data-type';

export interface RagResult {
  entry: ReferenceEntryType;
  score: number;
  excerpt: string;
}

export interface RagResponse {
  query: string;
  results: RagResult[];
  hasResults: boolean;
}

// Common English stop words to filter out during tokenization
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'shall',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'about',
  'into',
  'through',
  'from',
  'up',
  'if',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'our',
  'their',
  'what',
  'which',
  'who',
  'how',
  'when',
  'where',
  'why',
  'all',
  'and',
  'but',
  'or',
  'nor',
  'not',
  'so',
  'yet',
  'both',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'than',
  'too',
  'very',
  'just',
  'any',
  'here',
  'there',
  'get',
  'use',
  'make',
  'need',
  'like',
]);

/**
 * Converts a ScenarioCardType to a ReferenceEntryType so scenario cards can
 * be scored and excerpted by the same pipeline as reference entries.
 *
 * Mapping:
 *   first_5_minutes + first_hour + first_day → steps (chronological actions)
 *   immediate_risks                           → do_not (things to watch/avoid)
 *   watch_for                                 → watch_for
 *   notes                                     → notes
 */
function scenarioCardToEntry(card: ScenarioCardType): ReferenceEntryType {
  return {
    id: card.id,
    category: card.category,
    title: card.title,
    summary: card.summary,
    difficulty: card.difficulty,
    tags: card.tags,
    steps: [...card.first_5_minutes, ...card.first_hour, ...card.first_day],
    do_not: card.immediate_risks,
    watch_for: card.watch_for,
    notes: card.notes,
  };
}

/**
 * Synthetic reference entries for app modules and tools that have no backing
 * JSON file. These make communication tools, Morse code, radio frequencies, etc.
 * discoverable through natural language search. Their `related_screen` values
 * let SearchScreen navigate directly to the corresponding tool screen.
 */
const SYNTHETIC_TOOL_ENTRIES: ReferenceEntryType[] = [
  {
    id: 'synthetic_morse_code',
    category: 'Communications',
    title: 'Morse Code',
    summary:
      'International Morse code translator, trainer, and cheat sheet. Encode and decode text using dots and dashes for signaling or radio communication.',
    difficulty: 'intermediate',
    tags: [
      'morse',
      'code',
      'communication',
      'sos',
      'dots',
      'dashes',
      'signal',
      'decode',
      'encode',
      'ham',
      'radio',
      'international',
    ],
    steps: [
      'Represent each letter or number as a sequence of dots (.) and dashes (-)',
      'SOS distress signal: ... --- ... (dot dot dot, dash dash dash, dot dot dot)',
      'Use Alpha to Morse to convert text into Morse code',
      'Use Morse to Alpha to decode incoming Morse signals',
      'Practice with the Morse Trainer to build speed and accuracy',
      'Use the Cheat Sheet for a quick reference of all characters',
    ],
    do_not: [],
    watch_for: [],
    notes: [
      'Based on the ITU-R International Morse Code standard',
      'Commonly used by HAM (amateur) radio operators and in maritime communication',
    ],
    related_screen: 'MorseCode',
    related_screen_label: 'Open Morse Code',
  },
  {
    id: 'synthetic_nato_phonetic',
    category: 'Communications',
    title: 'NATO Phonetic Alphabet',
    summary:
      'The NATO/ICAO phonetic alphabet for spelling out words clearly over radio or telephone. Alpha, Bravo, Charlie — reduces miscommunication in noisy environments.',
    difficulty: 'basic',
    tags: [
      'nato',
      'phonetic',
      'alphabet',
      'radio',
      'spelling',
      'alpha',
      'bravo',
      'charlie',
      'communication',
      'military',
    ],
    steps: [
      'Use the phonetic alphabet to spell call signs, names, or critical words over radio',
      'Alpha = A, Bravo = B, Charlie = C, Delta = D, Echo = E, Foxtrot = F',
      'Golf = G, Hotel = H, India = I, Juliet = J, Kilo = K, Lima = L',
      'Mike = M, November = N, Oscar = O, Papa = P, Quebec = Q, Romeo = R',
      'Sierra = S, Tango = T, Uniform = U, Victor = V, Whiskey = W, X-ray = X',
      'Yankee = Y, Zulu = Z',
    ],
    do_not: [],
    watch_for: [],
    notes: [
      'Standardized by NATO and the ICAO for international interoperability',
      'Essential for clear radio communication when voice quality is poor',
    ],
    related_screen: 'NatoPhonetic',
    related_screen_label: 'Open NATO Phonetic',
  },
  {
    id: 'synthetic_radio_frequencies',
    category: 'Communications',
    title: 'Radio Frequency References',
    summary:
      'Reference guide for emergency and off-grid radio frequencies — HAM amateur radio, CB, GMRS, FRS, and MURS. Includes channel frequencies, modes, and license requirements.',
    difficulty: 'intermediate',
    tags: [
      'radio',
      'frequency',
      'ham',
      'cb',
      'gmrs',
      'frs',
      'murs',
      'amateur',
      'channel',
      'communication',
      'emergency',
      'repeater',
      'simplex',
      'uhf',
      'vhf',
    ],
    steps: [
      'HAM (Amateur Radio) — requires FCC license; national simplex calling 146.520 MHz',
      'CB (Citizens Band) — no license required; Channel 9 emergency (27.065 MHz)',
      'GMRS — requires FCC license, no exam; 462–467 MHz range; up to 50W and repeaters',
      'FRS (Family Radio Service) — no license; 22 channels shared with GMRS; 2W max (0.5W on 8–14)',
      'MURS (Multi-Use Radio Service) — no license; 151–154 MHz; 5 channels; 2W max',
    ],
    do_not: [
      'Do not transmit on amateur radio frequencies without a valid FCC license',
      'Do not exceed legal power limits for each radio service',
    ],
    watch_for: [],
    notes: [
      'Always comply with FCC regulations and local laws',
      'CB Channel 9 is reserved for emergencies and traveler assistance',
      '146.520 MHz is the national 2 m simplex calling frequency for HAM operators',
    ],
    related_screen: 'RadioFrequencies',
    related_screen_label: 'Open Radio Frequencies',
  },
  {
    id: 'synthetic_ground_to_air',
    category: 'Survival',
    title: 'Ground-to-Air Signals',
    summary:
      'The ICAO ground-to-air code for signaling rescue aircraft, plus the older symbols survival cards still print. Lay symbols on open ground using rocks, logs, or high-contrast materials.',
    difficulty: 'basic',
    tags: [
      'ground',
      'air',
      'signal',
      'rescue',
      'aircraft',
      'distress',
      'sar',
      'search',
      'survival',
      'icao',
      'symbols',
      'sos',
    ],
    steps: [
      'V — Require assistance',
      'X — Require medical assistance',
      'N — No / Negative',
      'Y — Yes / Affirmative',
      '→ (Arrow) — Proceeding in this direction',
      'Make each symbol at least 2.5 m (8 ft) long, and bigger if you can',
      'Choose a clearing with maximum sky visibility and high contrast materials',
    ],
    do_not: [
      'Do not make symbols smaller than 2.5 m (8 ft) — they must be visible from altitude',
      'Do not rely on the older code (F, K, △, LL, JL) — pilots may not know it, and X in it meant "unable to proceed"',
    ],
    watch_for: [
      'Wings rocking by day, or landing or navigation lights flashing twice at night — the pilot has understood',
      'Aircraft circling overhead — they may have spotted your signal',
      'Drop message from aircraft indicating help is coming',
    ],
    notes: [
      "The five symbols above are the ICAO Annex 12 survivors' code",
      'Trampled vegetation, snow trenches, or rock arrangements all work',
    ],
    related_screen: 'GroundToAirSignals',
    related_screen_label: 'Open Ground-to-Air Signals',
  },
  {
    id: 'synthetic_digital_whistle',
    category: 'Communications',
    title: 'Digital Whistle',
    summary:
      'Emergency distress whistle and SOS signal generator. Produces loud audio tones for attracting attention when lost or in danger.',
    difficulty: 'basic',
    tags: [
      'whistle',
      'sos',
      'distress',
      'emergency',
      'signal',
      'audio',
      'alert',
      'lost',
      'rescue',
      'sound',
    ],
    steps: [
      'Activate the digital whistle to emit a loud, piercing emergency tone',
      'SOS pattern: three short blasts, three long blasts, three short blasts',
      'Use in open areas where sound carries further',
    ],
    do_not: [
      'Do not use in enclosed spaces at maximum volume — risk of hearing damage',
    ],
    watch_for: [],
    notes: [
      'Works offline — no cellular signal required',
      'Three blasts is the universal distress signal in wilderness',
    ],
    related_screen: 'DigitalWhistle',
    related_screen_label: 'Open Digital Whistle',
  },
  // --- Core module tools ---
  {
    id: 'synthetic_unit_conversion',
    category: 'Core',
    title: 'Unit Conversion',
    summary:
      'Convert between common units of measurement — length, weight, volume, temperature, area, speed, pressure, energy, time, compass angles, fuel, and light. Fully offline.',
    difficulty: 'basic',
    tags: [
      'unit',
      'conversion',
      'convert',
      'length',
      'weight',
      'volume',
      'temperature',
      'speed',
      'distance',
      'metric',
      'imperial',
      'fahrenheit',
      'celsius',
      'miles',
      'kilometers',
      'pounds',
      'kilograms',
      'gallons',
      'liters',
      'feet',
      'meters',
    ],
    steps: [
      'Select a category: Length, Weight, Volume, Temperature, Area, Speed, Pressure, Energy, Time, Compass/Angles, Fuel, or Light',
      'Enter a value in the input field to see the converted result instantly',
      'Length: inches ↔ cm, feet ↔ meters, miles ↔ km, nautical miles ↔ km',
      'Weight: ounces ↔ grams, pounds ↔ kg, stones ↔ pounds',
      'Volume: cups ↔ mL, gallons ↔ liters, fluid ounces ↔ mL',
      'Temperature: Fahrenheit ↔ Celsius ↔ Kelvin',
      'Speed: mph ↔ km/h, knots ↔ mph, knots ↔ km/h',
    ],
    do_not: [],
    watch_for: [],
    notes: ['All conversions work offline — no network required'],
    related_screen: 'UnitConversion',
    related_screen_label: 'Open Unit Conversion',
  },
  {
    id: 'synthetic_lunar_cycles',
    category: 'Core',
    title: 'Lunar Cycles',
    summary:
      'Track moon phases, upcoming full moons, new moons, and the current lunar cycle. Shows waxing/waning crescent, quarter, and gibbous phases — useful for night visibility and tidal planning.',
    difficulty: 'basic',
    tags: [
      'moon',
      'lunar',
      'phase',
      'cycle',
      'full moon',
      'new moon',
      'waxing',
      'waning',
      'crescent',
      'gibbous',
      'quarter',
      'night',
      'tides',
      'astronomy',
    ],
    steps: [
      'View the current moon phase and illumination percentage',
      'See upcoming full moons and new moons for the next 30 days',
      'Phases: New Moon → Waxing Crescent → First Quarter → Waxing Gibbous → Full Moon → Waning Gibbous → Last Quarter → Waning Crescent',
      'Full Moon provides maximum natural night lighting — useful for travel after dark',
      'New Moon means minimal light — plan accordingly for nighttime activities',
    ],
    do_not: [],
    watch_for: [
      'Full Moon nights provide significantly better visibility for off-grid travel',
    ],
    notes: [
      'Moon phase data is calculated entirely offline using astronomical formulas',
      'Lunar cycle averages 29.5 days',
    ],
    related_screen: 'LunarCycles',
    related_screen_label: 'Open Lunar Cycles',
  },
  {
    id: 'synthetic_barometric_pressure',
    category: 'Core',
    title: 'Barometric Pressure',
    summary:
      'Read real-time barometric pressure from the device sensor in hPa and inHg. Tracks pressure trends (rising, steady, falling) over 1–24 hour windows to help predict incoming weather.',
    difficulty: 'intermediate',
    tags: [
      'barometric',
      'pressure',
      'weather',
      'forecast',
      'rising',
      'falling',
      'storm',
      'hpa',
      'inhg',
      'sensor',
      'trend',
      'atmosphere',
      'millibar',
    ],
    steps: [
      'Open the screen to see the current barometric pressure in hPa and inHg',
      'Select a trend window (1, 3, 6, 12, or 24 hours) to see how pressure has changed',
      'Rising pressure typically indicates improving weather',
      'Falling pressure typically indicates deteriorating weather or an incoming storm',
      'Rapid pressure drops (>3 hPa/hour) often precede severe weather',
    ],
    do_not: [
      'Do not rely solely on barometric pressure for critical weather decisions — use all available information',
    ],
    watch_for: [
      'Rapid pressure drops of more than 3 hPa per hour — sign of approaching storm',
      'Steady low pressure sustained for 24+ hours — prolonged bad weather likely',
    ],
    notes: [
      'Requires a device with a built-in barometric sensor — not all devices have one',
      'Works fully offline — no network required',
    ],
    related_screen: 'BarometricPressure',
    related_screen_label: 'Open Barometric Pressure',
  },
  {
    id: 'synthetic_sun_times',
    category: 'Core',
    title: 'Sun Times',
    summary:
      'Displays sunrise, sunset, dawn, dusk, solar noon, and golden hour times for your current GPS location. Calculated offline using astronomical formulas.',
    difficulty: 'basic',
    tags: [
      'sun',
      'sunrise',
      'sunset',
      'dawn',
      'dusk',
      'golden hour',
      'solar noon',
      'daylight',
      'twilight',
      'night',
      'astronomy',
      'location',
      'gps',
      'light',
    ],
    steps: [
      'Open the screen — sun times are calculated automatically for your GPS location',
      'See sunrise and sunset for today',
      'Dawn and dusk show civil twilight — when the horizon is first/last visible',
      'Solar noon is when the sun reaches its highest point — shortest shadows',
      'Golden hour (first/last hour of sunlight) is ideal for navigation by shadow',
    ],
    do_not: [],
    watch_for: [
      'Approaching sunset — plan shelter and camp setup well before dark',
    ],
    notes: [
      'Calculations use your last known GPS location — accuracy depends on device location services',
      'Works fully offline using the suncalc library',
    ],
    related_screen: 'SunTime',
    related_screen_label: 'Open Sun Times',
  },
  {
    id: 'synthetic_device_status',
    category: 'Core',
    title: 'Device Status',
    summary:
      'View key device health metrics: battery level, last GPS fix, available storage, and offline/connectivity status. Helps you monitor readiness before going off-grid.',
    difficulty: 'basic',
    tags: [
      'device',
      'status',
      'battery',
      'gps',
      'storage',
      'offline',
      'connectivity',
      'health',
      'readiness',
      'fix',
    ],
    steps: [
      'Check battery level to ensure the device can last through your activity',
      'Review the last GPS fix time — a stale fix means location data may be outdated',
      'Check available storage before recording voice logs or downloading offline maps',
      'Offline status confirms whether the device is currently connected to a network',
    ],
    do_not: [],
    watch_for: [
      'Low battery below 20% before heading off-grid',
      'GPS fix older than several minutes in rapidly changing environments',
    ],
    notes: ['All metrics are read from device sensors — no network required'],
    related_screen: 'DeviceStatus',
    related_screen_label: 'Open Device Status',
  },
  {
    id: 'synthetic_flashlight',
    category: 'Core',
    title: 'Flashlight',
    summary:
      'Device flashlight with multiple modes: solid on, strobe (1–15 Hz adjustable), SOS Morse code pattern, and night-vision red mode. Useful for emergencies and low-light navigation.',
    difficulty: 'basic',
    tags: [
      'flashlight',
      'light',
      'torch',
      'strobe',
      'sos',
      'morse',
      'night vision',
      'nightvision',
      'red light',
      'emergency',
      'signal',
      'dark',
    ],
    steps: [
      'Tap Flashlight On to activate the device torch at full brightness',
      'Strobe mode flashes rapidly (1–15 Hz adjustable) — useful for signaling',
      'SOS mode automatically transmits the international distress pattern (... --- ...)',
      'Night Vision mode uses a dim red screen to preserve dark-adapted vision',
    ],
    do_not: [
      'Do not stare directly into the flashlight — risk of temporary blindness',
    ],
    watch_for: [],
    notes: [
      'SOS pattern is internationally recognized — three short, three long, three short flashes',
      'Strobe can attract attention from aircraft or rescue teams',
    ],
    related_screen: 'Flashlight',
    related_screen_label: 'Open Flashlight',
  },
  {
    id: 'synthetic_voice_log',
    category: 'Core',
    title: 'Voice Log',
    summary:
      'Record short voice notes (up to 12 seconds) with automatic timestamp and location metadata. Useful for logging observations, leaving audio messages, or documenting conditions hands-free.',
    difficulty: 'basic',
    tags: [
      'voice',
      'log',
      'audio',
      'record',
      'note',
      'memo',
      'microphone',
      'playback',
      'message',
      'timestamp',
      'observation',
    ],
    steps: [
      'Tap the record button to start a voice recording (max 12 seconds)',
      'Recording stops automatically at 12 seconds or when you tap stop',
      'Each recording is saved with a timestamp and your current location',
      'Tap any saved recording to play it back',
      'Recordings are stored locally on device — no network required',
    ],
    do_not: [],
    watch_for: [],
    notes: [
      'Maximum recording duration is 12 seconds per clip',
      'Requires microphone permission on first use',
    ],
    related_screen: 'VoiceLog',
    related_screen_label: 'Open Voice Log',
  },
  // --- Communications module (additional) ---
  {
    id: 'synthetic_decibel_meter',
    category: 'Communications',
    title: 'Decibel Meter',
    summary:
      'Real-time ambient sound level measurement in decibels (dB) using the device microphone. Useful for assessing noise levels, detecting activity, or monitoring environments.',
    difficulty: 'basic',
    tags: [
      'decibel',
      'sound',
      'noise',
      'level',
      'audio',
      'meter',
      'dB',
      'microphone',
      'ambient',
      'measure',
      'volume',
    ],
    steps: [
      'Tap Start to begin measuring ambient sound levels in real time',
      'The meter displays current dB level with a color-coded visual indicator',
      'Tap Stop to end measurement',
      'The decibel level is also shown in the footer while the meter is active',
    ],
    do_not: [],
    watch_for: [],
    notes: [
      'Works offline — no network required',
      'Requires microphone permission on first use',
      'Typical conversation: ~60 dB; loud noise: >85 dB',
    ],
    related_screen: 'DecibelMeter',
    related_screen_label: 'Open Decibel Meter',
  },
  // --- Navigation module ---
  {
    id: 'synthetic_map',
    category: 'Navigation',
    title: 'Map',
    summary:
      'GPS map with live location tracking and compass heading overlay. Displays your current position, movement direction, altitude, and speed. Supports offline map tiles cached by the OS.',
    difficulty: 'basic',
    tags: [
      'map',
      'gps',
      'location',
      'navigation',
      'compass',
      'heading',
      'coordinates',
      'latitude',
      'longitude',
      'offline',
      'tracking',
      'position',
      'satellite',
    ],
    steps: [
      'Open the Map to see your live GPS position on the map',
      'The compass ring shows your current heading in degrees',
      'Your position updates in real time as you move',
      'Map tiles are cached by the OS for partial offline use',
      'Coordinates, altitude, speed, and heading are displayed in the data panel',
    ],
    do_not: [
      'Do not rely solely on this map for navigation in remote areas without offline maps downloaded',
    ],
    watch_for: [],
    notes: [
      'Requires location permission for GPS tracking',
      'For full offline map coverage, download offline map tiles from the Offline Maps section',
    ],
    related_screen: 'MapScreen',
    related_screen_label: 'Open Map',
  },
  {
    id: 'synthetic_star_map',
    category: 'Navigation',
    title: 'Star Map & Celestial Navigation',
    summary:
      'Offline star map and celestial navigation guide. Shows navigational stars, constellation guides for your hemisphere and season, and step-by-step instructions for finding north or south using the stars.',
    difficulty: 'intermediate',
    tags: [
      'star',
      'stars',
      'celestial',
      'navigation',
      'polaris',
      'north star',
      'constellation',
      'orion',
      'southern cross',
      'hemisphere',
      'astronomy',
      'night sky',
      'compass',
      'nocturnal navigation',
    ],
    steps: [
      'Open Star Map to see navigation instructions tailored to your hemisphere',
      'Northern hemisphere: find Polaris (North Star) using the Big Dipper pointer stars',
      'Southern hemisphere: use the Southern Cross (Crux) to find south',
      'Key navigational stars: Polaris, Sirius, Canopus, Arcturus, Vega',
      'Constellation guides are filtered by your hemisphere and current season',
      'Use star bearings to navigate when you have no compass or GPS',
    ],
    do_not: [],
    watch_for: [
      'Cloud cover may obscure stars — have a backup navigation method',
      'Light pollution reduces star visibility near cities',
    ],
    notes: [
      'Works fully offline — no network required',
      'Hemisphere is determined from your device GPS location',
    ],
    related_screen: 'StarMap',
    related_screen_label: 'Open Star Map',
  },
  {
    id: 'synthetic_grid_reference',
    category: 'Navigation',
    title: 'Grid Reference Converter',
    summary:
      'Offline coordinate format converter. Convert between Decimal Degrees (DD), Degrees Minutes Seconds (DMS), and MGRS (Military Grid Reference System). Pure math — no network required.',
    difficulty: 'basic',
    tags: [
      'grid',
      'reference',
      'coordinate',
      'mgrs',
      'utm',
      'decimal degrees',
      'dms',
      'degrees minutes seconds',
      'latitude',
      'longitude',
      'convert',
      'navigation',
      'military',
      'wgs84',
    ],
    steps: [
      'Select your input coordinate format: Decimal Degrees, Deg Min Sec, or MGRS',
      'Type or paste a coordinate into the input field',
      'All three formats are displayed instantly as output',
      'Use the Copy button on any output row to copy the result',
      'Example: 36.1716, -115.1391 (Las Vegas in Decimal Degrees)',
    ],
    do_not: [],
    watch_for: [
      'MGRS is only valid between 80°S and 84°N — polar regions use UPS instead',
    ],
    notes: [
      'Conversion is done entirely on-device — no network call is ever made',
      'MGRS uses UTM as an intermediate step (WGS84 ellipsoid)',
    ],
    related_screen: 'GridReference',
    related_screen_label: 'Open Grid Reference Converter',
  },
  // --- Navigation — Waypoints ---
  {
    id: 'synthetic_waypoints',
    category: 'Navigation',
    title: 'Waypoint Tracker',
    summary:
      'Save, manage, and navigate to GPS waypoints. Add waypoints from your current location or by entering coordinates manually. Live bearing and distance update in real time as you move.',
    difficulty: 'basic',
    tags: [
      'waypoint',
      'navigate',
      'gps',
      'bearing',
      'distance',
      'destination',
      'coordinates',
      'latitude',
      'longitude',
      'track',
      'route',
      'field',
    ],
    steps: [
      'Tap the ⚑ Waypoints button (bottom-left of the map) to open the waypoint sheet',
      'Tap + to add a waypoint from your current GPS location or by entering coordinates',
      'Tap Navigate on any waypoint to start live bearing and distance tracking',
      'The active strip at the bottom shows real-time bearing and distance to the waypoint',
      'Tap ✕ on the active strip to stop navigating to that waypoint',
      'Tap Delete to remove a waypoint from the list permanently',
    ],
    do_not: [],
    watch_for: [
      'GPS must be enabled and location permission granted for "current location" waypoints',
      'Bearing shown is true bearing (great-circle, relative to true north); no magnetic declination is applied',
    ],
    notes: [
      'Waypoints are stored in SQLite and persist across app restarts',
      'Distance uses the haversine formula; bearing uses atan2 over a spherical Earth model',
    ],
    related_screen: 'MapScreen',
    related_screen_label: 'Open Map & Waypoints',
  },
  // --- Prepper module ---
  {
    id: 'synthetic_emergency_planner',
    category: 'Prepper',
    title: 'Emergency Planner',
    summary:
      'Plan and store emergency contacts, rally points, and a family communication plan. Store who to call, where to meet, and how to coordinate when normal communication is disrupted.',
    difficulty: 'basic',
    tags: [
      'emergency',
      'plan',
      'contacts',
      'rally',
      'meeting point',
      'communication',
      'family',
      'evacuation',
      'preparedness',
      'prepper',
      'bug out',
    ],
    steps: [
      'Add emergency contacts with name, phone number, and role',
      'Set rally points — physical locations where your group will meet if separated',
      'Create a communication plan — who calls whom and what the fallback plan is if phones are down',
      'Review your plan regularly so everyone in your household knows it',
    ],
    do_not: [
      'Do not wait for an emergency to set up your plan — prepare it now',
    ],
    watch_for: [],
    notes: [
      'Data is stored locally on the device — no cloud sync',
      'A good communication plan includes an out-of-area contact as a relay point',
    ],
    related_screen: 'EmergencyPlan',
    related_screen_label: 'Open Emergency Planner',
  },
  // --- Earth Module — Sky Events ---
  {
    id: 'synthetic_sky_events',
    category: 'Earth',
    title: 'Sky Events',
    summary:
      'Upcoming astronomical events for the next 12 months: solar and lunar eclipses, solstices, equinoxes, supermoons, and planet rise times for Venus, Mars, Jupiter, and Saturn. All calculations run fully offline.',
    difficulty: 'basic',
    tags: [
      'astronomy',
      'eclipse',
      'solar eclipse',
      'lunar eclipse',
      'solstice',
      'equinox',
      'supermoon',
      'planet',
      'Jupiter',
      'Saturn',
      'Venus',
      'Mars',
      'rise',
      'celestial',
      'sky',
      'night sky',
      'moon',
      'stargazing',
    ],
    steps: [
      'Open Sky Events from the Earth module',
      'Browse upcoming events sorted chronologically — full details are shown for each event',
      'Enable location for planet rise times — other events require no location',
    ],
    do_not: [],
    watch_for: [
      'Eclipse visibility depends on your location — a total solar eclipse may only be total in certain regions',
      'Supermoon brightness is subtle — differences from an average full moon are minor',
    ],
    notes: [
      'All calculations are performed on-device with no network required',
      'Uses the astronomia library (Jean Meeus Astronomical Algorithms)',
      'The footer notification also shows the next sky event within 30 days',
    ],
    related_screen: 'SkyEvents',
    related_screen_label: 'Open Sky Events',
  },
];

// All reference entries indexed once at module load time
const ALL_ENTRIES: ReferenceEntryType[] = [
  ...(healthData.entries as ReferenceEntryType[]),
  ...(survivalData.entries as ReferenceEntryType[]),
  ...(emergencyData.entries as ReferenceEntryType[]),
  ...(toolsData.entries as ReferenceEntryType[]),
  ...(weatherData.entries as ReferenceEntryType[]),
  ...(roadsideData.entries as ReferenceEntryType[]),
  ...(scenarioCardsData.entries as ScenarioCardType[]).map(scenarioCardToEntry),
  ...SYNTHETIC_TOOL_ENTRIES,
];

/**
 * Tokenizes text into meaningful words by lowercasing, stripping punctuation,
 * splitting on whitespace, and removing stop words and very short tokens.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Scores a reference entry against a list of query tokens using field-weighted
 * substring matching. Fields are weighted by how specifically they represent
 * the entry's topic:
 *
 * - title      ×5 — the authoritative label for this topic
 * - category   ×3 — broad topic group
 * - tags       ×3 — curated keywords
 * - summary    ×2 — concise description
 * - steps      ×1.5 — procedural content
 * - do_not     ×1 — cautionary content
 * - watch_for  ×1 — warning signals
 * - notes      ×1 — supplementary context
 *
 * The raw score is divided by the number of query tokens to normalize across
 * different query lengths.
 */
export function scoreEntry(
  entry: ReferenceEntryType,
  queryTokens: string[],
): number {
  if (queryTokens.length === 0) return 0;

  let score = 0;

  for (const token of queryTokens) {
    if (entry.title.toLowerCase().includes(token)) {
      score += 5;
    }
    if (entry.category.toLowerCase().includes(token)) {
      score += 3;
    }
    if (entry.tags.some((tag) => tag.toLowerCase().includes(token))) {
      score += 3;
    }
    if (entry.summary.toLowerCase().includes(token)) {
      score += 2;
    }
    if (entry.steps.some((step) => step.toLowerCase().includes(token))) {
      score += 1.5;
    }
    if (entry.do_not?.some((item) => item.toLowerCase().includes(token))) {
      score += 1;
    }
    if (entry.watch_for?.some((item) => item.toLowerCase().includes(token))) {
      score += 1;
    }
    if (entry.notes?.some((note) => note.toLowerCase().includes(token))) {
      score += 1;
    }
  }

  // Normalize by query length so longer queries don't inflate scores
  return score / queryTokens.length;
}

/**
 * Builds a focused excerpt from a reference entry that is most relevant to the
 * query. Always starts with the entry's summary. If any individual steps contain
 * query tokens, the two most relevant steps are appended; otherwise the first
 * step is shown as a starting point.
 */
export function createExcerpt(
  entry: ReferenceEntryType,
  queryTokens: string[],
): string {
  const parts: string[] = [entry.summary];

  const relevantSteps = entry.steps
    .filter((step) =>
      queryTokens.some((token) => step.toLowerCase().includes(token)),
    )
    .slice(0, 2);

  if (relevantSteps.length > 0) {
    parts.push('Key steps:');
    relevantSteps.forEach((step, i) => {
      parts.push(`${i + 1}. ${step}`);
    });
  } else if (entry.steps.length > 0) {
    parts.push(`First step: ${entry.steps[0]}`);
  }

  return parts.join('\n\n');
}

/**
 * Performs an on-device, offline natural language search over all indexed
 * reference entries using TF-IDF-style term matching.
 *
 * @param query    The user's natural language question.
 * @param topN     Maximum number of results to return (default: 3).
 * @param threshold Minimum normalized score required to include a result (default: 1.0).
 * @returns A {@link RagResponse} containing ranked results or an empty set when
 *          nothing meets the threshold.
 */
export function ragSearch(
  query: string,
  topN: number = 3,
  threshold: number = 1.0,
): RagResponse {
  if (!query || query.trim() === '') {
    return { query, results: [], hasResults: false };
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return { query, results: [], hasResults: false };
  }

  const scored = ALL_ENTRIES.map((entry) => ({
    entry,
    score: scoreEntry(entry, queryTokens),
  })).filter((item) => item.score >= threshold);

  scored.sort((a, b) => b.score - a.score);

  const results: RagResult[] = scored.slice(0, topN).map((item) => ({
    entry: item.entry,
    score: item.score,
    excerpt: createExcerpt(item.entry, queryTokens),
  }));

  return {
    query,
    results,
    hasResults: results.length > 0,
  };
}

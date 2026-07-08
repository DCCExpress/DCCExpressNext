import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import hu from "./i18n/hu.json";
import en from "./i18n/en.json";
import de from "./i18n/de.json";

type SupportedLanguage = "en" | "hu" | "de";

const supportedLanguages: SupportedLanguage[] = ["en", "hu", "de"];

function normalizeLanguage(language: string | null | undefined): SupportedLanguage | null {
  const shortCode = language?.split("-")[0]?.toLowerCase();

  if (supportedLanguages.includes(shortCode as SupportedLanguage)) {
    return shortCode as SupportedLanguage;
  }

  return null;
}

function readInitialLanguage(): SupportedLanguage {
  const urlLanguage = normalizeLanguage(
    new URLSearchParams(window.location.search).get("lang")
  );

  if (urlLanguage) {
    localStorage.setItem("lang", urlLanguage);
    return urlLanguage;
  }

  return normalizeLanguage(localStorage.getItem("lang")) ?? "en";
}

const savedLang = readInitialLanguage();

const enAutomation = {
  dialog: {
    title: "Railway model automation",
    badge: "React Flow MVP",
    description: "Node-RED style graphical logic editor for railway model automation.",
  },
  groups: {
    input: "Input",
    logic: "Logic",
    railway: "Railway",
    output: "Output",
  },
  nodes: {
    blockOccupied: {
      title: "Block occupied",
      description: "Occupancy detector or block state.",
    },
    sensor: {
      title: "Sensor",
      description: "DCC-EX, S88, Arduino or other physical sensor input.",
    },
    turnout: {
      title: "Turnout state",
      description: "Logical turnout state input. The physical closed bit is converted by turnoutClosedValue.",
    },
    button: {
      title: "Manual command",
      description: "UI button or external manual switch.",
    },
    and: {
      title: "AND",
      description: "True when every valid input is true.",
    },
    or: {
      title: "OR",
      description: "True when at least one valid input is true.",
    },
    not: {
      title: "NOT",
      description: "Inverts the first valid input.",
    },
    ifThenElse: {
      title: "IF / THEN / ELSE",
      description: "One condition input with THEN and ELSE outputs.",
    },
    timer: {
      title: "Timer",
      description: "PLC-like delay prepared for later runtime execution.",
    },
    latch: {
      title: "Latch",
      description: "Holding logic with a later reset input.",
    },
    routeLock: {
      title: "Route lock",
      description: "Logical route locking for turnouts, blocks and signals.",
    },
    signal: {
      title: "Signal command",
      description: "Controls a signal aspect from the layout address and aspect bit pattern.",
    },
    turnoutCommand: {
      title: "Turnout command",
      description: "Logical turnout command output. turnoutClosedValue converts to the physical closed bit.",
    },
    output: {
      title: "Output",
      description: "Generic runtime output command.",
    },
  },
  badge: {
    true: "TRUE",
    false: "FALSE",
    noData: "NO DATA",
    on: "ON",
  },
  panel: {
    nodePalette: "Node palette",
    automationPage: "Automation page",
    pageName: "Page name",
    addPage: "New page",
    deletePage: "Delete",
    properties: "Properties",
    saveToServer: "Save to server",
    loadFromServer: "Load from server",
    resetSample: "Reset sample",
    selectNodeHint: "Select a node and edit its properties here.",
    label: "Label",
    ioKey: "I/O key",
    ioKeyDescription: "Later this will bind the block, sensor, turnout state, signal or runtime command.",
    comment: "Note",
    jsonPreview: "JSON preview",
    simulatedActiveOutputs: "Simulated active outputs on this page",
    noActiveOutput: "No active output.",
    edges: "{{count}} edge",
    edges_plural: "{{count}} edges",
  },
  fields: {
    sensorAddress: "Sensor address",
    sensorAddressDescription: "Physical sensor address. The runtime will bind this to the real state.",
    turnoutAddress: "Turnout address",
    turnoutAddressDescription: "Physical turnout address. For example T1.",
    turnoutCommandAddressDescription: "Controls this physical turnout. For example T2.",
    turnoutExpectedClosed: "Logical closed state is the true condition",
    turnoutExpectedClosedDescription: "If disabled, the node is true when the turnout is in the logical thrown/diverging position.",
    turnoutCommandClosed: "Set to logical closed state",
    turnoutCommandClosedDescription: "If disabled, it sends the turnout to the logical thrown/diverging position.",
    physicalClosedMeansLogicalClosed: "Physical closed=true means logical closed",
    physicalClosedMeansLogicalClosedDescription: "For left/right turnouts this is loaded from the layout mapping. If needed, it can be inverted here.",
    physicalClosedMeansLogicalClosedCommandDescription: "This is also loaded from the layout mapping and is used to calculate the physical bit to send.",
    signalAddress: "Signal address",
    signalAddressDescription: "Address field of the tracksignal2 layout element. addressLength and bit pattern are loaded from this.",
    signalAspect: "Signal aspect",
    signalAspectDescription: "Choose from a list to avoid typos.",
    currentBitPattern: "Current bit pattern: {{bits}}, address length: {{length}}. These are loaded from the layout signal element.",
    ifThenElseInfo: "There is one IF input. If the input is valid and true, the THEN output is active; if it is valid and false, the ELSE output is active. With an invalid or unconnected IF input, neither output is active.",
    simulatedInputActive: "Simulated input active",
    delayMs: "Delay ms",
    outputCommand: "Output command",
  },
  graph: {
    sensorAddress: "address: {{address}}",
    turnoutState: "T{{address}}: {{state}} · closed = {{closedValue}}",
    signalMain: "S{{address}}: {{aspect}}",
    signalBits: "length: {{length}} · bit: {{bits}}",
    turnoutCommand: "command: T{{address}} {{state}} · closed = {{closedValue}}",
    outputCommand: "command: {{command}}",
    physicalTrue: "physical true",
    physicalFalse: "physical false",
    closed: "closed",
    thrown: "thrown",
    ifInput: "IF input: condition",
    thenOutput: "THEN output: when true",
    elseOutput: "ELSE output: when false",
  },
  aspects: {
    red: "Red",
    yellow: "Yellow",
    green: "Green",
    white: "White",
  },
  status: {
    pageCreated: "New automation page created: {{name}}.",
    lastPageCannotDelete: "The last automation page cannot be deleted.",
    pageDeleted: "Automation page deleted: {{name}}.",
    resetSample: "Sample automation restored. Press the floppy icon to save.",
    saving: "Saving automation to the server...",
    saveError: "Save error: {{message}}",
    saved: "Automation saved: {{nodes}} nodes, {{edges}} edges, {{pages}} pages.",
    loading: "Loading automation from the server...",
    loadError: "Load error: {{message}}",
    loaded: "Automation loaded: {{nodes}} nodes, {{edges}} edges, {{pages}} pages, {{turnouts}} turnout mappings, {{signals}} signal mappings.",
    changedByOtherClient: "Automation updated from another client save.",
    turnoutCommandMissingAddress: "Turnout command error: {{label}} has no address.",
    turnoutCommandSent: "Turnout command sent: {{label}}. Physical closed={{physicalClosed}}.",
    turnoutCommandFailed: "Failed to send turnout command: {{label}}.",
    signalCommandMissingAddress: "Signal command error: {{label}} has no address.",
    signalCommandSent: "Signal command sent: S{{address}} {{aspect}}. Bit pattern={{bits}}.",
    signalCommandFailed: "Failed to send signal command: S{{address}} {{aspect}}.",
  },
};

const huAutomation = {
  dialog: {
    title: "Vasútmodell automatizálás",
    badge: "React Flow MVP",
    description: "Node-RED jellegű grafikus logikai szerkesztő vasútmodell automatizáláshoz.",
  },
  groups: {
    input: "Bemenet",
    logic: "Logika",
    railway: "Vasút",
    output: "Kimenet",
  },
  nodes: {
    blockOccupied: {
      title: "Szakasz foglalt",
      description: "Foglaltságérzékelő vagy blokkállapot.",
    },
    sensor: {
      title: "Szenzor",
      description: "DCC-EX, S88, Arduino vagy egyéb fizikai szenzor bemenet.",
    },
    turnout: {
      title: "Váltó állapot",
      description: "Logikai váltóállás bemenet. A fizikai closed bitet a turnoutClosedValue fordítja logikai állásra.",
    },
    button: {
      title: "Kézi parancs",
      description: "UI gomb vagy külső kézi kapcsoló.",
    },
    and: {
      title: "AND",
      description: "Akkor igaz, ha minden érvényes bemenete igaz.",
    },
    or: {
      title: "OR",
      description: "Akkor igaz, ha legalább egy érvényes bemenete igaz.",
    },
    not: {
      title: "NOT",
      description: "Invertálja az első érvényes bemenetet.",
    },
    ifThenElse: {
      title: "IF / THEN / ELSE",
      description: "Egy feltétel bemenet, THEN és ELSE kimenettel.",
    },
    timer: {
      title: "Timer",
      description: "PLC-szerű késleltetés előkészítve.",
    },
    latch: {
      title: "Latch",
      description: "Öntartó logika későbbi reset bemenettel.",
    },
    routeLock: {
      title: "Útvonal zár",
      description: "Váltók, szakaszok és jelzők logikai útvonal-zárolása.",
    },
    signal: {
      title: "Jelző parancs",
      description: "Jelzőkép vezérlése layoutból betöltött cím és aspect bitminta alapján.",
    },
    turnoutCommand: {
      title: "Váltó parancs",
      description: "Logikai váltóállító kimenet. A parancs küldésnél turnoutClosedValue fordít fizikai closed bitre.",
    },
    output: {
      title: "Kimenet",
      description: "Általános runtime kimeneti parancs.",
    },
  },
  badge: {
    true: "TRUE",
    false: "FALSE",
    noData: "NO DATA",
    on: "ON",
  },
  panel: {
    nodePalette: "Node paletta",
    automationPage: "Automatika lap",
    pageName: "Lap neve",
    addPage: "Új lap",
    deletePage: "Törlés",
    properties: "Tulajdonságok",
    saveToServer: "Mentés szerverre",
    loadFromServer: "Betöltés szerverről",
    resetSample: "Minta visszaállítása",
    selectNodeHint: "Jelölj ki egy node-ot, és itt szerkesztheted a tulajdonságait.",
    label: "Felirat",
    ioKey: "I/O kulcs",
    ioKeyDescription: "Később ehhez kötjük a blokkot, szenzort, váltóállapotot, jelzőt vagy runtime parancsot.",
    comment: "Megjegyzés",
    jsonPreview: "JSON előnézet",
    simulatedActiveOutputs: "Szimulált aktív kimenetek ezen a lapon",
    noActiveOutput: "Nincs aktív kimenet.",
    edges: "{{count}} él",
  },
  fields: {
    sensorAddress: "Szenzor cím",
    sensorAddressDescription: "A fizikai szenzor címe. A runtime ezt fogja majd a valós állapothoz kötni.",
    turnoutAddress: "Váltó cím",
    turnoutAddressDescription: "A fizikai váltó címe. Például T1.",
    turnoutCommandAddressDescription: "Ezt a fizikai váltót állítja. Például T2.",
    turnoutExpectedClosed: "Logikai closed állás legyen az igaz feltétel",
    turnoutExpectedClosedDescription: "Ha kikapcsolod, akkor a node akkor lesz igaz, ha a váltó logikai thrown/kitérő állásban van.",
    turnoutCommandClosed: "Logikai closed állásba állítsa",
    turnoutCommandClosedDescription: "Ha kikapcsolod, akkor logikai thrown/kitérő állásba küld parancsot.",
    physicalClosedMeansLogicalClosed: "Fizikai closed=true jelenti a logikai closed állást",
    physicalClosedMeansLogicalClosedDescription: "Balos/jobbos váltóknál ezt a pályarajz mappingje alapján betöltjük. Ha kézzel kell, itt fordítható.",
    physicalClosedMeansLogicalClosedCommandDescription: "Ezt is a pályarajz mappingje alapján betöltjük, és ebből számoljuk a küldendő fizikai bitet.",
    signalAddress: "Jelző cím",
    signalAddressDescription: "A tracksignal2 layout elem address mezője. Betöltéskor ebből jön az addressLength és a bitminta.",
    signalAspect: "Jelzőkép",
    signalAspectDescription: "Legördülőből választjuk, hogy ne legyen elgépelés.",
    currentBitPattern: "Aktuális bitminta: {{bits}}, címhossz: {{length}}. Ezeket a pályarajz jelző eleméből töltjük.",
    ifThenElseInfo: "Egy IF bemenet van. Ha a bemenet érvényes és igaz, a THEN kimenet aktív; ha érvényes és hamis, az ELSE kimenet aktív. Érvénytelen vagy bekötetlen IF bemenetnél egyik kimenet sem aktív.",
    simulatedInputActive: "Szimulált bemenet aktív",
    delayMs: "Késleltetés ms",
    outputCommand: "Kimeneti parancs",
  },
  graph: {
    sensorAddress: "cím: {{address}}",
    turnoutState: "T{{address}}: {{state}} · closed = {{closedValue}}",
    signalMain: "S{{address}}: {{aspect}}",
    signalBits: "hossz: {{length}} · bit: {{bits}}",
    turnoutCommand: "állítás: T{{address}} {{state}} · closed = {{closedValue}}",
    outputCommand: "parancs: {{command}}",
    physicalTrue: "physical true",
    physicalFalse: "physical false",
    closed: "closed",
    thrown: "thrown",
    ifInput: "IF bemenet: feltétel",
    thenOutput: "THEN kimenet: ha igaz",
    elseOutput: "ELSE kimenet: ha hamis",
  },
  aspects: {
    red: "Vörös",
    yellow: "Sárga",
    green: "Zöld",
    white: "Fehér",
  },
  status: {
    pageCreated: "Új automatika lap létrehozva: {{name}}.",
    lastPageCannotDelete: "Az utolsó automatika lap nem törölhető.",
    pageDeleted: "Automatika lap törölve: {{name}}.",
    resetSample: "Minta automatika visszaállítva. Mentéshez nyomd meg a floppy ikont.",
    saving: "Automatika mentése a szerverre...",
    saveError: "Mentési hiba: {{message}}",
    saved: "Automatika mentve: {{nodes}} node, {{edges}} él, {{pages}} lap.",
    loading: "Automatika betöltése a szerverről...",
    loadError: "Betöltési hiba: {{message}}",
    loaded: "Automatika betöltve: {{nodes}} node, {{edges}} él, {{pages}} lap, {{turnouts}} váltó mapping, {{signals}} jelző mapping.",
    changedByOtherClient: "Automatika frissítve egy másik kliens mentése alapján.",
    turnoutCommandMissingAddress: "Váltó parancs hiba: {{label}} cím nélkül.",
    turnoutCommandSent: "Váltó parancs elküldve: {{label}}. Fizikai closed={{physicalClosed}}.",
    turnoutCommandFailed: "Váltó parancs küldése sikertelen: {{label}}.",
    signalCommandMissingAddress: "Jelző parancs hiba: {{label}} cím nélkül.",
    signalCommandSent: "Jelző parancs elküldve: S{{address}} {{aspect}}. Bitminta={{bits}}.",
    signalCommandFailed: "Jelző parancs küldése sikertelen: S{{address}} {{aspect}}.",
  },
};

const deAutomation = {
  dialog: {
    title: "Modellbahn-Automatisierung",
    badge: "React Flow MVP",
    description: "Grafischer Logikeditor im Node-RED-Stil für Modellbahn-Automatisierung.",
  },
  groups: {
    input: "Eingang",
    logic: "Logik",
    railway: "Bahn",
    output: "Ausgang",
  },
  nodes: {
    blockOccupied: {
      title: "Block belegt",
      description: "Belegtmeldung oder Blockzustand.",
    },
    sensor: {
      title: "Sensor",
      description: "DCC-EX-, S88-, Arduino- oder anderer physischer Sensoreingang.",
    },
    turnout: {
      title: "Weichenzustand",
      description: "Logischer Weichenzustand. Das physische closed-Bit wird durch turnoutClosedValue in den logischen Zustand übersetzt.",
    },
    button: {
      title: "Manueller Befehl",
      description: "UI-Taster oder externer manueller Schalter.",
    },
    and: {
      title: "AND",
      description: "Wahr, wenn alle gültigen Eingänge wahr sind.",
    },
    or: {
      title: "OR",
      description: "Wahr, wenn mindestens ein gültiger Eingang wahr ist.",
    },
    not: {
      title: "NOT",
      description: "Invertiert den ersten gültigen Eingang.",
    },
    ifThenElse: {
      title: "IF / THEN / ELSE",
      description: "Ein Bedingungseingang mit THEN- und ELSE-Ausgang.",
    },
    timer: {
      title: "Timer",
      description: "PLC-artige Verzögerung für spätere Runtime-Ausführung vorbereitet.",
    },
    latch: {
      title: "Latch",
      description: "Selbsthaltelogik mit späterem Reset-Eingang.",
    },
    routeLock: {
      title: "Fahrstraßensperre",
      description: "Logische Fahrstraßensperre für Weichen, Blöcke und Signale.",
    },
    signal: {
      title: "Signalbefehl",
      description: "Steuert ein Signalbild anhand der Layout-Adresse und des Aspect-Bitmusters.",
    },
    turnoutCommand: {
      title: "Weichenbefehl",
      description: "Logischer Weichenstellbefehl. turnoutClosedValue übersetzt zum physischen closed-Bit.",
    },
    output: {
      title: "Ausgang",
      description: "Allgemeiner Runtime-Ausgabebefehl.",
    },
  },
  badge: {
    true: "TRUE",
    false: "FALSE",
    noData: "NO DATA",
    on: "ON",
  },
  panel: {
    nodePalette: "Node-Palette",
    automationPage: "Automatikseite",
    pageName: "Seitenname",
    addPage: "Neue Seite",
    deletePage: "Löschen",
    properties: "Eigenschaften",
    saveToServer: "Auf Server speichern",
    loadFromServer: "Vom Server laden",
    resetSample: "Beispiel zurücksetzen",
    selectNodeHint: "Wähle einen Node aus, um hier seine Eigenschaften zu bearbeiten.",
    label: "Beschriftung",
    ioKey: "I/O-Schlüssel",
    ioKeyDescription: "Später wird damit Block, Sensor, Weichenzustand, Signal oder Runtime-Befehl verbunden.",
    comment: "Notiz",
    jsonPreview: "JSON-Vorschau",
    simulatedActiveOutputs: "Simulierte aktive Ausgänge auf dieser Seite",
    noActiveOutput: "Kein aktiver Ausgang.",
    edges: "{{count}} Kante",
    edges_plural: "{{count}} Kanten",
  },
  fields: {
    sensorAddress: "Sensoradresse",
    sensorAddressDescription: "Physische Sensoradresse. Die Runtime verbindet sie später mit dem echten Zustand.",
    turnoutAddress: "Weichenadresse",
    turnoutAddressDescription: "Physische Weichenadresse. Zum Beispiel T1.",
    turnoutCommandAddressDescription: "Diese physische Weiche wird gestellt. Zum Beispiel T2.",
    turnoutExpectedClosed: "Logische closed-Stellung ist die wahre Bedingung",
    turnoutExpectedClosedDescription: "Wenn deaktiviert, ist der Node wahr, wenn die Weiche logisch thrown/abzweigend steht.",
    turnoutCommandClosed: "In logische closed-Stellung stellen",
    turnoutCommandClosedDescription: "Wenn deaktiviert, wird die Weiche logisch thrown/abzweigend gestellt.",
    physicalClosedMeansLogicalClosed: "Physisch closed=true bedeutet logisch closed",
    physicalClosedMeansLogicalClosedDescription: "Bei linken/rechten Weichen wird dies aus dem Layout-Mapping geladen. Bei Bedarf kann es hier invertiert werden.",
    physicalClosedMeansLogicalClosedCommandDescription: "Dies wird ebenfalls aus dem Layout-Mapping geladen und zur Berechnung des zu sendenden physischen Bits verwendet.",
    signalAddress: "Signaladresse",
    signalAddressDescription: "Address-Feld des tracksignal2-Layout-Elements. Daraus werden addressLength und Bitmuster geladen.",
    signalAspect: "Signalbild",
    signalAspectDescription: "Aus der Liste auswählen, damit keine Tippfehler entstehen.",
    currentBitPattern: "Aktuelles Bitmuster: {{bits}}, Adresslänge: {{length}}. Diese Werte werden aus dem Layout-Signalelement geladen.",
    ifThenElseInfo: "Es gibt einen IF-Eingang. Ist der Eingang gültig und wahr, ist der THEN-Ausgang aktiv; ist er gültig und falsch, ist der ELSE-Ausgang aktiv. Bei ungültigem oder nicht verbundenem IF-Eingang ist kein Ausgang aktiv.",
    simulatedInputActive: "Simulierter Eingang aktiv",
    delayMs: "Verzögerung ms",
    outputCommand: "Ausgabebefehl",
  },
  graph: {
    sensorAddress: "Adresse: {{address}}",
    turnoutState: "T{{address}}: {{state}} · closed = {{closedValue}}",
    signalMain: "S{{address}}: {{aspect}}",
    signalBits: "Länge: {{length}} · Bit: {{bits}}",
    turnoutCommand: "Befehl: T{{address}} {{state}} · closed = {{closedValue}}",
    outputCommand: "Befehl: {{command}}",
    physicalTrue: "physical true",
    physicalFalse: "physical false",
    closed: "closed",
    thrown: "thrown",
    ifInput: "IF-Eingang: Bedingung",
    thenOutput: "THEN-Ausgang: wenn wahr",
    elseOutput: "ELSE-Ausgang: wenn falsch",
  },
  aspects: {
    red: "Rot",
    yellow: "Gelb",
    green: "Grün",
    white: "Weiß",
  },
  status: {
    pageCreated: "Neue Automatikseite erstellt: {{name}}.",
    lastPageCannotDelete: "Die letzte Automatikseite kann nicht gelöscht werden.",
    pageDeleted: "Automatikseite gelöscht: {{name}}.",
    resetSample: "Beispiel-Automatik wiederhergestellt. Zum Speichern das Diskettensymbol drücken.",
    saving: "Automatik wird auf dem Server gespeichert...",
    saveError: "Speicherfehler: {{message}}",
    saved: "Automatik gespeichert: {{nodes}} Nodes, {{edges}} Kanten, {{pages}} Seiten.",
    loading: "Automatik wird vom Server geladen...",
    loadError: "Ladefehler: {{message}}",
    loaded: "Automatik geladen: {{nodes}} Nodes, {{edges}} Kanten, {{pages}} Seiten, {{turnouts}} Weichen-Mappings, {{signals}} Signal-Mappings.",
    changedByOtherClient: "Automatik wurde durch Speichern eines anderen Clients aktualisiert.",
    turnoutCommandMissingAddress: "Weichenbefehl-Fehler: {{label}} ohne Adresse.",
    turnoutCommandSent: "Weichenbefehl gesendet: {{label}}. Physisch closed={{physicalClosed}}.",
    turnoutCommandFailed: "Weichenbefehl konnte nicht gesendet werden: {{label}}.",
    signalCommandMissingAddress: "Signalbefehl-Fehler: {{label}} ohne Adresse.",
    signalCommandSent: "Signalbefehl gesendet: S{{address}} {{aspect}}. Bitmuster={{bits}}.",
    signalCommandFailed: "Signalbefehl konnte nicht gesendet werden: S{{address}} {{aspect}}.",
  },
};

const enTranslation = {
  ...en,
  automation: enAutomation,
  home: {
    ...en.home,
    thanksDescription:
      "DCCExpress stands on the shoulders of excellent open-source tools, modern web technologies, and a good dose of AI-assisted brainstorming.",
  },
  locodialog: {
    ...en.locodialog,
    tabs: {
      general: "General",
      functions: "Functions",
      actions: "Actions",
    },
    train_type: "Train type",
    occupancy_detection_position: "Occupancy detection position",
    last_run_at: "Last run / stopped at",
    last_run_at_empty: "Not recorded yet",
    trainTypes: {
      passenger: "Passenger",
      freight: "Freight",
      mixed: "Mixed",
      maintenance: "Maintenance",
      other: "Other",
    },
    occupancyDetectionPositions: {
      forward: "Forward end",
      reverse: "Reverse end",
      both: "Both ends",
    },
  },
  blockActions: {
    menu: "Blocks",
    managerTitle: "Block actions",
    blocks: "Blocks",
    emptyBlocks: "No blocks found on the layout.",
    selectBlock: "Select a block from the list or add blocks to the layout first.",
    blockDetails: "ID: {{id}} | Address: {{address}} | Sensor: {{sensor}}",
    totalActions: "{{count}} actions",
  },
  settings: {
    ...en.settings,
    languages: {
      en: "English",
      hu: "Magyar",
      de: "Deutsch",
    },
  },
};

const huTranslation = {
  ...hu,
  automation: huAutomation,
  home: {
    ...hu.home,
    thanksDescription:
      "A DCCExpress kiváló nyílt forráskódú eszközökre, modern webes technológiákra és egy jó adag AI-segített ötletelésre épül.",
  },
  locodialog: {
    ...hu.locodialog,
    tabs: {
      general: "Általános",
      functions: "Funkciók",
      actions: "Műveletek",
    },
    train_type: "Vonat típusa",
    occupancy_detection_position: "Foglaltság érzékelése",
    last_run_at: "Utolsó futás / megállás ideje",
    last_run_at_empty: "Még nincs rögzítve",
    trainTypes: {
      passenger: "Személy",
      freight: "Teher",
      mixed: "Vegyes",
      maintenance: "Üzemi / karbantartó",
      other: "Egyéb",
    },
    occupancyDetectionPositions: {
      forward: "Elöl (forward)",
      reverse: "Hátul (reverse)",
      both: "Mindkét végén",
    },
  },
  blockActions: {
    menu: "Blocks",
    managerTitle: "Block actionök",
    blocks: "Blokkok",
    emptyBlocks: "Nincs blokk a layouton.",
    selectBlock: "Válassz egy blokkot a listából, vagy előbb tegyél blokkokat a layoutra.",
    blockDetails: "ID: {{id}} | Cím: {{address}} | Szenzor: {{sensor}}",
    totalActions: "{{count}} action",
  },
  settings: {
    ...hu.settings,
    languages: {
      en: "English",
      hu: "Magyar",
      de: "Deutsch",
    },
  },
};

const deTranslation = {
  ...de,
  automation: deAutomation,
  home: {
    ...de.home,
    thanksDescription:
      "DCCExpress baut auf hervorragenden Open-Source-Werkzeugen, modernen Webtechnologien und einer guten Portion KI-gestütztem Brainstorming auf.",
  },
  locodialog: {
    ...de.locodialog,
    tabs: {
      general: "Allgemein",
      functions: "Funktionen",
      actions: "Aktionen",
    },
    train_type: "Zugtyp",
    occupancy_detection_position: "Belegterkennung",
    last_run_at: "Letzte Fahrt / Halt um",
    last_run_at_empty: "Noch nicht erfasst",
    trainTypes: {
      passenger: "Personenzug",
      freight: "Güterzug",
      mixed: "Gemischt",
      maintenance: "Dienst-/Wartungszug",
      other: "Sonstiges",
    },
    occupancyDetectionPositions: {
      forward: "Vorne (forward)",
      reverse: "Hinten (reverse)",
      both: "An beiden Enden",
    },
  },
  blockActions: {
    menu: "Blöcke",
    managerTitle: "Blockaktionen",
    blocks: "Blöcke",
    emptyBlocks: "Keine Blöcke im Layout gefunden.",
    selectBlock: "Wähle einen Block aus der Liste aus oder füge zuerst Blöcke zum Layout hinzu.",
    blockDetails: "ID: {{id}} | Adresse: {{address}} | Sensor: {{sensor}}",
    totalActions: "{{count}} Aktionen",
  },
  settings: {
    ...de.settings,
    languages: {
      en: "English",
      hu: "Magyar",
      de: "Deutsch",
    },
  },
};

i18n.use(initReactI18next).init({
  resources: {
    hu: { translation: huTranslation },
    en: { translation: enTranslation },
    de: { translation: deTranslation },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

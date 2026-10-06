export const LANGUAGES = [
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export const NAVIGATION: Record<LangCode, { menu: string; special: string; services: string; contact: string; install: string; book: string }> = {
  it: { menu: "Menù", special: "Specialità", services: "Servizi", contact: "Contatti", install: "Installa il menù", book: "Prenota un tavolo" },
  en: { menu: "Menu", special: "Specials", services: "Services", contact: "Contact", install: "Install menu", book: "Book a table" },
  es: { menu: "Menú", special: "Especialidades", services: "Servicios", contact: "Contacto", install: "Instalar menú", book: "Reservar mesa" },
  fr: { menu: "Menu", special: "Spécialités", services: "Services", contact: "Contact", install: "Installer le menu", book: "Réserver une table" },
  de: { menu: "Menü", special: "Empfehlungen", services: "Services", contact: "Kontakt", install: "Menü installieren", book: "Tisch reservieren" },
  pt: { menu: "Menu", special: "Especialidades", services: "Serviços", contact: "Contactos", install: "Instalar menu", book: "Reservar mesa" },
  zh: { menu: "菜单", special: "招牌推荐", services: "服务", contact: "联系", install: "安装菜单", book: "预订餐桌" },
};

export const LANG_NAMES: Record<LangCode, string> = {
  it: "Italian",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  zh: "Simplified Chinese",
};

type UIStrings = {
  search: string;
  noResults: string;
  unavailable: string;
  allergens: string;
  searchResults: string;
  clearSearch: string;
};

type MenuLabelTranslations = {
  macros: Record<string, string>;
  categories: Record<string, { name: string; eyebrow: string | null }>;
  groups: Record<string, string>;
  tags: Record<string, string>;
};

export const UI: Record<LangCode, UIStrings> = {
  it: {
    search: "Cerca nel menù",
    noResults: "Nessun risultato",
    unavailable: "Non disponibile",
    allergens: "Allergeni",
    searchResults: "risultati trovati",
    clearSearch: "Cancella ricerca",
  },
  en: {
    search: "Search the menu",
    noResults: "No results",
    unavailable: "Unavailable",
    allergens: "Allergens",
    searchResults: "results found",
    clearSearch: "Clear search",
  },
  es: {
    search: "Buscar en el menú",
    noResults: "Sin resultados",
    unavailable: "No disponible",
    allergens: "Alérgenos",
    searchResults: "resultados encontrados",
    clearSearch: "Borrar búsqueda",
  },
  fr: {
    search: "Rechercher au menu",
    noResults: "Aucun résultat",
    unavailable: "Indisponible",
    allergens: "Allergènes",
    searchResults: "résultats trouvés",
    clearSearch: "Effacer la recherche",
  },
  de: {
    search: "Menü durchsuchen",
    noResults: "Keine Treffer",
    unavailable: "Nicht verfügbar",
    allergens: "Allergene",
    searchResults: "Ergebnisse gefunden",
    clearSearch: "Suche löschen",
  },
  pt: {
    search: "Pesquisar no menu",
    noResults: "Sem resultados",
    unavailable: "Indisponível",
    allergens: "Alérgenos",
    searchResults: "resultados encontrados",
    clearSearch: "Limpar pesquisa",
  },
  zh: {
    search: "搜索菜单",
    noResults: "没有结果",
    unavailable: "暂不供应",
    allergens: "过敏原",
    searchResults: "个结果",
    clearSearch: "清除搜索",
  },
};

export const MENU_LABELS: Record<LangCode, MenuLabelTranslations> = {
 it: {
 macros: { food: "Cibo", drinks: "Bevande" },
 categories: {
 stuzzicheria: { name: " Stuzzicheria", eyebrow: null },
 patate: { name: " Le patate", eyebrow: null },
 panini: { name: " I panini", eyebrow: null },
 brace: { name: " La brace", eyebrow: null },
 insalate: { name: " Le insalate", eyebrow: null },
 contorni: { name: " I contorni", eyebrow: null },
 dolci: { name: " Dolci", eyebrow: null },
 birre_spina: { name: " Birre alla spina", eyebrow: null },
 birre_bottiglia: { name: " Birre in bottiglia", eyebrow: null },
 bibite: { name: " Bibite analcoliche", eyebrow: null },
 vini_rossi: { name: " Vini rossi", eyebrow: null },
 vini_bianchi: { name: " Vini bianchi", eyebrow: null },
 altre_bevande: { name: " Altre bevande", eyebrow: null },
 },
 groups: {},
 tags: {},
 },
 en: {
 macros: { food: "Food", drinks: "Drinks" },
 categories: {
 stuzzicheria: { name: " Snacks", eyebrow: null },
 patate: { name: " Potatoes", eyebrow: null },
 panini: { name: " Burgers", eyebrow: null },
 brace: { name: " Grill", eyebrow: null },
 insalate: { name: " Salads", eyebrow: null },
 contorni: { name: " Sides", eyebrow: null },
 dolci: { name: " Desserts", eyebrow: null },
 birre_spina: { name: " Draft beer", eyebrow: null },
 birre_bottiglia: { name: " Bottled beer", eyebrow: null },
 bibite: { name: " Soft drinks", eyebrow: null },
 vini_rossi: { name: " Red wines", eyebrow: null },
 vini_bianchi: { name: " White wines", eyebrow: null },
 altre_bevande: { name: " Other drinks", eyebrow: null },
 },
 groups: {},
 tags: {
 Glutine: "Gluten",
 Lattosio: "Lactose",
 Pesce: "Fish",
 "Frutta a guscio": "Tree nuts",
 Vegetariano: "Vegetarian",
 },
 },
 es: {
 macros: { food: "Comida", drinks: "Bebidas" },
 categories: {
 stuzzicheria: { name: " Aperitivos", eyebrow: null },
 patate: { name: " Patatas", eyebrow: null },
 panini: { name: " Hamburguesas", eyebrow: null },
 brace: { name: " Parrilla", eyebrow: null },
 insalate: { name: " Ensaladas", eyebrow: null },
 contorni: { name: " Guarniciones", eyebrow: null },
 dolci: { name: " Postres", eyebrow: null },
 birre_spina: { name: " Cerveza de barril", eyebrow: null },
 birre_bottiglia: { name: " Cerveza en botella", eyebrow: null },
 bibite: { name: " Refrescos", eyebrow: null },
 vini_rossi: { name: " Vinos tintos", eyebrow: null },
 vini_bianchi: { name: " Vinos blancos", eyebrow: null },
 altre_bevande: { name: " Otras bebidas", eyebrow: null },
 },
 groups: {},
 tags: {
 Glutine: "Gluten",
 Lattosio: "Lactosa",
 Pesce: "Pescado",
 "Frutta a guscio": "Frutos secos",
 Vegetariano: "Vegetariano",
 },
 },
 fr: {
 macros: { food: "Cuisine", drinks: "Boissons" },
 categories: {
 stuzzicheria: { name: " À grignoter", eyebrow: null },
 patate: { name: " Pommes de terre", eyebrow: null },
 panini: { name: " Burgers", eyebrow: null },
 brace: { name: " Grillades", eyebrow: null },
 insalate: { name: " Salades", eyebrow: null },
 contorni: { name: " Accompagnements", eyebrow: null },
 dolci: { name: " Desserts", eyebrow: null },
 birre_spina: { name: " Bières pression", eyebrow: null },
 birre_bottiglia: { name: " Bières en bouteille", eyebrow: null },
 bibite: { name: " Boissons sans alcool", eyebrow: null },
 vini_rossi: { name: " Vins rouges", eyebrow: null },
 vini_bianchi: { name: " Vins blancs", eyebrow: null },
 altre_bevande: { name: " Autres boissons", eyebrow: null },
 },
 groups: {},
 tags: {
 Glutine: "Gluten",
 Lattosio: "Lactose",
 Pesce: "Poisson",
 "Frutta a guscio": "Fruits à coque",
 Vegetariano: "Végétarien",
 },
 },
 de: {
 macros: { food: "Speisen", drinks: "Getränke" },
 categories: {
 stuzzicheria: { name: " Snacks", eyebrow: null },
 patate: { name: " Kartoffeln", eyebrow: null },
 panini: { name: " Burger", eyebrow: null },
 brace: { name: " Vom Grill", eyebrow: null },
 insalate: { name: " Salate", eyebrow: null },
 contorni: { name: " Beilagen", eyebrow: null },
 dolci: { name: " Desserts", eyebrow: null },
 birre_spina: { name: " Fassbier", eyebrow: null },
 birre_bottiglia: { name: " Flaschenbier", eyebrow: null },
 bibite: { name: " Alkoholfreie Getränke", eyebrow: null },
 vini_rossi: { name: " Rotweine", eyebrow: null },
 vini_bianchi: { name: " Weißweine", eyebrow: null },
 altre_bevande: { name: " Weitere Getränke", eyebrow: null },
 },
 groups: {},
 tags: {
 Glutine: "Gluten",
 Lattosio: "Laktose",
 Pesce: "Fisch",
 "Frutta a guscio": "Schalenfrüchte",
 Vegetariano: "Vegetarisch",
 },
 },
 pt: {
 macros: { food: "Comida", drinks: "Bebidas" },
 categories: {
 stuzzicheria: { name: " Petiscos", eyebrow: null },
 patate: { name: " Batatas", eyebrow: null },
 panini: { name: " Hambúrgueres", eyebrow: null },
 brace: { name: " Grelhados", eyebrow: null },
 insalate: { name: " Saladas", eyebrow: null },
 contorni: { name: " Acompanhamentos", eyebrow: null },
 dolci: { name: " Sobremesas", eyebrow: null },
 birre_spina: { name: " Cerveja de pressão", eyebrow: null },
 birre_bottiglia: { name: " Cerveja em garrafa", eyebrow: null },
 bibite: { name: " Bebidas sem álcool", eyebrow: null },
 vini_rossi: { name: " Vinhos tintos", eyebrow: null },
 vini_bianchi: { name: " Vinhos brancos", eyebrow: null },
 altre_bevande: { name: " Outras bebidas", eyebrow: null },
 },
 groups: {},
 tags: {
 Glutine: "Glúten",
 Lattosio: "Lactose",
 Pesce: "Peixe",
 "Frutta a guscio": "Frutos secos",
 Vegetariano: "Vegetariano",
 },
 },
 zh: {
 macros: { food: "餐点", drinks: "饮品" },
 categories: {
 stuzzicheria: { name: " 小吃", eyebrow: null },
 patate: { name: " 薯类", eyebrow: null },
 panini: { name: " 汉堡", eyebrow: null },
 brace: { name: " 烧烤", eyebrow: null },
 insalate: { name: " 沙拉", eyebrow: null },
 contorni: { name: " 配菜", eyebrow: null },
 dolci: { name: " 甜点", eyebrow: null },
 birre_spina: { name: " 生啤", eyebrow: null },
 birre_bottiglia: { name: " 瓶装啤酒", eyebrow: null },
 bibite: { name: " 无酒精饮料", eyebrow: null },
 vini_rossi: { name: " 红葡萄酒", eyebrow: null },
 vini_bianchi: { name: " 白葡萄酒", eyebrow: null },
 altre_bevande: { name: " 其他饮品", eyebrow: null },
 },
 groups: {},
 tags: {
 Glutine: "麸质",
 Lattosio: "乳糖",
 Pesce: "鱼类",
 "Frutta a guscio": "坚果",
 Vegetariano: "素食",
 },
 },
};

export const VENUE = {
 address: "Calata Trinità Maggiore 51, Napoli",
 phone: "081-18273748",
 phoneHref: "tel:+3908118273748",
 mapsUrl: "https://www.google.com/maps/search/?api=1&query=Calata+Trinit%C3%A0+Maggiore+51+Napoli",
 reviewUrl: "https://share.google/zfypnSXd01WtotAVc",
 instagramUrl: "https://www.instagram.com/lubranopubnapoli/",
 whatsappUrl: "https://wa.me/3908118273748",
 wifiPassword: null as string | null,
};

export const SERVICES: Record<
 LangCode,
 {
 title: string;
 review: string;
 instagram: string;
 whatsapp: string;
 wifi: string;
 wifiAsk: string;
 copied: string;
 allergenTitle: string;
 allergenBody: string;
 special: string;
 }
> = {
 it: {
 title: "Lubrano con te",
 review: "Lascia una recensione",
 instagram: "Seguici su Instagram",
 whatsapp: "Scrivici su WhatsApp",
 wifi: "Wi-Fi",
 wifiAsk: "Password disponibile al banco",
 copied: "Password copiata",
 allergenTitle: "Allergie o intolleranze?",
 allergenBody:
 "Prima di ordinare, informa il nostro staff: siamo a disposizione per indicarti ingredienti e allergeni.",
 special: "In evidenza",
 },
 en: {
 title: "Stay with Lubrano",
 review: "Leave a review",
 instagram: "Follow us on Instagram",
 whatsapp: "Message us on WhatsApp",
 wifi: "Wi-Fi",
 wifiAsk: "Password available at the counter",
 copied: "Password copied",
 allergenTitle: "Allergies or intolerances?",
 allergenBody:
 "Please tell our staff before ordering. We can help you check ingredients and allergens.",
 special: "Featured",
 },
 es: {
 title: "Conecta con Lubrano",
 review: "Deja una reseña",
 instagram: "Síguenos en Instagram",
 whatsapp: "Escríbenos por WhatsApp",
 wifi: "Wi-Fi",
 wifiAsk: "Contraseña disponible en la barra",
 copied: "Contraseña copiada",
 allergenTitle: "¿Alergias o intolerancias?",
 allergenBody:
 "Informa a nuestro personal antes de pedir. Te ayudaremos con ingredientes y alérgenos.",
 special: "Destacado",
 },
 fr: {
 title: "Restez avec Lubrano",
 review: "Laisser un avis",
 instagram: "Suivez-nous sur Instagram",
 whatsapp: "Écrivez-nous sur WhatsApp",
 wifi: "Wi-Fi",
 wifiAsk: "Mot de passe disponible au comptoir",
 copied: "Mot de passe copié",
 allergenTitle: "Allergies ou intolérances ?",
 allergenBody:
 "Prévenez notre équipe avant de commander. Nous vous renseignerons sur les ingrédients et allergènes.",
 special: "À la une",
 },
 de: {
 title: "Lubrano erleben",
 review: "Bewertung abgeben",
 instagram: "Folgen Sie uns auf Instagram",
 whatsapp: "WhatsApp-Nachricht",
 wifi: "WLAN",
 wifiAsk: "Passwort an der Theke erhältlich",
 copied: "Passwort kopiert",
 allergenTitle: "Allergien oder Unverträglichkeiten?",
 allergenBody:
 "Bitte informieren Sie unser Team vor der Bestellung. Wir helfen bei Zutaten und Allergenen.",
 special: "Empfehlung",
 },
 pt: {
 title: "Fique com o Lubrano",
 review: "Deixe uma avaliação",
 instagram: "Siga-nos no Instagram",
 whatsapp: "Fale connosco no WhatsApp",
 wifi: "Wi-Fi",
 wifiAsk: "Senha disponível no balcão",
 copied: "Senha copiada",
 allergenTitle: "Alergias ou intolerâncias?",
 allergenBody: "Avise a nossa equipa antes de pedir. Ajudamos com ingredientes e alergénios.",
 special: "Em destaque",
 },
 zh: {
 title: "关注 Lubrano",
 review: "留下评价",
 instagram: "关注 Instagram",
 whatsapp: "WhatsApp 联系我们",
 wifi: "无线网络",
 wifiAsk: "请向吧台索取密码",
 copied: "密码已复制",
 allergenTitle: "有过敏或不耐受吗？",
 allergenBody: "点餐前请告知工作人员，我们可以协助确认食材和过敏原。",
 special: "本月推荐",
 },
};

type InfoStrings = {
 title: string;
 eyebrow: string;
 hours: string;
 monday: string;
 closed: string;
 openDays: string;
 openHours: string;
 directions: string;
 call: string;
 days: Array<{ day: string; hours: string; closed?: boolean }>;
};

export const INFO: Record<LangCode, InfoStrings> = {
 it: {
 title: "Dove siamo",
 eyebrow: "Nel cuore di Napoli",
 hours: "Orari",
 monday: "Lunedì",
 closed: "Chiuso",
 openDays: "Mar – Dom",
 openHours: "19:00 – 01:30",
 directions: "Come arrivare",
 call: "Chiama",
 days: [
 { day: "Lunedì", hours: "Chiuso", closed: true },
 { day: "Martedì", hours: "19:00 – 01:30" },
 { day: "Mercoledì", hours: "19:00 – 01:30" },
 { day: "Giovedì", hours: "19:00 – 01:30" },
 { day: "Venerdì", hours: "19:00 – 01:30" },
 { day: "Sabato", hours: "19:00 – 01:30" },
 { day: "Domenica", hours: "19:00 – 01:30" },
 ],
 },
 en: {
 title: "Find us",
 eyebrow: "In the heart of Naples",
 hours: "Opening hours",
 monday: "Monday",
 closed: "Closed",
 openDays: "Tue – Sun",
 openHours: "7:00 pm – 1:30 am",
 directions: "Directions",
 call: "Call",
 days: [
 { day: "Monday", hours: "Closed", closed: true },
 { day: "Tuesday", hours: "7:00 pm – 1:30 am" },
 { day: "Wednesday", hours: "7:00 pm – 1:30 am" },
 { day: "Thursday", hours: "7:00 pm – 1:30 am" },
 { day: "Friday", hours: "7:00 pm – 1:30 am" },
 { day: "Saturday", hours: "7:00 pm – 1:30 am" },
 { day: "Sunday", hours: "7:00 pm – 1:30 am" },
 ],
 },
 es: {
 title: "Dónde estamos",
 eyebrow: "En el corazón de Nápoles",
 hours: "Horario",
 monday: "Lunes",
 closed: "Cerrado",
 openDays: "Mar – Dom",
 openHours: "19:00 – 01:30",
 directions: "Cómo llegar",
 call: "Llamar",
 days: [
 { day: "Lunes", hours: "Cerrado", closed: true },
 { day: "Martes", hours: "19:00 – 01:30" },
 { day: "Miércoles", hours: "19:00 – 01:30" },
 { day: "Jueves", hours: "19:00 – 01:30" },
 { day: "Viernes", hours: "19:00 – 01:30" },
 { day: "Sábado", hours: "19:00 – 01:30" },
 { day: "Domingo", hours: "19:00 – 01:30" },
 ],
 },
 fr: {
 title: "Nous trouver",
 eyebrow: "Au cœur de Naples",
 hours: "Horaires",
 monday: "Lundi",
 closed: "Fermé",
 openDays: "Mar – Dim",
 openHours: "19h00 – 01h30",
 directions: "Itinéraire",
 call: "Appeler",
 days: [
 { day: "Lundi", hours: "Fermé", closed: true },
 { day: "Mardi", hours: "19h00 – 01h30" },
 { day: "Mercredi", hours: "19h00 – 01h30" },
 { day: "Jeudi", hours: "19h00 – 01h30" },
 { day: "Vendredi", hours: "19h00 – 01h30" },
 { day: "Samedi", hours: "19h00 – 01h30" },
 { day: "Dimanche", hours: "19h00 – 01h30" },
 ],
 },
 de: {
 title: "So finden Sie uns",
 eyebrow: "Im Herzen von Neapel",
 hours: "Öffnungszeiten",
 monday: "Montag",
 closed: "Geschlossen",
 openDays: "Di – So",
 openHours: "19:00 – 01:30",
 directions: "Route",
 call: "Anrufen",
 days: [
 { day: "Montag", hours: "Geschlossen", closed: true },
 { day: "Dienstag", hours: "19:00 – 01:30" },
 { day: "Mittwoch", hours: "19:00 – 01:30" },
 { day: "Donnerstag", hours: "19:00 – 01:30" },
 { day: "Freitag", hours: "19:00 – 01:30" },
 { day: "Samstag", hours: "19:00 – 01:30" },
 { day: "Sonntag", hours: "19:00 – 01:30" },
 ],
 },
 pt: {
 title: "Onde estamos",
 eyebrow: "No coração de Nápoles",
 hours: "Horário",
 monday: "Segunda",
 closed: "Fechado",
 openDays: "Ter – Dom",
 openHours: "19:00 – 01:30",
 directions: "Como chegar",
 call: "Ligar",
 days: [
 { day: "Segunda", hours: "Fechado", closed: true },
 { day: "Terça", hours: "19:00 – 01:30" },
 { day: "Quarta", hours: "19:00 – 01:30" },
 { day: "Quinta", hours: "19:00 – 01:30" },
 { day: "Sexta", hours: "19:00 – 01:30" },
 { day: "Sábado", hours: "19:00 – 01:30" },
 { day: "Domingo", hours: "19:00 – 01:30" },
 ],
 },
 zh: {
 title: "地址",
 eyebrow: "那不勒斯市中心",
 hours: "营业时间",
 monday: "周一",
 closed: "休息",
 openDays: "周二至周日",
 openHours: "19:00 – 01:30",
 directions: "导航",
 call: "致电",
 days: [
 { day: "周一", hours: "休息", closed: true },
 { day: "周二", hours: "19:00 – 01:30" },
 { day: "周三", hours: "19:00 – 01:30" },
 { day: "周四", hours: "19:00 – 01:30" },
 { day: "周五", hours: "19:00 – 01:30" },
 { day: "周六", hours: "19:00 – 01:30" },
 { day: "周日", hours: "19:00 – 01:30" },
 ],
 },
};

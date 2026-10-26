import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Tiny i18n: flat string tables, `{name}` interpolation, browser-language
// detection, choice remembered per device. Channel / category names come from
// the data and aren't translated. Missing keys fall back to English.

export const LANGS = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
  hi: 'हिन्दी',
};

const en = {
  skip: 'Skip to channels',
  search: 'Search 13,000+ channels',
  searchLabel: 'Search channels',
  clearSearch: 'Clear search',
  recentSearches: 'Recent searches',
  home: 'Home',
  filters: 'Filters',
  favorites: 'Favorites',
  recent: 'Recent',
  install: 'Install',
  theme: 'Theme: {name}. Switch theme',
  themeSystem: 'system', themeDark: 'dark', themeLight: 'light',
  all: 'All',
  quickCategories: 'Quick categories',
  offline: 'You’re offline. Saved channels still show, but streams need a connection.',
  stale: 'Showing saved channels — refreshing in the background…',
  enriching: 'Loading country & language filters…',
  errorTitle: 'Can’t reach the channel list',
  errorText: 'Check your connection and try again.',
  retry: 'Retry',
  allChannels: 'All channels',
  recentlyWatched: 'Recently watched',
  resultsFor: 'Results for “{q}”',
  live: '{n} live',
  shareList: 'Share list',
  sortLabel: 'Sort channels',
  sortPopular: 'Popular', sortAz: 'A–Z', sortHd: 'HD first', sortWorks: 'Works for me',
  clearView: 'Clear view',
  remove: 'Remove {name}',
  clearAll: 'Clear all',
  noFavorites: 'No favorites yet',
  noFavoritesText: 'Tap the star on any channel to keep it here.',
  noRecent: 'Nothing watched yet',
  noRecentText: 'Channels you watch will show up here.',
  noResults: 'No channels found',
  noMatch: 'Nothing matches “{q}”. Try a different name.',
  noFilterMatch: 'Try removing a filter or two.',
  browseAll: 'Browse all channels',
  continueWatching: 'Continue watching',
  addedFav: 'Added {name} to favorites',
  removedFav: 'Removed {name} from favorites',
  addFav: 'Add {name} to favorites',
  removeFav: 'Remove {name} from favorites',
  undo: 'Undo',
  importPrompt: 'Import {n} shared favorites?',
  import: 'Import',
  linkCopiedFavs: 'Link to your favorites copied',
  shareFavsTitle: 'My NOVA Live TV favorites',
  // filters
  reset: 'Reset ({n})',
  closeFilters: 'Close filters',
  findOption: 'Find a category, country, language…',
  filterOptions: 'Filter options',
  clear: 'Clear',
  hideDead: 'Hide broken streams',
  categories: 'Categories', countries: 'Countries', languages: 'Languages',
  showLess: 'Show less',
  showAll: 'Show all {n}',
  showN: 'Show {n} channels',
  credits: 'Streams by iptv-org · free & open',
  privacy: 'Privacy settings',
  language: 'Language',
  // watch
  back: 'Back to channels',
  liveBadge: 'LIVE',
  favorite: 'Favorite',
  saved: 'Saved',
  share: 'Share',
  linkCopied: 'Link copied',
  watchTip: 'Swipe the video to change channel · ← → zap · F fullscreen · M mute · P picture-in-picture · swipe down to close',
  upNext: 'Up next',
  // player
  starting: 'Starting player…',
  tuning: 'Tuning in…',
  offlineStream: 'You’re offline — reconnect and try again.',
  deadStream: 'This stream is offline or geo-blocked.',
  tryAgain: 'Try again',
  nextChannel: 'Next channel',
  prevChannelLabel: 'Previous channel',
  nextChannelLabel: 'Next channel',
  mute: 'Mute', unmute: 'Unmute', volume: 'Volume',
  cast: 'Cast to a device',
  pip: 'Picture in picture',
  enterFs: 'Enter fullscreen', exitFs: 'Exit fullscreen',
  nowPlaying: 'Now playing: {name}',
  expand: 'Expand {name}',
  stop: 'Stop playback',
};

const es = {
  skip: 'Ir a los canales',
  search: 'Busca entre más de 13.000 canales',
  searchLabel: 'Buscar canales',
  clearSearch: 'Borrar búsqueda',
  recentSearches: 'Búsquedas recientes',
  home: 'Inicio', filters: 'Filtros', favorites: 'Favoritos', recent: 'Recientes', install: 'Instalar',
  theme: 'Tema: {name}. Cambiar tema',
  themeSystem: 'sistema', themeDark: 'oscuro', themeLight: 'claro',
  all: 'Todos', quickCategories: 'Categorías rápidas',
  offline: 'Sin conexión. Los canales guardados siguen visibles, pero las emisiones necesitan conexión.',
  stale: 'Mostrando canales guardados — actualizando en segundo plano…',
  enriching: 'Cargando filtros de país e idioma…',
  errorTitle: 'No se pudo cargar la lista de canales',
  errorText: 'Revisa tu conexión e inténtalo de nuevo.',
  retry: 'Reintentar',
  allChannels: 'Todos los canales', recentlyWatched: 'Vistos recientemente',
  resultsFor: 'Resultados para «{q}»', live: '{n} en vivo',
  shareList: 'Compartir lista', sortLabel: 'Ordenar canales',
  sortPopular: 'Populares', sortAz: 'A–Z', sortHd: 'HD primero', sortWorks: 'Funcionan para mí',
  clearView: 'Quitar vista', remove: 'Quitar {name}', clearAll: 'Borrar todo',
  noFavorites: 'Aún no hay favoritos', noFavoritesText: 'Toca la estrella de cualquier canal para guardarlo aquí.',
  noRecent: 'Aún no has visto nada', noRecentText: 'Los canales que veas aparecerán aquí.',
  noResults: 'No se encontraron canales', noMatch: 'Nada coincide con «{q}». Prueba otro nombre.',
  noFilterMatch: 'Prueba a quitar uno o dos filtros.', browseAll: 'Ver todos los canales',
  continueWatching: 'Seguir viendo',
  addedFav: '{name} añadido a favoritos', removedFav: '{name} quitado de favoritos',
  addFav: 'Añadir {name} a favoritos', removeFav: 'Quitar {name} de favoritos',
  undo: 'Deshacer', importPrompt: '¿Importar {n} favoritos compartidos?', import: 'Importar',
  linkCopiedFavs: 'Enlace a tus favoritos copiado', shareFavsTitle: 'Mis favoritos de NOVA Live TV',
  reset: 'Restablecer ({n})', closeFilters: 'Cerrar filtros',
  findOption: 'Busca una categoría, país, idioma…', filterOptions: 'Filtrar opciones', clear: 'Borrar',
  hideDead: 'Ocultar emisiones caídas',
  categories: 'Categorías', countries: 'Países', languages: 'Idiomas',
  showLess: 'Mostrar menos', showAll: 'Mostrar los {n}', showN: 'Ver {n} canales',
  credits: 'Emisiones de iptv-org · libres y abiertas', privacy: 'Privacidad', language: 'Idioma',
  back: 'Volver a los canales', liveBadge: 'EN VIVO', favorite: 'Favorito', saved: 'Guardado',
  share: 'Compartir', linkCopied: 'Enlace copiado',
  watchTip: 'Desliza el vídeo para cambiar de canal · ← → cambiar · F pantalla completa · M silenciar · P imagen en imagen · desliza hacia abajo para cerrar',
  upNext: 'A continuación',
  starting: 'Iniciando reproductor…', tuning: 'Sintonizando…',
  offlineStream: 'Sin conexión — vuelve a conectarte e inténtalo de nuevo.',
  deadStream: 'Esta emisión no está disponible o está bloqueada en tu región.',
  tryAgain: 'Reintentar', nextChannel: 'Siguiente canal',
  prevChannelLabel: 'Canal anterior', nextChannelLabel: 'Canal siguiente',
  mute: 'Silenciar', unmute: 'Activar sonido', volume: 'Volumen', cast: 'Enviar a un dispositivo',
  pip: 'Imagen en imagen', enterFs: 'Pantalla completa', exitFs: 'Salir de pantalla completa',
  nowPlaying: 'Reproduciendo: {name}', expand: 'Ampliar {name}', stop: 'Detener',
};

const fr = {
  skip: 'Aller aux chaînes',
  search: 'Rechercher parmi 13 000+ chaînes',
  searchLabel: 'Rechercher des chaînes',
  clearSearch: 'Effacer la recherche',
  recentSearches: 'Recherches récentes',
  home: 'Accueil', filters: 'Filtres', favorites: 'Favoris', recent: 'Récents', install: 'Installer',
  theme: 'Thème : {name}. Changer de thème',
  themeSystem: 'système', themeDark: 'sombre', themeLight: 'clair',
  all: 'Toutes', quickCategories: 'Catégories rapides',
  offline: 'Vous êtes hors ligne. Les chaînes enregistrées restent visibles, mais la lecture nécessite une connexion.',
  stale: 'Chaînes enregistrées affichées — actualisation en arrière-plan…',
  enriching: 'Chargement des filtres pays et langue…',
  errorTitle: 'Impossible de charger la liste des chaînes',
  errorText: 'Vérifiez votre connexion et réessayez.',
  retry: 'Réessayer',
  allChannels: 'Toutes les chaînes', recentlyWatched: 'Regardées récemment',
  resultsFor: 'Résultats pour « {q} »', live: '{n} en direct',
  shareList: 'Partager la liste', sortLabel: 'Trier les chaînes',
  sortPopular: 'Populaires', sortAz: 'A–Z', sortHd: 'HD d’abord', sortWorks: 'Fonctionnent chez moi',
  clearView: 'Retirer la vue', remove: 'Retirer {name}', clearAll: 'Tout effacer',
  noFavorites: 'Aucun favori pour l’instant', noFavoritesText: 'Touchez l’étoile d’une chaîne pour la garder ici.',
  noRecent: 'Rien regardé pour l’instant', noRecentText: 'Les chaînes que vous regardez apparaîtront ici.',
  noResults: 'Aucune chaîne trouvée', noMatch: 'Rien ne correspond à « {q} ». Essayez un autre nom.',
  noFilterMatch: 'Essayez de retirer un ou deux filtres.', browseAll: 'Voir toutes les chaînes',
  continueWatching: 'Reprendre',
  addedFav: '{name} ajoutée aux favoris', removedFav: '{name} retirée des favoris',
  addFav: 'Ajouter {name} aux favoris', removeFav: 'Retirer {name} des favoris',
  undo: 'Annuler', importPrompt: 'Importer {n} favoris partagés ?', import: 'Importer',
  linkCopiedFavs: 'Lien vers vos favoris copié', shareFavsTitle: 'Mes favoris NOVA Live TV',
  reset: 'Réinitialiser ({n})', closeFilters: 'Fermer les filtres',
  findOption: 'Trouver une catégorie, un pays, une langue…', filterOptions: 'Filtrer les options', clear: 'Effacer',
  hideDead: 'Masquer les flux hors service',
  categories: 'Catégories', countries: 'Pays', languages: 'Langues',
  showLess: 'Afficher moins', showAll: 'Tout afficher ({n})', showN: 'Voir {n} chaînes',
  credits: 'Flux fournis par iptv-org · libres et ouverts', privacy: 'Confidentialité', language: 'Langue',
  back: 'Retour aux chaînes', liveBadge: 'DIRECT', favorite: 'Favori', saved: 'Enregistrée',
  share: 'Partager', linkCopied: 'Lien copié',
  watchTip: 'Balayez la vidéo pour changer de chaîne · ← → zapper · F plein écran · M muet · P image dans l’image · balayez vers le bas pour fermer',
  upNext: 'À suivre',
  starting: 'Démarrage du lecteur…', tuning: 'Connexion…',
  offlineStream: 'Vous êtes hors ligne — reconnectez-vous et réessayez.',
  deadStream: 'Ce flux est hors service ou bloqué dans votre région.',
  tryAgain: 'Réessayer', nextChannel: 'Chaîne suivante',
  prevChannelLabel: 'Chaîne précédente', nextChannelLabel: 'Chaîne suivante',
  mute: 'Couper le son', unmute: 'Activer le son', volume: 'Volume', cast: 'Diffuser sur un appareil',
  pip: 'Image dans l’image', enterFs: 'Plein écran', exitFs: 'Quitter le plein écran',
  nowPlaying: 'En cours : {name}', expand: 'Agrandir {name}', stop: 'Arrêter la lecture',
};

const pt = {
  skip: 'Ir para os canais',
  search: 'Pesquise entre mais de 13.000 canais',
  searchLabel: 'Pesquisar canais',
  clearSearch: 'Limpar pesquisa',
  recentSearches: 'Pesquisas recentes',
  home: 'Início', filters: 'Filtros', favorites: 'Favoritos', recent: 'Recentes', install: 'Instalar',
  theme: 'Tema: {name}. Trocar tema',
  themeSystem: 'sistema', themeDark: 'escuro', themeLight: 'claro',
  all: 'Todos', quickCategories: 'Categorias rápidas',
  offline: 'Você está offline. Os canais salvos continuam visíveis, mas as transmissões precisam de conexão.',
  stale: 'Mostrando canais salvos — atualizando em segundo plano…',
  enriching: 'Carregando filtros de país e idioma…',
  errorTitle: 'Não foi possível carregar a lista de canais',
  errorText: 'Verifique sua conexão e tente novamente.',
  retry: 'Tentar novamente',
  allChannels: 'Todos os canais', recentlyWatched: 'Assistidos recentemente',
  resultsFor: 'Resultados para “{q}”', live: '{n} ao vivo',
  shareList: 'Compartilhar lista', sortLabel: 'Ordenar canais',
  sortPopular: 'Populares', sortAz: 'A–Z', sortHd: 'HD primeiro', sortWorks: 'Funcionam para mim',
  clearView: 'Remover visualização', remove: 'Remover {name}', clearAll: 'Limpar tudo',
  noFavorites: 'Nenhum favorito ainda', noFavoritesText: 'Toque na estrela de qualquer canal para guardá-lo aqui.',
  noRecent: 'Nada assistido ainda', noRecentText: 'Os canais que você assistir aparecerão aqui.',
  noResults: 'Nenhum canal encontrado', noMatch: 'Nada corresponde a “{q}”. Tente outro nome.',
  noFilterMatch: 'Tente remover um ou dois filtros.', browseAll: 'Ver todos os canais',
  continueWatching: 'Continuar assistindo',
  addedFav: '{name} adicionado aos favoritos', removedFav: '{name} removido dos favoritos',
  addFav: 'Adicionar {name} aos favoritos', removeFav: 'Remover {name} dos favoritos',
  undo: 'Desfazer', importPrompt: 'Importar {n} favoritos compartilhados?', import: 'Importar',
  linkCopiedFavs: 'Link dos seus favoritos copiado', shareFavsTitle: 'Meus favoritos do NOVA Live TV',
  reset: 'Redefinir ({n})', closeFilters: 'Fechar filtros',
  findOption: 'Encontre uma categoria, país, idioma…', filterOptions: 'Filtrar opções', clear: 'Limpar',
  hideDead: 'Ocultar transmissões fora do ar',
  categories: 'Categorias', countries: 'Países', languages: 'Idiomas',
  showLess: 'Mostrar menos', showAll: 'Mostrar todos os {n}', showN: 'Ver {n} canais',
  credits: 'Transmissões do iptv-org · livres e abertas', privacy: 'Privacidade', language: 'Idioma',
  back: 'Voltar aos canais', liveBadge: 'AO VIVO', favorite: 'Favoritar', saved: 'Salvo',
  share: 'Compartilhar', linkCopied: 'Link copiado',
  watchTip: 'Deslize o vídeo para trocar de canal · ← → zapear · F tela cheia · M mudo · P picture-in-picture · deslize para baixo para fechar',
  upNext: 'A seguir',
  starting: 'Iniciando o player…', tuning: 'Sintonizando…',
  offlineStream: 'Você está offline — reconecte e tente novamente.',
  deadStream: 'Esta transmissão está fora do ar ou bloqueada na sua região.',
  tryAgain: 'Tentar novamente', nextChannel: 'Próximo canal',
  prevChannelLabel: 'Canal anterior', nextChannelLabel: 'Próximo canal',
  mute: 'Silenciar', unmute: 'Ativar som', volume: 'Volume', cast: 'Transmitir para um dispositivo',
  pip: 'Picture-in-picture', enterFs: 'Tela cheia', exitFs: 'Sair da tela cheia',
  nowPlaying: 'Tocando agora: {name}', expand: 'Expandir {name}', stop: 'Parar',
};

const hi = {
  skip: 'चैनलों पर जाएँ',
  search: '13,000+ चैनल खोजें',
  searchLabel: 'चैनल खोजें',
  clearSearch: 'खोज साफ़ करें',
  recentSearches: 'हाल की खोजें',
  home: 'होम', filters: 'फ़िल्टर', favorites: 'पसंदीदा', recent: 'हाल के', install: 'इंस्टॉल करें',
  theme: 'थीम: {name}। थीम बदलें',
  themeSystem: 'सिस्टम', themeDark: 'डार्क', themeLight: 'लाइट',
  all: 'सभी', quickCategories: 'त्वरित श्रेणियाँ',
  offline: 'आप ऑफ़लाइन हैं। सहेजे गए चैनल दिखते रहेंगे, पर स्ट्रीम के लिए इंटरनेट चाहिए।',
  stale: 'सहेजे गए चैनल दिखाए जा रहे हैं — पीछे अपडेट हो रहा है…',
  enriching: 'देश और भाषा फ़िल्टर लोड हो रहे हैं…',
  errorTitle: 'चैनल सूची लोड नहीं हो सकी',
  errorText: 'अपना कनेक्शन जाँचें और फिर कोशिश करें।',
  retry: 'फिर कोशिश करें',
  allChannels: 'सभी चैनल', recentlyWatched: 'हाल ही में देखे गए',
  resultsFor: '“{q}” के नतीजे', live: '{n} लाइव',
  shareList: 'सूची शेयर करें', sortLabel: 'चैनल क्रमबद्ध करें',
  sortPopular: 'लोकप्रिय', sortAz: 'A–Z', sortHd: 'पहले HD', sortWorks: 'मेरे लिए चलने वाले',
  clearView: 'व्यू हटाएँ', remove: '{name} हटाएँ', clearAll: 'सब हटाएँ',
  noFavorites: 'अभी कोई पसंदीदा नहीं', noFavoritesText: 'किसी भी चैनल का स्टार दबाकर उसे यहाँ रखें।',
  noRecent: 'अभी कुछ नहीं देखा', noRecentText: 'आप जो चैनल देखेंगे, वे यहाँ दिखेंगे।',
  noResults: 'कोई चैनल नहीं मिला', noMatch: '“{q}” से कुछ मेल नहीं खाता। कोई और नाम आज़माएँ।',
  noFilterMatch: 'एक-दो फ़िल्टर हटाकर देखें।', browseAll: 'सभी चैनल देखें',
  continueWatching: 'देखना जारी रखें',
  addedFav: '{name} पसंदीदा में जोड़ा गया', removedFav: '{name} पसंदीदा से हटाया गया',
  addFav: '{name} को पसंदीदा में जोड़ें', removeFav: '{name} को पसंदीदा से हटाएँ',
  undo: 'पूर्ववत करें', importPrompt: '{n} शेयर किए गए पसंदीदा इम्पोर्ट करें?', import: 'इम्पोर्ट करें',
  linkCopiedFavs: 'आपके पसंदीदा का लिंक कॉपी हो गया', shareFavsTitle: 'मेरे NOVA Live TV पसंदीदा',
  reset: 'रीसेट ({n})', closeFilters: 'फ़िल्टर बंद करें',
  findOption: 'श्रेणी, देश, भाषा खोजें…', filterOptions: 'विकल्प फ़िल्टर करें', clear: 'साफ़ करें',
  hideDead: 'बंद स्ट्रीम छिपाएँ',
  categories: 'श्रेणियाँ', countries: 'देश', languages: 'भाषाएँ',
  showLess: 'कम दिखाएँ', showAll: 'सभी {n} दिखाएँ', showN: '{n} चैनल दिखाएँ',
  credits: 'स्ट्रीम: iptv-org · मुफ़्त और ओपन', privacy: 'गोपनीयता सेटिंग', language: 'भाषा',
  back: 'चैनलों पर वापस', liveBadge: 'लाइव', favorite: 'पसंदीदा', saved: 'सहेजा गया',
  share: 'शेयर करें', linkCopied: 'लिंक कॉपी हुआ',
  watchTip: 'चैनल बदलने के लिए वीडियो स्वाइप करें · ← → बदलें · F फ़ुल स्क्रीन · M म्यूट · P पिक्चर-इन-पिक्चर · बंद करने के लिए नीचे स्वाइप करें',
  upNext: 'आगे',
  starting: 'प्लेयर शुरू हो रहा है…', tuning: 'ट्यून हो रहा है…',
  offlineStream: 'आप ऑफ़लाइन हैं — फिर से कनेक्ट करके कोशिश करें।',
  deadStream: 'यह स्ट्रीम बंद है या आपके क्षेत्र में उपलब्ध नहीं है।',
  tryAgain: 'फिर कोशिश करें', nextChannel: 'अगला चैनल',
  prevChannelLabel: 'पिछला चैनल', nextChannelLabel: 'अगला चैनल',
  mute: 'म्यूट', unmute: 'अनम्यूट', volume: 'आवाज़', cast: 'किसी डिवाइस पर कास्ट करें',
  pip: 'पिक्चर-इन-पिक्चर', enterFs: 'फ़ुल स्क्रीन', exitFs: 'फ़ुल स्क्रीन से बाहर',
  nowPlaying: 'अभी चल रहा है: {name}', expand: '{name} बड़ा करें', stop: 'प्लेबैक रोकें',
};

const DICTS = { en, es, fr, pt, hi };
const KEY = 'nova.lang';

export function detectLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && DICTS[saved]) return saved;
  } catch { /* private mode */ }
  for (const l of navigator.languages || [navigator.language || 'en']) {
    const base = l.toLowerCase().split('-')[0];
    if (DICTS[base]) return base;
  }
  return 'en';
}

export function translate(lang, key, vars) {
  let s = DICTS[lang]?.[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, typeof v === 'number' ? v.toLocaleString(lang) : v);
    }
  }
  return s;
}

const I18n = createContext({ lang: 'en', setLang: () => {}, t: (k, v) => translate('en', k, v) });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({ lang, setLang, t: (k, v) => translate(lang, k, v) }), [lang, setLang]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);

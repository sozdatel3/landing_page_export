import { DEFAULT_LANGUAGE, translations } from './translations';
import { partnersData } from './partners-data';

const STORAGE_KEY = 'preferredLanguage';
const TOOTH_EMOJI = '🦷';

let currentLanguage = DEFAULT_LANGUAGE;

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function getNestedTranslation(language, keyPath) {
  if (!language || !keyPath) return undefined;

  const parts = String(keyPath).split('.');
  let value = translations[language];

  for (const part of parts) {
    if (value && typeof value === 'object' && hasOwn(value, part)) {
      value = value[part];
    } else {
      return undefined;
    }
  }

  return value;
}

function t(keyPath, { lang = currentLanguage, fallbackLang = DEFAULT_LANGUAGE } = {}) {
  const primary = getNestedTranslation(lang, keyPath);
  if (primary !== undefined) return primary;

  const fallback = getNestedTranslation(fallbackLang, keyPath);
  if (fallback !== undefined) return fallback;

  console.warn(`Missing translation: ${keyPath} (${lang})`);
  return keyPath;
}

function replaceToothEmoji(text, iconHeight) {
  if (typeof text !== 'string') return text;
  if (!text.includes(TOOTH_EMOJI)) return text;

  const height = Number(iconHeight);
  const style =
    Number.isFinite(height) && height > 0 ? ` style="height: ${height}px;"` : '';
  const icon = `<img src="/cropped_tooth.svg" alt="" class="tooth-icon"${style}>`;
  return text.replaceAll(TOOTH_EMOJI, icon);
}

function setElementText(element, value, iconHeight) {
  const asString = typeof value === 'string' ? value : String(value ?? '');
  if (asString.includes(TOOTH_EMOJI)) {
    element.innerHTML = replaceToothEmoji(asString, iconHeight);
    return;
  }
  element.textContent = asString;
}

function setElementHtml(element, value, iconHeight) {
  const asString = typeof value === 'string' ? value : String(value ?? '');
  element.innerHTML = replaceToothEmoji(asString, iconHeight);
}

function renderList(element, items, iconHeight) {
  element.innerHTML = items
    .map((item) => `<li>${replaceToothEmoji(String(item ?? ''), iconHeight)}</li>`)
    .join('');
}

function renderParagraphs(element, items, iconHeight) {
  element.innerHTML = items
    .map((item) => `<p>${replaceToothEmoji(String(item ?? ''), iconHeight)}</p>`)
    .join('');
}

function applyTranslations() {
  // Plain translations (text / lists)
  document.querySelectorAll('[data-translate]').forEach((element) => {
    const keyPath = element.getAttribute('data-translate');
    if (!keyPath) return;

    const iconHeight = element.getAttribute('data-icon-height');
    const value = t(keyPath);

    if (Array.isArray(value)) {
      if (element.tagName === 'UL' || element.tagName === 'OL') {
        renderList(element, value, iconHeight);
      } else {
        renderParagraphs(element, value, iconHeight);
      }
      return;
    }

    setElementText(element, value, iconHeight);
  });

  // Explicit HTML translations
  document.querySelectorAll('[data-translate-html]').forEach((element) => {
    const keyPath = element.getAttribute('data-translate-html');
    if (!keyPath) return;

    const iconHeight = element.getAttribute('data-icon-height');
    const value = t(keyPath);

    if (Array.isArray(value)) {
      if (element.tagName === 'UL' || element.tagName === 'OL') {
        renderList(element, value, iconHeight);
      } else {
        renderParagraphs(element, value, iconHeight);
      }
      return;
    }

    setElementHtml(element, value, iconHeight);
  });

  // Array-as-paragraphs helper
  document.querySelectorAll('[data-translate-paragraphs]').forEach((element) => {
    const keyPath = element.getAttribute('data-translate-paragraphs');
    if (!keyPath) return;

    const iconHeight = element.getAttribute('data-icon-height');
    const value = t(keyPath);
    const paragraphs = Array.isArray(value) ? value : [value];
    renderParagraphs(element, paragraphs, iconHeight);
  });

  syncTestimonialToggleLabels();
}

function normalizeLanguage(lang) {
  const value = String(lang || '')
    .trim()
    .toLowerCase();
  return value || DEFAULT_LANGUAGE;
}

function isSupportedLanguage(lang) {
  return hasOwn(translations, lang);
}

function normalizePathname(pathname) {
  if (!pathname) return '/';
  const normalized = String(pathname).replace(/\/index\.html$/, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function getLanguageFromUrl() {
  const pathname = normalizePathname(window.location.pathname);
  const parts = pathname.split('/').filter(Boolean);
  const maybeLang = parts[0] ? normalizeLanguage(parts[0]) : '';
  return maybeLang && isSupportedLanguage(maybeLang) ? maybeLang : null;
}

function getPathForLanguage(lang) {
  const normalized = normalizeLanguage(lang);
  return normalized === DEFAULT_LANGUAGE ? '/' : `/${normalized}/`;
}

function updateUrlForLanguage(lang, { replace = false } = {}) {
  const pathname = normalizePathname(window.location.pathname);
  const targetPath = getPathForLanguage(lang);
  if (pathname === targetPath) return;

  const nextUrl = `${targetPath}${window.location.search}${window.location.hash}`;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ lang }, '', nextUrl);
}

function getButtonLanguage(button) {
  if (button.dataset && button.dataset.lang) return button.dataset.lang;

  const onClick = button.getAttribute('onclick') || '';
  const match = onClick.match(/switchLanguage\('([^']+)'\)/);
  return match?.[1] ?? '';
}

function setActiveLanguageButton(lang) {
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    const btnLang = getButtonLanguage(btn);
    btn.classList.toggle('active', btnLang === lang);
  });
}

function setLanguage(lang, { persist = true } = {}) {
  const normalized = normalizeLanguage(lang);
  const nextLang = isSupportedLanguage(normalized) ? normalized : DEFAULT_LANGUAGE;

  currentLanguage = nextLang;
  document.documentElement.lang = nextLang;

  setActiveLanguageButton(nextLang);
  applyTranslations();

  if (persist) {
    localStorage.setItem(STORAGE_KEY, nextLang);
  }

  return nextLang;
}

function initLanguageSwitcher() {
  const container = document.querySelector('.language-switcher');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const button = e.target instanceof Element ? e.target.closest('.lang-btn') : null;
    if (!button) return;

    const lang = getButtonLanguage(button);
    if (!lang) return;

    const appliedLang = setLanguage(lang);
    updateUrlForLanguage(appliedLang);
  });
}

function restoreLanguage() {
  const fromUrl = getLanguageFromUrl();
  if (fromUrl) return fromUrl;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const normalized = normalizeLanguage(saved);
    if (isSupportedLanguage(normalized)) return normalized;
  }

  const fromDocument = document.documentElement.lang;
  if (fromDocument) {
    const normalized = normalizeLanguage(fromDocument);
    if (isSupportedLanguage(normalized)) return normalized;
  }

  return DEFAULT_LANGUAGE;
}

// Partners Section Logic

function initPartnersSection() {
  const paginationContainer = document.querySelector('.partners-pagination');
  const contentContainer = document.querySelector('.partners-content');
  if (!paginationContainer || !contentContainer) return;

  paginationContainer.textContent = '';
  contentContainer.textContent = '';

  const states = Object.keys(partnersData);

  states.forEach((state, index) => {
    const button = document.createElement('button');
    button.className = 'partner-page-btn';
    button.textContent = state;
    button.dataset.state = state;
    button.classList.toggle('active', index === 0);
    paginationContainer.appendChild(button);

    const list = document.createElement('div');
    list.className = 'partner-list';
    list.dataset.state = state;
    list.classList.toggle('active', index === 0);

    const partnersHtml = partnersData[state]
      .map(
        (partner) =>
          `<div class="partner-item"><a href="${partner.link}" target="_blank" rel="noopener noreferrer">${partner.name} (${partner.city})</a></div>`
      )
      .join('');

    list.innerHTML = partnersHtml;
    contentContainer.appendChild(list);
  });

  paginationContainer.addEventListener('click', (e) => {
    const button = e.target instanceof Element ? e.target.closest('.partner-page-btn') : null;
    if (!button) return;

    const targetState = button.dataset.state;
    if (!targetState) return;

    paginationContainer
      .querySelectorAll('.partner-page-btn')
      .forEach((btn) => btn.classList.toggle('active', btn === button));

    contentContainer.querySelectorAll('.partner-list').forEach((list) => {
      list.classList.toggle('active', list.dataset.state === targetState);
    });
  });
}

function initTestimonialToggles() {
  document.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('.testimonial-more a') : null;
    if (!link) return;

    e.preventDefault();

    const card = link.closest('.testimonial-card');
    const text = card?.querySelector('.testimonial-text');
    if (!text) return;

    const isExpanded = link.getAttribute('data-expanded') === 'true';
    link.setAttribute('data-expanded', (!isExpanded).toString());
    text.style.webkitLineClamp = isExpanded ? '3' : 'unset';

    syncTestimonialToggleLabels();
  });
}

function syncTestimonialToggleLabels() {
  const moreLabel = t('testimonialMore');
  const lessLabel = t('testimonialLess');

  document.querySelectorAll('.testimonial-more a').forEach((link) => {
    const isExpanded = link.getAttribute('data-expanded') === 'true';
    link.textContent = isExpanded ? String(lessLabel) : String(moreLabel);
  });
}

function initModal({ modalId, bodyId, closeSelector, triggerId, getContent }) {
  const modal = document.getElementById(modalId);
  const body = document.getElementById(bodyId);
  if (!modal || !body) return;

  const closeButton = modal.querySelector(closeSelector);

  function open() {
    body.innerHTML = String(getContent());
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.id === triggerId) {
      e.preventDefault();
      open();
    }
  });

  closeButton?.addEventListener('click', close);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') close();
  });
}

function initModals() {
  initModal({
    modalId: 'privacyModal',
    bodyId: 'privacyModalBody',
    closeSelector: '.privacy-close',
    triggerId: 'privacy-notes-link',
    getContent: () => replaceToothEmoji(String(t('privacyPolicyContent')), 30)
  });

  initModal({
    modalId: 'dentalProfessionalsModal',
    bodyId: 'dentalProfessionalsModalBody',
    closeSelector: '.dental-close',
    triggerId: 'dental-professionals-link',
    getContent: () => replaceToothEmoji(String(t('dentalProfessionalsFullContent')), 30)
  });
}

function init() {
  initLanguageSwitcher();
  initPartnersSection();
  initTestimonialToggles();
  initModals();

  window.addEventListener('popstate', () => {
    setLanguage(restoreLanguage(), { persist: false });
  });

  const initialLang = restoreLanguage();
  setLanguage(initialLang, { persist: false });
  updateUrlForLanguage(initialLang, { replace: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

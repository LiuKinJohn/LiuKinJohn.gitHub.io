(() => {
  const key = 'portfolio-language';
  const root = document.documentElement;
  const toggle = document.querySelector('.language-toggle');
  const setLanguage = (language) => {
    root.dataset.lang = language;
    root.lang = language === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem(key, language);
    if (toggle) toggle.setAttribute('aria-pressed', String(language === 'en'));
  };
  setLanguage(localStorage.getItem(key) || 'zh');
  toggle?.addEventListener('click', () => setLanguage(root.dataset.lang === 'zh' ? 'en' : 'zh'));
})();

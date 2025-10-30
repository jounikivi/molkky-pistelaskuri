document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('themeToggle');
  const stored = localStorage.getItem('darkMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const setTheme = (dark) => {
    document.body.classList.toggle('dark-mode', dark);
    localStorage.setItem('darkMode', dark);
    if (toggleBtn) {
      toggleBtn.textContent = dark ? '🌞 Vaalea tila' : '🌙 Tumma tila';
      toggleBtn.setAttribute('aria-label', dark ? 'Vaihda vaaleaan teemaan' : 'Vaihda tummaan teemaan');
    }
  };

  // Käynnistys
  const isDark = stored === null ? prefersDark : stored === 'true';
  setTheme(isDark);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      setTheme(!document.body.classList.contains('dark-mode'));
    });
  }
});

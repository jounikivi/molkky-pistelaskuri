document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('themeToggle');
  const stored = localStorage.getItem('darkMode');
  if (stored === 'true') {
    document.body.classList.add('dark-mode');
  }
  if (toggleBtn) {
    const updateText = () => {
      toggleBtn.textContent = document.body.classList.contains('dark-mode') ? 'Vaalea tila' : 'Tumma tila';
    };
    updateText();
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
      updateText();
    });
  }
});

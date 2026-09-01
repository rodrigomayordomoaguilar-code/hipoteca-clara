(() => {
  const banner = document.querySelector('#cookie-banner');
  if (!banner) return;
  if (!localStorage.getItem('hipoteca-clara-cookies')) banner.hidden = false;
  const choose = choice => { localStorage.setItem('hipoteca-clara-cookies', choice); banner.hidden = true; };
  document.querySelector('#cookie-essential').addEventListener('click', () => choose('necessary'));
  document.querySelector('#cookie-accept').addEventListener('click', () => choose('accepted'));
})();

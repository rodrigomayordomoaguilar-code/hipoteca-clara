const form = document.querySelector('#mortgage-form');
const inputs = [...form.querySelectorAll('input')];
const error = document.querySelector('#form-error');
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const euroDecimal = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

function restoreSharedValues() {
  const params = new URLSearchParams(window.location.search);
  ['price', 'deposit', 'rate', 'years'].forEach(id => { if (params.has(id) && Number(params.get(id)) >= 0) document.querySelector(`#${id}`).value = params.get(id); });
  if (params.get('type') === 'variable') document.querySelector('[name="mortgageType"][value="variable"]').checked = true;
}

function values() {
  return {
    price: Number(document.querySelector('#price').value),
    deposit: Number(document.querySelector('#deposit').value),
    annualRate: Number(document.querySelector('#rate').value),
    years: Number(document.querySelector('#years').value),
    type: form.querySelector('[name="mortgageType"]:checked').value
  };
}

function monthlyPayment(principal, annualRate, months) {
  const rate = annualRate / 100 / 12;
  if (rate === 0) return principal / months;
  return principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
}

function buildSchedule(principal, annualRate, months, payment) {
  const monthlyRate = annualRate / 100 / 12;
  let balance = principal;
  const years = [];
  for (let month = 1; month <= months; month++) {
    const interest = balance * monthlyRate;
    const capital = Math.min(payment - interest, balance);
    balance = Math.max(0, balance - capital);
    const yearIndex = Math.ceil(month / 12) - 1;
    if (!years[yearIndex]) years[yearIndex] = { paid: 0, capital: 0, interest: 0, balance: 0 };
    years[yearIndex].paid += payment;
    years[yearIndex].capital += capital;
    years[yearIndex].interest += interest;
    years[yearIndex].balance = balance;
  }
  return years;
}

function drawCharts(schedule, principal, interest) {
  const svg = document.querySelector('#amortization-chart');
  if (!svg) return;
  const width = 600, height = 260, left = 48, right = 18, top = 18, bottom = 35;
  const entries = schedule.map((year, index) => ({ x: index + 1, value: year.balance }));
  const max = principal || 1;
  const x = item => left + ((item.x - 1) / Math.max(entries.length - 1, 1)) * (width - left - right);
  const y = item => top + (1 - item.value / max) * (height - top - bottom);
  const line = entries.map((item, index) => `${index ? 'L' : 'M'}${x(item).toFixed(1)},${y(item).toFixed(1)}`).join(' ');
  const area = `${line} L${x(entries[entries.length - 1]).toFixed(1)},${height - bottom} L${left},${height - bottom} Z`;
  const tickYears = [...new Set([0, Math.floor((entries.length - 1) / 2), entries.length - 1])];
  svg.innerHTML = `<line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"/><line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"/><path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>${tickYears.map(i => `<text class="chart-text" x="${x(entries[i])}" y="${height - 12}" text-anchor="middle">Año ${entries[i].x}</text>`).join('')}<text class="chart-text" x="${left}" y="${top - 3}">${euro.format(principal)}</text><text class="chart-text" x="${left}" y="${height - bottom - 6}">0 €</text><line class="chart-guide" id="line-guide" y1="${top}" y2="${height - bottom}" hidden/><circle class="chart-point" id="line-point" r="5" hidden/><rect class="chart-hit" x="${left}" y="${top}" width="${width - left - right}" height="${height - top - bottom}"/>`;
  const capitalPercent = Math.round((principal / (principal + interest)) * 100);
  const donut = document.querySelector('#cost-donut');
  donut.style.setProperty('--capital-share', capitalPercent);
  document.querySelector('#capital-share').textContent = `${capitalPercent}%`;
  document.querySelector('#chart-capital').textContent = euro.format(principal);
  document.querySelector('#chart-interest').textContent = euro.format(interest);
  document.querySelector('#chart-end-label').textContent = `0 € al final del plazo`;
  connectLineHover(svg, entries, x, y);
  drawBars(schedule);
}

function positionTooltip(tooltip, panel, event) {
  const rect = panel.getBoundingClientRect();
  tooltip.style.left = `${Math.max(8, Math.min(event.clientX - rect.left + 14, rect.width - 168))}px`;
  tooltip.style.top = `${Math.max(36, event.clientY - rect.top - 58)}px`;
}

function connectLineHover(svg, entries, x, y) {
  const tooltip = document.querySelector('#line-tooltip'), guide = svg.querySelector('#line-guide'), point = svg.querySelector('#line-point'), panel = svg.closest('.chart-panel');
  const show = event => {
    const rect = svg.getBoundingClientRect(), svgX = ((event.clientX - rect.left) / rect.width) * 600;
    const nearest = entries.reduce((best, item) => Math.abs(x(item) - svgX) < Math.abs(x(best) - svgX) ? item : best, entries[0]);
    guide.setAttribute('x1', x(nearest)); guide.setAttribute('x2', x(nearest)); point.setAttribute('cx', x(nearest)); point.setAttribute('cy', y(nearest)); guide.hidden = false; point.hidden = false;
    tooltip.innerHTML = `<strong>Año ${nearest.x}</strong>Capital pendiente: ${euro.format(nearest.value)}`; tooltip.hidden = false; positionTooltip(tooltip, panel, event);
  };
  svg.addEventListener('pointermove', show); svg.addEventListener('pointerdown', show); svg.addEventListener('pointerleave', () => { tooltip.hidden = true; guide.hidden = true; point.hidden = true; });
}

function drawBars(schedule) {
  const svg = document.querySelector('#payment-breakdown-chart');
  if (!svg) return;
  const width = 600, height = 260, left = 46, right = 16, top = 18, bottom = 35, chartWidth = width - left - right;
  const max = Math.max(...schedule.map(year => year.paid), 1), barWidth = Math.max(5, Math.min(28, chartWidth / schedule.length * .62));
  const bars = schedule.map((year, index) => {
    const center = left + chartWidth * ((index + .5) / schedule.length), totalHeight = year.paid / max * (height - top - bottom), interestHeight = year.interest / max * (height - top - bottom), base = height - bottom;
    return { ...year, year: index + 1, x: center - barWidth / 2, base, totalHeight, interestHeight };
  });
  const labels = [...new Set([0, Math.floor((bars.length - 1) / 2), bars.length - 1])];
  svg.innerHTML = `<line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"/>${bars.map(bar => `<g data-bar-year="${bar.year}"><rect class="chart-bar-capital" x="${bar.x}" y="${bar.base - bar.totalHeight}" width="${barWidth}" height="${bar.totalHeight - bar.interestHeight}"/><rect class="chart-bar-interest" x="${bar.x}" y="${bar.base - bar.interestHeight}" width="${barWidth}" height="${bar.interestHeight}"/></g>`).join('')}${labels.map(i => `<text class="chart-text" x="${bars[i].x + barWidth / 2}" y="${height - 12}" text-anchor="middle">Año ${bars[i].year}</text>`).join('')}<rect class="chart-hit" x="${left}" y="${top}" width="${chartWidth}" height="${height - top - bottom}"/>`;
  const tooltip = document.querySelector('#bar-tooltip'), panel = svg.closest('.chart-panel');
  const show = event => { const rect = svg.getBoundingClientRect(), relative = (event.clientX - rect.left) / rect.width, index = Math.max(0, Math.min(bars.length - 1, Math.floor((relative * 600 - left) / chartWidth * bars.length))); const bar = bars[index]; tooltip.innerHTML = `<strong>Año ${bar.year}</strong>Capital: ${euro.format(bar.capital)}<br>Intereses: ${euro.format(bar.interest)}`; tooltip.hidden = false; positionTooltip(tooltip, panel, event); };
  svg.addEventListener('pointermove', show); svg.addEventListener('pointerdown', show); svg.addEventListener('pointerleave', () => { tooltip.hidden = true; });
}

function calculate() {
  const { price, deposit, annualRate, years, type } = values();
  const valid = price > 0 && deposit >= 0 && deposit < price && annualRate >= 0 && years >= 1 && years <= 50;
  if (!valid) {
    error.hidden = false;
    error.textContent = 'Revisa los datos: la entrada debe ser menor que el precio y el plazo debe estar entre 1 y 50 años.';
    return;
  }
  error.hidden = true;
  const principal = price - deposit;
  const months = years * 12;
  const payment = monthlyPayment(principal, annualRate, months);
  const total = payment * months;
  const interest = total - principal;
  document.querySelector('#monthly-payment').textContent = euroDecimal.format(payment);
  document.querySelector('#loan-context').textContent = `${years} años · ${annualRate.toLocaleString('es-ES', { maximumFractionDigits: 2 })}% TIN · tipo ${type === 'fixed' ? 'fijo' : 'variable (escenario inicial)'}`;
  document.querySelector('#principal-result').textContent = euro.format(principal);
  document.querySelector('#interest-result').textContent = euro.format(interest);
  document.querySelector('#total-result').textContent = euro.format(total);
  const schedule = buildSchedule(principal, annualRate, months, payment);
  document.querySelector('#amortization-body').innerHTML = schedule.map((year, index) => `<tr><td>${index + 1}</td><td>${euro.format(year.paid)}</td><td>${euro.format(year.capital)}</td><td>${euro.format(year.interest)}</td><td>${euro.format(year.balance)}</td></tr>`).join('');
  drawCharts(schedule, principal, interest);
}

inputs.forEach(input => input.addEventListener('input', calculate));
document.querySelectorAll('[name="mortgageType"]').forEach(input => input.addEventListener('change', () => {
  document.querySelector('#type-note').textContent = input.value === 'fixed' ? 'Calculamos una cuota constante durante toda la vida del préstamo.' : 'Mostramos un escenario inicial constante; en una hipoteca variable la cuota puede cambiar en cada revisión.';
  calculate();
}));
document.querySelector('#show-table').addEventListener('click', () => {
  const section = document.querySelector('#amortization');
  section.hidden = false;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.querySelector('#share-simulation').addEventListener('click', async () => {
  const data = values(), url = new URL(window.location.href); url.search = '';
  url.searchParams.set('price', data.price); url.searchParams.set('deposit', data.deposit); url.searchParams.set('rate', data.annualRate); url.searchParams.set('years', data.years); url.searchParams.set('type', data.type);
  const button = document.querySelector('#share-simulation');
  try { await navigator.clipboard.writeText(url.toString()); button.textContent = 'Enlace copiado'; setTimeout(() => { button.textContent = 'Compartir simulación'; }, 1800); } catch { window.prompt('Copia este enlace:', url.toString()); }
});
document.querySelector('#print-simulation').addEventListener('click', () => { document.querySelector('#amortization').hidden = false; window.print(); });
restoreSharedValues();
calculate();

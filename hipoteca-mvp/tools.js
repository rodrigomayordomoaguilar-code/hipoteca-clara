const form = document.querySelector('form[data-tool]');
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const euroDecimal = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const value = id => Number(document.querySelector(`#${id}`).value) || 0;
const payment = (principal, annualRate, months) => {
  const r = annualRate / 100 / 12;
  return r === 0 ? principal / months : principal * (r * (1 + r) ** months) / ((1 + r) ** months - 1);
};
const principalFromPayment = (monthly, annualRate, months) => {
  const r = annualRate / 100 / 12;
  return r === 0 ? monthly * months : monthly * ((1 + r) ** months - 1) / (r * (1 + r) ** months);
};
const set = (id, text) => { document.querySelector(`#${id}`).textContent = text; };

function addTaxEstimateField() {
  if (!form || !['quota', 'table', 'compare'].includes(form.dataset.tool)) return;
  form.insertAdjacentHTML('beforeend', '<div class="field-group"><label for="upfront-taxes">Impuestos y gastos iniciales estimados</label><div class="input-suffix"><input id="upfront-taxes" value="0" type="number" min="0" step="500"><span>€</span></div><p class="field-note">Añade aquí tu cifra contrastada; no asumimos un impuesto por defecto.</p></div>');
}

function renderDonut(slices) {
  const card = document.querySelector('.result-card');
  if (!card) return;
  let visual = card.querySelector('.mini-donut-visual');
  if (!visual) { visual = document.createElement('div'); visual.className = 'mini-donut-visual'; card.append(visual); }
  const safe = slices.filter(slice => slice.value > 0); const total = safe.reduce((sum, slice) => sum + slice.value, 0) || 1; const circumference = 2 * Math.PI * 38; let offset = 0;
  const colors = ['#477a71', '#94afa5', '#d1ded8'];
  visual.innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="Desglose visual del resultado"><circle cx="60" cy="60" r="38" fill="none" stroke="#315b54" stroke-width="18"/><text x="60" y="56" text-anchor="middle" fill="#fff" font-family="DM Serif Display, serif" font-size="16">${safe.length}</text><text x="60" y="72" text-anchor="middle" fill="#c4d4c7" font-family="DM Sans, sans-serif" font-size="9">partidas</text>${safe.map((slice, index) => { const length = slice.value / total * circumference; const element = `<circle class="mini-slice" data-index="${index}" cx="60" cy="60" r="38" fill="none" stroke="${colors[index]}" stroke-width="18" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"/>`; offset += length; return element; }).join('')}</svg><div class="mini-donut-caption"><strong>Desglose del resultado</strong><span>${euro.format(total)}</span><p>Por cada 100 €: ${safe.map(item => `${item.label} ${Math.round(item.value / total * 100)} €`).join(' · ')}</p></div>`;
  const caption = visual.querySelector('.mini-donut-caption');
  visual.querySelectorAll('.mini-slice').forEach(slice => { const item = safe[Number(slice.dataset.index)]; const show = () => { visual.querySelectorAll('.mini-slice').forEach(other => other.classList.remove('is-active')); slice.classList.add('is-active'); caption.innerHTML = `<strong>${item.label}</strong><span>${euro.format(item.value)}</span><p>Por cada 100 € del total: ${Math.round(item.value / total * 100)} €. ${item.note || ''}</p>`; }; slice.addEventListener('pointerenter', show); slice.addEventListener('pointerdown', show); });
}

function updateCapacity() {
  const income = value('income'), debts = value('debts'), rate = value('capacity-rate'), months = value('capacity-years') * 12;
  const max = Math.max(0, income * .35 - debts); const principal = principalFromPayment(max, rate, months);
  set('capacity-payment', euroDecimal.format(max)); set('capacity-principal', euro.format(principal)); set('capacity-margin', euroDecimal.format(Math.max(0, income - debts - max)));
  renderDonut([{ label:'Cuota hipotecaria orientativa', value:max, note:'Pago previsto de vivienda.' }, { label:'Otras deudas', value:debts, note:'Compromisos mensuales declarados.' }, { label:'Resto de ingresos', value:Math.max(0, income - debts - max), note:'Margen antes de otros gastos del hogar.' }]);
}
function updateCosts() {
  const price = value('cost-price'), tax = price * value('tax-rate') / 100, other = price * value('other-rate') / 100, fixed = value('fixed-costs');
  set('costs-total', euro.format(tax + other + fixed)); set('costs-tax', euro.format(tax)); set('costs-other', euro.format(other)); set('costs-fixed', euro.format(fixed));
  renderDonut([{ label:'Impuesto indicado', value:tax, note:'Importe introducido por ti.' }, { label:'Otros gastos', value:other, note:'Provisión porcentual editable.' }, { label:'Costes fijos', value:fixed, note:'Tasación, gestoría u otros costes indicados.' }]);
}
function updatePrepayment() {
  const balance = value('balance'), extra = Math.min(value('prepayment'), balance), rate = value('prepay-rate'), months = value('remaining-years') * 12;
  const oldPayment = payment(balance, rate, months), newPayment = payment(balance - extra, rate, months);
  const r = rate / 100 / 12; const newMonths = r === 0 ? (balance - extra) / oldPayment : -Math.log(1 - r * (balance - extra) / oldPayment) / Math.log(1 + r);
  const saved = oldPayment * months - balance - (oldPayment * newMonths - (balance - extra));
  set('prepay-new-payment', euroDecimal.format(newPayment)); set('prepay-payment-detail', `Antes: ${euroDecimal.format(oldPayment)} al mes. Diferencia: ${euroDecimal.format(oldPayment - newPayment)}.`); set('prepay-new-years', `${Math.floor(newMonths / 12)} años y ${Math.round(newMonths % 12)} meses`); set('prepay-saved-interest', euro.format(Math.max(0, saved)));
  renderDonut([{ label:'Capital tras amortizar', value:Math.max(0, balance - extra), note:'Deuda que seguirá pendiente.' }, { label:'Amortización anticipada', value:extra, note:'Dinero destinado a reducir capital.' }]);
}
function updateCompare() {
  const principal = value('compare-principal'), months = value('compare-years') * 12, fixed = payment(principal, value('fixed-rate'), months), variable = payment(principal, value('variable-rate'), months);
  set('compare-fixed', euroDecimal.format(fixed)); set('compare-variable', euroDecimal.format(variable)); set('compare-difference', euroDecimal.format(Math.abs(variable - fixed))); set('compare-total-difference', euro.format(Math.abs(variable - fixed) * months));
  renderDonut([{ label:'Capital del escenario fijo', value:principal, note:'Importe que devuelve el préstamo.' }, { label:'Intereses del escenario fijo', value:fixed * months - principal, note:'Coste financiero con el tipo fijo indicado.' }, { label:'Impuestos y gastos iniciales', value:value('upfront-taxes'), note:'Cifra editable y no integrada en la cuota.' }]);
}
function updateDeposit() {
  const price = value('home-price'), finance = value('finance-percent') / 100, costs = price * value('purchase-cost-percent') / 100, entry = price * (1 - finance), total = entry + costs, savings = value('current-savings');
  set('deposit-total', euro.format(total)); set('deposit-detail', `Con ${euro.format(savings)} disponibles hoy.`); set('deposit-entry', euro.format(entry)); set('deposit-costs', euro.format(costs)); set('deposit-gap', euro.format(Math.max(0, total - savings)));
  renderDonut([{ label:'Entrada', value:entry, note:'Ahorro que no financia el banco.' }, { label:'Impuestos y gastos', value:costs, note:'Provisión porcentual editable.' }]);
}
function updateQuota() {
  const principal = value('quota-principal'), months = value('quota-years') * 12, monthly = payment(principal, value('quota-rate'), months), total = monthly * months;
  set('quota-payment', euroDecimal.format(monthly)); set('quota-interest', euro.format(total - principal)); set('quota-total', euro.format(total));
  renderDonut([{ label:'Capital prestado', value:principal, note:'Parte que devuelve el préstamo.' }, { label:'Intereses estimados', value:total - principal, note:'Coste financiero con el tipo y plazo introducidos.' }, { label:'Impuestos y gastos iniciales', value:value('upfront-taxes'), note:'Cifra editable; no forma parte de la cuota mensual.' }]);
}
function schedule(principal, annualRate, months, monthly) {
  const r = annualRate / 100 / 12; let balance = principal; const years = [];
  for (let month = 1; month <= months; month += 1) {
    const interest = balance * r, capital = Math.min(monthly - interest, balance), i = Math.ceil(month / 12) - 1;
    if (!years[i]) years[i] = { paid: 0, capital: 0, interest: 0, balance: 0 };
    years[i].paid += monthly; years[i].capital += capital; years[i].interest += interest; balance = Math.max(0, balance - capital); years[i].balance = balance;
  }
  return years;
}
function updateTable() {
  const principal = value('table-principal'), months = value('table-years') * 12, monthly = payment(principal, value('table-rate'), months);
  set('table-payment', euroDecimal.format(monthly));
  document.querySelector('#table-body').innerHTML = schedule(principal, value('table-rate'), months, monthly).map((year, index) => `<tr><td>${index + 1}</td><td>${euro.format(year.paid)}</td><td>${euro.format(year.capital)}</td><td>${euro.format(year.interest)}</td><td>${euro.format(year.balance)}</td></tr>`).join('');
  renderDonut([{ label:'Capital prestado', value:principal, note:'Parte que amortiza la deuda.' }, { label:'Intereses estimados', value:monthly * months - principal, note:'Coste financiero estimado.' }, { label:'Impuestos y gastos iniciales', value:value('upfront-taxes'), note:'Cifra editable; no forma parte de la cuota mensual.' }]);
}
function updateSalary() {
  const monthly = value('salary-income') * .35, principal = principalFromPayment(monthly, value('salary-rate'), value('salary-years') * 12);
  set('salary-payment', euroDecimal.format(monthly)); set('salary-principal', euro.format(principal));
  renderDonut([{ label:'Cuota orientativa', value:monthly, note:'Presupuesto de vivienda al 35% del sueldo neto.' }, { label:'Resto del sueldo', value:Math.max(0, value('salary-income') - monthly), note:'Renta disponible antes de otros gastos personales.' }]);
}
function updateBuyingBudget() {
  const price = value('budget-price'), entry = price * (1 - value('budget-finance') / 100), expenses = price * value('budget-costs') / 100, total = entry + expenses;
  set('budget-total', euro.format(total)); set('budget-entry', euro.format(entry)); set('budget-expenses', euro.format(expenses)); set('budget-gap', euro.format(Math.max(0, total - value('budget-savings'))));
  renderDonut([{ label:'Entrada', value:entry, note:'Ahorro destinado al precio de la vivienda.' }, { label:'Impuestos y gastos', value:expenses, note:'Provisión editable para tributos y gastos de compra.' }]);
}
const updaters = { capacity: updateCapacity, costs: updateCosts, prepayment: updatePrepayment, compare: updateCompare, deposit: updateDeposit, quota: updateQuota, table: updateTable, salary: updateSalary, buyingbudget: updateBuyingBudget };
if (form) { addTaxEstimateField(); const update = updaters[form.dataset.tool]; form.querySelectorAll('input').forEach(input => input.addEventListener('input', update)); update(); }

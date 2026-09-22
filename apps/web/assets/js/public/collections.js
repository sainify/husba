import {productCardHtml as cardHtml} from './cards.js';
import {refreshMedia} from './site.js';
import { getBootstrap, getProducts, escapeHtml as e } from './api.js';

const grid = document.getElementById('products-grid');
const chipsWrap = document.getElementById('category-chips');
const searchInput = document.getElementById('search-input');
const availabilityChip = document.getElementById('availability-chip');

const params = new URLSearchParams(location.search);
const state = {
  category: params.get('category') || '',
  search: params.get('q') || '',
  availableOnly: params.get('available') === '1',
};
if (state.search) searchInput.value = state.search;
if (state.availableOnly) availabilityChip.setAttribute('aria-pressed', 'true');

function syncUrl() {
  const p = new URLSearchParams();
  if (state.category) p.set('category', state.category);
  if (state.search) p.set('q', state.search);
  if (state.availableOnly) p.set('available', '1');
  history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
}

let debounceTimer;
let generation=0;
async function renderProducts() {
  const current=++generation;
  grid.setAttribute('aria-busy', 'true');
  try {
    const products = await getProducts({...state});
    if(current!==generation)return;
    grid.innerHTML = products.length
      ? products.map(cardHtml).join('')
      : '<p class="hb-empty">No pieces match that search yet — try a different filter, or send us a custom enquiry.</p>';
  } catch (err) {
    grid.innerHTML = '<p class="hb-error">Couldn\u2019t load products right now. Please refresh.</p>';
  }
  if(current!==generation)return;
  grid.removeAttribute('aria-busy');
  refreshMedia();
}

async function renderChips() {
  try {
    const { categories } = await getBootstrap();
    chipsWrap.innerHTML =
      `<button class="hb-chip" data-category="" aria-pressed="${state.category === ''}">All</button>` +
      categories
        .map((c) => `<button class="hb-chip" data-category="${e(c.slug)}" aria-pressed="${String(state.category) === String(c.slug)}">${e(c.name)}</button>`)
        .join('');
    chipsWrap.querySelectorAll('.hb-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.category = chip.dataset.category;
        chipsWrap.querySelectorAll('.hb-chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        syncUrl();
        renderProducts();
      });
    });
  } catch (err) {
    chipsWrap.innerHTML = '<button class="hb-chip" aria-pressed="true">All</button>';
  }
}

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.search = searchInput.value;
    syncUrl();
    renderProducts();
  }, 250);
});

availabilityChip.addEventListener('click', () => {
  state.availableOnly = !state.availableOnly;
  availabilityChip.setAttribute('aria-pressed', String(state.availableOnly));
  syncUrl();
  renderProducts();
});

renderChips();
renderProducts();

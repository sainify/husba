import { api } from "./api.js";
import { escapeHtml, refreshAnimations, renderProductCard, setSiteSettings } from "./shared.js";

const grid = document.querySelector("[data-product-grid]");
const chips = document.querySelector("[data-filter-chips]");
const count = document.querySelector("[data-result-count]");
const search = document.querySelector("[data-search]");
const sort = document.querySelector("[data-sort]");
const initial = new URLSearchParams(location.search);
const filters = { category: initial.get("category") || "", search: "" };
let currentProducts = [];
let timer;

const renderChips = (categories) => {
  chips.innerHTML = [
    `<button class="chip${filters.category ? "" : " is-active"}" type="button" data-category="">All</button>`,
    ...categories.map((category) => `<button class="chip${filters.category === category.slug ? " is-active" : ""}" type="button" data-category="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</button>`),
  ].join("");
};

const render = () => {
  let products = [...currentProducts];
  if (filters.category) products = products.filter((product) => product.category_slug === filters.category);
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    products = products.filter((product) => `${product.name || ""} ${product.product_code || ""} ${product.description || ""}`.toLowerCase().includes(needle));
  }
  if (sort.value === "name") products.sort((a, b) => a.name.localeCompare(b.name));
  if (sort.value === "newest") products.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  if (sort.value === "featured") products.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  count.textContent = `${products.length} ${products.length === 1 ? "piece" : "pieces"}`;
  if (!products.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state__inner"><h2>No pieces found.</h2><p>Try another search or send us a custom enquiry.</p><button class="button" type="button" data-open-enquiry data-enquiry-type="custom">Start a custom enquiry</button></div></div>';
  } else {
    grid.innerHTML = products.map(renderProductCard).join("");
  }
  refreshAnimations();
};

const loadProducts = async () => {
  grid.innerHTML = '<div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>';
  try {
    const [data, bootstrap] = await Promise.all([api.getProducts(), api.getBootstrap()]);
    const merged = new Map();
    [...(data.products || []), ...(bootstrap.products || [])].forEach((product) => merged.set(product.id || product.slug, product));
    currentProducts = [...merged.values()].filter((product) => product.is_active !== false);
    renderChips(data.categories?.length ? data.categories : (bootstrap.categories || []));
    render();
  } catch (error) {
    grid.innerHTML = `<div class="error-state"><div class="error-state__inner"><h2>The collection is unavailable.</h2><p>${escapeHtml(error.message)}</p><button class="button button--ghost" type="button" data-reload>Try again</button></div></div>`;
  }
};

chips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  filters.category = button.dataset.category;
  chips.querySelectorAll("[data-category]").forEach((chip) => chip.classList.toggle("is-active", chip === button));
  const url = new URL(location.href);
  filters.category ? url.searchParams.set("category", filters.category) : url.searchParams.delete("category");
  history.replaceState({}, "", url);
  render();
});

search.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    filters.search = search.value.trim();
    render();
  }, 280);
});

sort.addEventListener("change", render);

api.getBootstrap().then((data) => setSiteSettings(data.settings)).catch(() => {});
loadProducts();

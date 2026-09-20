import { api, setAdminToken } from "./api.js";

const state = {
  products: [],
  categories: [],
  videos: [],
  enquiries: [],
  settings: {},
  dashboard: {},
};

const resourceDialog = document.querySelector("[data-resource-dialog]");
const resourceForm = document.querySelector("[data-resource-form]");
const confirmDialog = document.querySelector("[data-confirm-dialog]");
const accessScreen = document.querySelector("[data-access-screen]");
let pendingDelete = null;
let currentView = "dashboard";
let resourceFormDirty = false;
let hasLoaded = false;

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const statusText = (value = "") => String(value).replaceAll("_", " ");

const searchable = (value = "") => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value))
  : "—";

const enquiryWhatsAppUrl = (item) => {
  const phone = String(item.phone || "").replace(/\D/g, "");
  const requirement = item.product_name || statusText(item.enquiry_type) || "your enquiry";
  const message = `Hello ${item.name || ""}, regarding your HUSBA Beads enquiry for ${requirement} (Reference: ${item.reference || ""}).`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const formatPrice = (item) => {
  if (!item.show_price) return "Price hidden";
  if (item.price_label) return item.price_label;
  if (item.price_minor == null) return "Price on request";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: item.currency || "INR",
    maximumFractionDigits: Number(item.price_minor) % 100 ? 2 : 0
  }).format(Number(item.price_minor) / 100);
};

const mediaUrl = (item) =>
  item.media?.find((entry) => entry.media_type === "image")?.url ||
  item.primary_image_url ||
  "/assets/media/products/pearl-glow-hero.webp";

const toast = (message, type = "success") => {
  const node = document.createElement("div");
  node.className = `toast${type === "error" ? " is-error" : ""}`;
  node.textContent = message;
  document.querySelector(".toast-region").append(node);
  if (navigator.vibrate) navigator.vibrate(type === "error" ? [40, 40, 40] : 35);
  setTimeout(() => node.remove(), 4200);
};

const empty = (title, copy) =>
  `<div class="admin-empty"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(copy)}</span></div></div>`;

const table = (headers, rows) => {
  const labelledRows = rows.map((row) => {
    let index = 0;
    return row.replace(/<td(\s|>)/g, (_match, ending) => `<td data-label="${escapeHtml(headers[index++] || "Details")}"${ending}`);
  });
  return `<table class="admin-table"><thead><tr>${headers.map((header) =>
    `<th>${escapeHtml(header)}</th>`
  ).join("")}</tr></thead><tbody>${labelledRows.join("")}</tbody></table>`;
};

const renderDashboard = () => {
  const counts = state.dashboard.counts || {};
  document.querySelectorAll("[data-product-badge]").forEach((badge) => {
    const count = Number(counts.products || 0);
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count < 1;
  });
  document.querySelectorAll("[data-enquiry-badge]").forEach((badge) => {
    const count = Number(counts.new_enquiries || 0);
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count < 1;
  });

  document.querySelector("[data-stats]").innerHTML = [
    ["Published products", counts.products || 0],
    ["New enquiries", counts.new_enquiries || 0],
    ["Product films", counts.videos || 0],
    ["Categories", counts.categories || 0],
  ].map(([label, value]) =>
    `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`
  ).join("");

  const recent = state.dashboard.recent_enquiries || [];

  document.querySelector("[data-recent-enquiries]").innerHTML =
    recent.length
      ? recent.map((item) =>
          `<div class="recent-item">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.product_name || statusText(item.enquiry_type))} · ${escapeHtml(item.reference)}</span>
            </div>
            <div class="recent-item__actions">
              <span class="status-pill status-pill--${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
              <time>${formatDate(item.created_at)}</time>
              <a class="whatsapp-action" href="${escapeHtml(enquiryWhatsAppUrl(item))}" target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </div>`
        ).join("")
      : empty("No enquiries yet", "New enquiries will appear here.");
};

const renderProducts = (query = "") => {
  const target = document.querySelector("[data-products-table]");
  const needle = searchable(query);
  const category = document.querySelector("[data-product-category-filter]")?.value || "";
  const status = document.querySelector("[data-product-status-filter]")?.value || "";
  const visibility = document.querySelector("[data-product-visibility-filter]")?.value || "";

  const items = state.products.filter((item) =>
    searchable(`${item.name || ""} ${item.product_code || ""}`).includes(needle) &&
    (!category || String(item.category_id) === category) &&
    (!status || item.status === status) &&
    (!visibility || (visibility === "published" ? item.is_active : !item.is_active))
  );

  const resultCount = document.querySelector("[data-product-result-count]");
  if (resultCount) {
    resultCount.textContent = needle
      ? `${items.length} of ${state.products.length} products`
      : `${state.products.length} products`;
  }

  if (!items.length) {
    target.innerHTML = empty(
      "No products found",
      "Add a product or try another search."
    );
    return;
  }

  target.innerHTML = table(
    ["Product", "Category", "Price", "Availability", "Order", "Visibility", "Actions"],
    items.map((item) =>
      `<tr>
        <td>
          <div class="table-product">
            <img src="${escapeHtml(mediaUrl(item))}" alt="">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <small>${escapeHtml(item.product_code || "No code")}</small>
            </div>
          </div>
        </td>
        <td>${escapeHtml(item.category_name || "Uncategorised")}</td>
        <td><strong>${escapeHtml(formatPrice(item))}</strong></td>
        <td>
          <span class="status-pill status-pill--${escapeHtml(item.status)}">
            ${escapeHtml(statusText(item.status))}
          </span>
        </td>
        <td>${Number(item.sort_order || 0)}</td>
        <td>
          <button class="visibility-toggle${item.is_active ? " is-on" : ""}" type="button" role="switch" aria-checked="${item.is_active ? "true" : "false"}" data-toggle-product data-id="${escapeHtml(item.id)}"><i></i><span>${item.is_active ? "Published" : "Hidden"}</span></button>
        </td>
        <td>
          <details class="card-menu"><summary aria-label="Product actions">•••</summary><div><button type="button" data-edit="product" data-id="${escapeHtml(item.id)}">Edit product</button><button type="button" data-delete="product" data-id="${escapeHtml(item.id)}">Delete product</button></div></details>
        </td>
      </tr>`
    )
  );
};

const renderCategories = () => {
  const target = document.querySelector("[data-categories-table]");

  if (!state.categories.length) {
    target.innerHTML = empty(
      "No categories yet",
      "Create the first category for your collection."
    );
    return;
  }

  target.innerHTML = table(
    ["Category", "Slug", "Order", "Visibility", "Actions"],
    state.categories.map((item) =>
      `<tr>
        <td>
          <strong>${escapeHtml(item.name)}</strong><br>
          <small>${escapeHtml(item.description || "")}</small>
        </td>
        <td>${escapeHtml(item.slug)}</td>
        <td>${Number(item.sort_order || 0)}</td>
        <td>
          <span class="status-pill${item.is_active ? " status-pill--active" : ""}">
            ${item.is_active ? "Published" : "Hidden"}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="table-action" type="button" data-edit="category" data-id="${escapeHtml(item.id)}">Edit</button>
            <button class="table-action" type="button" data-delete="category" data-id="${escapeHtml(item.id)}">Remove</button>
          </div>
        </td>
      </tr>`
    )
  );
};

const renderVideos = () => {
  const target = document.querySelector("[data-videos-table]");

  if (!state.videos.length) {
    target.innerHTML = empty(
      "No product videos yet",
      "Paste a Cloudinary video URL to publish the first film."
    );
    return;
  }

  target.innerHTML = table(
    ["Film", "Product", "Order", "Visibility", "Actions"],
    state.videos.map((item) =>
      `<tr>
        <td>
          <div class="table-product">
            <img src="${escapeHtml(item.poster_url || "/assets/media/products/blush-bloom.webp")}" alt="">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${item.is_featured ? "Homepage feature" : "Product film"}</small>
            </div>
          </div>
        </td>
        <td>${escapeHtml(item.product_name || "Not linked")}</td>
        <td>${Number(item.sort_order || 0)}</td>
        <td>
          <span class="status-pill${item.is_active ? " status-pill--active" : ""}">
            ${item.is_active ? "Published" : "Hidden"}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="table-action" type="button" data-edit="video" data-id="${escapeHtml(item.id)}">Edit</button>
            <button class="table-action" type="button" data-delete="video" data-id="${escapeHtml(item.id)}">Remove</button>
          </div>
        </td>
      </tr>`
    )
  );
};

const renderEnquiries = (query = "", filter = "") => {
  const target = document.querySelector("[data-enquiries-table]");
  const needle = query.toLowerCase();

  const items = state.enquiries.filter((item) =>
    (!filter || item.status === filter) &&
    `${item.name} ${item.phone} ${item.reference} ${item.product_name}`
      .toLowerCase()
      .includes(needle)
  );

  if (!items.length) {
    target.innerHTML = empty(
      "No matching enquiries",
      "New customer enquiries will appear here."
    );
    return;
  }

  target.innerHTML = table(
    ["Reference", "Customer", "Requirement", "Received", "Status", "Actions"],
    items.map((item) =>
      `<tr>
        <td><strong>${escapeHtml(item.reference)}</strong></td>
        <td>
          <strong>${escapeHtml(item.name)}</strong><br>
          <a href="${escapeHtml(enquiryWhatsAppUrl(item))}" target="_blank" rel="noopener">
            ${escapeHtml(item.phone)} ↗
          </a><br>
          <small>${escapeHtml(item.city || "")}</small>
        </td>
        <td>
          ${escapeHtml(item.product_name || statusText(item.enquiry_type))}<br>
          <small>Qty: ${Number(item.quantity || 1)}</small>
        </td>
        <td>${formatDate(item.created_at)}</td>
        <td>
          <span class="status-pill status-pill--${escapeHtml(item.status)}">
            ${escapeHtml(item.status)}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <a class="table-action whatsapp-action" href="${escapeHtml(enquiryWhatsAppUrl(item))}" target="_blank" rel="noopener">WhatsApp</a>
            <button class="table-action" type="button" data-edit="enquiry" data-id="${escapeHtml(item.id)}">Open</button>
            <button class="table-action table-action--danger" type="button" data-delete="enquiry" data-id="${escapeHtml(item.id)}">Delete</button>
          </div>
        </td>
      </tr>`
    )
  );
};

const renderSettings = () => {
  const form = document.querySelector("[data-settings-form]");

  for (const [key, value] of Object.entries(state.settings)) {
    if (form.elements[key]) {
      if (form.elements[key].type === "checkbox") {
        form.elements[key].checked = String(value) !== "false" && String(value) !== "0";
      } else {
        form.elements[key].value = value ?? "";
      }
    }
  }
};

const renderProductFilters = () => {
  const select = document.querySelector("[data-product-category-filter]");
  if (!select) return;
  const selected = select.value;
  select.innerHTML = `<option value="">All categories</option>${state.categories.map((item) =>
    `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`
  ).join("")}`;
  select.value = selected;
};

const renderAll = () => {
  renderDashboard();
  renderProductFilters();
  renderProducts(
    document.querySelector('[data-admin-search="products"]')?.value || ""
  );
  renderCategories();
  renderVideos();
  renderEnquiries(
    document.querySelector('[data-admin-search="enquiries"]')?.value || "",
    document.querySelector("[data-enquiry-filter]")?.value || ""
  );
  renderSettings();
};

const field = (label, name, value = "", options = {}) => {
  const full = options.full ? " field--full" : "";
  const required = options.required ? " required" : "";
  const max = options.maxlength
    ? ` maxlength="${options.maxlength}"`
    : "";

  const help = options.help
    ? `<small>${escapeHtml(options.help)}</small>`
    : "";

  if (options.type === "checkbox") {
    return `<label class="checkbox-field${full}">
      <input type="checkbox" name="${name}"${value ? " checked" : ""}>
      <span>${escapeHtml(label)}</span>
    </label>`;
  }

  if (options.type === "textarea") {
    return `<div class="field${full}">
      <label>${escapeHtml(label)}</label>
      <textarea name="${name}"${required}${max}>${escapeHtml(value)}</textarea>
      ${help}
    </div>`;
  }

  if (options.type === "select") {
    return `<div class="field${full}">
      <label>${escapeHtml(label)}</label>
      <select name="${name}"${required}>
        ${options.choices.map(([choiceValue, choiceLabel]) =>
          `<option value="${escapeHtml(choiceValue)}"${String(value) === String(choiceValue) ? " selected" : ""}>
            ${escapeHtml(choiceLabel)}
          </option>`
        ).join("")}
      </select>
      ${help}
    </div>`;
  }

  if (options.type === "image") {
    return `<div class="field${full}">
      <label>${escapeHtml(label)}</label>
      <input name="${name}" type="url" value="${escapeHtml(value)}"${required}${max} placeholder="Cloudinary image URL" inputmode="url">
      ${help}
    </div>`;
  }

  return `<div class="field${full}">
    <label>${escapeHtml(label)}</label>
    <input name="${name}" type="${options.type === "number" ? "number" : "text"}" value="${escapeHtml(value)}"${required}${max}>
    ${help}
  </div>`;
};

const findResource = (type, id) => {
  const collection = {
    product: state.products,
    category: state.categories,
    video: state.videos,
    enquiry: state.enquiries,
  }[type];

  return collection?.find((item) => String(item.id) === String(id));
};

const categoryImageMap = () => {
  try {
    const parsed = JSON.parse(String(state.settings.category_images || "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const openForm = (type, item = null) => {
  const title = document.querySelector("[data-dialog-title]");
  const fields = document.querySelector("[data-dialog-fields]");

  title.textContent = item
    ? `Edit ${type}`
    : `Add ${type}`;

  resourceForm.dataset.resource = type;
  resourceForm.dataset.id = item?.id || "";
  resourceFormDirty = false;

  const data = item || {};

  if (type === "product") {
    const productImages = data.media?.filter((media) => media.media_type === "image") || [];
    fields.innerHTML = [
      field("Product name", "name", data.name, { required: true }),
      field("Category", "category_id", data.category_id, {
        type: "select",
        choices: state.categories.map((category) => [category.id, category.name])
      }),
      field("Product code", "product_code", data.product_code),
      field("Slug", "slug", data.slug),
      field("Description", "description", data.description, { type: "textarea", full: true }),
      field("Materials", "materials", data.materials),
      field("Colors", "colors", data.colors),
      field("Sizes", "sizes", data.sizes),
      field("Price (₹ INR)", "price", data.price_minor ? Number(data.price_minor) / 100 : "", { type: "number", help: "Enter numbers only, for example 499." }),
      field("Custom price text (optional)", "price_label", data.price_label, { help: "Example: Starting at ₹499. Leave blank to show the amount above." }),
      field("Status", "status", data.status || "available", {
        type: "select",
        choices: [
          ["available", "Available"],
          ["sold_out", "Sold out"],
          ["made_to_order", "Made to order"]
        ]
      }),
      field("Sort order", "sort_order", data.sort_order || 0),
      ...Array.from({ length: 5 }, (_, index) =>
        field(
          `Image URL ${index + 1}${index === 0 ? " (required)" : ""}`,
          `image_url_${index + 1}`,
          productImages[index]?.url || "",
          {
            required: index === 0,
            full: true,
            type: "image",
            help: "Paste a Cloudinary image URL."
          }
        )
      ),
      field("Product video URL", "product_video_url", data.media?.find((m) => m.media_type === "video")?.url, { full: true })
      ,field("Show price on website", "show_price", item ? data.show_price : true, { type: "checkbox", full: true })
      ,field("Feature on homepage", "is_featured", data.is_featured, { type: "checkbox" })
      ,field("Mark as new", "is_new", data.is_new, { type: "checkbox" })
      ,field("Show product", "is_active", item ? data.is_active : true, { type: "checkbox" })
    ].join("");
  } else if (type === "category") {
    fields.innerHTML = [
      field("Name", "name", data.name, { required: true }),
      field("Slug", "slug", data.slug, { required: true }),
      field("Description", "description", data.description, { type: "textarea", full: true }),
      field("Category image URL", "category_image_url", categoryImageMap()[data.slug] || "", { type: "image", full: true, help: "Paste the Cloudinary image URL for this category. This image is used in the homepage collection grid." }),
      field("Sort order", "sort_order", data.sort_order || 0),
      field("Show category", "is_active", item ? data.is_active : true, { type: "checkbox", full: true })
    ].join("");
  } else if (type === "video") {
    fields.innerHTML = [
      field("Title", "title", data.title, { required: true }),
      field("Link to product", "product_id", data.product_id || "", {
        type: "select",
        choices: [["", "Not linked"], ...state.products.map((product) => [product.id, product.name])]
      }),
      field("Video URL", "video_url", data.video_url, { required: true, full: true }),
      field("Poster URL", "poster_url", data.poster_url, { full: true }),
      field("Caption", "caption", data.caption, { type: "textarea", full: true }),
      field("Sort order", "sort_order", data.sort_order || 0),
      field("Feature on homepage", "is_featured", data.is_featured, { type: "checkbox" }),
      field("Show video", "is_active", item ? data.is_active : true, { type: "checkbox" })
    ].join("");
  } else if (type === "enquiry") {
    const summary = item ? `<div class="enquiry-detail">
      <dl>
        <dt>Reference</dt><dd>${escapeHtml(data.reference || "")}</dd>
        <dt>Customer</dt><dd>${escapeHtml(data.name || "")}</dd>
        <dt>Phone</dt><dd>${escapeHtml(data.phone || "")}</dd>
        <dt>City</dt><dd>${escapeHtml(data.city || "—")}</dd>
        <dt>Requirement</dt><dd>${escapeHtml(data.product_name || statusText(data.enquiry_type) || "—")}</dd>
        <dt>Quantity</dt><dd>${Number(data.quantity || 1)}</dd>
        <dt>Received</dt><dd>${formatDate(data.created_at)}</dd>
      </dl>
      ${data.message ? `<p>${escapeHtml(data.message)}</p>` : ""}
    </div>` : "";
    fields.innerHTML = summary + [
      field("Status", "status", data.status || "new", {
        type: "select",
        choices: [
          ["new", "New"],
          ["contacted", "Contacted"],
          ["closed", "Closed"]
        ]
      }),
      field("Admin notes", "admin_notes", data.admin_notes, { type: "textarea", full: true })
    ].join("");
  }

  if (type === "product") {
    fields.querySelectorAll('input[name^="image_url_"]').forEach((input) => {
      const preview = document.createElement("img");
      preview.className = "field-image-preview";
      preview.alt = "";
      preview.loading = "lazy";
      const sync = () => {
        const url = input.value.trim();
        if (url) {
          preview.src = url;
          preview.classList.add("is-visible");
        } else {
          preview.classList.remove("is-visible");
          preview.removeAttribute("src");
        }
      };
      preview.addEventListener("error", () => preview.classList.remove("is-visible"));
      input.insertAdjacentElement("afterend", preview);
      input.addEventListener("input", sync);
      sync();
    });
  }

  history.pushState({ adminView: currentView, dialog: "resource" }, "", `#${currentView}`);
  resourceDialog.showModal();
};

const closeResourceDialog = (force = false) => {
  if (!force && resourceFormDirty && !window.confirm("Discard your unsaved changes?")) return;
  resourceFormDirty = false;
  if (history.state?.dialog === "resource") history.back();
  else resourceDialog.close();
};

const payloadFromForm = (type, form) => {
  const data = new FormData(form);
  const bool = (name) => data.get(name) === "on";

  if (type === "product") {
    const images = Array.from({ length: 5 }, (_, index) =>
      String(data.get(`image_url_${index + 1}`) || "").trim()
    )
      .filter(Boolean);

    const video = String(data.get("product_video_url") || "").trim();

    return {
      name: data.get("name"),
      category_id: data.get("category_id"),
      product_code: data.get("product_code"),
      slug: data.get("slug"),
      description: data.get("description"),
      materials: data.get("materials"),
      colors: data.get("colors"),
      sizes: data.get("sizes"),
      status: data.get("status"),
      price_minor: data.get("price")
        ? Math.round(Number(data.get("price")) * 100)
        : null,
      price_label: data.get("price_label"),
      currency: "INR",
      show_price: bool("show_price"),
      is_featured: bool("is_featured"),
      is_new: bool("is_new"),
      is_active: bool("is_active"),
      sort_order: Number(data.get("sort_order") || 0),
      media: [
        ...images.map((url, index) => ({
          media_type: "image",
          url,
          alt_text: data.get("name"),
          sort_order: index + 1
        })),
        ...(video
          ? [{
              media_type: "video",
              url: video,
              alt_text: `${data.get("name")} video`,
              sort_order: images.length + 1
            }]
          : [])
      ]
    };
  }

  if (type === "category") {
    return {
      name: data.get("name"),
      slug: data.get("slug"),
      description: data.get("description"),
      category_image_url: data.get("category_image_url"),
      sort_order: Number(data.get("sort_order") || 0),
      is_active: bool("is_active")
    };
  }

  if (type === "video") {
    return {
      title: data.get("title"),
      product_id: data.get("product_id") || null,
      caption: data.get("caption"),
      video_url: data.get("video_url"),
      poster_url: data.get("poster_url"),
      sort_order: Number(data.get("sort_order") || 0),
      is_featured: bool("is_featured"),
      is_active: bool("is_active")
    };
  }

  return {
    status: data.get("status"),
    admin_notes: data.get("admin_notes")
  };
};

const productPayloadFromItem = (item, overrides = {}) => ({
  name: item.name,
  category_id: item.category_id,
  product_code: item.product_code || "",
  slug: item.slug,
  description: item.description,
  materials: item.materials || "",
  colors: item.colors || "",
  sizes: item.sizes || "",
  status: item.status,
  price_minor: item.price_minor,
  price_label: item.price_label || "",
  currency: item.currency || "INR",
  show_price: Boolean(item.show_price),
  is_featured: Boolean(item.is_featured),
  is_new: Boolean(item.is_new),
  is_active: Boolean(item.is_active),
  sort_order: Number(item.sort_order || 0),
  media: (item.media || []).map((media) => ({
    media_type: media.media_type,
    url: media.url,
    cloudinary_public_id: media.cloudinary_public_id || "",
    poster_url: media.poster_url || "",
    alt_text: media.alt_text || item.name,
    sort_order: Number(media.sort_order || 0)
  })),
  ...overrides
});

const resourcePath = (type) => ({
  product: "products",
  category: "categories",
  video: "videos",
  enquiry: "enquiries"
})[type];

const reloadResource = async (type) => {
  const path = resourcePath(type);

  const result = await api.admin(
    `/${path}${type === "enquiry" ? "" : "?include_inactive=1"}`
  );

  state[path] = result[path] || [];

  state.dashboard = (await api.admin("/dashboard")).dashboard;

  renderAll();
};

resourceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!resourceForm.reportValidity()) return;

  const type = resourceForm.dataset.resource;
  const id = resourceForm.dataset.id;

  const save = document.querySelector("[data-save-resource]");
  const error = document.querySelector("[data-dialog-error]");

  save.disabled = true;
  error.textContent = "";

  try {
    const resourcePayload = payloadFromForm(type, resourceForm);
    await api.admin(
      `/${resourcePath(type)}${id ? `/${encodeURIComponent(id)}` : ""}`,
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(resourcePayload)
      }
    );

    if (type === "category") {
      const map = categoryImageMap();
      if (id) {
        const previous = findResource("category", id);
        if (previous?.slug && previous.slug !== resourcePayload.slug) delete map[previous.slug];
      }
      const imageUrl = String(resourcePayload.category_image_url || "").trim();
      if (imageUrl) map[resourcePayload.slug] = imageUrl;
      else delete map[resourcePayload.slug];
      await api.admin("/settings", { method: "PUT", body: JSON.stringify({ category_images: JSON.stringify(map) }) });
      state.settings = { ...state.settings, category_images: JSON.stringify(map) };
    }

    await reloadResource(type);
    resourceFormDirty = false;
    closeResourceDialog(true);
    toast(`${type[0].toUpperCase()}${type.slice(1)} saved.`);
  } catch (requestError) {
    error.textContent = requestError.message;
    error.className = "dialog-body form-status is-error";
  } finally {
    save.disabled = false;
  }
});

const removeResource = async () => {
  if (!pendingDelete) return;

  const { type, id } = pendingDelete;
  const button = document.querySelector("[data-confirm-delete]");

  button.disabled = true;

  try {
    await api.admin(
      `/${resourcePath(type)}/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );

    await reloadResource(type);
    if (history.state?.dialog === "confirm") history.back();
    else confirmDialog.close();
    toast(`${type[0].toUpperCase()}${type.slice(1)} removed.`);
  } catch (error) {
    toast(error.message, "error");
  } finally {
    button.disabled = false;
    pendingDelete = null;
  }
};

const showView = (name, options = {}) => {
  currentView = name;
  document.querySelectorAll("[data-view]").forEach((view) => {
    view.hidden = view.dataset.view !== name;
  });

  document.querySelectorAll("[data-view-button]").forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.viewButton === name
    );
  });

  const label =
    document.querySelector(`[data-view-button="${name}"]`)?.textContent ||
    "Admin";

  document.querySelector("[data-view-title]").textContent = label;
  document.querySelector("[data-admin-back]").hidden = name === "dashboard";

  document
    .querySelector("[data-admin-sidebar]")
    .classList.remove("is-open");
  document.querySelector("[data-admin-sidebar-scrim]").hidden = true;
  if (options.history !== false) {
    history.pushState({ adminView: name }, "", `#${name}`);
  }
  window.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });
};

document.querySelector("[data-admin-back]").addEventListener("click", () => history.back());

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest(
    "[data-view-button], [data-jump-view]"
  );

  if (viewButton) {
    showView(
      viewButton.dataset.viewButton ||
      viewButton.dataset.jumpView
    );
  }

  const create = event.target.closest("[data-create]");

  if (create) {
    openForm(create.dataset.create);
  }

  const edit = event.target.closest("[data-edit]");

  if (edit) {
    openForm(
      edit.dataset.edit,
      findResource(edit.dataset.edit, edit.dataset.id)
    );
  }

  const toggleProduct = event.target.closest("[data-toggle-product]");
  if (toggleProduct) {
    const item = findResource("product", toggleProduct.dataset.id);
    if (item) {
      toggleProduct.disabled = true;
      try {
        await api.admin(`/products/${encodeURIComponent(item.id)}`, {
          method: "PUT",
          body: JSON.stringify(productPayloadFromItem(item, { is_active: !item.is_active }))
        });
        await reloadResource("product");
        toast(`Product ${item.is_active ? "hidden" : "published"}.`);
      } catch (error) {
        toast(error.message, "error");
        toggleProduct.disabled = false;
      }
    }
  }

  const remove = event.target.closest("[data-delete]");

  if (remove) {
    pendingDelete = {
      type: remove.dataset.delete,
      id: remove.dataset.id
    };

    document.querySelector("[data-confirm-message]").textContent =
      `Remove this ${remove.dataset.delete}? This cannot be undone.`;

    history.pushState({ adminView: currentView, dialog: "confirm" }, "", `#${currentView}`);
    confirmDialog.showModal();
  }

  if (event.target.closest("[data-close-admin-dialog]")) {
    closeResourceDialog();
  }

  if (event.target.closest("[data-cancel-delete]")) {
    if (history.state?.dialog === "confirm") history.back();
    else confirmDialog.close();
  }

  if (event.target.closest("[data-confirm-delete]")) {
    removeResource();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches('[data-admin-search="products"]')) {
    renderProducts(event.target.value);
  }
  if (event.target.closest("[data-resource-form]")) resourceFormDirty = true;
});

document.querySelectorAll("[data-product-category-filter], [data-product-status-filter], [data-product-visibility-filter]")
  .forEach((filter) => filter.addEventListener("change", () =>
    renderProducts(document.querySelector('[data-admin-search="products"]').value)
  ));

document.querySelector("[data-clear-product-filters]").addEventListener("click", () => {
  document.querySelector('[data-admin-search="products"]').value = "";
  document.querySelectorAll("[data-product-category-filter], [data-product-status-filter], [data-product-visibility-filter]")
    .forEach((filter) => { filter.value = ""; });
  renderProducts("");
});

document
  .querySelector('[data-admin-search="enquiries"]')
  .addEventListener("input", (event) =>
    renderEnquiries(
      event.target.value,
      document.querySelector("[data-enquiry-filter]").value
    )
  );

document
  .querySelector("[data-enquiry-filter]")
  .addEventListener("change", (event) =>
    renderEnquiries(
      document.querySelector('[data-admin-search="enquiries"]').value,
      event.target.value
    )
  );

document
  .querySelectorAll("[data-admin-menu]")
  .forEach((button) => button.addEventListener("click", () => {
    const sidebar = document.querySelector("[data-admin-sidebar]");
    const open = !sidebar.classList.contains("is-open");
    sidebar.classList.toggle("is-open", open);
    document.querySelector("[data-admin-sidebar-scrim]").hidden = !open;
  }));

document
  .querySelector("[data-settings-form]")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.target;
    const status = form.querySelector("[data-settings-status]");
    const payload = Object.fromEntries(new FormData(form));
    ["announcement_1", "announcement_2", "announcement_3"].forEach((key) => {
      payload[key] = String(payload[key] || "").trim();
    });
    form.querySelectorAll('input[type="checkbox"][name]').forEach((checkbox) => {
      payload[checkbox.name] = checkbox.checked ? "true" : "false";
    });

    status.textContent = "Saving…";

    try {
      const result = await api.admin("/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      state.settings = result.settings;

      status.className = "form-status is-success";
      status.textContent = "Website content saved.";
    } catch (error) {
      status.className = "form-status is-error";
      status.textContent = error.message;
    }
  });

const loginPanel = document.querySelector("[data-login-panel]");
const loadingPanel = document.querySelector("[data-loading-panel]");
const loginForm = document.querySelector("[data-login-form]");
const loginStatus = document.querySelector("[data-login-status]");

const showLogin = (
  message = "Sign in to manage your HUSBA website."
) => {
  accessScreen.hidden = false;
  loginPanel.hidden = false;
  loadingPanel.hidden = true;

  document.querySelector("[data-access-message]").textContent =
    message;

};

const load = async () => {
  document.body.classList.add("is-loading");
  if (!hasLoaded) {
    accessScreen.hidden = false;
    loginPanel.hidden = true;
    loadingPanel.hidden = false;
  } else {
    document.querySelector("[data-stats]").innerHTML = Array.from({ length: 4 }, () => '<div class="stat-card skeleton-card"><i></i><b></b></div>').join("");
    document.querySelector("[data-recent-enquiries]").innerHTML = Array.from({ length: 3 }, () => '<div class="skeleton-row"><i></i><span></span></div>').join("");
  }

  const accessMessage = document.querySelector("[data-access-message]");
  if (accessMessage) accessMessage.textContent = "Checking your secure admin session…";

  try {
    await api.admin("/session");

    const [
      dashboard,
      products,
      categories,
      videos,
      enquiries,
      settings
    ] = await Promise.all([
      api.admin("/dashboard"),
      api.admin("/products?include_inactive=1"),
      api.admin("/categories?include_inactive=1"),
      api.admin("/videos?include_inactive=1"),
      api.admin("/enquiries"),
      api.admin("/settings")
    ]);

    state.dashboard = dashboard.dashboard || {};
    state.products = products.products || [];
    state.categories = categories.categories || [];
    state.videos = videos.videos || [];
    state.enquiries = enquiries.enquiries || [];
    state.settings = settings.settings || {};

    renderAll();
    hasLoaded = true;

    accessScreen.hidden = true;

    const badge = document.querySelector("[data-connection]");
    badge.textContent = "Securely connected";
    badge.classList.add("is-online");
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      showLogin("Sign in with your HUSBA admin account.");
    } else if (hasLoaded) {
      renderAll();
      toast(error.message || "Could not refresh data.", "error");
    } else {
      showLogin(
        error.message ||
        "The admin service is temporarily unavailable."
      );
    }

    document.querySelector("[data-connection]").textContent =
      "Not connected";
  } finally {
    document.body.classList.remove("is-loading");
  }
};

// Keep the long-lived admin session fresh while the admin app is open.
let sessionHeartbeatTimer = null;
const startSessionHeartbeat = () => {
  if (sessionHeartbeatTimer) clearInterval(sessionHeartbeatTimer);
  sessionHeartbeatTimer = setInterval(async () => {
    try {
      const result = await api.admin("/session");
      if (result?.token) setAdminToken(result.token);
    } catch (error) {
      // Do not sign the user out merely because a background refresh failed.
      // The next foreground API request will surface a real authentication error.
      if (error?.status !== 401 && error?.status !== 403) return;
    }
  }, 10 * 60 * 1000);
};
startSessionHeartbeat();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!loginForm.reportValidity()) return;

  const button = document.querySelector("[data-login-submit]");

  button.disabled = true;

  loginStatus.textContent = "";
  loginStatus.className = "form-status";

  const data = new FormData(loginForm);

  try {
    const result = await api.login(
      data.get("email"),
      data.get("password")
    );

    setAdminToken(result.token);

    loginForm.reset();

    await load();
  } catch (error) {
    loginStatus.textContent = error.message;
    loginStatus.className = "form-status is-error";
  } finally {
    button.disabled = false;
  }
});

document
  .querySelectorAll("[data-logout]")
  .forEach((button) => button.addEventListener("click", async () => {
    try {
      await api.logout();
    } catch {
      // Local token is still cleared.
    }

    setAdminToken("");
    showLogin("You have been signed out.");
  }));

document
  .querySelector("[data-refresh]")
  .addEventListener("click", load);

document.querySelector("[data-clear-cache]")?.addEventListener("click", async () => {
  const button = document.querySelector("[data-clear-cache]");
  button.disabled = true;
  try {
    if ("caches" in window) {
      await Promise.all((await caches.keys()).filter((key) => key.startsWith("husba-admin-")).map((key) => caches.delete(key)));
    }
    const registration = await navigator.serviceWorker?.getRegistration("/admin/");
    await registration?.update();
    toast("App files refreshed. Reloading…");
    setTimeout(() => location.reload(), 650);
  } catch (error) {
    toast(error.message || "Could not refresh app files.", "error");
    button.disabled = false;
  }
});

const updateConnectionState = () => {
  const online = navigator.onLine;
  const banner = document.querySelector("[data-offline-banner]");
  banner.hidden = online;
  document.querySelector("[data-offline-screen]").hidden = online || hasLoaded;
  const badge = document.querySelector("[data-connection]");
  if (!online) {
    badge.textContent = "Offline";
    badge.classList.remove("is-online");
  } else if (!accessScreen || accessScreen.hidden) {
    badge.textContent = "Securely connected";
    badge.classList.add("is-online");
  }
};

window.addEventListener("online", () => { updateConnectionState(); toast("Back online."); });
window.addEventListener("offline", updateConnectionState);
document.querySelector("[data-retry-connection]").addEventListener("click", () => {
  updateConnectionState();
  if (navigator.onLine) load();
});

let pullStart = 0;
let pullDistance = 0;
const pullIndicator = document.querySelector("[data-pull-indicator]");
window.addEventListener("touchstart", (event) => {
  if (scrollY !== 0 || event.target.closest("input, textarea, select, dialog")) return;
  pullStart = event.touches[0].clientY;
  pullDistance = 0;
}, { passive: true });
window.addEventListener("touchmove", (event) => {
  if (!pullStart) return;
  pullDistance = Math.min(110, Math.max(0, event.touches[0].clientY - pullStart));
  pullIndicator.style.transform = `translate(-50%, ${Math.max(-70, pullDistance - 70)}px)`;
  pullIndicator.classList.toggle("is-ready", pullDistance >= 75);
  pullIndicator.querySelector("b").textContent = pullDistance >= 75 ? "Release to refresh" : "Pull to refresh";
}, { passive: true });
window.addEventListener("touchend", async () => {
  if (!pullStart) return;
  const refresh = pullDistance >= 75;
  pullStart = 0;
  if (refresh) {
    pullIndicator.classList.add("is-refreshing");
    pullIndicator.querySelector("b").textContent = "Refreshing…";
    await load();
  }
  pullIndicator.style.transform = "translate(-50%, -80px)";
  pullIndicator.classList.remove("is-ready", "is-refreshing");
}, { passive: true });

const requestedView = location.hash.slice(1);
const validViews = new Set(["dashboard", "products", "categories", "videos", "enquiries", "content"]);
history.replaceState({ adminView: "dashboard" }, "", "#dashboard");
if (validViews.has(requestedView) && requestedView !== "dashboard") {
  showView(requestedView, { instant: true });
}
window.addEventListener("popstate", (event) => {
  if (resourceDialog.open) {
    resourceFormDirty = false;
    resourceDialog.close();
  }
  if (confirmDialog.open) confirmDialog.close();
  showView(event.state?.adminView || "dashboard", { history: false, instant: true });
});

window.addEventListener("beforeunload", (event) => {
  if (!resourceFormDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

load();
updateConnectionState();

let installPrompt = null;
const installButton = document.querySelector("[data-install-app]");
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  if (isStandalone || localStorage.getItem("husba-admin-installed") === "1") return;
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  if (choice.outcome === "accepted") localStorage.setItem("husba-admin-installed", "1");
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener("appinstalled", () => {
  localStorage.setItem("husba-admin-installed", "1");
  installButton.hidden = true;
});
if (isStandalone) installButton.hidden = true;
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" }).catch(() => {}));
}

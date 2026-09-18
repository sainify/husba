import { api } from "./api.js";
import { setSiteSettings } from "./shared.js";

const setText = (selector, value, fallback = "Available after launch") => {
  const element = document.querySelector(selector);
  if (!element) return;
  element.textContent = value || fallback;
};

api.getBootstrap().then(({ settings }) => {
  setSiteSettings(settings);
  setText("[data-contact-whatsapp]", settings.whatsapp_display, "Add from the admin panel");
  setText("[data-contact-email]", settings.email, "Add from the admin panel");
  setText("[data-contact-location]", settings.location, "India");
  const instagram = document.querySelector("[data-contact-instagram]");
  if (instagram) instagram.href = settings.instagram_url || "https://www.instagram.com/husba.beads/";
}).catch(() => {});


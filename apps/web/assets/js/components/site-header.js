

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/collections/', label: 'Collections' },
  { href: '/videos/', label: 'The Edit' },
  { href: '/story/', label: 'Our Story' },
  { href: '/contact/', label: 'Enquire' },
];

class SiteHeader extends HTMLElement {
  connectedCallback() {
    const current = location.pathname;
    const navHtml = (extraClass = '') =>
      NAV.map(
        (item) =>
          `<a class="${extraClass}" href="${item.href}" ${
            current === item.href ? 'aria-current="page"' : ''
          }>${item.label}</a>`
      ).join('');

    this.innerHTML = `
      <div class="hb-announce" id="hb-announce" hidden></div>
      <header class="hb-header" data-menu-open="false">
        <div class="hb-wrap hb-header__bar">
          <a href="/" class="hb-header__mark">HUSBA Beads</a>
          <nav class="hb-header__nav" aria-label="Primary">${navHtml()}</nav>
          <div class="hb-header__actions">
            <a class="hb-icon-btn" href="/collections/" aria-label="Search collections">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            </a>
            <button class="hb-menu-btn" aria-expanded="false" aria-controls="hb-mobile-menu" aria-label="Open menu">
              <span class="hb-menu-btn__bars"><span></span><span></span><span></span></span>
            </button>
          </div>
        </div>
      </header>
      <nav class="hb-mobile-menu" id="hb-mobile-menu" aria-label="Mobile" data-open="false" inert>
        ${navHtml()}
        <div class="hb-mobile-menu__foot">
          <a class="hb-btn hb-btn--whatsapp" data-whatsapp="919326840719" href="#">WhatsApp us</a>
        </div>
      </nav>
    `;

  }
}

customElements.define('site-header', SiteHeader);

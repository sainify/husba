class SiteFooter extends HTMLElement {
  connectedCallback() {
    const year = new Date().getFullYear();
    this.innerHTML = `
      <footer class="hb-footer">
        <div class="hb-wrap hb-footer__grid">
          <div>
            <div class="hb-footer__mark">HUSBA Beads</div>
            <p class="hb-footer__tag">Handmade beaded jewellery, made to order in small batches from Mumbai.</p>
            <div class="hb-footer__social">
              <a class="hb-icon-btn" href="https://www.instagram.com/husba.beads/" target="_blank" rel="noopener" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>
              </a>
              <a class="hb-icon-btn" data-whatsapp="919326840719" href="#" aria-label="WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-5A8.5 8.5 0 1 1 21 11.5Z"/></svg>
              </a>
            </div>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><a href="/collections/">All collections</a></li>
              <li><a href="/videos/">The HUSBA Edit</a></li>
              <li><a href="/contact/">Custom enquiry</a></li>
            </ul>
          </div>
          <div>
            <h4>About</h4>
            <ul>
              <li><a href="/story/">Our story</a></li>
              <li><a href="/contact/">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Policies</h4>
            <ul>
              <li><a href="/policies/privacy.html">Privacy policy</a></li>
              <li><a href="/policies/terms.html">Terms of enquiry</a></li>
            </ul>
          </div>
        </div>
        <div class="hb-wrap hb-footer__bottom">
          <span>© ${year} HUSBA Beads · Handcrafted in Mumbai</span>
          <a href="https://wa.me/919326840719" target="_blank" rel="noopener">All rights reserved by Mohd Husain</a>
        </div>
      </footer>
      <a class="hb-fab-whatsapp" data-whatsapp="919326840719" href="#" aria-label="Message us on WhatsApp">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#08350f" stroke-width="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-5A8.5 8.5 0 1 1 21 11.5Z"/></svg>
      </a>
    `;
  }
}

customElements.define('site-footer', SiteFooter);

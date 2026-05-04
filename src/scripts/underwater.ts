// scripts/site-effects.ts

/**
 * =========================
 * Smooth Scroll
 * =========================
 */
function initSmoothScroll(offset = 80) {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;

      e.preventDefault();

      const top = target.offsetTop - offset;
      window.scrollTo({
        top,
        behavior: 'smooth',
      });
    });
  });
}

/**
 * =========================
 * Active Navbar on Scroll
 * =========================
 */
function initActiveNavbar(offset = 100) {
  const sections = document.querySelectorAll<HTMLElement>('section[id]');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-link');

  function activateNav() {
    const scrollY = window.pageYOffset;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - offset;
      const sectionHeight = section.offsetHeight;
      const id = section.getAttribute('id');
      if (!id) return;

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach((link) => link.classList.remove('active'));
        document
          .querySelectorAll<HTMLAnchorElement>(`.nav-link[href="#${id}"]`)
          .forEach((link) => link.classList.add('active'));
      }
    });
  }

  window.addEventListener('scroll', activateNav);
  activateNav();
}

/**
 * =========================
 * Flower Rain Effect
 * =========================
 */
class FlowerRain {
  private flowers: string[];
  private leafs: string[];
  private container!: HTMLDivElement;

  constructor(flowers: string[], leafs: string[]) {
    this.flowers = flowers;
    this.leafs = leafs;
    this.init();
  }

  private init() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    `;
    this.container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.container);

    this.createItem();
    setInterval(() => this.createItem(), 3000);
  }

  private createItem() {
    const img = document.createElement('img');
    const isLeaf = Math.random() < 0.5;

    const src = isLeaf
      ? this.leafs[Math.floor(Math.random() * this.leafs.length)]
      : this.flowers[Math.floor(Math.random() * this.flowers.length)];

    img.src = src;

    /**
     * ✅ Accessibility
     * Decorative image → empty alt + aria-hidden
     */
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');

    img.style.cssText = `
      position: absolute;
      top: -50px;
      left: ${Math.random() * 90}%;
      width: ${30 + Math.random() * 30}px;
      opacity: 0.95;
      user-select: none;
      pointer-events: none;
    `;

    img.onerror = () => {
      const emojis = ['🌸', '🌺', '🌼', '🍃', '🌿'];
      const fallback = document.createElement('div');
      fallback.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      fallback.style.cssText = img.style.cssText + `
        font-size: ${20 + Math.random() * 15}px;
      `;
      fallback.setAttribute('aria-hidden', 'true');
      img.replaceWith(fallback);
      this.animate(fallback);
    };

    this.container.appendChild(img);
    this.animate(img);
  }

  private animate(el: HTMLElement) {
    const duration = 8000 + Math.random() * 7000;
    const startX = parseFloat(el.style.left);
    const drift = (Math.random() - 0.75) * 100;
    const rotation = Math.random() * 720 - 360;
    const swingAmp = 30 + Math.random() * 50;
    const swingFreq = 2 + Math.random() * 3;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = (now - start) / duration;
      if (progress >= 1) {
        el.remove();
        return;
      }

      const y = progress * (window.innerHeight + 100);
      const swing = Math.sin(progress * Math.PI * swingFreq) * swingAmp;
      const x = startX + drift * progress + swing;

      el.style.transform = `
        translate(${x - startX}%, ${y}px)
        rotate(${rotation * progress}deg)
        scale(${0.8 + Math.sin(progress * Math.PI * 4) * 0.2})
      `;
      el.style.opacity = `${0.95 - progress}`;

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
}

/**
 * =========================
 * INIT ALL
 * =========================
 */
export function initSiteEffects() {
  initSmoothScroll(80);
  initActiveNavbar(100);

  new FlowerRain(
    [
      '/img/flower1.png',
      '/img/flower2.png',
      '/img/flower3.png',
    ],
    [
      '/img/leaf1.png',
      '/img/leaf2.png',
      '/img/leaf3.png',
      '/img/leaf4.png',
    ]
  );
}

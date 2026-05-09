/* ============================================================
   LUMIÈRE — Main JavaScript
   Scroll animaties, nav gedrag, search, mobile menu
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. SCROLL ANIMATIES (Intersection Observer) ──────────── */
  const fadeEls = document.querySelectorAll('.fade-up');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px'
  });

  fadeEls.forEach(el => observer.observe(el));


  /* ── 2. NAV SCROLL GEDRAG ─────────────────────────────────── */
  const header = document.getElementById('site-header');
  const announcementBar = document.querySelector('.announcement-bar');
  let lastScrollY = 0;
  let ticking = false;

  const handleScroll = () => {
    const scrollY = window.scrollY;

    // Nav wordt wit na 80px scrollen
    if (scrollY > 80) {
      header.classList.add('scrolled');
      announcementBar.style.transform = 'translateY(-100%)';
      announcementBar.style.transition = 'transform 0.4s ease';
    } else {
      header.classList.remove('scrolled');
      announcementBar.style.transform = 'translateY(0)';
    }

    lastScrollY = scrollY;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }, { passive: true });


  /* ── 3. PARALLAX HERO (subtiel) ──────────────────────────── */
  const hero = document.querySelector('.hero');
  const heroContent = document.querySelector('.hero-content');

  if (hero && heroContent) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY < window.innerHeight) {
        heroContent.style.transform = `translateY(${scrollY * 0.25}px)`;
        heroContent.style.opacity = 1 - (scrollY / window.innerHeight) * 1.5;
      }
    }, { passive: true });
  }


  /* ── 4. BANNER PARALLAX ───────────────────────────────────── */
  const parallaxImgs = document.querySelectorAll('.parallax-img');

  if (parallaxImgs.length > 0) {
    window.addEventListener('scroll', () => {
      parallaxImgs.forEach(img => {
        const rect = img.closest('section').getBoundingClientRect();
        const centerOffset = (rect.top + rect.height / 2) - window.innerHeight / 2;
        img.style.transform = `translateY(${centerOffset * 0.15}px)`;
      });
    }, { passive: true });
  }


  /* ── 5. MOBILE MENU ───────────────────────────────────────── */
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  let menuOpen = false;

  mobileMenuBtn?.addEventListener('click', () => {
    menuOpen = !menuOpen;
    mobileMenu.classList.toggle('open', menuOpen);
    document.body.style.overflow = menuOpen ? 'hidden' : '';

    // Hamburger → X animatie
    const spans = mobileMenuBtn.querySelectorAll('span');
    if (menuOpen) {
      spans[0].style.transform = 'translateY(6px) rotate(45deg)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'translateY(-6px) rotate(-45deg)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

  // Sluit menu bij klik op link
  mobileMenu?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuOpen = false;
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });


  /* ── 6. ZOEK OVERLAY ──────────────────────────────────────── */
  const searchBtn = document.getElementById('search-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const searchClose = document.getElementById('search-close');
  const searchInput = document.getElementById('search-input');

  searchBtn?.addEventListener('click', () => {
    searchOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInput?.focus(), 300);
  });

  searchClose?.addEventListener('click', closeSearch);

  searchOverlay?.addEventListener('click', (e) => {
    if (e.target === searchOverlay) closeSearch();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });

  function closeSearch() {
    searchOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Zoek suggesties klikbaar maken
  document.querySelectorAll('.search-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = tag.textContent;
        searchInput.focus();
        // Hier koppel je later de Shopify search API
      }
    });
  });


  /* ── 7. NIEUWSBRIEF FORMULIER ─────────────────────────────── */
  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterSuccess = document.getElementById('newsletter-success');

  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletter-email')?.value;

    if (!email) return;

    // Hier koppel je Klaviyo, Mailchimp of Shopify customer
    console.log('Newsletter signup:', email);

    newsletterForm.style.display = 'none';
    newsletterSuccess?.classList.add('visible');
  });


  /* ── 8. WISHLIST TOGGLE ───────────────────────────────────── */
  document.querySelectorAll('.product-wishlist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('active');

      // Sla op in localStorage
      const productName = btn.closest('.product-card')?.querySelector('.product-name')?.textContent;
      if (productName) {
        let wishlist = JSON.parse(localStorage.getItem('lumiere_wishlist') || '[]');
        if (btn.classList.contains('active')) {
          wishlist.push(productName);
        } else {
          wishlist = wishlist.filter(item => item !== productName);
        }
        localStorage.setItem('lumiere_wishlist', JSON.stringify(wishlist));
      }
    });
  });


  /* ── 9. AFBEELDINGEN LADEN ────────────────────────────────── */
  document.querySelectorAll('img').forEach(img => {
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'));
    }
  });


  /* ── 10. SMOOTH ANCHOR SCROLL ─────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 100;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  /* ── 11. INSTAGRAM CONFIG ─────────────────────────────────── */
  // Vul hier je Instagram handle in als je Instafeed.js wilt gebruiken:
  // const INSTAGRAM_HANDLE = '@lumiere.jewellery';
  //
  // Gebruik een Shopify app (bijv. "Instafeed" of "Storefronts")
  // voor eenvoudige Instagram integratie zonder API setup.


  /* ── 12. SCROLL PROGRESS INDICATOR ───────────────────────── */
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 2px;
    background: var(--tiffany);
    z-index: 300;
    width: 0%;
    transition: width 0.1s linear;
    pointer-events: none;
  `;
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    progressBar.style.width = `${Math.min(progress, 100)}%`;
  }, { passive: true });

});

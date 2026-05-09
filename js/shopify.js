/* ============================================================
   LUMIÈRE — Shopify Storefront API Integratie
   ─────────────────────────────────────────────────────────────

   HOE KOPPELEN MET SHOPIFY:
   ─────────────────────────
   1. Ga in Shopify admin naar:
      Apps → Apps beheren → Eigen apps ontwikkelen →
      Maak een app → Storefront API instellen

   2. Geef de app toegang tot:
      - products (lezen)
      - collections (lezen)
      - cart (lezen + schrijven)

   3. Kopieer je "Storefront API access token"

   4. Vul hieronder in:
      SHOPIFY_DOMAIN   → jouwwinkel.myshopify.com
      STOREFRONT_TOKEN → je access token

   ============================================================ */

const SHOPIFY_CONFIG = {
  domain: 'JOUW-WINKEL.myshopify.com',       // ← Aanpassen
  storefrontToken: 'JOUW-STOREFRONT-TOKEN',  // ← Aanpassen
  apiVersion: '2025-01',
};

/* ── GraphQL helper ── */
async function shopifyFetch(query, variables = {}) {
  const endpoint = `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    console.warn('Shopify API niet bereikbaar — placeholder producten worden getoond.');
    return null;
  }

  const { data, errors } = await response.json();
  if (errors) {
    console.error('Shopify GraphQL errors:', errors);
    return null;
  }

  return data;
}

/* ── Bestsellers ophalen ── */
async function loadBestsellers() {
  const query = `
    query getBestsellers {
      products(first: 4, sortKey: BEST_SELLING) {
        edges {
          node {
            id
            title
            handle
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 2) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            metafield(namespace: "custom", key: "material") {
              value
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  availableForSale
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch(query);

  if (!data?.products?.edges?.length) {
    // Geen verbinding of geen producten — toon placeholder kaarten
    return;
  }

  const grid = document.getElementById('products-grid');
  if (!grid) return;

  // Vervang placeholders door echte producten
  grid.innerHTML = '';

  data.products.edges.forEach(({ node: product }, i) => {
    const price = parseFloat(product.priceRange.minVariantPrice.amount).toLocaleString('nl-NL', {
      style: 'currency',
      currency: product.priceRange.minVariantPrice.currencyCode,
    });

    const image = product.images.edges[0]?.node;
    const secondImage = product.images.edges[1]?.node;
    const material = product.metafield?.value || '';
    const variantId = product.variants.edges[0]?.node?.id;
    const available = product.variants.edges[0]?.node?.availableForSale;

    const delayClass = i > 0 ? `delay-${i}` : '';

    const card = document.createElement('article');
    card.className = `product-card fade-up ${delayClass}`;
    card.dataset.variantId = variantId;

    card.innerHTML = `
      <div class="product-img-wrap">
        <img
          src="${image?.url || ''}"
          alt="${image?.altText || product.title}"
          loading="lazy"
          data-hover="${secondImage?.url || image?.url || ''}"
        />
        <button class="product-wishlist" aria-label="Opslaan">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <div class="product-quick-add">
          <button class="btn-quick-add" ${!available ? 'disabled' : ''}>
            ${available ? 'Snel toevoegen' : 'Uitverkocht'}
          </button>
        </div>
      </div>
      <div class="product-info">
        ${material ? `<p class="product-material">${material}</p>` : ''}
        <h3 class="product-name">${product.title}</h3>
        <p class="product-price">${price}</p>
      </div>
    `;

    // Hover afbeelding wissel
    const img = card.querySelector('img');
    const hoverSrc = secondImage?.url;
    if (hoverSrc) {
      card.querySelector('.product-img-wrap').addEventListener('mouseenter', () => {
        img.src = hoverSrc;
      });
      card.querySelector('.product-img-wrap').addEventListener('mouseleave', () => {
        img.src = image?.url;
      });
    }

    // Product pagina navigatie
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        window.location.href = `/products/${product.handle}`;
      }
    });

    // Snel toevoegen aan winkelwagen
    card.querySelector('.btn-quick-add')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (variantId && available) {
        addToCart(variantId, 1);
      }
    });

    grid.appendChild(card);

    // Trigger scroll animatie observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(card);
  });
}

/* ── Cart beheer ── */
let cart = { id: null, lines: [] };

async function getOrCreateCart() {
  const savedCartId = localStorage.getItem('lumiere_cart_id');

  if (savedCartId) {
    const data = await shopifyFetch(`
      query getCart($id: ID!) {
        cart(id: $id) {
          id
          totalQuantity
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product { title }
                    price { amount currencyCode }
                    image { url altText }
                  }
                }
              }
            }
          }
        }
      }
    `, { id: savedCartId });

    if (data?.cart) {
      cart = data.cart;
      updateCartCount(cart.totalQuantity);
      return cart;
    }
  }

  // Maak nieuwe cart aan
  const data = await shopifyFetch(`
    mutation cartCreate {
      cartCreate {
        cart { id totalQuantity }
        userErrors { field message }
      }
    }
  `);

  if (data?.cartCreate?.cart) {
    cart = data.cartCreate.cart;
    localStorage.setItem('lumiere_cart_id', cart.id);
    updateCartCount(0);
  }

  return cart;
}

async function addToCart(variantId, quantity = 1) {
  await getOrCreateCart();

  const data = await shopifyFetch(`
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          totalQuantity
        }
        userErrors { field message }
      }
    }
  `, {
    cartId: cart.id,
    lines: [{ merchandiseId: variantId, quantity }],
  });

  if (data?.cartLinesAdd?.cart) {
    cart = data.cartLinesAdd.cart;
    updateCartCount(cart.totalQuantity);
    showCartNotification();
  }
}

function updateCartCount(count) {
  const countEl = document.getElementById('cart-count');
  if (!countEl) return;
  countEl.textContent = count;
  countEl.classList.toggle('visible', count > 0);
}

function showCartNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: var(--dark);
    color: white;
    padding: 1rem 1.5rem;
    font-family: var(--font-sans);
    font-size: 0.82rem;
    letter-spacing: 0.05em;
    z-index: 500;
    animation: slideInRight 0.4s ease both;
  `;
  notification.textContent = '✓ Toegevoegd aan winkelwagen';
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

/* ── Shopify search ── */
async function searchProducts(query) {
  if (!query || query.length < 2) return [];

  const data = await shopifyFetch(`
    query searchProducts($query: String!) {
      products(first: 5, query: $query) {
        edges {
          node {
            handle
            title
            priceRange {
              minVariantPrice { amount currencyCode }
            }
            images(first: 1) {
              edges { node { url altText } }
            }
          }
        }
      }
    }
  `, { query });

  return data?.products?.edges?.map(({ node }) => node) || [];
}

// Koppel search aan overlay
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchTimeout;

searchInput?.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();

  if (query.length < 2) {
    if (searchResults) searchResults.innerHTML = '';
    return;
  }

  searchTimeout = setTimeout(async () => {
    const results = await searchProducts(query);

    if (!searchResults) return;

    if (!results.length) {
      searchResults.innerHTML = '<p style="color: var(--mid); font-size: 0.85rem; margin-top: 1.5rem;">Geen resultaten gevonden.</p>';
      return;
    }

    searchResults.innerHTML = results.map(product => {
      const price = parseFloat(product.priceRange.minVariantPrice.amount)
        .toLocaleString('nl-NL', { style: 'currency', currency: product.priceRange.minVariantPrice.currencyCode });
      const img = product.images.edges[0]?.node;

      return `
        <a href="/products/${product.handle}" style="
          display: flex; gap: 1rem; align-items: center;
          padding: 0.85rem 0; border-bottom: 1px solid var(--cream-dark);
          text-decoration: none; color: var(--dark);
          transition: opacity 0.2s ease;
        " onmouseover="this.style.opacity=0.6" onmouseout="this.style.opacity=1">
          ${img ? `<img src="${img.url}" alt="${img.altText || product.title}" style="width:56px;height:56px;object-fit:cover;flex-shrink:0;" />` : ''}
          <div>
            <p style="font-family: var(--font-serif); font-size: 0.95rem;">${product.title}</p>
            <p style="font-size: 0.8rem; color: var(--mid); margin-top: 0.2rem;">${price}</p>
          </div>
        </a>
      `;
    }).join('');
  }, 350);
});

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  // Initialiseer cart count
  const savedCartId = localStorage.getItem('lumiere_cart_id');
  if (savedCartId && SHOPIFY_CONFIG.domain !== 'JOUW-WINKEL.myshopify.com') {
    getOrCreateCart();
  }

  // Laad bestsellers van Shopify (als geconfigureerd)
  if (SHOPIFY_CONFIG.domain !== 'JOUW-WINKEL.myshopify.com') {
    loadBestsellers();
  }
});

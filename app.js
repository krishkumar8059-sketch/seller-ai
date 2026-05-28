/* ===== ResellFlow.ai - Full Application Logic ===== */

// ===== STATE =====
var STATE_KEY = 'resellflow_data';
var state = loadState();
var posterUploadedImage = null;

function defaultState() {
  return {
    products: [],
    leads: [],
    reminders: [],
    generations: [],
    settings: { lang: 'en', theme: 'dark', selectedTemplate: 'minimalist', selectedPalette: 'neonglow' },
    lastSave: Date.now()
  };
}

function loadState() {
  try {
    var raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return defaultState();
}

function saveState() {
  state.lastSave = Date.now();
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
  updateStorageStats();
}

// ===== SPA ROUTER =====
var VALID_SECTIONS = ['home', 'core', 'marketing', 'design', 'platform', 'business', 'premium'];

function navigateTo(section) {
  window.location.hash = '#' + section;
}

function handleRoute() {
  var hash = window.location.hash.replace('#', '') || 'home';
  if (VALID_SECTIONS.indexOf(hash) === -1) hash = 'home';

  document.querySelectorAll('.page-section').forEach(function(s) { s.classList.remove('active'); });
  var target = document.getElementById('section-' + hash);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(function(n) {
    n.classList.toggle('active', n.dataset.section === hash);
  });
  document.querySelectorAll('.bottom-nav-item').forEach(function(n) {
    n.classList.toggle('active', n.dataset.section === hash);
  });

  if (hash === 'platform') updateMobileDashboard();
  if (hash === 'business') updateAnalytics();

  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', function() {
  handleRoute();
  initAuth();
  renderReminders();
  renderLeads();
  renderCatalog();
  updateMobileDashboard();
  updateStorageStats();
  applyTheme();
});

// ===== THEME =====
document.getElementById('themeToggle').addEventListener('click', function() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  saveState();
  applyTheme();
});

function applyTheme() {
  if (state.settings.theme === 'light') {
    document.body.classList.add('light');
    document.getElementById('themeIcon').className = 'fa-solid fa-sun';
  } else {
    document.body.classList.remove('light');
    document.getElementById('themeIcon').className = 'fa-solid fa-moon';
  }
}

// ===== TOAST =====
function showToast(message, typeOrDuration, type) {
  var duration = 4000;
  var actualType = 'info';
  // Support showToast(message, type) and showToast(message, duration, type)
  if (typeof typeOrDuration === 'number') {
    duration = typeOrDuration;
    actualType = type || 'info';
  } else if (typeof typeOrDuration === 'string') {
    actualType = typeOrDuration;
  }
  var container = document.getElementById('toastContainer');
  var toast = document.createElement('div');
  toast.className = 'toast ' + actualType;
  var icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  toast.innerHTML = '<i class="fa-solid ' + (icons[actualType] || icons.info) + '"></i><span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, duration);
}

// ===== COPY OUTPUT =====
function copyOutput(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var text = el.innerText;
  navigator.clipboard.writeText(text).then(function() {
    showToast('Copied to clipboard!', 'success');
  }).catch(function() {
    showToast('Failed to copy', 'error');
  });
}

// ===== MODAL =====
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ===== TRACK GENERATION =====
function trackGeneration(type, input, output) {
  state.generations.push({ type: type, input: input, output: output, timestamp: Date.now() });
  saveState();
}

// ===== AI SIMULATION ENGINE =====

// Product Description Generator
function generateProductDescription() {
  var name = document.getElementById('pd-name').value.trim();
  if (!name) { showToast('Please enter a product name', 'warning'); return; }
  var category = document.getElementById('pd-category').value;
  var features = document.getElementById('pd-features').value.trim();
  var tone = document.getElementById('pd-tone').value;

  var featureList = features ? features.split(',').map(function(f) { return f.trim(); }).filter(Boolean) : ['Premium Quality', 'Great Value', 'Fast Delivery'];

  var toneStyles = {
    professional: { adj: 'Premium', verb: 'Elevate', cta: 'Order Now' },
    casual: { adj: 'Awesome', verb: 'Level up', cta: 'Grab Yours Today!' },
    luxury: { adj: 'Exquisite', verb: 'Indulge in', cta: 'Shop the Collection' },
    urgent: { adj: 'Must-Have', verb: "Don't Miss", cta: 'Buy Now \u2014 Limited Stock!' }
  };
  var t = toneStyles[tone] || toneStyles.professional;

  var bullets = featureList.map(function(f) { return '  \u2022 ' + f; }).join('\n');

  var description = t.adj + ' ' + name + ' \u2014 ' + category.charAt(0).toUpperCase() + category.slice(1) + ' Essentials\n\n' +
    t.verb + ' your everyday experience with the ' + t.adj.toLowerCase() + ' ' + name + '. Carefully crafted for those who demand the best in ' + category + ', this product delivers unmatched quality and performance.\n\n' +
    'KEY FEATURES:\n' + bullets + '\n\n' +
    'WHY CHOOSE THIS?\n' +
    '  \u2714 Trusted by thousands of happy customers\n' +
    '  \u2714 Designed for modern lifestyles\n' +
    '  \u2714 Backed by our satisfaction guarantee\n\n' +
    t.cta + ' and experience the difference!';

  var output = document.getElementById('pd-output');
  output.style.display = 'block';
  output.textContent = description;
  document.getElementById('pd-actions').style.display = 'flex';

  trackGeneration('product-description', name, description);
  showToast('Product description generated!', 'success');
}

// Save to catalog from product description
function saveToCatalog() {
  var name = document.getElementById('pd-name').value.trim();
  if (!name) return;
  var category = document.getElementById('pd-category').value;
  var desc = document.getElementById('pd-output').textContent;
  var product = {
    id: Date.now(),
    name: name,
    category: category,
    price: 0,
    stock: 0,
    description: desc.substring(0, 120)
  };
  state.products.push(product);
  saveState();
  renderCatalog();
  showToast('Saved to product catalog!', 'success');
}

// Ad Creative Generator
function generateAdCreative() {
  var product = document.getElementById('ad-product').value.trim();
  if (!product) { showToast('Please enter a product name', 'warning'); return; }
  var platform = document.getElementById('ad-platform').value;
  var points = document.getElementById('ad-points').value.trim() || 'Premium quality, Best price, Fast delivery';

  var pointList = points.split(',').map(function(p) { return p.trim(); }).filter(Boolean);

  var output = '';

  if (platform === 'instagram' || platform === 'all') {
    output += '=== INSTAGRAM AD ===\n\n';
    output += '\uD83D\uDD25 ' + product.toUpperCase() + ' \uD83D\uDD25\n\n';
    output += 'Your search ends here! \u2728\n';
    output += pointList.map(function(p) { return '\u2705 ' + p; }).join('\n') + '\n\n';
    output += '\uD83D\uDCE3 Limited Time Offer!\n';
    output += '\uD83D\uDC49 Tap the link in bio to shop NOW!\n\n';
    output += '#' + product.replace(/\s+/g, '') + ' #ShopNow #BestDeals #Trending #MustHave #SaleAlert #OnlineShopping #InstaShop\n\n';
  }

  if (platform === 'whatsapp' || platform === 'all') {
    output += '=== WHATSAPP MESSAGE ===\n\n';
    output += '\uD83D\uDD25 *' + product.toUpperCase() + '* \uD83D\uDD25\n\n';
    output += pointList.map(function(p) { return '\u2705 ' + p; }).join('\n') + '\n\n';
    output += '\uD83D\uDCB0 Best Price Guaranteed!\n';
    output += '\uD83D\uDE9A Fast Delivery \u2022 Easy Returns\n\n';
    output += 'Reply ORDER to buy now! \uD83D\uDC47\n\n';
  }

  if (platform === 'facebook' || platform === 'all') {
    output += '=== FACEBOOK AD ===\n\n';
    output += '\uD83C\uDF1F ' + product + ' \u2014 Your Next Must-Have!\n\n';
    output += 'Looking for the perfect ' + categoryFromProduct(product) + '? Look no further!\n\n';
    output += pointList.map(function(p) { return '\u2B50 ' + p; }).join('\n') + '\n\n';
    output += '\uD83D\uDCC5 Hurry! Offer ends soon.\n';
    output += '\uD83D\uDC49 Shop Now: [Your Link Here]\n\n';
    output += '#' + product.replace(/\s+/g, '') + ' #FacebookDeals #ShopLocal #BestPrice #LimitedOffer\n\n';
  }

  document.getElementById('ad-output').style.display = 'block';
  document.getElementById('ad-output').textContent = output;
  document.getElementById('ad-actions').style.display = 'flex';

  trackGeneration('ad-creative', product, output);
  showToast('Ad creative generated!', 'success');
}

function categoryFromProduct(name) {
  var n = name.toLowerCase();
  if (n.match(/phone|earbud|speaker|laptop|tablet|charger|watch/)) return 'electronics';
  if (n.match(/saree|shirt|dress|jeans|kurta|jacket/)) return 'fashion';
  if (n.match(/cream|serum|oil|shampoo|makeup/)) return 'beauty';
  return 'product';
}

// Smart Price Suggestion
function generatePriceSuggestion() {
  var product = document.getElementById('sp-product').value.trim();
  if (!product) { showToast('Please enter a product name', 'warning'); return; }
  var category = document.getElementById('sp-category').value;
  var cost = parseFloat(document.getElementById('sp-cost').value) || 0;
  var margin = parseFloat(document.getElementById('sp-margin').value) || 40;

  var catMultipliers = { electronics: 1.3, fashion: 1.8, beauty: 2.2, home: 1.6, sports: 1.5, handmade: 2.5 };
  var multiplier = catMultipliers[category] || 1.5;

  var basePrice = cost > 0 ? cost : 200;
  var suggestedMin = Math.round(basePrice * (1 + margin / 100));
  var suggestedMid = Math.round(basePrice * multiplier);
  var suggestedMax = Math.round(suggestedMid * 1.3);

  var outputEl = document.getElementById('sp-output');
  outputEl.style.display = 'block';

  outputEl.innerHTML = '<h3>Price Suggestion for ' + escapeHtml(product) + '</h3>' +
    '<div class="price-range">' +
    '<div class="price-box"><div class="pb-label">Minimum</div><div class="pb-value">\u20B9' + suggestedMin + '</div></div>' +
    '<div class="price-arrow">\u2192</div>' +
    '<div class="price-box"><div class="pb-label">Recommended</div><div class="pb-value">\u20B9' + suggestedMid + '</div></div>' +
    '<div class="price-arrow">\u2192</div>' +
    '<div class="price-box"><div class="pb-label">Premium</div><div class="pb-value">\u20B9' + suggestedMax + '</div></div>' +
    '</div>' +
    '<p style="margin-top:16px;color:var(--text-secondary);font-size:13px">' +
    '<strong>Reasoning:</strong> Based on the ' + category + ' category, typical markup ranges from ' +
    Math.round((multiplier - 1) * 100) + '% to ' + Math.round((multiplier * 1.3 - 1) * 100) + '%. ' +
    'Your target margin of ' + margin + '% suggests a minimum of \u20B9' + suggestedMin + '. ' +
    'For competitive positioning, we recommend \u20B9' + suggestedMid + ' which aligns with market expectations for ' + category + ' products.</p>';

  trackGeneration('price-suggestion', product, 'Min:' + suggestedMin + ' Mid:' + suggestedMid + ' Max:' + suggestedMax);
  showToast('Price suggestion ready!', 'success');
}

// Trending Product Finder
function findTrendingProducts() {
  var category = document.getElementById('tp-category').value;
  var sortBy = document.getElementById('tp-sort').value;

  var trendingDB = {
    electronics: [
      { name: 'Smart Watch Ultra', category: 'electronics', demand: 94, profit: 78, competition: 45 },
      { name: 'Wireless Earbuds Pro', category: 'electronics', demand: 91, profit: 72, competition: 60 },
      { name: 'Portable Bluetooth Speaker', category: 'electronics', demand: 87, profit: 68, competition: 55 },
      { name: 'LED Ring Light', category: 'electronics', demand: 83, profit: 65, competition: 40 },
      { name: 'Fast Charging Power Bank', category: 'electronics', demand: 80, profit: 60, competition: 70 }
    ],
    fashion: [
      { name: 'Oversized Graphic Tees', category: 'fashion', demand: 92, profit: 80, competition: 35 },
      { name: 'Boho Maxi Dresses', category: 'fashion', demand: 88, profit: 75, competition: 30 },
      { name: 'Chunky Sneakers', category: 'fashion', demand: 85, profit: 70, competition: 50 },
      { name: 'Silk Saree Collection', category: 'fashion', demand: 90, profit: 85, competition: 25 },
      { name: 'Designer Phone Cases', category: 'fashion', demand: 79, profit: 90, competition: 65 }
    ],
    beauty: [
      { name: 'Vitamin C Serum', category: 'beauty', demand: 95, profit: 88, competition: 55 },
      { name: 'Organic Hair Oil', category: 'beauty', demand: 89, profit: 82, competition: 35 },
      { name: 'Sheet Mask Pack', category: 'beauty', demand: 86, profit: 75, competition: 45 },
      { name: 'Natural Lip Balm Set', category: 'beauty', demand: 82, profit: 78, competition: 40 },
      { name: 'Charcoal Face Wash', category: 'beauty', demand: 80, profit: 70, competition: 50 }
    ],
    home: [
      { name: 'Aromatherapy Diffuser', category: 'home', demand: 88, profit: 72, competition: 35 },
      { name: 'Macrame Wall Hanging', category: 'home', demand: 84, profit: 80, competition: 20 },
      { name: 'Bamboo Kitchen Set', category: 'home', demand: 81, profit: 65, competition: 30 },
      { name: 'LED Desk Lamp', category: 'home', demand: 79, profit: 60, competition: 55 },
      { name: 'Handmade Candle Collection', category: 'home', demand: 85, profit: 85, competition: 25 }
    ],
    festival: [
      { name: 'Diwali Gift Hamper', category: 'festival', demand: 96, profit: 70, competition: 40 },
      { name: 'Rakhi Thali Set', category: 'festival', demand: 90, profit: 75, competition: 30 },
      { name: 'Holi Color Pack', category: 'festival', demand: 88, profit: 82, competition: 25 },
      { name: 'Eid Decoration Kit', category: 'festival', demand: 82, profit: 68, competition: 35 },
      { name: 'Christmas Ornament Set', category: 'festival', demand: 85, profit: 78, competition: 45 }
    ]
  };

  var products = [];
  if (category === 'all') {
    Object.values(trendingDB).forEach(function(arr) { products = products.concat(arr); });
  } else {
    products = trendingDB[category] || trendingDB.electronics;
  }

  var sortKey = sortBy === 'profit' ? 'profit' : sortBy === 'competition' ? 'competition' : 'demand';
  products.sort(function(a, b) { return sortKey === 'competition' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]; });

  var container = document.getElementById('tp-results');
  container.style.display = 'grid';
  var html = '';
  var topProducts = products.slice(0, 8);
  for (var i = 0; i < topProducts.length; i++) {
    var p = topProducts[i];
    html += '<div class="trending-item">' +
      '<div class="trending-rank">' + (i + 1) + '</div>' +
      '<div class="trending-info"><h4>' + escapeHtml(p.name) + '</h4><p>' + p.category.charAt(0).toUpperCase() + p.category.slice(1) + ' \u2022 Profit: ' + p.profit + '% \u2022 Competition: ' + p.competition + '%</p></div>' +
      '<div class="trending-score"><div class="score-value">' + p.demand + '</div><div class="score-label">Demand</div></div>' +
      '</div>';
  }
  container.innerHTML = html;

  trackGeneration('trending-finder', category, products.length + ' results');
  showToast('Found ' + products.length + ' trending products!', 'success');
}

// Short Video Script Generator
function generateVideoScript() {
  var product = document.getElementById('vs-product').value.trim();
  if (!product) { showToast('Please enter a product name', 'warning'); return; }
  var videoType = document.getElementById('vs-type').value;
  var message = document.getElementById('vs-message').value.trim() || 'This product will change your life';

  var hooks = [
    'Stop scrolling! You NEED to see this...',
    'POV: You just found the BEST ' + product + ' online',
    "I can't believe I waited this long to get this...",
    'This ' + product + ' is breaking the internet right now!'
  ];
  var hook = hooks[Math.floor(Math.random() * hooks.length)];

  var script = '=== ' + videoType.toUpperCase() + ' SCRIPT for ' + product.toUpperCase() + ' ===\n\n' +
    'HOOK (0-3 sec):\n' + hook + '\n\n' +
    'VISUAL: Close-up of ' + product + ' with aesthetic lighting\n\n' +
    'BODY (3-15 sec):\n' +
    '"' + message + '. Just look at this quality! Every detail is crafted to perfection."\n\n' +
    'VISUAL: Product demonstration / unboxing / in-use shots\n\n' +
    'KEY SELLING POINTS (overlay text):\n' +
    '  \u2728 Premium Quality\n' +
    '  \uD83D\uDCB0 Best Price\n' +
    '  \uD83D\uDE9A Free Delivery\n\n' +
    'CTA (15-20 sec):\n' +
    '"Link in bio! Grab yours before it\'s gone!"\n\n' +
    'VISUAL: Product shot with price overlay + swipe up animation\n\n' +
    'AUDIO SUGGESTION: Trending upbeat music\n' +
    'HASHTAGS: #' + product.replace(/\s+/g, '') + ' #Viral #Trending #MustHave #Reels';

  document.getElementById('vs-output').style.display = 'block';
  document.getElementById('vs-output').textContent = script;
  document.getElementById('vs-actions').style.display = 'flex';

  trackGeneration('video-script', product, script);
  showToast('Video script generated!', 'success');
}

// Caption and Hashtag Generator
function generateCaptionHashtag() {
  var product = document.getElementById('ch-product').value.trim();
  if (!product) { showToast('Please enter a product or niche', 'warning'); return; }
  var style = document.getElementById('ch-style').value;

  var captions = {
    engaging: [
      'This ' + product + ' just hit DIFFERENT! \u2728\uD83D\uDD25 Who else is obsessed? Drop a \u2764\uFE0F if you need this in your life!',
      'Okay but can we talk about how AMAZING this ' + product + ' is?! \uD83E\uDD29 Run, don\'t walk!',
      'Me: I don\'t need anything\nAlso me: *adds ' + product + ' to cart immediately* \uD83D\uDE02\uD83D\uDED2'
    ],
    professional: [
      'Introducing ' + product + ' \u2014 designed for those who accept nothing but the best. Premium quality meets exceptional value.',
      'Elevate your standards with ' + product + '. Trusted by professionals, loved by customers. Discover the difference today.',
      'When quality matters, choose ' + product + '. Crafted with precision, delivered with care. Shop the collection now.'
    ],
    minimal: [
      product + '. \u2728',
      'Less is more. ' + product + '.',
      'The ' + product + ' you\'ve been waiting for. \u2615'
    ],
    storytelling: [
      'I remember searching everywhere for the perfect ' + product + '. Nothing felt right until I found THIS. Sometimes the best things find you when you stop looking. \u2728',
      'It started with a simple need. Then ' + product + ' showed up and changed everything. This isn\'t just a product \u2014 it\'s an experience. \uD83C\uDF1F',
      'My grandmother always said, "Invest in things that last." That\'s exactly what ' + product + ' represents \u2014 timeless quality. \u2764\uFE0F'
    ]
  };

  var selectedCaptions = captions[style] || captions.engaging;
  var caption = selectedCaptions[Math.floor(Math.random() * selectedCaptions.length)];

  var hashtagSets = [
    '#' + product.replace(/\s+/g, '') + ' #Trending #MustHave #ShopNow #BestDeals #OnlineShopping #Viral #InstaDaily #Sale #ShoppingAddict',
    '#' + product.replace(/\s+/g, '') + ' #NewArrival #LimitedEdition #ShopLocal #DealOfTheDay #FashionLovers #StyleInspo #TrendingNow #MustBuy',
    '#' + product.replace(/\s+/g, '') + ' #HottestDeal #FlashSale #Discount #PremiumQuality #CustomerFavorite #TopRated #BestBuy #DealAlert'
  ];
  var hashtags = hashtagSets[Math.floor(Math.random() * hashtagSets.length)];

  var outputText = caption + '\n\n' + hashtags;

  document.getElementById('ch-output').style.display = 'block';
  document.getElementById('ch-output').textContent = outputText;
  document.getElementById('ch-actions').style.display = 'flex';

  trackGeneration('caption-hashtag', product, outputText);
  showToast('Captions & hashtags generated!', 'success');
}

// Marketing Reminder System
function addReminder() {
  var title = document.getElementById('mr-title').value.trim();
  if (!title) { showToast('Please enter a reminder title', 'warning'); return; }
  var datetime = document.getElementById('mr-datetime').value;
  var notes = document.getElementById('mr-notes').value.trim();

  state.reminders.push({
    id: Date.now(),
    title: title,
    datetime: datetime,
    notes: notes,
    done: false
  });
  saveState();
  renderReminders();

  document.getElementById('mr-title').value = '';
  document.getElementById('mr-datetime').value = '';
  document.getElementById('mr-notes').value = '';

  showToast('Reminder added!', 'success');
}

function renderReminders() {
  var container = document.getElementById('reminder-list');
  if (!state.reminders.length) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No reminders yet. Add one above!</p>';
    return;
  }
  var html = '';
  for (var i = 0; i < state.reminders.length; i++) {
    var r = state.reminders[i];
    var dtText = r.datetime ? new Date(r.datetime).toLocaleString() : 'No date set';
    var notesText = r.notes ? ' \u2022 ' + escapeHtml(r.notes) : '';
    html += '<div class="reminder-item' + (r.done ? ' done' : '') + '">' +
      '<div class="ri-icon"><i class="fa-solid fa-bell"></i></div>' +
      '<div class="ri-content">' +
      '<div class="ri-title">' + escapeHtml(r.title) + '</div>' +
      '<div class="ri-meta">' + dtText + notesText + '</div>' +
      '</div>' +
      '<div class="ri-actions">' +
      '<button class="btn btn-sm btn-outline" onclick="toggleReminder(' + r.id + ')">' + (r.done ? 'Undo' : 'Done') + '</button>' +
      '<button class="btn btn-sm btn-danger" onclick="deleteReminder(' + r.id + ')"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
      '</div>';
  }
  container.innerHTML = html;
}

function toggleReminder(id) {
  var r = state.reminders.find(function(x) { return x.id === id; });
  if (r) r.done = !r.done;
  saveState();
  renderReminders();
}

function deleteReminder(id) {
  state.reminders = state.reminders.filter(function(x) { return x.id !== id; });
  saveState();
  renderReminders();
  showToast('Reminder deleted', 'info');
}

// ===== AUTH SYSTEM (Firebase Google Sign-In) =====

function initAuth() {
  initFirebaseAuth();
}

function showAuthModal() {
  var modal = document.getElementById('authModal');
  modal.classList.add('active');
}

function hideAuthModal() {
  document.getElementById('authModal').classList.remove('active');
}

// Google Sign-In using redirect (more reliable for cross-domain)
function googleSignIn() {
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
  firebase.auth().signInWithRedirect(provider);
}

// Sign out
function googleSignOut() {
  firebase.auth().signOut().then(function() {
    updateAuthUI(null);
    showAuthModal();
    showToast('Signed out successfully', 'info');
  }).catch(function(error) {
    showToast('Sign out failed: ' + error.message, 'error');
  });
}

// Initialize Firebase Auth
function initFirebaseAuth() {
  // Bind the Google Sign-In button
  var signInBtn = document.getElementById('googleSignInBtn');
  if (signInBtn) {
    signInBtn.addEventListener('click', googleSignIn);
  }

  // Handle redirect result (when returning from Google sign-in page)
  firebase.auth().getRedirectResult().then(function(result) {
    if (result.user) {
      // User just signed in via redirect
      hideAuthModal();
      updateAuthUI(result.user);
      showToast('Welcome, ' + (result.user.displayName || result.user.email) + '!', 'success');
    }
  }).catch(function(error) {
    if (error.code === 'auth/unauthorized-domain') {
      showToast('Domain not authorized. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.', 8000);
    } else {
      showToast('Sign-in error: ' + error.message, 'error');
    }
  });

  // Listen for auth state changes (handles page reload persistence)
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      hideAuthModal();
      updateAuthUI(user);
    } else {
      updateAuthUI(null);
      showAuthModal();
    }
  });
}

// Update auth UI based on Firebase user state
function updateAuthUI(user) {
  var loggedOut = document.getElementById('sidebarLoggedOut');
  var loggedIn = document.getElementById('sidebarLoggedIn');

  if (user) {
    // User is signed in
    loggedOut.style.display = 'none';
    loggedIn.style.display = 'flex';

    var avatarEl = document.getElementById('userAvatar');
    avatarEl.innerHTML = '';

    if (user.photoURL) {
      var img = document.createElement('img');
      img.src = user.photoURL;
      img.alt = user.displayName || 'User';
      avatarEl.appendChild(img);
    } else {
      var displayName = user.displayName || '';
      var emailPrefix = user.email ? user.email.split('@')[0] : '';
      var letter = (displayName || emailPrefix || '?').charAt(0).toUpperCase();
      avatarEl.textContent = letter;
    }

    var displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
    document.getElementById('userName').textContent = displayName;
  } else {
    // User is signed out
    loggedOut.style.display = 'block';
    loggedIn.style.display = 'none';
  }
}

// Check if user is authenticated
function checkAuth() {
  var user = firebase.auth().currentUser;
  if (!user) {
    showAuthModal();
    return false;
  }
  return true;
}

// ===== POSTER TEMPLATE & PALETTE SYSTEM =====
var COLOR_PALETTES = {
  neonglow: { bg: '#1a0033', primary: '#6C5CE7', secondary: '#00CEFF', accent: '#FD79A8', text: '#FFFFFF' },
  pasteldream: { bg: '#FFF0F5', primary: '#DDA0DD', secondary: '#B0E0E6', accent: '#FFB6C1', text: '#4A4A4A' },
  darkluxe: { bg: '#1A1A2E', primary: '#E6B800', secondary: '#C0C0C0', accent: '#FFFFFF', text: '#F5F5F5' },
  earthytones: { bg: '#F5E6D3', primary: '#8B4513', secondary: '#6B8E23', accent: '#CD853F', text: '#3E2723' },
  vibrantpop: { bg: '#FF6B6B', primary: '#FFE66D', secondary: '#4ECDC4', accent: '#FF6B6B', text: '#FFFFFF' }
};

function selectTemplate(template, el) {
  if (!state.settings) state.settings = {};
  state.settings.selectedTemplate = template;
  saveState();
  document.querySelectorAll('.template-card').forEach(function(c) { c.classList.remove('selected'); });
  if (el) el.classList.add('selected');
}

function selectPalette(palette, el) {
  if (!state.settings) state.settings = {};
  state.settings.selectedPalette = palette;
  saveState();
  document.querySelectorAll('.palette-swatch').forEach(function(c) { c.classList.remove('selected'); });
  if (el) el.classList.add('selected');
}

function handlePosterImageUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    posterUploadedImage = new Image();
    posterUploadedImage.onload = function() {
      document.getElementById('uploadPlaceholder').style.display = 'none';
      document.getElementById('uploadPreview').style.display = 'flex';
      document.getElementById('posterImagePreview').src = e.target.result;
    };
    posterUploadedImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removePosterImage() {
  posterUploadedImage = null;
  document.getElementById('uploadPlaceholder').style.display = 'flex';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('posterImageInput').value = '';
}

// Drawing helpers
function drawGradientBg(ctx, palette, width, height) {
  var grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, palette.bg);
  grad.addColorStop(0.4, palette.primary);
  grad.addColorStop(0.7, palette.secondary);
  grad.addColorStop(1, palette.accent);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawDecorations(ctx, template, width, height, palette) {
  ctx.save();
  if (template === 'minimalist') {
    // Concentric circles with subtle opacity
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1;
    for (var i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(width * 0.75 + i * 14, height * 0.25, 30 + i * 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Subtle dot grid in bottom-right
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = palette.primary;
    for (var dx = 0; dx < 6; dx++) {
      for (var dy = 0; dy < 6; dy++) {
        ctx.beginPath();
        ctx.arc(width * 0.6 + dx * 16, height * 0.7 + dy * 16, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (template === 'boldsale') {
    // Star burst decorations
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 2;
    var burstPoints = [[width * 0.12, height * 0.12], [width * 0.88, height * 0.75], [width * 0.5, height * 0.9]];
    for (var b = 0; b < burstPoints.length; b++) {
      var bx = burstPoints[b][0], by = burstPoints[b][1];
      var numRays = 12;
      for (var r = 0; r < numRays; r++) {
        var angle = (r / numRays) * Math.PI * 2;
        var innerR = 8;
        var outerR = 28;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(angle) * innerR, by + Math.sin(angle) * innerR);
        ctx.lineTo(bx + Math.cos(angle) * outerR, by + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      // Center dot
      ctx.fillStyle = palette.text;
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Diagonal stripes pattern
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 3;
    for (var s = -height; s < width + height; s += 40) {
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(s + height, height);
      ctx.stroke();
    }
  } else if (template === 'elegant') {
    // Corner ornaments with bezier curves
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1.5;
    var orn = 40;
    // Top-left ornament
    ctx.beginPath();
    ctx.moveTo(width * 0.04, height * 0.04 + orn);
    ctx.quadraticCurveTo(width * 0.04, height * 0.04, width * 0.04 + orn, height * 0.04);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.04 + 10, height * 0.04);
    ctx.quadraticCurveTo(width * 0.04, height * 0.04, width * 0.04, height * 0.04 + 10);
    ctx.stroke();
    // Top-right ornament
    ctx.beginPath();
    ctx.moveTo(width * 0.96 - orn, height * 0.04);
    ctx.quadraticCurveTo(width * 0.96, height * 0.04, width * 0.96, height * 0.04 + orn);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.96, height * 0.04 + 10);
    ctx.quadraticCurveTo(width * 0.96, height * 0.04, width * 0.96 - 10, height * 0.04);
    ctx.stroke();
    // Bottom-left ornament
    ctx.beginPath();
    ctx.moveTo(width * 0.04, height * 0.96 - orn);
    ctx.quadraticCurveTo(width * 0.04, height * 0.96, width * 0.04 + orn, height * 0.96);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.04 + 10, height * 0.96);
    ctx.quadraticCurveTo(width * 0.04, height * 0.96, width * 0.04, height * 0.96 - 10);
    ctx.stroke();
    // Bottom-right ornament
    ctx.beginPath();
    ctx.moveTo(width * 0.96 - orn, height * 0.96);
    ctx.quadraticCurveTo(width * 0.96, height * 0.96, width * 0.96, height * 0.96 - orn);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.96, height * 0.96 - 10);
    ctx.quadraticCurveTo(width * 0.96, height * 0.96, width * 0.96 - 10, height * 0.96);
    ctx.stroke();
    // Small diamond accents at corners
    ctx.fillStyle = palette.secondary;
    ctx.globalAlpha = 0.15;
    var dSize = 6;
    [[width * 0.06, height * 0.06], [width * 0.94, height * 0.06], [width * 0.06, height * 0.94], [width * 0.94, height * 0.94]].forEach(function(pt) {
      ctx.beginPath();
      ctx.moveTo(pt[0], pt[1] - dSize);
      ctx.lineTo(pt[0] + dSize, pt[1]);
      ctx.lineTo(pt[0], pt[1] + dSize);
      ctx.lineTo(pt[0] - dSize, pt[1]);
      ctx.closePath();
      ctx.fill();
    });
  } else if (template === 'festival') {
    // Decorative border pattern
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 6]);
    ctx.strokeRect(width * 0.035, height * 0.035, width * 0.93, height * 0.93);
    ctx.setLineDash([]);
    // Sparkle/dot decorations scattered
    var sparkleColors = [palette.primary, palette.secondary, palette.accent, palette.text];
    for (var k = 0; k < 60; k++) {
      ctx.fillStyle = sparkleColors[k % sparkleColors.length];
      ctx.globalAlpha = 0.1 + Math.random() * 0.15;
      var sx = Math.random() * width;
      var sy = Math.random() * height;
      var sr = 1.5 + Math.random() * 3.5;
      // Draw 4-pointed sparkle
      ctx.beginPath();
      ctx.moveTo(sx, sy - sr * 2);
      ctx.quadraticCurveTo(sx, sy, sx + sr * 2, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy + sr * 2);
      ctx.quadraticCurveTo(sx, sy, sx - sr * 2, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy - sr * 2);
      ctx.fill();
    }
    // Small circle dots
    for (var d = 0; d < 30; d++) {
      ctx.fillStyle = sparkleColors[d % sparkleColors.length];
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 2 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (template === 'productshowcase') {
    // Subtle line pattern on right side
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 1;
    for (var li = 0; li < 12; li++) {
      ctx.beginPath();
      ctx.moveTo(width * 0.52, height * 0.15 + li * (height * 0.06));
      ctx.lineTo(width * 0.95, height * 0.15 + li * (height * 0.06));
      ctx.stroke();
    }
    // Small geometric accents
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.arc(width * 0.92, height * 0.08, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.secondary;
    ctx.beginPath();
    ctx.arc(width * 0.55, height * 0.92, 15, 0, Math.PI * 2);
    ctx.fill();
  } else if (template === 'socialstory') {
    // Soft bokeh circles
    ctx.globalAlpha = 0.06;
    for (var m = 0; m < 8; m++) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height * 0.55, 20 + Math.random() * 50, 0, Math.PI * 2);
      ctx.fill();
    }
    // Subtle glow effect near center
    var glowGrad = ctx.createRadialGradient(width / 2, height * 0.3, 0, width / 2, height * 0.3, width * 0.4);
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height * 0.6);
  } else if (template === 'quotecard') {
    // Large soft circles
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.2, width * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.85, width * 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Horizontal line accents
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.2, height * 0.7);
    ctx.lineTo(width * 0.8, height * 0.7);
    ctx.stroke();
    // Small decorative dots
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = palette.primary;
    for (var qi = 0; qi < 5; qi++) {
      ctx.beginPath();
      ctx.arc(width * 0.3 + qi * (width * 0.1), height * 0.72, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (template === 'eventflyer') {
    // Corner triangles
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width * 0.12, 0);
    ctx.lineTo(0, height * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.secondary;
    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(width * 0.88, height);
    ctx.lineTo(width, height * 0.88);
    ctx.closePath();
    ctx.fill();
    // Additional geometric accents
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width * 0.88, 0);
    ctx.lineTo(width, height * 0.12);
    ctx.closePath();
    ctx.fill();
    // Dot pattern along bottom
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = palette.text;
    for (var ei = 0; ei < 12; ei++) {
      ctx.beginPath();
      ctx.arc(width * 0.1 + ei * (width * 0.07), height * 0.92, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Horizontal line accent
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.35);
    ctx.lineTo(width * 0.9, height * 0.35);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTypography(ctx, text, x, y, options) {
  if (!text) return;
  options = options || {};
  var font = options.font || 'Inter';
  var weight = options.weight || '600';
  var size = options.size || 24;
  var color = options.color || '#ffffff';
  var align = options.align || 'center';
  var maxWidth = options.maxWidth || 400;
  var lineHeight = options.lineHeight || 1.3;
  var shadow = options.shadow || false;

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  // Auto-fit font size
  var testSize = size;
  ctx.font = weight + ' ' + testSize + 'px ' + font + ', sans-serif';
  while (ctx.measureText(text).width > maxWidth && testSize > 10) {
    testSize -= 1;
    ctx.font = weight + ' ' + testSize + 'px ' + font + ', sans-serif';
  }

  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  // Multi-line wrapping
  var words = text.split(' ');
  var lines = [];
  var currentLine = '';
  for (var i = 0; i < words.length; i++) {
    var testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  var totalHeight = lines.length * testSize * lineHeight;
  var startY = y - totalHeight / 2 + testSize / 2;
  for (var j = 0; j < lines.length; j++) {
    ctx.fillText(lines[j], x, startY + j * testSize * lineHeight);
  }
  ctx.restore();
}

function drawImageRounded(ctx, image, x, y, width, height, borderRadius) {
  ctx.save();
  borderRadius = Math.max(0, borderRadius || 0);
  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.moveTo(x + borderRadius, y);
  ctx.lineTo(x + width - borderRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);
  ctx.lineTo(x + width, y + height - borderRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);
  ctx.lineTo(x + borderRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);
  ctx.lineTo(x, y + borderRadius);
  ctx.quadraticCurveTo(x, y, x + borderRadius, y);
  ctx.closePath();
  ctx.clip();
  // Draw image maintaining aspect ratio
  var imgRatio = image.width / image.height;
  var boxRatio = width / height;
  var sx = 0, sy = 0, sw = image.width, sh = image.height;
  if (imgRatio > boxRatio) {
    sw = image.height * boxRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / boxRatio;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  ctx.restore();
}

// Rounded rectangle helper
function roundRect(ctx, x, y, width, height, radius) {
  radius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Alias for drawImageRounded - matches spec signature drawImage(ctx, image, x, y, width, height, borderRadius)
function drawImage(ctx, image, x, y, width, height, borderRadius) {
  drawImageRounded(ctx, image, x, y, width, height, borderRadius);
}

// 8 Template Drawing Functions
function drawMinimalist(canvas, ctx, data) {
  var w = canvas.width, h = canvas.height;
  var p = data.palette;
  // Clean white/light background
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, w, h);
  drawDecorations(ctx, 'minimalist', w, h, p);
  // Subtle accent line on left
  ctx.fillStyle = p.primary;
  ctx.fillRect(w * 0.1, h * 0.35, w * 0.008, h * 0.3);
  // Thin horizontal accent below headline area
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = p.primary;
  ctx.fillRect(w * 0.15, h * 0.52, w * 0.35, 1);
  ctx.restore();
  // Badge (small, top-left)
  if (data.badge) {
    var bx = w * 0.1, by = h * 0.12;
    ctx.font = '600 11px Poppins, sans-serif';
    var badgeW = Math.max(ctx.measureText(data.badge).width + 24, 60);
    // Rounded rect badge
    ctx.fillStyle = p.primary;
    roundRect(ctx, bx, by, badgeW, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.badge, bx + 12, by + 14);
  }
  // Headline - thin, elegant
  drawTypography(ctx, data.headline, w * 0.55, h * 0.4, { font: 'Inter', weight: '300', size: Math.max(24, w * 0.07), color: '#1a1a1a', align: 'center', maxWidth: w * 0.7 });
  // Subheadline
  drawTypography(ctx, data.subhead, w * 0.55, h * 0.55, { font: 'Poppins', weight: '400', size: Math.max(14, w * 0.035), color: '#666666', align: 'center', maxWidth: w * 0.65 });
  // Body text
  if (data.body) {
    drawTypography(ctx, data.body, w * 0.55, h * 0.68, { font: 'Poppins', weight: '300', size: Math.max(11, w * 0.022), color: '#999999', align: 'center', maxWidth: w * 0.55 });
  }
  // CTA button
  if (data.cta) {
    ctx.fillStyle = p.primary;
    var ctaY = h * 0.82;
    ctx.font = '600 ' + Math.max(12, w * 0.025) + 'px Montserrat, sans-serif';
    var ctaW = Math.max(ctx.measureText(data.cta).width + 44, 110);
    var ctaX = w * 0.55 - ctaW / 2;
    roundRect(ctx, ctaX, ctaY, ctaW, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.cta, w * 0.55, ctaY + 22);
  }
}

function drawBoldSale(canvas, ctx, data) {
  var w = canvas.width, h = canvas.height;
  var p = data.palette;
  // Vibrant gradient background
  drawGradientBg(ctx, p, w, h);
  drawDecorations(ctx, 'boldsale', w, h, p);
  // Diagonal stripe with badge text
  if (data.badge) {
    ctx.save();
    ctx.translate(w * 0.85, 0);
    ctx.rotate(Math.PI / 4);
    var stripeW = 180;
    ctx.fillStyle = p.accent;
    ctx.fillRect(-stripeW / 2, -10, stripeW, 38);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.badge, 0, 9);
    ctx.restore();
  }
  // Large bold headline
  drawTypography(ctx, data.headline, w / 2, h * 0.3, { font: 'Montserrat', weight: '800', size: Math.max(32, w * 0.1), color: p.text, align: 'center', maxWidth: w * 0.85, shadow: true });
  // Subheadline with emphasis
  drawTypography(ctx, data.subhead, w / 2, h * 0.48, { font: 'Poppins', weight: '600', size: Math.max(18, w * 0.05), color: p.text, align: 'center', maxWidth: w * 0.8, shadow: true });
  // Price/CTA prominent box
  if (data.body) {
    drawTypography(ctx, data.body, w / 2, h * 0.62, { font: 'Poppins', weight: '400', size: Math.max(12, w * 0.025), color: p.text, align: 'center', maxWidth: w * 0.7, shadow: true });
  }
  // CTA button with contrasting background
  if (data.cta) {
    ctx.fillStyle = p.text;
    var ctaY = h * 0.78;
    ctx.font = '700 ' + Math.max(14, w * 0.035) + 'px Montserrat, sans-serif';
    var ctaW = Math.max(ctx.measureText(data.cta).width + 48, 120);
    var ctaX = w / 2 - ctaW / 2;
    roundRect(ctx, ctaX, ctaY, ctaW, 52, 8);
    ctx.fill();
    ctx.fillStyle = p.bg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.cta, w / 2, ctaY + 26);
  }
}

function drawElegant(canvas, ctx, data) {
  var w = canvas.width, h = canvas.height;
  var p = data.palette;
  // Soft gradient background
  var grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, p.bg);
  grad.addColorStop(1, p.primary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  drawDecorations(ctx, 'elegant', w, h, p);
  // Badge in elegant style
  if (data.badge) {
    ctx.save();
    ctx.font = '400 13px Playfair Display, serif';
    ctx.fillStyle = p.secondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '3px';
    ctx.fillText('\u2014 ' + data.badge + ' \u2014', w / 2, h * 0.16);
    ctx.restore();
  }
  // Thin decorative divider line above headline
  ctx.save();
  ctx.strokeStyle = p.secondary;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.24); ctx.lineTo(w * 0.7, h * 0.24); ctx.stroke();
  ctx.restore();
  // Headline (serif font)
  drawTypography(ctx, data.headline, w / 2, h * 0.37, { font: 'Playfair Display', weight: '700', size: Math.max(26, w * 0.07), color: p.text, align: 'center', maxWidth: w * 0.75 });
  // Thin decorative divider line below headline
  ctx.save();
  ctx.strokeStyle = p.secondary;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(w * 0.38, h * 0.49); ctx.lineTo(w * 0.62, h * 0.49); ctx.stroke();
  // Small diamond in center of divider
  ctx.fillStyle = p.secondary;
  ctx.globalAlpha = 0.4;
  var dmx = w / 2, dmy = h * 0.49, dms = 4;
  ctx.beginPath();
  ctx.moveTo(dmx, dmy - dms); ctx.lineTo(dmx + dms, dmy);
  ctx.lineTo(dmx, dmy + dms); ctx.lineTo(dmx - dms, dmy);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Subheadline
  drawTypography(ctx, data.subhead, w / 2, h * 0.58, { font: 'Poppins', weight: '400', size: Math.max(14, w * 0.03), color: p.text, align: 'center', maxWidth: w * 0.65 });
  // Body text
  if (data.body) {
    drawTypography(ctx, data.body, w / 2, h * 0.7, { font: 'Poppins', weight: '300', size: Math.max(11, w * 0.02), color: p.text, align: 'center', maxWidth: w * 0.55 });
  }
  // CTA with refined outline style
  if (data.cta) {
    ctx.save();
    ctx.strokeStyle = p.text;
    ctx.lineWidth = 1.5;
    ctx.font = '600 ' + Math.max(12, w * 0.025) + 'px Montserrat, sans-serif';
    var ctaW = Math.max(ctx.measureText(data.cta).width + 44, 110);
    var ctaX = w / 2 - ctaW / 2;
    var ctaY = h * 0.82;
    roundRect(ctx, ctaX, ctaY, ctaW, 42, 4);
    ctx.stroke();
    ctx.fillStyle = p.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.cta, w / 2, ctaY + 21);
    ctx.restore();
  }
}

function drawFestival(canvas, ctx, data) {
  var w = canvas.width, h = canvas.height;
  var p = data.palette;
  // Rich gradient background
  drawGradientBg(ctx, p, w, h);
  drawDecorations(ctx, 'festival', w, h, p);
  // Decorative border pattern
  ctx.save();
  ctx.strokeStyle = p.text;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 6]);
  ctx.strokeRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92);
  ctx.setLineDash([]);
  ctx.restore();
  // Festive ribbons at top
  ctx.save();
  // Main ribbon
  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.07);
  ctx.lineTo(w, h * 0.07);
  ctx.lineTo(w, h * 0.125);
  ctx.lineTo(0, h * 0.125);
  ctx.closePath();
  ctx.fill();
  // Ribbon fold left
  ctx.fillStyle = p.secondary;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.07);
  ctx.lineTo(w * 0.02, h * 0.07);
  ctx.lineTo(0, h * 0.09);
  ctx.closePath();
  ctx.fill();
  // Ribbon fold right
  ctx.beginPath();
  ctx.moveTo(w, h * 0.07);
  ctx.lineTo(w * 0.98, h * 0.07);
  ctx.lineTo(w, h * 0.09);
  ctx.closePath();
  ctx.fill();
  // Badge on ribbon
  if (data.badge) {
    ctx.font = '700 12px Montserrat, sans-serif';
    ctx.fillStyle = p.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1;
    ctx.fillText(data.badge, w / 2, h * 0.098);
  }
  ctx.restore();
  // Headline with shadow
  ctx.save();
  ctx.fillStyle = p.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 ' + Math.max(28, w * 0.08) + 'px Poppins, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillText(data.headline, w / 2, h * 0.32);
  ctx.restore();
  // Subheadline
  drawTypography(ctx, data.subhead, w / 2, h * 0.48, { font: 'Poppins', weight: '500', size: Math.max(16, w * 0.04), color: p.text, align: 'center', maxWidth: w * 0.8, shadow: true });
  // Body
  if (data.body) {
    drawTypography(ctx, data.body, w / 2, h * 0.62, { font: 'Poppins', weight: '400', size: Math.max(12, w * 0.025), color: p.text, align: 'center', maxWidth: w * 0.7, shadow: true });
  }
  // CTA button
  if (data.cta) {
    ctx.fillStyle = p.accent;
    var ctaY = h * 0.76;
    ctx.font = '700 ' + Math.max(14, w * 0.03) + 'px Montserrat, sans-serif';
    var ctaW = Math.max(ctx.measureText(data.cta).width + 44, 110);
    roundRect(ctx, w / 2 - ctaW / 2, ctaY, ctaW, 48, 8);
    ctx.fill();
    ctx.fillStyle = p.bg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.cta, w / 2, ctaY + 24);
  }
}

function drawProductShowcase(canvas, ctx, data) {
  var w = canvas.width, h = canvas.height;
  var p = data.palette;
  // Split layout - white left, colored right
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = p.bg;
  ctx.fillRect(w * 0.5, 0, w * 0.5, h);
  drawDecorations(ctx, 'productshowcase', w, h, p);
  // Vertical divider line
  ctx.save();
  ctx.strokeStyle = p.primary;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.08);
  ctx.lineTo(w * 0.5, h * 0.92);
  ctx.stroke();
  ctx.restore();
  // Product image on left with rounded corners and shadow
  if (data.image) {
    drawImageRounded(ctx, data.image, w * 0.06, h * 0.12, w * 0.4, h * 0.68, 16);
  } else {
    // Placeholder with icon
    ctx.save();
    ctx.fillStyle = '#f0f0f0';
    roundRect(ctx, w * 0.06, h * 0.12, w * 0.4, h * 0.68, 16);
    ctx.fill();
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    roundRect(ctx, w * 0.06, h * 0.12, w * 0.4, h * 0.68, 16);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#cccccc';
    ctx.font = '400 14px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Product Image', w * 0.26, h * 0.45);
    ctx.restore();
  }
  // Badge on right side
  if (data.badge) {
    ctx.fillStyle = p.primary;
    var bx = w * 0.56, by = h * 0.08;
    ctx.font = '700 11px Montserrat, sans-serif';
    var bW = Math.max(ctx.measureText(data.badge).width + 18, 50);
    roundRect(ctx, bx, by, bW, 24, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.badge, bx + 9, by + 12);
  }
  // Text on right side
  drawTypography(ctx, data.headline, w * 0.75, h * 0.3, { font: 'Montserrat', weight: '700', size: Math.max(20, w * 0.04), color: p.text, align: 'center', maxWidth: w * 0.38 });
  // Thin separator
  ctx.save();
  ctx.fillStyle = p.primary;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(w * 0.58, h * 0.38, w * 0.34, 2);
  ctx.restore();
  drawTypography(ctx, data.subhead, w * 0.75, h * 0.46, { font: 'Poppins', weight: '400', size: Math.max(13, w * 0.025), color: p.text, align: 'center', maxWidth: w * 0.35 });
  if (data.body) {
    drawTypography(ctx, data.body, w * 0.75, h * 0.58, { font: 'Poppins', weight: '300', size: Math.max(11, w * 0.02), color: p.text, align: 'center', maxWidth: w * 0.35 });
  }
  if (data.cta) {
    ctx.fillStyle = p.primary;
    var ctaY = h * 0.72;
    ctx.font = '600 ' + Math.max(12, w * 0.022) + 'px Montserrat, sans-serif';
    var ctaW = Math.max(ctx.measureText(data.cta).width + 34, 90);
    roundRect(ctx, w * 0.75 - ctaW / 2, ctaY, ctaW, 40, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.cta, w * 0.75, ctaY + 20);
  }
}

function drawSocialStory(canvas, ctx, data) {
  var w = canvas.width, h = canvas.height;
  var p = data.palette;
  // Full gradient background
  drawGradientBg(ctx, p, w, h);
  drawDecorations(ctx, 'socialstory', w, h, p);
  // Image overlay area (top portion with gradient)
  if (data.image) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(data.image, 0, 0, w, h * 0.65);
    ctx.restore();
  }
  // Gradient overlay on image
  ctx.save();
  var overlayGrad = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.65);
  overlayGrad.addColorStop(0, 'rgba(0,0,0,0)');
  overlayGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, h * 0.35, w, h * 0.3);
  ctx.restore();
  // Glassmorphism panel at bottom
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  var gp = 12; // glass panel radius
  ctx.beginPath();
  ctx.moveTo(w * 0.04 + gp, h * 0.56);
  ctx.lineTo(w * 0.96 - gp, h * 0.56);
  ctx.quadraticCurveTo(w * 0.96, h * 0.56, w * 0.96, h * 0.56 + gp);
  ctx.lineTo(w * 0.96, h * 0.93 - gp);
  ctx.quadraticCurveTo(w * 0.96, h * 0.93, w * 0.96 - gp, h * 0.93);
  ctx.lineTo(w * 0.04 + gp, h * 0.93);
  ctx.quadraticCurveTo(w * 0.04, h * 0.93, w * 0.04, h * 0.93 - gp);
  ctx.lineTo(w * 0.04, h * 0.56 + gp);
  ctx.quadraticCurveTo(w * 0.04, h * 0.56, w * 0.04 + gp, h * 0.56);
  ctx.closePath();
  ctx.fill();
  // Glass border
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  // Username-style subheadline
  if (data.subhead) {
    drawTypography(ctx, '@' + data.subhead.replace(/\s+/g, '').toLowerCase(), w / 2, h * 0.61, { font: 'Poppins', weight: '400', size: Math.max(11, w * 0.025), color: 'rgba(255,255,255,0.7)', align: 'center', maxWidth: w * 0.8 });
  }
  // Headline on glass panel
  drawTypography(ctx, data.headline, w / 2, h * 0.72, { font: 'Montserrat', weight: '700', size: Math.max(22, w * 0.06), color: '#ffffff', align: 'center', maxWidth: w * 0.8, shadow: true });
  // Body on glass panel
  if (data.body) {
    drawTypography(ctx, data.body, w / 2, h * 0.81, { font: 'Poppins', weight: '300', size: Math.max(10, w * 0.02), color: 'rgba(255,255,255,0.8)', align: 'center', maxWidth: w * 0.75 });
  }
  // CTA button
  if (data.cta) {
    ctx.fillStyle = p.primary;
    var ctaY = h * 0.87;
    ctx.font = '600 ' + Math.max(12, w * 0.025) + 'px Montserrat, sans-serif';
    var ctaW = Math.max(ctx.measureText(data.cta).width + 34, 90);
    roundRect(ctx, w / 2 - ctaW / 2, ctaY, ctaW, 36, 18);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.cta, w / 2, ctaY + 18);
  }
}

function drawQuoteCard(canvas, ctx, data) {
  var w = canvas.width, h = canvas.height;
  var p = data.palette;
  // Dark/minimal background
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  drawDecorations(ctx, 'quotecard', w, h, p);
  // Large quotation mark graphic
  ctx.save();
  ctx.fillStyle = p.primary;
  ctx.globalAlpha = 0.2;
  ctx.font = '700 ' + Math.max(120, w * 0.3) + 'px Playfair Display, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u201C', w / 2, h * 0.22);
  ctx.restore();
  // Quote text (body or headline) - centered italic
  var quoteText = data.body || data.headline;
  drawTypography(ctx, quoteText, w / 2, h * 0.44, { font: 'Playfair Display', weight: '400', size: Math.max(18, w * 0.04), color: p.text, align: 'center', maxWidth: w * 0.7 });
  // Thin decorative line
  ctx.save();
  ctx.fillStyle = p.primary;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(w / 2 - 30, h * 0.56, 60, 2);
  ctx.restore();
  // Author / subheadline below
  if (data.subhead) {
    ctx.save();
    ctx.fillStyle = p.primary;
    ctx.font = '600 ' + Math.max(12, w * 0.025) + 'px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2014 ' + data.subhead, w / 2, h * 0.63);
    ctx.restore();
  }
  // Badge
  if (data.badge) {
    ctx.save();
    ctx.fillStyle = p.primary;
    ctx.globalAlpha = 0.8;
    ctx.font = '600 11px Poppins, sans-serif';
    var badgeW = Math.max(ctx.measureText(data.badge).width + 20, 50);
    roundRect(ctx, w / 2 - badgeW / 2, h * 0.72, badgeW, 24, 12);
    ctx.fill();
    ctx.fillStyle = p.bg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.badge, w / 2, h * 0.72 + 12);
    ctx.restore();
  }
  // CTA with outline style
  if (data.cta) {
    ctx.save();
    ctx.strokeStyle = p.primary;
    ctx.lineWidth = 1.5;
    ctx.font = '600 ' + Math.max(12, w * 0.022) + 'px Montserrat, sans-serif';
    var ctaW = Math.max(ctx.measureText(data.cta).width + 44, 110);
    roundRect(ctx, w / 2 - ctaW / 2, h * 0.82, ctaW, 40, 6);
    ctx.stroke();
    ctx.fillStyle = p.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.cta, w / 2, h * 0.82 + 20);
    ctx.restore();
  }
}

function drawEventFlyer(canvas, ctx, data) {
  var w = canvas.width, h = canvas.height;
  var p = data.palette;
  // Full gradient background
  drawGradientBg(ctx, p, w, h);
  drawDecorations(ctx, 'eventflyer', w, h, p);
  // Bold geometric header block
  ctx.save();
  ctx.fillStyle = p.primary;
  ctx.globalAlpha = 0.88;
  ctx.fillRect(0, 0, w, h * 0.28);
  ctx.restore();
  // Accent line below header block
  ctx.save();
  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, h * 0.28, w, 4);
  ctx.restore();
  // Badge in header
  if (data.badge) {
    ctx.save();
    ctx.fillStyle = p.accent;
    ctx.font = '700 12px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.badge, w / 2, h * 0.07);
    ctx.restore();
  }
  // Headline on header block
  drawTypography(ctx, data.headline, w / 2, h * 0.18, { font: 'Montserrat', weight: '800', size: Math.max(24, w * 0.06), color: p.bg, align: 'center', maxWidth: w * 0.85 });
  // Structured event details area
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  roundRect(ctx, w * 0.06, h * 0.36, w * 0.88, h * 0.35, 10);
  ctx.fill();
  ctx.restore();
  // Subheadline (event details)
  drawTypography(ctx, data.subhead, w / 2, h * 0.43, { font: 'Poppins', weight: '500', size: Math.max(16, w * 0.04), color: p.text, align: 'center', maxWidth: w * 0.8, shadow: true });
  // Body text (structured details)
  if (data.body) {
    drawTypography(ctx, data.body, w / 2, h * 0.56, { font: 'Poppins', weight: '400', size: Math.max(12, w * 0.025), color: p.text, align: 'center', maxWidth: w * 0.75, shadow: true });
  }
  // Date/time prominent area
  ctx.save();
  ctx.fillStyle = p.secondary;
  ctx.globalAlpha = 0.2;
  roundRect(ctx, w * 0.15, h * 0.63, w * 0.7, h * 0.06, 4);
  ctx.fill();
  ctx.restore();
  // CTA button
  if (data.cta) {
    ctx.fillStyle = p.text;
    var ctaY = h * 0.75;
    ctx.font = '700 ' + Math.max(14, w * 0.03) + 'px Montserrat, sans-serif';
    var ctaW = Math.max(ctx.measureText(data.cta).width + 48, 120);
    roundRect(ctx, w / 2 - ctaW / 2, ctaY, ctaW, 48, 8);
    ctx.fill();
    ctx.fillStyle = p.bg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.cta, w / 2, ctaY + 24);
  }
  // Decorative corner triangles (already in drawDecorations but add extra here for emphasis)
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = p.secondary;
  ctx.beginPath();
  ctx.moveTo(0, h); ctx.lineTo(w * 0.15, h); ctx.lineTo(0, h * 0.85);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(w, h); ctx.lineTo(w * 0.85, h); ctx.lineTo(w, h * 0.85);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Main generatePoster - replaced with premium engine
function generatePoster() {
  var headline = document.getElementById('ps-headline').value.trim() || 'MEGA SALE';
  var subhead = document.getElementById('ps-subhead').value.trim() || 'Up to 70% Off';
  var body = document.getElementById('ps-body').value.trim();
  var cta = document.getElementById('ps-cta').value.trim();
  var badge = document.getElementById('ps-badge').value.trim();
  var size = document.getElementById('ps-size').value;
  var selectedTemplate = (state.settings && state.settings.selectedTemplate) || 'minimalist';
  var selectedPalette = (state.settings && state.settings.selectedPalette) || 'neonglow';
  var palette = COLOR_PALETTES[selectedPalette] || COLOR_PALETTES.neonglow;

  var canvas = document.getElementById('posterCanvas');
  var ctx = canvas.getContext('2d');

  var sizeMap = {
    'instagram-post': [600, 600],
    'instagram-story': [360, 640],
    'facebook-cover': [820, 312],
    'a4': [595, 842]
  };
  var dims = sizeMap[size] || sizeMap['instagram-post'];
  canvas.width = dims[0];
  canvas.height = dims[1];

  var data = {
    headline: headline,
    subhead: subhead,
    body: body,
    cta: cta,
    badge: badge,
    palette: palette,
    image: posterUploadedImage
  };

  var templateFns = {
    minimalist: drawMinimalist,
    boldsale: drawBoldSale,
    elegant: drawElegant,
    festival: drawFestival,
    productshowcase: drawProductShowcase,
    socialstory: drawSocialStory,
    quotecard: drawQuoteCard,
    eventflyer: drawEventFlyer
  };

  var drawFn = templateFns[selectedTemplate] || drawMinimalist;
  drawFn(canvas, ctx, data);

  // Brand watermark
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '400 ' + Math.max(10, Math.min(canvas.width, canvas.height) * 0.025) + 'px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ResellFlow.ai', canvas.width / 2, canvas.height * 0.95);
  ctx.restore();

  document.getElementById('poster-preview-wrap').style.display = 'block';
  trackGeneration('poster-banner', headline, 'Premium poster: ' + selectedTemplate);
  showToast('Poster generated with ' + selectedTemplate + ' template!', 'success');
}

function downloadPoster() {
  var canvas = document.getElementById('posterCanvas');
  var selectedTemplate = (state.settings && state.settings.selectedTemplate) || 'minimalist';
  var selectedPalette = (state.settings && state.settings.selectedPalette) || 'neonglow';
  var palette = COLOR_PALETTES[selectedPalette] || COLOR_PALETTES.neonglow;
  var headline = document.getElementById('ps-headline').value.trim() || 'MEGA SALE';
  var subhead = document.getElementById('ps-subhead').value.trim() || 'Up to 70% Off';
  var body = document.getElementById('ps-body').value.trim();
  var cta = document.getElementById('ps-cta').value.trim();
  var badge = document.getElementById('ps-badge').value.trim();
  var size = document.getElementById('ps-size').value;

  // Create 2x resolution offscreen canvas
  var sizeMap = {
    'instagram-post': [600, 600],
    'instagram-story': [360, 640],
    'facebook-cover': [820, 312],
    'a4': [595, 842]
  };
  var dims = sizeMap[size] || sizeMap['instagram-post'];
  var offCanvas = document.createElement('canvas');
  offCanvas.width = dims[0] * 2;
  offCanvas.height = dims[1] * 2;
  var offCtx = offCanvas.getContext('2d');
  offCtx.scale(2, 2);

  var data = {
    headline: headline,
    subhead: subhead,
    body: body,
    cta: cta,
    badge: badge,
    palette: palette,
    image: posterUploadedImage
  };

  var templateFns = {
    minimalist: drawMinimalist,
    boldsale: drawBoldSale,
    elegant: drawElegant,
    festival: drawFestival,
    productshowcase: drawProductShowcase,
    socialstory: drawSocialStory,
    quotecard: drawQuoteCard,
    eventflyer: drawEventFlyer
  };

  var drawFn = templateFns[selectedTemplate] || drawMinimalist;
  drawFn(offCanvas, offCtx, data);

  // Brand watermark
  offCtx.save();
  offCtx.fillStyle = 'rgba(255,255,255,0.4)';
  offCtx.font = '400 ' + Math.max(10, Math.min(dims[0], dims[1]) * 0.025) + 'px Inter, sans-serif';
  offCtx.textAlign = 'center';
  offCtx.textBaseline = 'middle';
  offCtx.fillText('ResellFlow.ai', dims[0] / 2, dims[1] * 0.95);
  offCtx.restore();

  var link = document.createElement('a');
  link.download = 'resellflow-poster-hd.png';
  link.href = offCanvas.toDataURL('image/png', 1.0);
  link.click();
  showToast('HD Poster downloaded!', 'success');
}

// Festival Sale Templates
function loadFestivalTemplate(festival) {
  var templates = {
    diwali: {
      headline: 'DIWALI MEGA SALE',
      subhead: 'Up to 75% Off \u2014 Festival of Lights!',
      caption: 'Light up your Diwali with amazing deals! Shop our Festival of Lights Sale and save big on everything you love!\n\nUp to 75% OFF\nFree Gifts on orders above \u20B9999\nFree Delivery\n\nShop Now before stocks run out!\n\n#DiwaliSale #FestivalOfLights #DiwaliDeals #SaleAlert #Diwali2024 #ShoppingFestival'
    },
    holi: {
      headline: 'HOLI COLOR SALE',
      subhead: 'Splash into Savings!',
      caption: 'Paint the town red, blue, and every color with our Holi Sale! Vibrant deals await!\n\nUp to 60% OFF\nColorful combos starting \u20B9499\nExtra 10% on 2+ items\n\nCelebrate with savings!\n\n#HoliSale #ColorFestival #HoliDeals #FestiveShopping #Holi2024 #SplashIntoSavings'
    },
    eid: {
      headline: 'EID MUBARAK SALE',
      subhead: 'Celebrate with Joy & Savings',
      caption: 'Eid Mubarak! Make this celebration extra special with our exclusive Eid Sale!\n\nUp to 65% OFF\nCurated Eid Gift Sets\nFree Gift Wrapping\n\nShop the collection now!\n\n#EidMubarak #EidSale #Eid2024 #CelebrationDeals #FestiveShopping #EidGifts'
    },
    rakhi: {
      headline: 'RAKHI SPECIAL',
      subhead: 'Bond of Love, Bond of Savings',
      caption: 'Celebrate the sibling bond with our Raksha Bandhan Special! Gifts that say "I care" without breaking the bank.\n\nUp to 55% OFF\nCombo Gifts for Siblings\nFree Delivery on Gift Sets\n\nOrder now and make Rakhi memorable!\n\n#RakhiSpecial #RakshaBandhan #SiblingLove #RakhiDeals #Rakhi2024 #GiftForSiblings'
    },
    newyear: {
      headline: 'NEW YEAR, NEW DEALS',
      subhead: 'Start 2025 Right!',
      caption: 'Ring in the New Year with incredible savings! Fresh start, fresh deals!\n\nUp to 80% OFF\nNew Year Special Bundles\nFreebies on orders above \u20B91499\n\nMake 2025 your best year yet!\n\n#NewYearSale #2025Deals #NewYearNewMe #FreshStart #JanuarySale #ResolutionSale'
    },
    christmas: {
      headline: 'CHRISTMAS MAGIC SALE',
      subhead: 'Unwrap the Best Deals!',
      caption: 'Ho ho ho! Santa came early with these amazing Christmas deals! Unwrap joy and savings!\n\nUp to 70% OFF\nHoliday Gift Guide\nFree Gift Wrapping\n\nDeck the halls with deals of folly!\n\n#ChristmasSale #HolidayDeals #XmasShopping #Christmas2024 #GiftIdeas #SantaCameEarly'
    }
  };

  var tmpl = templates[festival];
  if (!tmpl) return;

  var output = document.getElementById('festival-output');
  output.style.display = 'block';
  output.innerHTML = '<h3>' + escapeHtml(tmpl.headline) + '</h3><p style="font-size:18px;font-weight:700;margin:8px 0">' + escapeHtml(tmpl.subhead) + '</p><p>' + escapeHtml(tmpl.caption).replace(/\n/g, '<br>') + '</p>';

  trackGeneration('festival-template', festival, tmpl.caption);
  showToast(festival.charAt(0).toUpperCase() + festival.slice(1) + ' template loaded!', 'success');
}

// Auto Brand Kit Generator
function generateBrandKit() {
  var name = document.getElementById('bk-name').value.trim();
  if (!name) { showToast('Please enter a business name', 'warning'); return; }
  var industry = document.getElementById('bk-industry').value;

  var palettes = {
    fashion: ['#2C3E50', '#E74C3C', '#ECF0F1', '#C0392B', '#BDC3C7'],
    beauty: ['#E8A0BF', '#BA90C6', '#C2B280', '#8ECAE6', '#FFC8DD'],
    food: ['#D35400', '#F39C12', '#27AE60', '#E74C3C', '#FDEBD0'],
    tech: ['#2E86C1', '#1B2631', '#85C1E9', '#AEB6BF', '#2ECC71'],
    home: ['#A0522D', '#DEB887', '#8FBC8F', '#CD853F', '#F5F5DC'],
    handmade: ['#8B4513', '#FF6347', '#FFD700', '#2E8B57', '#FFA07A']
  };

  var fontSets = {
    fashion: ['Playfair Display (Headings)', 'Lato (Body)', 'Mix: Elegant Serif + Clean Sans'],
    beauty: ['Cormorant Garamond (Headings)', 'Montserrat (Body)', 'Mix: Romantic Serif + Modern Sans'],
    food: ['Poppins (Headings)', 'Open Sans (Body)', 'Mix: Friendly Rounded + Readable Sans'],
    tech: ['Space Grotesk (Headings)', 'Inter (Body)', 'Mix: Geometric + Technical Sans'],
    home: ['Merriweather (Headings)', 'Source Sans Pro (Body)', 'Mix: Warm Serif + Cozy Sans'],
    handmade: ['Caveat (Headings)', 'Nunito (Body)', 'Mix: Handwritten + Friendly Rounded']
  };

  var personalities = {
    fashion: 'Sophisticated, Bold, Trend-setting, Premium',
    beauty: 'Elegant, Nurturing, Trustworthy, Inspiring',
    food: 'Warm, Inviting, Authentic, Energetic',
    tech: 'Innovative, Reliable, Clean, Forward-thinking',
    home: 'Cozy, Earthy, Timeless, Welcoming',
    handmade: 'Artisanal, Authentic, Creative, Heartfelt'
  };

  var colors = palettes[industry] || palettes.fashion;
  var fontSet = fontSets[industry] || fontSets.fashion;
  var personality = personalities[industry] || personalities.fashion;

  var html = '<h3>Brand Kit for ' + escapeHtml(name) + '</h3>';
  html += '<p style="color:var(--text-secondary);margin-bottom:12px">Industry: ' + industry.charAt(0).toUpperCase() + industry.slice(1) + '</p>';

  html += '<h4 style="margin-bottom:8px">Color Palette</h4>';
  html += '<div class="brand-palette">';
  for (var i = 0; i < colors.length; i++) {
    var c = colors[i];
    html += '<div class="brand-swatch" style="background:' + c + '" data-color="' + c + '" onclick="navigator.clipboard.writeText(\'' + c + '\');showToast(\'Color copied!\',\'success\')"></div>';
  }
  html += '</div>';

  html += '<h4 style="margin:16px 0 8px">Typography</h4>';
  for (var j = 0; j < fontSet.length; j++) {
    html += '<p style="font-size:13px;color:var(--text-secondary);margin:4px 0">\u2022 ' + fontSet[j] + '</p>';
  }

  html += '<h4 style="margin:16px 0 8px">Brand Personality</h4>';
  html += '<p style="font-size:13px;color:var(--text-secondary)">' + personality + '</p>';

  var output = document.getElementById('bk-output');
  output.style.display = 'block';
  output.innerHTML = html;

  trackGeneration('brand-kit', name, 'Brand kit for ' + name);
  showToast('Brand kit generated!', 'success');
}

// ===== MOBILE DASHBOARD =====
function updateMobileDashboard() {
  document.getElementById('md-generations').textContent = state.generations.length;
  document.getElementById('md-products').textContent = state.products.length;
  document.getElementById('md-leads').textContent = state.leads.length;
  document.getElementById('md-reminders').textContent = state.reminders.length;
}

// ===== CLOUD SAVE =====
function exportData() {
  var data = JSON.stringify(state, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'resellflow-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported successfully!', 'success');
}

function importData(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var imported = JSON.parse(e.target.result);
      state = imported;
      saveState();
      renderReminders();
      renderLeads();
      renderCatalog();
      updateMobileDashboard();
      showToast('Data imported successfully!', 'success');
    } catch (err) {
      showToast('Invalid file format', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function clearAllData() {
  if (!confirm('Are you sure you want to delete all data? This cannot be undone.')) return;
  state = defaultState();
  saveState();
  renderReminders();
  renderLeads();
  renderCatalog();
  updateMobileDashboard();
  showToast('All data cleared', 'info');
}

function updateStorageStats() {
  try {
    var raw = localStorage.getItem(STATE_KEY) || '';
    var bytes = new Blob([raw]).size;
    var kb = (bytes / 1024).toFixed(1);
    var statsEl = document.getElementById('storage-stats');
    if (statsEl) {
      statsEl.innerHTML = 'Storage used: ' + kb + ' KB \u2022 Last saved: ' + new Date(state.lastSave).toLocaleString();
    }
  } catch (e) { /* ignore */ }
}

// ===== MULTI-LANGUAGE =====
var translations = {
  en: {
    tagline: 'Resell Smarter with AI',
    startCreating: 'Start Creating',
    viewDashboard: 'View Dashboard',
    generateBtn: 'Generate',
    copyBtn: 'Copy',
    saveBtn: 'Save',
    addBtn: 'Add',
    cancelBtn: 'Cancel',
    deleteBtn: 'Delete',
    productName: 'Product Name',
    category: 'Category',
    search: 'Search...',
    langNotice: 'Your selected language will be applied across the app interface.'
  },
  hi: {
    tagline: 'AI \u0915\u0947 \u0938\u093E\u0925 \u0938\u094D\u092E\u093E\u0930\u094D\u091F\u0932\u0940 \u0930\u0940\u0938\u0947\u0932 \u0915\u0930\u0947\u0902',
    startCreating: '\u092C\u0928\u093E\u0928\u093E \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902',
    viewDashboard: '\u0921\u0948\u0936\u092C\u094B\u0930\u094D\u0921 \u0926\u0947\u0916\u0947\u0902',
    generateBtn: '\u091C\u0928\u0930\u0947\u091F \u0915\u0930\u0947\u0902',
    copyBtn: '\u0915\u0949\u092A\u0940',
    saveBtn: '\u0938\u0947\u0935 \u0915\u0930\u0947\u0902',
    addBtn: '\u091C\u094B\u0921\u093C\u0947\u0902',
    cancelBtn: '\u0930\u0926\u094D\u0926 \u0915\u0930\u0947\u0902',
    deleteBtn: '\u0939\u091F\u093E\u090F\u0902',
    productName: '\u092A\u094D\u0930\u094B\u0921\u0915\u094D\u091F \u0915\u093E \u0928\u093E\u092E',
    category: '\u0936\u094D\u0930\u0947\u0923\u0940',
    search: '\u0916\u094B\u091C\u0947\u0902...',
    langNotice: '\u0906\u092A\u0915\u0940 \u091A\u092F\u0928\u093F\u0924 \u092D\u093E\u0937\u093E \u092A\u0942\u0930\u0947 \u0910\u092A \u092E\u0947\u0902 \u0932\u093E\u0917\u0942 \u0915\u0940 \u091C\u093E\u090F\u0917\u0940\u0964'
  },
  pa: {
    tagline: 'AI \u0928\u093E\u0932 \u0938\u092E\u091D\u0926\u093E\u0930\u0940 \u0930\u0940\u0938\u0947\u0932 \u0915\u0930\u094B',
    startCreating: '\u092C\u0923\u093E\u0909\u0923\u093E \u0938\u093C\u0941\u0930\u0942 \u0915\u0930\u094B',
    viewDashboard: '\u0921\u0948\u0938\u093C\u092C\u094B\u0930\u0921 \u0935\u0947\u0916\u094B',
    generateBtn: '\u0A1C\u0A28\u0A30\u0A47\u0A1F \u0A15\u0A30\u0A4B',
    copyBtn: '\u0A15\u0A3E\u0A2A\u0A40',
    saveBtn: '\u0A38\u0A47\u0A35 \u0A15\u0A30\u0A4B',
    addBtn: '\u0A1C\u0A4B\u0A21\u0A3C\u0A4B',
    cancelBtn: '\u0A30\u0A71\u0A26\u0A4D\u0A26 \u0A15\u0A30\u0A4B',
    deleteBtn: '\u0A39\u0A1F\u0A3E\u0A13',
    productName: '\u0A2A\u0A4D\u0A30\u0A4B\u0A21\u0A15\u0A1F \u0A26\u0A3E \u0A28\u0A3E\u0A02',
    category: '\u0A36\u0A4D\u0A30\u0A47\u0A23\u0A40',
    search: '\u0A16\u0A4B\u0A1C\u0A4B...',
    langNotice: '\u0A24\u0A41\u0A39\u0A3E\u0A21\u0A40 \u0A1A\u0A41\u0A23\u0A40 \u0A2D\u0A3E\u0A36\u0A3E \u0A2A\u0A42\u0A30\u0A40 \u0A10\u0A2A \u0A35\u0A3F\u0A71\u0A1A \u0A32\u0A3E\u0A17\u0A42 \u0A15\u0A40\u0A24\u0A40 \u0A1C\u0A3E\u0A35\u0A47\u0A17\u0A40\u0964'
  }
};

function switchLanguage(lang) {
  state.settings.lang = lang;
  saveState();
  var t = translations[lang] || translations.en;
  var preview = document.getElementById('lang-preview');
  if (preview) {
    preview.innerHTML = '<p class="lang-demo-text">' + t.langNotice + '</p>';
  }
  var langNames = { en: 'English', hi: 'Hindi', pa: 'Punjabi' };
  showToast('Language switched to ' + (langNames[lang] || lang), 'success');
}

// ===== SMART NOTIFICATIONS =====
var notificationPool = [
  { type: 'tip', icon: 'fa-lightbulb', title: 'Pro Tip', messages: [
    'Use emotional triggers in your product descriptions for 3x more engagement!',
    'Post your product images during 7-9 PM for maximum visibility.',
    'Add a story behind every product \u2014 customers love authentic narratives.',
    'Use before/after comparisons to showcase product effectiveness.',
    'Cross-promote your products on multiple platforms simultaneously.'
  ]},
  { type: 'trend', icon: 'fa-fire', title: 'Trending Now', messages: [
    'Smart watches are trending this week \u2014 consider adding them to your catalog.',
    'Organic skincare products are seeing 40% more searches this month.',
    'Home decor items peak during festive season \u2014 stock up now!',
    'Wireless audio gear demand is up 35% this quarter.',
    'Sustainable and eco-friendly products are the fastest growing category.'
  ]},
  { type: 'reminder', icon: 'fa-clock', title: 'Reminder', messages: [
    'Post your festive sale content at least 3 days before the event for maximum reach.',
    'Update your product photos regularly \u2014 fresh images get 2x more clicks.',
    'Follow up with leads within 24 hours for best conversion rates.',
    'Run flash sales on slow-moving inventory to free up capital.',
    'Review your pricing strategy monthly to stay competitive.'
  ]}
];

function refreshNotifications() {
  var feed = document.getElementById('notification-feed');
  feed.innerHTML = '';
  for (var i = 0; i < notificationPool.length; i++) {
    var group = notificationPool[i];
    var msg = group.messages[Math.floor(Math.random() * group.messages.length)];
    var div = document.createElement('div');
    div.className = 'notif-item notif-' + group.type;
    div.innerHTML = '<i class="fa-solid ' + group.icon + '"></i><div><strong>' + group.title + '</strong><p>' + msg + '</p></div>';
    feed.appendChild(div);
  }
  showToast('Notifications refreshed!', 'info');
}

// ===== ANALYTICS DASHBOARD =====
function updateAnalytics() {
  var totalGens = state.generations.length;
  var totalProducts = state.products.length;
  var totalLeads = state.leads.length;
  var convertedLeads = state.leads.filter(function(l) { return l.status === 'converted'; }).length;
  var conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  document.getElementById('an-total').textContent = totalGens;
  document.getElementById('an-products').textContent = totalProducts;
  document.getElementById('an-leads').textContent = totalLeads;
  document.getElementById('an-conversion').textContent = conversionRate + '%';

  // Generation types chart
  var typeCounts = {};
  for (var i = 0; i < state.generations.length; i++) {
    var g = state.generations[i];
    typeCounts[g.type] = (typeCounts[g.type] || 0) + 1;
  }

  var typeLabels = {
    'product-description': 'Descriptions',
    'ad-creative': 'Ad Creatives',
    'price-suggestion': 'Price Checks',
    'trending-finder': 'Trend Finds',
    'video-script': 'Video Scripts',
    'caption-hashtag': 'Captions',
    'poster-banner': 'Posters',
    'festival-template': 'Festival Tmpl',
    'brand-kit': 'Brand Kits'
  };

  var maxTypeCount = 1;
  var typeEntries = Object.entries(typeCounts);
  for (var j = 0; j < typeEntries.length; j++) {
    if (typeEntries[j][1] > maxTypeCount) maxTypeCount = typeEntries[j][1];
  }

  var barColors = ['purple', 'green', 'pink', 'yellow', 'red', 'purple', 'green', 'pink', 'yellow'];
  var genChart = '';
  if (typeEntries.length === 0) {
    genChart = '<p style="text-align:center;color:var(--text-muted);padding:16px">No data yet</p>';
  } else {
    for (var k = 0; k < typeEntries.length; k++) {
      var key = typeEntries[k][0];
      var val = typeEntries[k][1];
      var pct = Math.round((val / maxTypeCount) * 100);
      genChart += '<div class="bar-row">' +
        '<div class="bar-label">' + (typeLabels[key] || key) + '</div>' +
        '<div class="bar-track"><div class="bar-fill ' + barColors[k % barColors.length] + '" style="width:' + pct + '%">' + val + '</div></div>' +
        '</div>';
    }
  }
  document.getElementById('chart-gen-types').innerHTML = genChart;

  // Lead status chart
  var statusCounts = { new: 0, contacted: 0, converted: 0, lost: 0 };
  for (var m = 0; m < state.leads.length; m++) {
    statusCounts[state.leads[m].status] = (statusCounts[state.leads[m].status] || 0) + 1;
  }
  var maxStatusCount = 1;
  var statusEntries = Object.entries(statusCounts);
  for (var n = 0; n < statusEntries.length; n++) {
    if (statusEntries[n][1] > maxStatusCount) maxStatusCount = statusEntries[n][1];
  }

  var statusLabels = { new: 'New', contacted: 'Contacted', converted: 'Converted', lost: 'Lost' };
  var statusColors = { new: 'purple', contacted: 'green', converted: 'pink', lost: 'red' };
  var statusChart = '';
  for (var p = 0; p < statusEntries.length; p++) {
    var sKey = statusEntries[p][0];
    var sVal = statusEntries[p][1];
    var sPct = Math.round((sVal / maxStatusCount) * 100);
    statusChart += '<div class="bar-row">' +
      '<div class="bar-label">' + statusLabels[sKey] + '</div>' +
      '<div class="bar-track"><div class="bar-fill ' + statusColors[sKey] + '" style="width:' + sPct + '%">' + sVal + '</div></div>' +
      '</div>';
  }
  document.getElementById('chart-lead-status').innerHTML = statusChart;
}

// ===== CUSTOMER LEAD MANAGEMENT =====
function addLead() {
  var name = document.getElementById('cl-name').value.trim();
  if (!name) { showToast('Please enter a customer name', 'warning'); return; }
  var contact = document.getElementById('cl-contact').value.trim();
  var product = document.getElementById('cl-product').value.trim();
  var status = document.getElementById('cl-status').value;
  var notes = document.getElementById('cl-notes').value.trim();

  state.leads.push({
    id: Date.now(),
    name: name,
    contact: contact,
    product: product,
    status: status,
    notes: notes
  });
  saveState();
  renderLeads();

  document.getElementById('cl-name').value = '';
  document.getElementById('cl-contact').value = '';
  document.getElementById('cl-product').value = '';
  document.getElementById('cl-notes').value = '';

  showToast('Lead added!', 'success');
}

function renderLeads() {
  var tbody = document.getElementById('leads-tbody');
  if (!state.leads.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">No leads yet. Add one above!</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < state.leads.length; i++) {
    var l = state.leads[i];
    html += '<tr>' +
      '<td>' + escapeHtml(l.name) + '</td>' +
      '<td>' + escapeHtml(l.contact || '-') + '</td>' +
      '<td>' + escapeHtml(l.product || '-') + '</td>' +
      '<td><span class="status-badge status-' + l.status + '">' + l.status + '</span></td>' +
      '<td>' +
      '<select onchange="updateLeadStatus(' + l.id + ',this.value)" style="padding:4px 8px;font-size:12px;background:var(--bg-input);color:var(--text);border:1px solid var(--border);border-radius:6px">' +
      '<option value="new"' + (l.status === 'new' ? ' selected' : '') + '>New</option>' +
      '<option value="contacted"' + (l.status === 'contacted' ? ' selected' : '') + '>Contacted</option>' +
      '<option value="converted"' + (l.status === 'converted' ? ' selected' : '') + '>Converted</option>' +
      '<option value="lost"' + (l.status === 'lost' ? ' selected' : '') + '>Lost</option>' +
      '</select> ' +
      '<button class="btn btn-sm btn-danger" onclick="deleteLead(' + l.id + ')"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
      '</tr>';
  }
  tbody.innerHTML = html;
}

function updateLeadStatus(id, status) {
  var lead = state.leads.find(function(l) { return l.id === id; });
  if (lead) lead.status = status;
  saveState();
  renderLeads();
  showToast('Lead status updated', 'info');
}

function deleteLead(id) {
  state.leads = state.leads.filter(function(l) { return l.id !== id; });
  saveState();
  renderLeads();
  showToast('Lead deleted', 'info');
}

// ===== PRODUCT CATALOG =====
function openAddProductModal() {
  openModal('addProductModal');
}

function addProduct() {
  var name = document.getElementById('ap-name').value.trim();
  if (!name) { showToast('Please enter a product name', 'warning'); return; }
  var category = document.getElementById('ap-category').value;
  var price = parseFloat(document.getElementById('ap-price').value) || 0;
  var stock = parseInt(document.getElementById('ap-stock').value) || 0;
  var desc = document.getElementById('ap-desc').value.trim();

  state.products.push({
    id: Date.now(),
    name: name,
    category: category,
    price: price,
    stock: stock,
    description: desc
  });
  saveState();
  renderCatalog();
  closeModal('addProductModal');

  document.getElementById('ap-name').value = '';
  document.getElementById('ap-price').value = '';
  document.getElementById('ap-stock').value = '';
  document.getElementById('ap-desc').value = '';

  showToast('Product added to catalog!', 'success');
}

function renderCatalog() {
  var search = (document.getElementById('pc-search').value || '').toLowerCase();
  var catFilter = document.getElementById('pc-filter-cat').value;

  var filtered = state.products.filter(function(p) {
    var matchSearch = !search || p.name.toLowerCase().indexOf(search) !== -1 || (p.description || '').toLowerCase().indexOf(search) !== -1;
    var matchCat = catFilter === 'all' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  var grid = document.getElementById('catalog-grid');
  if (!filtered.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;grid-column:1/-1">No products found. Add your first product!</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var p = filtered[i];
    html += '<div class="catalog-item">' +
      '<div class="ci-category">' + escapeHtml(p.category) + '</div>' +
      '<h4>' + escapeHtml(p.name) + '</h4>' +
      '<div class="ci-price">\u20B9' + (p.price || 'N/A') + '</div>' +
      '<div class="ci-stock">Stock: ' + (p.stock || 'N/A') + '</div>' +
      (p.description ? '<div class="ci-desc">' + escapeHtml(p.description) + '</div>' : '') +
      '<div class="ci-actions">' +
      '<button class="btn btn-sm btn-outline" onclick="editProduct(' + p.id + ')"><i class="fa-solid fa-edit"></i></button>' +
      '<button class="btn btn-sm btn-danger" onclick="deleteProduct(' + p.id + ')"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
      '</div>';
  }
  grid.innerHTML = html;
}

function filterCatalog() {
  renderCatalog();
}

function editProduct(id) {
  var product = state.products.find(function(p) { return p.id === id; });
  if (!product) return;
  var newName = prompt('Edit product name:', product.name);
  if (newName === null) return;
  if (newName.trim()) product.name = newName.trim();
  var newPrice = prompt('Edit price (\u20B9):', product.price);
  if (newPrice !== null) product.price = parseFloat(newPrice) || 0;
  var newStock = prompt('Edit stock:', product.stock);
  if (newStock !== null) product.stock = parseInt(newStock) || 0;
  saveState();
  renderCatalog();
  showToast('Product updated!', 'success');
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  state.products = state.products.filter(function(p) { return p.id !== id; });
  saveState();
  renderCatalog();
  showToast('Product deleted', 'info');
}

// ===== PREMIUM DEMO FEATURES =====
function tryVoiceover() {
  var output = document.getElementById('vo-output');
  output.style.display = 'block';
  output.innerHTML = '<h3>Voiceover Demo</h3>' +
    '<p style="color:var(--text-secondary);font-size:13px;line-height:1.8">' +
    '<em>[AI Voiceover Simulation]</em>\n\n' +
    '"Introducing the product that everyone\'s been waiting for... Imagine holding perfection in your hands. ' +
    'Every detail crafted with care. Every feature designed for you. ' +
    'This isn\'t just a product \u2014 it\'s a game changer. ' +
    'Available now. Order today and experience the difference."\n\n' +
    'Voice: Professional Female | Speed: 1.0x | Duration: ~15 sec\n' +
    'Tone: Confident, Warm, Persuasive' +
    '</p>';
  showToast('Voiceover demo generated! (Premium feature)', 'info');
}

function tryVideoAd() {
  var output = document.getElementById('vac-output');
  output.style.display = 'block';
  output.innerHTML = '<h3>Video Ad Demo</h3>' +
    '<p style="color:var(--text-secondary);font-size:13px;line-height:1.8">' +
    '<em>[AI Video Ad Simulation]</em>\n\n' +
    'SCENE 1 (0-2s): Fade in from black. Product hero shot with dramatic lighting.\n' +
    'SCENE 2 (2-5s): Text overlay: "The Wait Is Over" with particle effects.\n' +
    'SCENE 3 (5-10s): Product demo montage \u2014 3 quick cuts showing features.\n' +
    'SCENE 4 (10-15s): Customer testimonial card with star rating.\n' +
    'SCENE 5 (15-20s): Price reveal with countdown timer. CTA: "Shop Now"\n\n' +
    'Resolution: 1080x1920 (9:16) | Format: MP4\n' +
    'Music: Upbeat Corporate | Duration: 20s' +
    '</p>';
  showToast('Video ad demo generated! (Premium feature)', 'info');
}

function tryShopifyIntegration() {
  var output = document.getElementById('si-output');
  output.style.display = 'block';
  output.innerHTML = '<h3>Shopify &amp; Meesho Integration Demo</h3>' +
    '<p style="color:var(--text-secondary);font-size:13px;line-height:1.8">' +
    '<em>[Integration Simulation]</em>\n\n' +
    'Connected Stores:\n' +
    '  \u2705 Shopify: my-store.myshopify.com\n' +
    '  \u2705 Meesho: meesho.com/seller/my-shop\n\n' +
    'Sync Status:\n' +
    '  \u2022 ' + state.products.length + ' products synced\n' +
    '  \u2022 Last sync: ' + new Date().toLocaleString() + '\n' +
    '  \u2022 Inventory: Real-time sync enabled\n\n' +
    'Actions Available:\n' +
    '  \u2022 Push new products to store\n' +
    '  \u2022 Update prices across platforms\n' +
    '  \u2022 Sync inventory levels\n' +
    '  \u2022 Import orders for fulfillment' +
    '</p>';
  showToast('Shopify/Meesho integration demo! (Premium feature)', 'info');
}

function tryWhatsAppIntegration() {
  var output = document.getElementById('wa-output');
  output.style.display = 'block';
  output.innerHTML = '<h3>WhatsApp Integration Demo</h3>' +
    '<p style="color:var(--text-secondary);font-size:13px;line-height:1.8">' +
    '<em>[WhatsApp Business API Simulation]</em>\n\n' +
    'Connected: WhatsApp Business\n' +
    'Phone: +91 98765 43210\n\n' +
    'Broadcast Templates:\n' +
    '  New Product Alert\n' +
    '  Flash Sale Notification\n' +
    '  Order Confirmation\n' +
    '  Delivery Update\n\n' +
    'Quick Actions:\n' +
    '  \u2022 Send catalog to customer\n' +
    '  \u2022 Broadcast sale alert to ' + state.leads.length + ' leads\n' +
    '  \u2022 Auto-reply to inquiries\n' +
    '  \u2022 Share payment links' +
    '</p>';
  showToast('WhatsApp integration demo! (Premium feature)', 'info');
}

// ===== UTILITY =====
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ===== ResellFlow.ai - Full Application Logic ===== */

// ===== STATE =====
var STATE_KEY = 'resellflow_data';
var state = loadState();

function defaultState() {
  return {
    products: [],
    leads: [],
    reminders: [],
    generations: [],
    settings: { lang: 'en', theme: 'dark' },
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
function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toastContainer');
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  var icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  toast.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4000);
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

// Poster and Banner Maker
function generatePoster() {
  var headline = document.getElementById('ps-headline').value.trim() || 'MEGA SALE';
  var subhead = document.getElementById('ps-subhead').value.trim() || 'Up to 70% Off';
  var theme = document.getElementById('ps-theme').value;
  var size = document.getElementById('ps-size').value;

  var canvas = document.getElementById('posterCanvas');
  var ctx = canvas.getContext('2d');

  var sizeMap = {
    'instagram-post': [600, 600],
    'instagram-story': [360, 640],
    'facebook-cover': [820, 312],
    'whatsapp-status': [360, 640]
  };
  var dims = sizeMap[size] || sizeMap['instagram-post'];
  var w = dims[0];
  var h = dims[1];
  canvas.width = w;
  canvas.height = h;

  var gradients = {
    gradient1: ['#6C5CE7', '#a29bfe'],
    gradient2: ['#0984e3', '#74b9ff'],
    gradient3: ['#e17055', '#fdcb6e'],
    gradient4: ['#00B894', '#55efc4'],
    gradient5: ['#FD79A8', '#fab1a0'],
    gradient6: ['#2d3436', '#636e72']
  };
  var colors = gradients[theme] || gradients.gradient1;

  var grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Decorative circles
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.2, Math.min(w, h) * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.2, h * 0.8, Math.min(w, h) * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Headline
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var headlineSize = Math.max(28, Math.min(w, h) * 0.12);
  ctx.font = '800 ' + headlineSize + 'px Inter, sans-serif';
  ctx.fillText(headline, w / 2, h * 0.4);

  // Subheadline
  var subheadSize = Math.max(18, Math.min(w, h) * 0.07);
  ctx.font = '500 ' + subheadSize + 'px Inter, sans-serif';
  ctx.fillText(subhead, w / 2, h * 0.55);

  // Brand
  ctx.font = '400 ' + Math.max(12, Math.min(w, h) * 0.035) + 'px Inter, sans-serif';
  ctx.globalAlpha = 0.7;
  ctx.fillText('ResellFlow.ai', w / 2, h * 0.9);
  ctx.globalAlpha = 1;

  document.getElementById('poster-preview-wrap').style.display = 'block';
  trackGeneration('poster-banner', headline, 'Canvas poster');
  showToast('Poster generated!', 'success');
}

function downloadPoster() {
  var canvas = document.getElementById('posterCanvas');
  var link = document.createElement('a');
  link.download = 'resellflow-poster.png';
  link.href = canvas.toDataURL();
  link.click();
  showToast('Poster downloaded!', 'success');
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

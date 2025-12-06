(function(){
  // Sample product data with real images
  var products = [
    {
      id: 'p1',
      name: 'Samsung Galaxy S21',
      brand: 'Samsung',
      category: 'Electronics',
      type: 'Smartphone',
      size: '6.2"',
      condition: 'Like New',
      price: 450,
      originalPrice: 600,
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 5
    },
    {
      id: 'p2',
      name: 'LG OLED TV 55"',
      brand: 'LG',
      category: 'Electronics',
      type: 'Television',
      size: '55"',
      condition: 'Good',
      price: 800,
      originalPrice: 1200,
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 3
    },
    {
      id: 'p3',
      name: 'Korean Beauty Set',
      brand: 'Other',
      category: 'Beauty',
      type: 'Skincare',
      size: 'Set',
      condition: 'New',
      price: 35,
      originalPrice: 50,
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 12
    },
    {
      id: 'p4',
      name: 'Hyundai Car Parts',
      brand: 'Hyundai',
      category: 'Accessories',
      type: 'Automotive',
      size: 'Various',
      condition: 'Good',
      price: 120,
      originalPrice: 180,
      image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 8
    },
    {
      id: 'p5',
      name: 'Korean Traditional Hanbok',
      brand: 'Other',
      category: 'Clothing',
      type: 'Traditional',
      size: 'M',
      condition: 'Like New',
      price: 85,
      originalPrice: 120,
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 2
    },
    {
      id: 'p6',
      name: 'Kia Car Accessories',
      brand: 'Kia',
      category: 'Accessories',
      type: 'Automotive',
      size: 'Universal',
      condition: 'New',
      price: 45,
      originalPrice: 65,
      image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 15
    },
    {
      id: 'p7',
      name: 'Samsung Wireless Earbuds',
      brand: 'Samsung',
      category: 'Electronics',
      type: 'Audio',
      size: 'One Size',
      condition: 'New',
      price: 120,
      originalPrice: 180,
      image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 8
    },
    {
      id: 'p8',
      name: 'Korean Ceramic Tableware',
      brand: 'Other',
      category: 'Home',
      type: 'Kitchen',
      size: 'Set of 4',
      condition: 'Like New',
      price: 65,
      originalPrice: 95,
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 6
    },
    {
      id: 'p9',
      name: 'LG Air Purifier',
      brand: 'LG',
      category: 'Home',
      type: 'Appliances',
      size: 'Medium',
      condition: 'Good',
      price: 200,
      originalPrice: 280,
      image: 'https://images.unsplash.com/photo-1581578731548-c6a0c3f2f4c4?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 4
    },
    {
      id: 'p10',
      name: 'Korean Tea Set',
      brand: 'Other',
      category: 'Home',
      type: 'Tea Accessories',
      size: 'Complete Set',
      condition: 'New',
      price: 55,
      originalPrice: 80,
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&crop=center',
      availability: 'In Stock',
      stock: 10
    }
  ];

  var reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
  var cart = JSON.parse(localStorage.getItem('cart') || '[]');

  // Load products from localStorage (admin uploaded products)
  var savedProducts = localStorage.getItem('products');
  if (savedProducts) {
    var adminProducts = JSON.parse(savedProducts);
    // Merge admin products with default products
    adminProducts.forEach(function(adminProduct) {
      if (!products.find(p => p.id === adminProduct.id)) {
        products.push(adminProduct);
      }
    });
  }

  // Navigation
  var sections = Array.from(document.querySelectorAll('.section'));
  var navLinks = Array.from(document.querySelectorAll('.sidebar nav a'));
  
  function showSection(hash){
    var id = (hash||'#home').replace('#','');
    sections.forEach(function(s){ s.classList.toggle('active', s.id === id); });
    navLinks.forEach(function(l){ l.classList.toggle('active', l.getAttribute('href') === '#'+id); });
  }
  
  window.addEventListener('hashchange', function(){ showSection(location.hash); });
  showSection(location.hash);

  // Toast helper
  var toast = document.getElementById('toast');
  function showToast(text){
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(function(){ toast.classList.remove('show'); }, 3000);
  }

  // Render products
  function renderProducts(productsToRender = products){
    var productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    productGrid.innerHTML = '';
    
    productsToRender.forEach(function(product){
      var productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.setAttribute('data-name', product.name);
      productCard.setAttribute('data-category', product.category);
      productCard.setAttribute('data-brand', product.brand);
      productCard.setAttribute('data-condition', product.condition);
      
      var discount = Math.round((1 - product.price / product.originalPrice) * 100);
      
      productCard.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <div class="info">
          <p class="name">${product.name}</p>
          <p class="brand">${product.brand}</p>
          <p class="details">${product.type} • ${product.size} • ${product.condition}</p>
          <p class="availability">${product.availability} (${product.stock} left)</p>
          <p class="price">$${product.price} <span class="old-price">$${product.originalPrice}</span></p>
          <p class="discount">-${discount}%</p>
          <div class="product-actions">
            <button class="btn btn-outline add-cart-btn" data-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>Add to Cart</button>
            <button class="btn reserve-btn" data-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>${product.stock === 0 ? 'Out of Stock' : 'Reserve'}</button>
          </div>
        </div>
      `;
      
      productGrid.appendChild(productCard);
    });
  }

  // Filter products
  function applyFilters(){
    var searchTerm = (document.getElementById('search-input').value || '').toLowerCase();
    var categoryFilter = document.getElementById('category-filter').value;
    var conditionFilter = document.getElementById('condition-filter').value;
    var brandFilter = document.getElementById('brand-filter').value;
    
    var filteredProducts = products.filter(function(product){
      var matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                        product.brand.toLowerCase().includes(searchTerm);
      var matchesCategory = !categoryFilter || product.category === categoryFilter;
      var matchesCondition = !conditionFilter || product.condition === conditionFilter;
      var matchesBrand = !brandFilter || product.brand === brandFilter;
      
      return matchesSearch && matchesCategory && matchesCondition && matchesBrand;
    });
    
    renderProducts(filteredProducts);
  }

  // Event listeners for filters
  document.getElementById('search-input').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  document.getElementById('condition-filter').addEventListener('change', applyFilters);
  document.getElementById('brand-filter').addEventListener('change', applyFilters);

  // Daily order tracking
  const DAILY_LIMIT = 5;
  const ORDER_TRACKING_KEY = 'ksurplus_daily_orders';

  function getTodayString() {
    return new Date().toLocaleDateString();
  }

  function getDailyOrderCount() {
    try {
      const today = getTodayString();
      const dailyOrders = JSON.parse(localStorage.getItem(ORDER_TRACKING_KEY) || '{}');
      return dailyOrders[today] || 0;
    } catch(e) {
      return 0;
    }
  }

  function incrementDailyOrderCount(count = 1) {
    try {
      const today = getTodayString();
      const dailyOrders = JSON.parse(localStorage.getItem(ORDER_TRACKING_KEY) || '{}');
      dailyOrders[today] = (dailyOrders[today] || 0) + count;
      localStorage.setItem(ORDER_TRACKING_KEY, JSON.stringify(dailyOrders));
    } catch(e) {
      console.error('Error updating daily order count:', e);
    }
  }

  function canMakeReservation(itemCount = 1) {
    const currentCount = getDailyOrderCount();
    return (currentCount + itemCount) <= DAILY_LIMIT;
  }

  // Add to cart
  function addToCart(productId){
    var product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) return;
    var existing = cart.find(function(item){ return item.productId === productId; });
    if (existing){
      var nextQty = Math.min(product.stock, existing.quantity + 1);
      existing.quantity = nextQty;
    } else {
      cart.push({ productId: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    showToast(product.name + ' added to cart');
    renderCart();
  }

  // Remove from cart
  function removeFromCart(productId){
    cart = cart.filter(function(item){ return item.productId !== productId; });
    localStorage.setItem('cart', JSON.stringify(cart));
    showToast('Item removed from cart');
    renderCart();
  }

  // Make removeFromCart globally accessible
  window.removeFromCart = removeFromCart;

  // Update cart quantity
  function updateCartQuantity(productId, newQuantity){
    var item = cart.find(function(item){ return item.productId === productId; });
    if (item) {
      if (newQuantity <= 0) {
        removeFromCart(productId);
      } else {
        var product = products.find(p => p.id === productId);
        var maxQty = product ? product.stock : 999;
        item.quantity = Math.min(newQuantity, maxQty);
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
      }
    }
  }

  // Make updateCartQuantity globally accessible
  window.updateCartQuantity = updateCartQuantity;

  // Render cart table
  function renderCart(){
    var cartTableBody = document.getElementById('cart-table-body');
    var cartSummary = document.getElementById('cart-summary');
    var totalItems = document.getElementById('total-items');
    var totalAmount = document.getElementById('total-amount');
    
    if (!cartTableBody || !cartSummary || !totalItems || !totalAmount) return;
    
    if (cart.length === 0){
      cartTableBody.innerHTML = '<tr><td colspan="6" class="empty-cell">Your cart is empty. Browse products to add items!</td></tr>';
      cartSummary.style.display = 'none';
      return;
    }
    
    cartTableBody.innerHTML = '';
    var totalItemsCount = 0;
    var totalAmountValue = 0;
    
    cart.forEach(function(item){
      var row = document.createElement('tr');
      var itemTotal = item.price * item.quantity;
      totalItemsCount += item.quantity;
      totalAmountValue += itemTotal;
      
      row.innerHTML = `
        <td><input type="checkbox" class="item-checkbox" data-product-id="${item.productId}"></td>
        <td>
          <div class="product-info">
            <img src="${item.image}" alt="${item.name}" class="product-thumb">
            <div>
              <div class="product-name">${item.name}</div>
              <div class="product-id">ID: ${item.productId}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="quantity-controls">
            <button class="qty-btn" onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})">-</button>
            <input type="number" class="qty-input" value="${item.quantity}" min="1" onchange="updateCartQuantity('${item.productId}', parseInt(this.value))" style="-moz-appearance: textfield;">
            <button class="qty-btn" onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})">+</button>
          </div>
        </td>
        <td class="price-cell">$${item.price}</td>
        <td class="subtotal-cell">$${itemTotal.toFixed(2)}</td>
        <td>
          <button class="remove-btn" onclick="removeFromCart('${item.productId}')">Remove</button>
        </td>
      `;
      
      cartTableBody.appendChild(row);
    });
    
    totalItems.textContent = totalItemsCount;
    totalAmount.textContent = '$' + totalAmountValue.toFixed(2);
    cartSummary.style.display = 'block';
  }

  // Select all functionality
  function selectAllItems(selectAll){
    var checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(function(checkbox){
      checkbox.checked = selectAll;
    });
    document.getElementById('select-all-checkbox').checked = selectAll;
  }

  // Get selected items
  function getSelectedItems(){
    var selectedItems = [];
    var checkboxes = document.querySelectorAll('.item-checkbox:checked');
    checkboxes.forEach(function(checkbox){
      var productId = checkbox.getAttribute('data-product-id');
      var item = cart.find(function(cartItem){ return cartItem.productId === productId; });
      if (item) selectedItems.push(item);
    });
    return selectedItems;
  }

  // Reserve selected items
  function reserveSelectedItems(){
    var selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      showToast('Please select items to reserve');
      return;
    }
    
    var totalReserved = 0;
    selectedItems.forEach(function(item){
      var product = products.find(p => p.id === item.productId);
      if (product && product.stock >= item.quantity) {
        // Create reservation for each item
        for (var i = 0; i < item.quantity; i++) {
          var reservation = {
            id: Date.now().toString() + '_' + i,
            productId: item.productId,
            productName: item.name,
            productImage: item.image,
            price: item.price,
            status: 'Pending',
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
          };
          reservations.push(reservation);
          product.stock--;
          totalReserved++;
        }
      }
    });
    
    if (totalReserved > 0) {
      localStorage.setItem('reservations', JSON.stringify(reservations));
      showToast(totalReserved + ' items reserved successfully!');
      renderReservations();
      renderProducts();
      
      // Remove reserved items from cart
      var selectedProductIds = selectedItems.map(function(item){ return item.productId; });
      cart = cart.filter(function(item){ return !selectedProductIds.includes(item.productId); });
      localStorage.setItem('cart', JSON.stringify(cart));
      renderCart();
    } else {
      showToast('Unable to reserve selected items. Please check stock availability.');
    }
  }

  // Event delegation for action buttons
  document.addEventListener('click', function(e){
    if (e.target.classList.contains('reserve-btn')){
      e.preventDefault();
      var productId = e.target.getAttribute('data-id');
      reserveProduct(productId);
    } else if (e.target.classList.contains('add-cart-btn')){
      e.preventDefault();
      var productId = e.target.getAttribute('data-id');
      addToCart(productId);
    }
  });

  // Render reservations
  function renderReservations(){
    var reservationsList = document.getElementById('reservations-list');
    if (!reservationsList) return;
    
    if (reservations.length === 0){
      reservationsList.innerHTML = '<div class="empty">No reservations yet. Browse products to make a reservation!</div>';
      return;
    }
    
    reservationsList.innerHTML = '';
    
    reservations.forEach(function(reservation){
      var reservationCard = document.createElement('div');
      reservationCard.className = 'reservation-card';
      
      var statusClass = reservation.status.toLowerCase().replace(' ', '-');
      
      reservationCard.innerHTML = `
        <div class="reservation-image">
          <img src="${reservation.productImage}" alt="${reservation.productName}">
        </div>
        <div class="reservation-details">
          <h3>${reservation.productName}</h3>
          <p class="reservation-price">$${reservation.price}</p>
          <p class="reservation-date">Reserved: ${reservation.date} at ${reservation.time}</p>
          <span class="reservation-status ${statusClass}">${reservation.status}</span>
          ${(reservation.status === 'Pending' || reservation.status === 'Confirmed') ? 
            '<button class="btn-small btn-warning cancel-reservation-btn" onclick="cancelUserReservation(\'' + reservation.id + '\')" style="margin-top: 8px;">Cancel Reservation</button>' : 
            ''
          }
        </div>
      `;
      
      reservationsList.appendChild(reservationCard);
    });
  }

  // Cancel user reservation
  window.cancelUserReservation = function(reservationId){
    var reservation = reservations.find(r => r.id === reservationId);
    if (reservation) {
      if (confirm('Are you sure you want to cancel this reservation?')) {
        reservation.status = 'Cancelled';
        localStorage.setItem('reservations', JSON.stringify(reservations));
        renderReservations();
        alert('Reservation cancelled successfully!');
      }
    }
  };

  // Render Home sections (Featured & New Arrivals)
  function renderHomeSections(){
    var featuredGrid = document.getElementById('featured-grid');
    var newArrivalsGrid = document.getElementById('new-arrivals-grid');
    if (!featuredGrid || !newArrivalsGrid) return;

    var byDiscount = products
      .slice()
      .sort(function(a,b){ return (b.originalPrice - b.price) - (a.originalPrice - a.price); })
      .slice(0, 4);

    var newArrivals = products.slice(-4);

    function cardHtml(product){
      var discount = Math.round((1 - product.price / product.originalPrice) * 100);
      return `
        <div class="product-card">
          <img src="${product.image}" alt="${product.name}">
          <div class="info">
            <p class="name">${product.name}</p>
            <p class="brand">${product.brand}</p>
            <p class="price">$${product.price} <span class="old-price">$${product.originalPrice}</span></p>
            <p class="discount">-${discount}%</p>
            <div class="product-actions">
              <button class="btn btn-outline add-cart-btn" data-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>Add to Cart</button>
              <button class="btn reserve-btn" data-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>${product.stock === 0 ? 'Out of Stock' : 'Reserve'}</button>
            </div>
          </div>
        </div>`;
    }

    featuredGrid.innerHTML = byDiscount.map(cardHtml).join('');
    newArrivalsGrid.innerHTML = newArrivals.map(cardHtml).join('');
  }

  // Category filter from home page
  function onCategoryClick(e){
    var btn = e.currentTarget;
    document.querySelectorAll('.cat-card').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    location.hash = '#products';
    
    var category = btn.getAttribute('data-category');
    document.getElementById('category-filter').value = category;
    applyFilters();
  }
  
  Array.from(document.querySelectorAll('.cat-card')).forEach(function(btn){ 
    btn.addEventListener('click', onCategoryClick); 
  });

  // Logout
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn){ 
    logoutBtn.addEventListener('click', function(){
      localStorage.removeItem('reservations');
    window.location.replace('login.html');
    }); 
  }

  // Cart event listeners
  document.getElementById('select-all-btn').addEventListener('click', function(){
    selectAllItems(true);
  });

  document.getElementById('deselect-all-btn').addEventListener('click', function(){
    selectAllItems(false);
  });

  document.getElementById('reserve-selected-btn').addEventListener('click', function(){
    reserveSelectedItems();
  });

  document.getElementById('select-all-checkbox').addEventListener('change', function(){
    selectAllItems(this.checked);
  });

  // Initialize
  renderProducts();
  renderHomeSections();
  renderCart();
  renderReservations();
})();

// DOM elements
const [
  categoryFilter,
  productsContainer,
  selectedProductsList,
  chatForm,
  chatWindow,
  productModal,
  closeModalBtn,
] = [
  "categoryFilter",
  "productsContainer",
  "selectedProductsList",
  "chatForm",
  "chatWindow",
  "productModal",
  ".close-modal",
].map((id) =>
  id.startsWith(".") ? document.querySelector(id) : document.getElementById(id),
);

let allProducts = [],
  selectedProducts = [],
  conversationHistory = [];

// localStorage helpers
const saveSelectedProducts = () =>
  localStorage.setItem(
    "selectedProductIds",
    JSON.stringify(selectedProducts.map((p) => p.id)),
  );
const loadSelectedProducts = () => {
  const saved = localStorage.getItem("selectedProductIds");
  if (saved)
    selectedProducts = allProducts.filter((p) =>
      JSON.parse(saved).includes(p.id),
    );
};

// Initial placeholders
const setPlaceholder = (el, msg, icon = "") =>
  (el.innerHTML = `<div class="placeholder-message">${icon} ${msg}</div>`);
setPlaceholder(
  productsContainer,
  "Loading products...",
  '<i class="fa-solid fa-spinner fa-spin"></i>',
);
setPlaceholder(selectedProductsList, "Loading your selections...");

// Load products
const loadProducts = async () => {
  if (allProducts.length) return allProducts;
  const { products } = await (await fetch("products.json")).json();
  return (allProducts = products);
};

// Initialize app
const init = async () => {
  await loadProducts();
  loadSelectedProducts();
  updateSelectedProducts();
  setPlaceholder(productsContainer, "Select a category to view products");
};
document.addEventListener("DOMContentLoaded", init);

// Display products
const displayProducts = (products) => {
  if (!products.length)
    return setPlaceholder(
      productsContainer,
      "No products found for this category.",
    );

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some((s) => s.id === product.id);
      return `<div class="product-card${isSelected ? " selected" : ""}" data-product-id="${product.id}">
      <button class="product-add-btn" aria-label="View product details" title="Click to view product description">
        <i class="fa-solid fa-${isSelected ? "check" : "plus"}"></i>
      </button>
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info"><h3>${product.name}</h3><p>${product.brand}</p></div>
    </div>`;
    })
    .join("");
};

// Update selected products display
const updateSelectedProducts = () => {
  if (!selectedProducts.length)
    return setPlaceholder(
      selectedProductsList,
      "No products selected yet. Click a product to add it.",
    );

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) =>
        `<div class="selected-product-pill fade-in" data-product-id="${product.id}">
      <span>${product.name}</span>
      <button class="remove-product" type="button" data-product-id="${product.id}" aria-label="Remove ${product.name}">&times;</button>
    </div>`,
    )
    .join("");
};

// Clear all selections
const clearAllSelections = () => {
  selectedProducts = [];
  updateSelectedProducts();
  refreshProductCards();
  saveSelectedProducts();
};

// Refresh product card visual states
const refreshProductCards = () => {
  document.querySelectorAll('.product-card').forEach(card => {
    const productId = +card.dataset.productId;
    const isSelected = selectedProducts.some(p => p.id === productId);
    card.classList.toggle('selected', isSelected);
    const addBtn = card.querySelector('.product-add-btn i');
    if (addBtn) {
      addBtn.className = `fa-solid fa-${isSelected ? 'check' : 'plus'}`;
    }
  });
};

// Modal functions
const openProductModal = (product) => {
  Object.assign(document.getElementById("modalProductImage"), {
    src: product.image,
    alt: product.name,
  });
  document.getElementById("modalProductName").textContent = product.name;
  document.getElementById("modalProductBrand").textContent = product.brand;
  document.getElementById("modalProductDescription").textContent =
    product.description;
  productModal.style.display = "block";
  document.body.style.overflow = "hidden";
};

const closeProductModal = () => {
  productModal.style.display = "none";
  document.body.style.overflow = "auto";
};

// Toggle product selection
const toggleProductSelection = (productId) => {
  const index = selectedProducts.findIndex((p) => p.id === productId);
  if (index > -1) selectedProducts.splice(index, 1);
  else {
    const product = allProducts.find((p) => p.id === productId);
    if (product) selectedProducts.push(product);
  }
  updateSelectedProducts();
  refreshProductCards();
  saveSelectedProducts();
};

// Event listeners
productsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card");
  if (!card) return;
  const productId = +card.dataset.productId;
  if (e.target.closest(".product-add-btn")) {
    e.stopPropagation();
    const product = allProducts.find((p) => p.id === productId);
    if (product) openProductModal(product);
  } else toggleProductSelection(productId);
});

selectedProductsList.addEventListener("click", (e) => {
  const btn = e.target.closest(".remove-product");
  if (btn) toggleProductSelection(+btn.dataset.productId);
});

document.getElementById("clearAllBtn")?.addEventListener("click", () => {
  if (
    selectedProducts.length &&
    confirm(`Remove all ${selectedProducts.length} selected products?`)
  )
    clearAllSelections();
});

categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  displayProducts(products.filter((p) => p.category === e.target.value));
});

// Generate routine
document
  .getElementById("generateRoutine")
  ?.addEventListener("click", async () => {
    if (!selectedProducts.length)
      return setPlaceholder(
        chatWindow,
        "Please select at least one product to generate a routine.",
      );

    const btn = document.getElementById("generateRoutine");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
    setPlaceholder(
      chatWindow,
      "Generating your personalized routine...",
      '<i class="fa-solid fa-spinner fa-spin"></i>',
    );

    try {
      await generateRoutineWithAI();
    } finally {
      btn.disabled = false;
      btn.innerHTML =
        '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Routine';
    }
  });

// AI routine generation
const generateRoutineWithAI = async () => {
  try {
    conversationHistory = [];
    const productList = selectedProducts
      .map((p, i) => `${i + 1}. ${p.name} by ${p.brand} (${p.category})`)
      .join("\n");
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful skincare and beauty advisor. Answer questions about skincare, haircare, makeup, fragrance, and other beauty topics. You have just provided the user with a personalized routine based on their selected products. Be helpful, friendly, and inform.",
      },
      {
        role: "user",
        content: `You are a skincare and beauty routine expert. Based on the following selected products, create a personalized daily routine. Include morning and evening steps, how to apply each product, and any tips for best results.\n\nSelected Products:\n${productList}\n\nPlease provide a comprehensive, easy-to-follow routine that incorporates these products.`,
      },
    ];

    const response = await fetch("https://protect.matesto55.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok)
      throw new Error(
        `Worker API Error: ${response.status} ${response.statusText}`,
      );
    const data = await response.json();
    if (!data.choices?.[0]?.message)
      throw new Error("Invalid response format from API");

    const routine = data.choices[0].message.content;
    conversationHistory.push(
      { role: "user", content: messages[1].content },
      { role: "assistant", content: routine },
    );
    chatWindow.innerHTML = `<div>${routine.replace(/\n/g, "<br>")}</div>`;
  } catch (error) {
    console.error("Error generating routine:", error);
    setPlaceholder(
      chatWindow,
      "Sorry, there was an error generating your routine. Please try again.",
    );
  }
};

// Chat functionality
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("userInput"),
    btn = document.getElementById("sendBtn"),
    message = input.value.trim();
  if (!message) return;
  if (!conversationHistory.length)
    return setPlaceholder(
      chatWindow,
      'Please generate a routine first by clicking the "Generate Routine" button.',
    );

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  chatWindow.innerHTML += `<div><strong>You:</strong> ${message}</div>`;
  input.value = "";
  conversationHistory.push({ role: "user", content: message });

  try {
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful skincare and beauty advisor. Answer questions about skincare, haircare, makeup, fragrance, and other beauty topics. The user has a personalized routine, and you can discuss it or related topics. Be helpful, friendly, and informative.",
      },
      ...conversationHistory,
    ];

    const response = await fetch("https://protect.matesto55.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok)
      throw new Error(
        `Worker API Error: ${response.status} ${response.statusText}`,
      );
    const data = await response.json();
    if (!data.choices?.[0]?.message)
      throw new Error("Invalid response format from API");

    const reply = data.choices[0].message.content;
    conversationHistory.push({ role: "assistant", content: reply });
    chatWindow.innerHTML += `<div><strong>Assistant:</strong> ${reply}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    console.error("Error sending message:", error);
    chatWindow.innerHTML += `<div><strong>Error:</strong> Sorry, I couldn't process your message. Please try again.</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML =
      '<i class="fa-solid fa-paper-plane"></i><span class="visually-hidden">Send</span>';
  }
});

// Modal event listeners
closeModalBtn?.addEventListener("click", closeProductModal);
window.addEventListener(
  "click",
  (e) => e.target === productModal && closeProductModal(),
);
document.addEventListener(
  "keydown",
  (e) =>
    e.key === "Escape" &&
    productModal.style.display === "block" &&
    closeProductModal(),
);

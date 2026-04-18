// script.js — логика чата
let chatHistory = [];
let isLoading = false;

// Авторесайз textarea
function autoResize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

// Enter отправляет, Shift+Enter — новая строка
function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// Клик по быстрой кнопке
function sendChip(text) {
    document.getElementById("userInput").value = text;
    sendMessage();
}

// Добавить сообщение в чат
function addMessage(role, content) {
    const messages = document.getElementById("messages");

    const msgDiv = document.createElement("div");
    msgDiv.className = "msg " + role;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "bot" ? "AI" : "Я";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // Проверяем есть ли карточка сборки
    const pcMatch = content.match(/<pc-build>([\s\S]*?)<\/pc-build>/);
    let text = content;

    if (pcMatch) {
        text = content.replace(/<pc-build>[\s\S]*?<\/pc-build>/, "").trim();
        try {
            const parts = JSON.parse(pcMatch[1].trim());
            bubble.textContent = text;
            bubble.appendChild(buildPCCard(parts));
        } catch {
            bubble.textContent = text;
        }
    } else {
        bubble.textContent = text;
    }

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    messages.appendChild(msgDiv);

    // Прокрутить вниз
    messages.scrollTop = messages.scrollHeight;
}

// Карточка сборки ПК
function buildPCCard(parts) {
    const card = document.createElement("div");
    card.className = "pc-card";

    const header = document.createElement("div");
    header.className = "pc-card-header";
    header.textContent = "Рекомендуемая сборка";
    card.appendChild(header);

    let total = 0;

    parts.forEach((item) => {
        const row = document.createElement("div");
        row.className = "pc-card-row";
        row.innerHTML = `
      <span class="part-label">${item.part}</span>
      <span class="part-info">
        <span class="part-model">${item.model}</span>
        <span class="part-price">${item.price.toLocaleString("ru")}₸</span>
      </span>
    `;
        card.appendChild(row);
        total += item.price;
    });

    const totalRow = document.createElement("div");
    totalRow.className = "pc-card-row total-row";
    totalRow.innerHTML = `
    <span class="part-label">Итого</span>
    <span class="part-price total-price">${total.toLocaleString("ru")}₸</span>
  `;
    card.appendChild(totalRow);

    return card;
}

// Анимация "печатает..."
function showTyping() {
    const messages = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "msg bot";
    div.id = "typing";
    div.innerHTML = `
    <div class="avatar">AI</div>
    <div class="bubble typing-bubble">
      <span></span><span></span><span></span>
    </div>
  `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function removeTyping() {
    const el = document.getElementById("typing");
    if (el) el.remove();
}

// Главная функция отправки
async function sendMessage() {
    const input = document.getElementById("userInput");
    const text = input.value.trim();

    if (!text || isLoading) return;

    // Очистить поле
    input.value = "";
    input.style.height = "auto";

    // Показать сообщение пользователя
    addMessage("user", text);
    chatHistory.push({ role: "user", content: text });

    // Блокировать кнопку
    isLoading = true;
    document.getElementById("sendBtn").disabled = true;
    showTyping();

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": CONFIG.API_KEY,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true"
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                max_tokens: 1000,
                system: CONFIG.SYSTEM_PROMPT,
                messages: chatHistory
            })
        });

        const data = await response.json();
        const reply =
            data.content?.find((b) => b.type === "text")?.text ||
            "Извини, не смог ответить. Попробуй ещё раз.";

        chatHistory.push({ role: "assistant", content: reply });
        removeTyping();
        addMessage("bot", reply);

    } catch (error) {
        removeTyping();
        addMessage("bot", "❌ Ошибка соединения. Проверь интернет и API ключ.");
        console.error(error);
    }

    isLoading = false;
    document.getElementById("sendBtn").disabled = false;
}
document.addEventListener('DOMContentLoaded', () => {
    const charactersList = document.getElementById('charactersList');
    const charSearch = document.getElementById('charSearch');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    const modal = document.getElementById('charModal');
    const modalBody = document.getElementById('modalBody');
    const closeBtn = document.querySelector('.close');

    const chatModal = document.getElementById('chatModal');
    const closeChatBtn = document.querySelector('.close-chat');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatWithTitle = document.getElementById('chatWithTitle');

    let allCharacters = [];
    let filteredCharacters = [];
    let currentPage = 1;
    let currentCharName = '';
    const itemsPerPage = 12;

    if (charactersList) {
        fetchCharacters();
    }

    async function fetchCharacters() {
        try {
            const response = await fetch('/api/characters');
            allCharacters = await response.json();
            filteredCharacters = [...allCharacters];
            renderCharacters();
        } catch (error) {
            console.error('Error fetching characters:', error);
            charactersList.innerHTML = '<p>Error loading characters. Please try again later.</p>';
        }
    }

    function renderCharacters() {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = filteredCharacters.slice(start, end);

        charactersList.innerHTML = '';
        pageItems.forEach(char => {
            const card = document.createElement('div');
            card.className = 'char-card';
            card.innerHTML = `
                <img src="${char.image || 'https://via.placeholder.com/200x250?text=No+Image'}" alt="${char.name}">
                <div class="char-info">
                    <h3>${char.name}</h3>
                    <p>House: ${char.house || 'N/A'}</p>
                    <p>Patronus: ${char.patronus || 'N/A'}</p>
                </div>
            `;
            card.addEventListener('click', () => showDetails(char));
            charactersList.appendChild(card);
        });

        updatePagination();
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredCharacters.length / itemsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    if (charSearch) {
        charSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filteredCharacters = allCharacters.filter(c => 
                c.name.toLowerCase().includes(term)
            );
            currentPage = 1;
            renderCharacters();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCharacters();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredCharacters.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderCharacters();
            }
        });
    }

    function showDetails(char) {
        modalBody.innerHTML = `
            <div style="display: flex; gap: 2rem;">
                <img src="${char.image || 'https://via.placeholder.com/200x250?text=No+Image'}" style="width: 200px; border-radius: 8px;">
                <div>
                    <h2>${char.name}</h2>
                    <p><strong>House:</strong> ${char.house || 'N/A'}</p>
                    <p><strong>Date of Birth:</strong> ${char.dateOfBirth || 'N/A'}</p>
                    <p><strong>Actor:</strong> ${char.actor || 'N/A'}</p>
                    <p><strong>Species:</strong> ${char.species || 'N/A'}</p>
                    <p><strong>Wand:</strong> ${char.wand.wood || 'N/A'} wood, ${char.wand.core || 'N/A'} core, ${char.wand.length || 'N/A'} inches</p>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button id="favBtn" class="fav-btn">${isFavorite(char.id) ? 'Remove from Favorites' : 'Add to Favorites'}</button>
                        <button id="startChatBtn" class="chat-btn">Chat with ${char.name.split(' ')[0]}</button>
                    </div>
                </div>
            </div>
        `;
        modal.style.display = 'block';

        const favBtn = document.getElementById('favBtn');
        favBtn.addEventListener('click', () => toggleFavorite(char, favBtn));

        const startChatBtn = document.getElementById('startChatBtn');
        startChatBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            openChat(char.name);
        });
    }

    async function openChat(name) {
        currentCharName = name;
        chatWithTitle.textContent = `Chat with ${name}`;
        chatMessages.innerHTML = '';
        
        // Check server status
        try {
            const statusRes = await fetch('/api/status');
            const statusData = await statusRes.json();
            if (!statusData.openai_key_configured) {
                addChatMessage('System', '⚠️ Warning: OPENAI_API_KEY is not configured on the server. Chat will not work.');
            }
        } catch (e) {
            console.error("Failed to check status", e);
        }

        addChatMessage('System', `You are now talking to ${name}.`);
        chatModal.style.display = 'block';
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        addChatMessage('You', text);
        chatInput.value = '';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ char_name: currentCharName, message: text })
            });
            const data = await response.json();
            addChatMessage(currentCharName, data.reply);
        } catch (error) {
            console.error('Chat error:', error);
            addChatMessage('System', 'Error: Could not connect to the magic network.');
        }
    }

    function addChatMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender === 'You' ? 'user-message' : 'bot-message'}`;
        msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }

    if (closeChatBtn) {
        closeChatBtn.onclick = () => chatModal.style.display = 'none';
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
        if (event.target == chatModal) {
            chatModal.style.display = 'none';
        }
    }

    // Favorites logic
    function toggleFavorite(char, btn) {
        let favorites = JSON.parse(localStorage.getItem('hp_favorites') || '[]');
        if (isFavorite(char.id)) {
            favorites = favorites.filter(id => id !== char.id);
            btn.textContent = 'Add to Favorites';
        } else {
            favorites.push(char.id);
            btn.textContent = 'Remove from Favorites';
        }
        localStorage.setItem('hp_favorites', JSON.stringify(favorites));
    }

    function isFavorite(id) {
        const favorites = JSON.parse(localStorage.getItem('hp_favorites') || '[]');
        return favorites.includes(id);
    }
});

/* ═══════════════════════════════════════════════════════════
   NIKOLAUS - Secret Santa con Firebase
   ═══════════════════════════════════════════════════════════ */

// ============================================================
// DATOS DEL GRUPO
// ============================================================
let groupData = {
    id: null,
    name: '',
    adminEmail: '',
    budgetMin: 0,
    budgetMax: 0,
    exchangeDate: '',
    participants: [],
    sorteoRealizado: false,
    assignments: {}
};

let currentUser = {
    name: '',
    email: '',
    wishlist: []
};

// ============================================================
// NAVEGACIÓN ENTRE PANTALLAS
// ============================================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// ============================================================
// TOGGLE PRESUPUESTO MÁXIMO
// ============================================================
function toggleMaxBudget() {
    const checkbox = document.getElementById('no-max-budget');
    const maxInput = document.getElementById('budget-max');
    
    if (checkbox.checked) {
        maxInput.disabled = true;
        maxInput.value = '';
        maxInput.placeholder = 'Sin límite';
    } else {
        maxInput.disabled = false;
        maxInput.placeholder = '100';
    }
}

// ============================================================
// CONTROL DE MÚSICA
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const musicToggle = document.getElementById('music-toggle');
    const audio = document.getElementById('christmas-music');
    
    if (audio) {
        audio.volume = 0.15;
    }
    
    if (musicToggle && audio) {
        musicToggle.addEventListener('click', function() {
            if (audio.paused) {
                audio.play().then(() => {
                    musicToggle.classList.add('playing');
                    musicToggle.textContent = '🔊';
                }).catch(e => {
                    console.log('Click de nuevo para activar música');
                });
            } else {
                audio.pause();
                musicToggle.classList.remove('playing');
                musicToggle.textContent = '🎵';
            }
        });
    }
    
    // Verificar si hay un grupo en la URL
    checkUrlForGroup();
});

// ============================================================
// CREAR GRUPO (con Firebase)
// ============================================================
async function createGroup(event) {
    event.preventDefault();
    
    const groupName = document.getElementById('group-name').value;
    const adminName = document.getElementById('admin-name').value;
    const adminEmail = document.getElementById('admin-email').value;
    const budgetMin = parseInt(document.getElementById('budget-min').value);
    const noMaxBudget = document.getElementById('no-max-budget').checked;
    const budgetMax = noMaxBudget ? null : parseInt(document.getElementById('budget-max').value);
    const exchangeDate = document.getElementById('exchange-date').value;
    
    // Validar presupuesto
    if (budgetMax !== null && budgetMin >= budgetMax) {
        alert('El presupuesto mínimo debe ser menor al máximo');
        return;
    }
    
    // Generar ID único
    const groupId = generateGroupId();
    
    // Crear datos del grupo
    groupData = {
        id: groupId,
        name: groupName,
        adminEmail: adminEmail,
        budgetMin: budgetMin,
        budgetMax: budgetMax,
        exchangeDate: exchangeDate,
        participants: [{
            name: adminName,
            email: adminEmail,
            wishlist: [],
            isAdmin: true
        }],
        sorteoRealizado: false,
        assignments: {}
    };
    
    try {
        // Guardar en Firebase
        await db.collection('grupos').doc(groupId).set(groupData);
        
        // Guardar ID local para el admin
        localStorage.setItem('nikolaus-current-group', groupId);
        localStorage.setItem('nikolaus-user-email', adminEmail);
        
        // Actualizar UI
        updateGroupCreatedScreen();
        showScreen('screen-group-created');
    } catch (error) {
        console.error('Error al crear grupo:', error);
        alert('Error al crear el grupo. Intenta de nuevo.');
    }
}

function generateGroupId() {
    return 'nk-' + Math.random().toString(36).substring(2, 8);
}

function updateGroupCreatedScreen() {
    const shareUrl = `${window.location.origin}${window.location.pathname}?group=${groupData.id}`;
    document.getElementById('share-link').value = shareUrl;
    
    document.getElementById('display-group-name').textContent = groupData.name;
    document.getElementById('display-budget-min').textContent = groupData.budgetMin;
    document.getElementById('display-budget-max').textContent = groupData.budgetMax || '∞';
    document.getElementById('display-date').textContent = formatDate(groupData.exchangeDate);
    
    updateParticipantsList();
}

function updateParticipantsList() {
    const list = document.getElementById('participants-list');
    const count = document.getElementById('participant-count');
    
    list.innerHTML = '';
    groupData.participants.forEach(p => {
        const li = document.createElement('li');
        li.textContent = p.name + (p.isAdmin ? ' 👑' : '') + (p.wishlist.length > 0 ? ' ✓' : ' ⏳');
        list.appendChild(li);
    });
    
    count.textContent = groupData.participants.length;
    
    const readyParticipants = groupData.participants.filter(p => p.wishlist.length >= 3);
    const btnSorteo = document.getElementById('btn-start-sorteo');
    if (readyParticipants.length >= 3) {
        btnSorteo.disabled = false;
        btnSorteo.textContent = '🎁 Iniciar sorteo';
    } else {
        btnSorteo.disabled = true;
        btnSorteo.textContent = `🎁 Iniciar sorteo (${readyParticipants.length}/3 listas completas)`;
    }
}

// ============================================================
// COPIAR LINK
// ============================================================
function copyLink() {
    const linkInput = document.getElementById('share-link');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(linkInput.value).then(() => {
        const btn = document.querySelector('.btn-copy');
        const originalText = btn.textContent;
        btn.textContent = '¡Copiado!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// ============================================================
// VERIFICAR URL Y CARGAR GRUPO (con Firebase)
// ============================================================
async function checkUrlForGroup() {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('group');
    
    if (groupId) {
        // Cargar grupo desde Firebase
        try {
            const doc = await db.collection('grupos').doc(groupId).get();
            if (doc.exists) {
                groupData = doc.data();
                groupData.id = groupId;
                
                // Mostrar info del grupo en la pantalla de unirse
                document.getElementById('invite-group-name').textContent = groupData.name;
                document.getElementById('invite-budget-min').textContent = groupData.budgetMin;
                document.getElementById('invite-budget-max').textContent = groupData.budgetMax || '∞';
                document.getElementById('invite-date').textContent = formatDate(groupData.exchangeDate);
                
                showScreen('screen-join-group');
            } else {
                alert('Grupo no encontrado');
            }
        } catch (error) {
            console.error('Error al cargar grupo:', error);
            alert('Error al cargar el grupo');
        }
    } else {
        // Verificar si es admin de un grupo existente
        const currentGroupId = localStorage.getItem('nikolaus-current-group');
        if (currentGroupId) {
            try {
                const doc = await db.collection('grupos').doc(currentGroupId).get();
                if (doc.exists) {
                    groupData = doc.data();
                    groupData.id = currentGroupId;
                    updateGroupCreatedScreen();
                    showScreen('screen-group-created');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    }
}

// ============================================================
// UNIRSE A GRUPO (con Firebase)
// ============================================================
async function joinGroup(event) {
    event.preventDefault();
    
    const name = document.getElementById('participant-name').value;
    const email = document.getElementById('participant-email').value;
    
    // Buscar por email O por nombre
    const existingByEmail = groupData.participants.find(p => p.email.toLowerCase() === email.toLowerCase());
    const existingByName = groupData.participants.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingByEmail) {
        // Usuario ya existe por email
        currentUser = existingByEmail;
        localStorage.setItem('nikolaus-user-email', email);
        
        if (existingByEmail.wishlist.length >= 3) {
            if (groupData.sorteoRealizado) {
                showResult();
            } else {
                startCountdown();
                showScreen('screen-waiting');
            }
        } else {
            showScreen('screen-wishlist');
        }
    } else if (existingByName) {
        // El nombre existe - dejar entrar si es la misma persona
        currentUser = existingByName;
        localStorage.setItem('nikolaus-user-email', existingByName.email);
        
        if (existingByName.wishlist.length >= 3) {
            if (groupData.sorteoRealizado) {
                showResult();
            } else {
                startCountdown();
                showScreen('screen-waiting');
            }
        } else {
            showScreen('screen-wishlist');
        }
    } else {
        // Nuevo participante
        currentUser = {
            name: name,
            email: email,
            wishlist: [],
            isAdmin: false
        };
        
        groupData.participants.push(currentUser);
        
        try {
            await db.collection('grupos').doc(groupData.id).update({
                participants: groupData.participants
            });
            localStorage.setItem('nikolaus-user-email', email);
            showScreen('screen-wishlist');
        } catch (error) {
            console.error('Error:', error);
            alert('Error al unirse al grupo');
        }
    }
}

// ============================================================
// GUARDAR LISTA DE DESEOS (con Firebase)
// ============================================================
async function saveWishlist(event) {
    event.preventDefault();
    
    const wishNames = document.querySelectorAll('.wish-name');
    const wishLinks = document.querySelectorAll('.wish-link');
    
    const wishlist = [];
    wishNames.forEach((input, index) => {
        if (input.value.trim()) {
            wishlist.push({
                name: input.value.trim(),
                link: wishLinks[index].value.trim() || null
            });
        }
    });
    
    if (wishlist.length < 3) {
        alert('Por favor completa los 3 deseos');
        return;
    }
    
    // Actualizar participante
    const participantIndex = groupData.participants.findIndex(p => p.email === currentUser.email);
    if (participantIndex !== -1) {
        groupData.participants[participantIndex].wishlist = wishlist;
        currentUser.wishlist = wishlist;
    }
    
    try {
        await db.collection('grupos').doc(groupData.id).update({
            participants: groupData.participants
        });
        
        startCountdown();
        showScreen('screen-waiting');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la lista');
    }
}

// ============================================================
// COUNTDOWN
// ============================================================
function startCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 60000);
}

function updateCountdown() {
    if (!groupData.exchangeDate) return;
    
    const exchangeDate = new Date(groupData.exchangeDate + 'T23:59:59');
    const now = new Date();
    const diff = exchangeDate - now;
    
    if (diff <= 0) {
        document.getElementById('countdown-days').textContent = '0';
        document.getElementById('countdown-hours').textContent = '0';
        document.getElementById('countdown-minutes').textContent = '0';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    document.getElementById('countdown-days').textContent = days;
    document.getElementById('countdown-hours').textContent = hours;
    document.getElementById('countdown-minutes').textContent = minutes;
}

// ============================================================
// SORTEO (con Firebase)
// ============================================================
async function startSorteo() {
    if (groupData.participants.length < 3) {
        alert('Se necesitan al menos 3 participantes');
        return;
    }
    
    const readyParticipants = groupData.participants.filter(p => p.wishlist.length >= 3);
    if (readyParticipants.length < 3) {
        alert('Se necesitan al menos 3 participantes con su lista completa');
        return;
    }
    
    const assignments = realizarSorteo(readyParticipants);
    
    if (!assignments) {
        alert('Hubo un error en el sorteo. Intenta de nuevo.');
        return;
    }
    
    groupData.assignments = assignments;
    groupData.sorteoRealizado = true;
    
    try {
        await db.collection('grupos').doc(groupData.id).update({
            assignments: assignments,
            sorteoRealizado: true
        });
        
        alert('🎉 ¡Sorteo realizado! Cada participante puede entrar con su email para ver a quién le tocó.');
        
        const userEmail = localStorage.getItem('nikolaus-user-email');
        if (userEmail && assignments[userEmail]) {
            currentUser = groupData.participants.find(p => p.email === userEmail);
            showResult();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar el sorteo');
    }
}

function realizarSorteo(participants) {
    const emails = participants.map(p => p.email);
    let shuffled = [...emails];
    
    for (let attempt = 0; attempt < 100; attempt++) {
        shuffled = shuffleArray([...emails]);
        
        let valid = true;
        for (let i = 0; i < emails.length; i++) {
            if (emails[i] === shuffled[i]) {
                valid = false;
                break;
            }
        }
        
        if (valid) {
            const assignments = {};
            for (let i = 0; i < emails.length; i++) {
                assignments[emails[i]] = shuffled[i];
            }
            return assignments;
        }
    }
    
    return null;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================================
// MOSTRAR RESULTADO
// ============================================================
function showResult() {
    const assignedEmail = groupData.assignments[currentUser.email];
    const assignedPerson = groupData.participants.find(p => p.email === assignedEmail);
    
    if (!assignedPerson) {
        alert('No se encontró tu asignación');
        return;
    }
    
    document.getElementById('secret-friend-name').textContent = assignedPerson.name;
    
    const wishlistContainer = document.getElementById('friend-wishlist');
    wishlistContainer.innerHTML = '';
    
    assignedPerson.wishlist.forEach(wish => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${wish.name}</span>
            ${wish.link ? `<a href="${wish.link}" target="_blank" class="wish-link-display">Ver referencia →</a>` : ''}
        `;
        wishlistContainer.appendChild(li);
    });
    
    document.getElementById('result-budget-min').textContent = groupData.budgetMin;
    document.getElementById('result-budget-max').textContent = groupData.budgetMax || '∞';
    
    document.querySelectorAll('.friend-name-placeholder').forEach(el => {
        el.textContent = assignedPerson.name;
    });
    
    showScreen('screen-result');
}

// ============================================================
// ASISTENTE DE REGALOS UI
// ============================================================
function showGiftOption(option) {
    document.querySelector('.ai-question').style.display = 'none';
    
    document.getElementById('gift-option-know').classList.add('hidden');
    document.getElementById('gift-option-help').classList.add('hidden');
    
    if (option === 'know') {
        document.getElementById('gift-option-know').classList.remove('hidden');
    } else {
        document.getElementById('gift-option-help').classList.remove('hidden');
    }
}

function showKnowStore(knows) {
    document.getElementById('store-known').classList.add('hidden');
    document.getElementById('store-unknown').classList.add('hidden');
    
    if (knows) {
        document.getElementById('store-known').classList.remove('hidden');
    } else {
        document.getElementById('store-unknown').classList.remove('hidden');
    }
}

function checkPrice() {
    const price = parseInt(document.getElementById('gift-price-known').value);
    
    if (!price) {
        alert('Por favor ingresa el precio');
        return;
    }
    
    const maxBudget = groupData.budgetMax || Infinity;
    
    if (price >= groupData.budgetMin && price <= maxBudget) {
        alert(`✅ ¡Perfecto! S/.${price} está dentro del presupuesto`);
    } else if (price < groupData.budgetMin) {
        alert(`⚠️ S/.${price} está por debajo del presupuesto mínimo (S/.${groupData.budgetMin})`);
    } else {
        alert(`⚠️ S/.${price} excede el presupuesto máximo (S/.${groupData.budgetMax})`);
    }
}

// ============================================================
// UTILIDADES
// ============================================================
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-PE', options);
}

// Exponer funciones globalmente
window.showScreen = showScreen;
window.createGroup = createGroup;
window.copyLink = copyLink;
window.joinGroup = joinGroup;
window.saveWishlist = saveWishlist;
window.startSorteo = startSorteo;
window.showGiftOption = showGiftOption;
window.showKnowStore = showKnowStore;
window.checkPrice = checkPrice;
window.toggleMaxBudget = toggleMaxBudget;
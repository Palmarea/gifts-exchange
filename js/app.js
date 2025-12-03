/* ═══════════════════════════════════════════════════════════
   NIKOLAUS - Secret Santa
   JavaScript Principal
   ═══════════════════════════════════════════════════════════ */

// ============================================================
// DATOS DEL GRUPO (simulado - en producción usarías una base de datos)
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
    assignments: {} // { participantEmail: assignedToEmail }
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
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar la pantalla seleccionada
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// ============================================================
// CONTROL DE MÚSICA
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const musicToggle = document.getElementById('music-toggle');
    const audio = document.getElementById('christmas-music');
    
    if (audio) {
        audio.volume = 0.15; // Volumen bajo y elegante
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
// CREAR GRUPO
// ============================================================
function createGroup(event) {
    event.preventDefault();
    
    const groupName = document.getElementById('group-name').value;
    const adminName = document.getElementById('admin-name').value;
    const adminEmail = document.getElementById('admin-email').value;
    const budgetMin = parseInt(document.getElementById('budget-min').value);
    const budgetMax = parseInt(document.getElementById('budget-max').value);
    const exchangeDate = document.getElementById('exchange-date').value;
    
    // Validar presupuesto
    if (budgetMin >= budgetMax) {
        alert('El presupuesto mínimo debe ser menor al máximo');
        return;
    }
    
    // Generar ID único para el grupo
    const groupId = generateGroupId();
    
    // Guardar datos del grupo
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
    
    // Guardar en localStorage
    saveGroupData();
    
    // Actualizar la UI
    updateGroupCreatedScreen();
    
    // Mostrar pantalla de grupo creado
    showScreen('screen-group-created');
}

function generateGroupId() {
    return 'nk-' + Math.random().toString(36).substring(2, 8);
}

function updateGroupCreatedScreen() {
    // Generar link para compartir
    const shareUrl = `${window.location.origin}${window.location.pathname}?group=${groupData.id}`;
    document.getElementById('share-link').value = shareUrl;
    
    // Mostrar info del grupo
    document.getElementById('display-group-name').textContent = groupData.name;
    document.getElementById('display-budget-min').textContent = groupData.budgetMin;
    document.getElementById('display-budget-max').textContent = groupData.budgetMax;
    document.getElementById('display-date').textContent = formatDate(groupData.exchangeDate);
    
    // Actualizar lista de participantes
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
    
    // Habilitar botón de sorteo si hay al menos 3 personas con lista completa
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
// UNIRSE A GRUPO
// ============================================================
function checkUrlForGroup() {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('group');
    
    if (groupId) {
        // Intentar cargar el grupo
        const savedGroup = localStorage.getItem('nikolaus-group-' + groupId);
        if (savedGroup) {
            groupData = JSON.parse(savedGroup);
            showScreen('screen-join-group');
        }
    }
}

function joinGroup(event) {
    event.preventDefault();
    
    const name = document.getElementById('participant-name').value;
    const email = document.getElementById('participant-email').value;
    
    // Verificar si el email ya existe
    const existingParticipant = groupData.participants.find(p => p.email === email);
    
    if (existingParticipant) {
        // Usuario ya existe, verificar si tiene wishlist
        currentUser = existingParticipant;
        
        if (existingParticipant.wishlist.length >= 3) {
            // Ya tiene lista, verificar si hay sorteo
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
        // Verificar que el nombre no exista
        const nameExists = groupData.participants.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (nameExists) {
            alert('Ya existe alguien con ese nombre. Por favor usa otro nombre.');
            return;
        }
        
        // Nuevo participante
        currentUser = {
            name: name,
            email: email,
            wishlist: [],
            isAdmin: false
        };
        
        groupData.participants.push(currentUser);
        saveGroupData();
        
        showScreen('screen-wishlist');
    }
}

// ============================================================
// LISTA DE DESEOS
// ============================================================
function saveWishlist(event) {
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
    
    // Actualizar el participante
    const participantIndex = groupData.participants.findIndex(p => p.email === currentUser.email);
    if (participantIndex !== -1) {
        groupData.participants[participantIndex].wishlist = wishlist;
        currentUser.wishlist = wishlist;
    }
    
    saveGroupData();
    
    // Iniciar countdown y mostrar pantalla de espera
    startCountdown();
    showScreen('screen-waiting');
}

// ============================================================
// COUNTDOWN
// ============================================================
function startCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 60000); // Actualizar cada minuto
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
// SORTEO
// ============================================================
function startSorteo() {
    if (groupData.participants.length < 3) {
        alert('Se necesitan al menos 3 participantes');
        return;
    }
    
    const readyParticipants = groupData.participants.filter(p => p.wishlist.length >= 3);
    if (readyParticipants.length < 3) {
        alert('Se necesitan al menos 3 participantes con su lista completa');
        return;
    }
    
    // Realizar el sorteo
    const assignments = realizarSorteo(readyParticipants);
    
    if (!assignments) {
        alert('Hubo un error en el sorteo. Intenta de nuevo.');
        return;
    }
    
    groupData.assignments = assignments;
    groupData.sorteoRealizado = true;
    saveGroupData();
    
    alert('🎉 ¡Sorteo realizado! Cada participante puede entrar con su email para ver a quién le tocó.');
    
    // Si el admin está en la lista, mostrar su resultado
    const adminParticipant = groupData.participants.find(p => p.isAdmin);
    if (adminParticipant && assignments[adminParticipant.email]) {
        currentUser = adminParticipant;
        showResult();
    }
}

function realizarSorteo(participants) {
    // Algoritmo de sorteo que garantiza que nadie se regale a sí mismo
    const emails = participants.map(p => p.email);
    let shuffled = [...emails];
    
    // Intentar hasta 100 veces encontrar una asignación válida
    for (let attempt = 0; attempt < 100; attempt++) {
        shuffled = shuffleArray([...emails]);
        
        // Verificar que nadie se tenga a sí mismo
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
    
    // Mostrar nombre
    document.getElementById('secret-friend-name').textContent = assignedPerson.name;
    
    // Mostrar lista de deseos
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
    
    // Mostrar presupuesto
    document.getElementById('result-budget-min').textContent = groupData.budgetMin;
    document.getElementById('result-budget-max').textContent = groupData.budgetMax;
    
    // Actualizar nombre en el asistente de regalos
    document.querySelectorAll('.friend-name-placeholder').forEach(el => {
        el.textContent = assignedPerson.name;
    });
    
    showScreen('screen-result');
}

// ============================================================
// ASISTENTE DE REGALOS UI
// ============================================================
function showGiftOption(option) {
    // Ocultar pregunta inicial
    document.querySelector('.ai-question').style.display = 'none';
    
    // Ocultar ambas opciones
    document.getElementById('gift-option-know').classList.add('hidden');
    document.getElementById('gift-option-help').classList.add('hidden');
    
    // Mostrar la opción seleccionada
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
    const link = document.getElementById('gift-link-known').value;
    
    if (!price) {
        alert('Por favor ingresa el precio');
        return;
    }
    
    if (price >= groupData.budgetMin && price <= groupData.budgetMax) {
        alert(`✅ ¡Perfecto! S/.${price} está dentro del presupuesto (S/.${groupData.budgetMin} - S/.${groupData.budgetMax})`);
    } else if (price < groupData.budgetMin) {
        alert(`⚠️ S/.${price} está por debajo del presupuesto mínimo (S/.${groupData.budgetMin})`);
    } else {
        alert(`⚠️ S/.${price} excede el presupuesto máximo (S/.${groupData.budgetMax}). ¿Quieres buscar opciones más económicas?`);
    }
}

// ============================================================
// UTILIDADES
// ============================================================
function saveGroupData() {
    localStorage.setItem('nikolaus-group-' + groupData.id, JSON.stringify(groupData));
    localStorage.setItem('nikolaus-current-group', groupData.id);
}

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
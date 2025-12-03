/* ═══════════════════════════════════════════════════════════
   NIKOLAUS - Asistente AI de Regalos
   Usa la API de Anthropic (APUPU) para sugerencias
   Tiendas: Perú (Saga, Ripley, Oechsle, MercadoLibre)
   ═══════════════════════════════════════════════════════════ */

// ============================================================
// CONFIGURACIÓN
// ============================================================

const APUPU = 'TU_API_KEY_AQUI'; // La configuraremos en Vercel

// Tiendas peruanas para buscar
const TIENDAS_PERU = {
    'saga': {
        nombre: 'Saga Falabella',
        url: 'https://www.falabella.com.pe/falabella-pe/search?Ntt=',
    },
    'ripley': {
        nombre: 'Ripley',
        url: 'https://simple.ripley.com.pe/search/',
    },
    'oechsle': {
        nombre: 'Oechsle',
        url: 'https://www.oechsle.pe/search?q=',
    },
    'mercadolibre': {
        nombre: 'Mercado Libre',
        url: 'https://listado.mercadolibre.com.pe/',
    },
    'plazavea': {
        nombre: 'Plaza Vea',
        url: 'https://www.plazavea.com.pe/search?_query=',
    }
};

// Categorías de regalos con sugerencias predefinidas (fallback si no hay API)
const SUGERENCIAS_POR_CATEGORIA = {
    'maquillaje': [
        { nombre: 'Set de brochas de maquillaje', precio: 60, tienda: 'saga' },
        { nombre: 'Paleta de sombras nude', precio: 80, tienda: 'ripley' },
        { nombre: 'Kit de labiales mate', precio: 55, tienda: 'oechsle' }
    ],
    'libros': [
        { nombre: 'Bestseller del momento', precio: 60, tienda: 'mercadolibre' },
        { nombre: 'Box set de novelas románticas', precio: 90, tienda: 'mercadolibre' },
        { nombre: 'Libro de recetas ilustrado', precio: 70, tienda: 'saga' }
    ],
    'tecnologia': [
        { nombre: 'Audífonos bluetooth', precio: 80, tienda: 'ripley' },
        { nombre: 'Cargador portátil 10000mAh', precio: 60, tienda: 'mercadolibre' },
        { nombre: 'Soporte para celular', precio: 40, tienda: 'oechsle' }
    ],
    'skincare': [
        { nombre: 'Set de skincare coreano', precio: 85, tienda: 'mercadolibre' },
        { nombre: 'Mascarillas faciales (pack)', precio: 50, tienda: 'saga' },
        { nombre: 'Sérum vitamina C', precio: 70, tienda: 'ripley' }
    ],
    'accesorios': [
        { nombre: 'Bolso pequeño elegante', precio: 80, tienda: 'saga' },
        { nombre: 'Set de aretes y collar', precio: 65, tienda: 'ripley' },
        { nombre: 'Billetera de cuero', precio: 70, tienda: 'oechsle' }
    ],
    'hogar': [
        { nombre: 'Velas aromáticas set', precio: 55, tienda: 'saga' },
        { nombre: 'Manta suave decorativa', precio: 80, tienda: 'ripley' },
        { nombre: 'Set de tazas bonitas', precio: 50, tienda: 'oechsle' }
    ],
    'default': [
        { nombre: 'Gift card Saga Falabella', precio: 100, tienda: 'saga' },
        { nombre: 'Set de spa en casa', precio: 75, tienda: 'ripley' },
        { nombre: 'Caja de chocolates premium', precio: 60, tienda: 'plazavea' }
    ]
};

// ============================================================
// BUSCAR REGALO CON AI (cuando ya sabe qué regalar pero no dónde)
// ============================================================
async function searchGiftAI() {
    const giftIdea = document.getElementById('gift-idea').value;
    
    if (!giftIdea) {
        alert('Por favor escribe qué regalo tienes en mente');
        return;
    }
    
    // Mostrar loading
    showLoading(true);
    
    try {
        // Intentar con AI primero
        if (APUPU && APUPU !== 'TU_API_KEY_AQUI') {
            const suggestions = await getAISuggestionsFromAPI(
                `Busco "${giftIdea}" en tiendas de Perú. Presupuesto: S/.${groupData.budgetMin} - S/.${groupData.budgetMax}`
            );
            displaySuggestions(suggestions);
        } else {
            // Fallback: generar links de búsqueda directa
            const searchLinks = generateSearchLinks(giftIdea);
            displaySearchLinks(searchLinks, giftIdea);
        }
    } catch (error) {
        console.error('Error:', error);
        // Fallback a links de búsqueda
        const searchLinks = generateSearchLinks(giftIdea);
        displaySearchLinks(searchLinks, giftIdea);
    }
    
    showLoading(false);
}

// ============================================================
// OBTENER SUGERENCIAS CON AI (cuando no sabe qué regalar)
// ============================================================
async function getAISuggestions() {
    const friendLikes = document.getElementById('friend-likes').value;
    const preferredStore = document.getElementById('preferred-store').value;
    
    if (!friendLikes) {
        alert('Por favor cuéntanos qué le gusta a tu amiga');
        return;
    }
    
    showLoading(true);
    
    try {
        if (APUPU && APUPU !== 'TU_API_KEY_AQUI') {
            // Usar API de Claude
            const prompt = `
                Mi amiga secreta tiene estos gustos: ${friendLikes}
                Presupuesto: S/.${groupData.budgetMin} - S/.${groupData.budgetMax} soles peruanos
                ${preferredStore ? `Tienda preferida: ${preferredStore}` : 'Tiendas disponibles: Saga Falabella, Ripley, Oechsle, Mercado Libre Perú'}
                
                Dame 3 sugerencias de regalo específicas con precio estimado.
            `;
            
            const suggestions = await getAISuggestionsFromAPI(prompt);
            displaySuggestions(suggestions);
        } else {
            // Fallback: usar sugerencias predefinidas
            const suggestions = getSmartSuggestions(friendLikes, preferredStore);
            displaySuggestions(suggestions);
        }
    } catch (error) {
        console.error('Error:', error);
        const suggestions = getSmartSuggestions(friendLikes, preferredStore);
        displaySuggestions(suggestions);
    }
    
    showLoading(false);
}

// ============================================================
// LLAMADA A LA API DE ANTHROPIC (APUPU)
// ============================================================
async function getAISuggestionsFromAPI(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': APUPU,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `${prompt}
                
                IMPORTANTE: Responde SOLO con un JSON válido, sin texto adicional, con este formato exacto:
                {
                    "sugerencias": [
                        {
                            "nombre": "Nombre del producto",
                            "precio": 75,
                            "tienda": "Nombre de la tienda",
                            "descripcion": "Breve descripción",
                            "busqueda": "términos para buscar"
                        }
                    ]
                }`
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error('Error en la API');
    }
    
    const data = await response.json();
    const content = data.content[0].text;
    
    // Parsear JSON de la respuesta
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.sugerencias || [];
        }
    } catch (e) {
        console.error('Error parsing AI response:', e);
    }
    
    return [];
}

// ============================================================
// SUGERENCIAS INTELIGENTES (sin API)
// ============================================================
function getSmartSuggestions(likes, preferredStore) {
    const likesLower = likes.toLowerCase();
    let suggestions = [];
    
    // Detectar categorías en los gustos
    const categorias = {
        'maquillaje': ['maquillaje', 'makeup', 'labial', 'sombras', 'base', 'corrector'],
        'libros': ['libro', 'leer', 'lectura', 'novela', 'romance', 'literatura'],
        'tecnologia': ['tecnología', 'tech', 'gadget', 'audifonos', 'celular', 'gamer'],
        'skincare': ['skincare', 'piel', 'crema', 'serum', 'cuidado facial', 'belleza'],
        'accesorios': ['accesorio', 'bolso', 'cartera', 'joya', 'arete', 'collar'],
        'hogar': ['hogar', 'casa', 'decoración', 'vela', 'cocina', 'plantas']
    };
    
    // Encontrar categorías que coincidan
    let categoriasEncontradas = [];
    for (const [cat, keywords] of Object.entries(categorias)) {
        if (keywords.some(kw => likesLower.includes(kw))) {
            categoriasEncontradas.push(cat);
        }
    }
    
    // Si no encontró nada, usar default
    if (categoriasEncontradas.length === 0) {
        categoriasEncontradas = ['default'];
    }
    
    // Obtener sugerencias de las categorías encontradas
    categoriasEncontradas.forEach(cat => {
        const catSuggestions = SUGERENCIAS_POR_CATEGORIA[cat] || [];
        suggestions = suggestions.concat(catSuggestions);
    });
    
    // Filtrar por presupuesto
    suggestions = suggestions.filter(s => 
        s.precio >= groupData.budgetMin && s.precio <= groupData.budgetMax
    );
    
    // Si hay tienda preferida, priorizar esas
    if (preferredStore) {
        const storeLower = preferredStore.toLowerCase();
        suggestions.sort((a, b) => {
            const aMatch = TIENDAS_PERU[a.tienda]?.nombre.toLowerCase().includes(storeLower) ? 0 : 1;
            const bMatch = TIENDAS_PERU[b.tienda]?.nombre.toLowerCase().includes(storeLower) ? 0 : 1;
            return aMatch - bMatch;
        });
    }
    
    // Devolver máximo 3
    return suggestions.slice(0, 3).map(s => ({
        nombre: s.nombre,
        precio: s.precio,
        tienda: TIENDAS_PERU[s.tienda]?.nombre || s.tienda,
        descripcion: `Perfecto para alguien que le gusta ${categoriasEncontradas[0]}`,
        busqueda: s.nombre
    }));
}

// ============================================================
// GENERAR LINKS DE BÚSQUEDA
// ============================================================
function generateSearchLinks(searchTerm) {
    const encoded = encodeURIComponent(searchTerm);
    return Object.entries(TIENDAS_PERU).map(([key, tienda]) => ({
        nombre: tienda.nombre,
        url: tienda.url + encoded
    }));
}

// ============================================================
// MOSTRAR RESULTADOS
// ============================================================
function displaySuggestions(suggestions) {
    const container = document.getElementById('ai-suggestions-list');
    const resultsDiv = document.getElementById('ai-results');
    
    if (suggestions.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: var(--color-gray);">
                No encontré sugerencias específicas. Prueba con otros gustos o busca directamente:
            </p>
        `;
        const defaultLinks = generateSearchLinks('regalo');
        displaySearchLinks(defaultLinks, 'regalo');
        return;
    }
    
    container.innerHTML = suggestions.map(s => `
        <div class="ai-suggestion-card">
            <h4>${s.nombre}</h4>
            <p class="price">S/.${s.precio} aprox.</p>
            <p class="store">${s.tienda}</p>
            ${s.descripcion ? `<p style="font-size: 0.9rem; color: var(--color-gray); margin-top: 0.5rem;">${s.descripcion}</p>` : ''}
            <a href="${getSearchUrl(s.busqueda || s.nombre)}" target="_blank">🔍 Buscar en tiendas →</a>
        </div>
    `).join('');
    
    resultsDiv.classList.remove('hidden');
}

function displaySearchLinks(links, searchTerm) {
    const container = document.getElementById('ai-suggestions-list');
    const resultsDiv = document.getElementById('ai-results');
    
    container.innerHTML = `
        <p style="margin-bottom: 1rem; text-align: center;">Busca "<strong>${searchTerm}</strong>" en estas tiendas:</p>
        ${links.map(link => `
            <div class="ai-suggestion-card">
                <h4>${link.nombre}</h4>
                <a href="${link.url}" target="_blank">🔍 Buscar aquí →</a>
            </div>
        `).join('')}
    `;
    
    resultsDiv.classList.remove('hidden');
}

function getSearchUrl(term) {
    const encoded = encodeURIComponent(term);
    return `https://www.google.com/search?q=${encoded}+precio+peru+comprar`;
}

// ============================================================
// UTILIDADES UI
// ============================================================
function showLoading(show) {
    const resultsDiv = document.getElementById('ai-results');
    const container = document.getElementById('ai-suggestions-list');
    
    if (show) {
        resultsDiv.classList.remove('hidden');
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <span style="font-size: 2rem; animation: spin 1s linear infinite; display: inline-block;">🎁</span>
                <p style="margin-top: 1rem; color: var(--color-gold);">Buscando las mejores opciones...</p>
            </div>
        `;
    }
}

// Exponer funciones globalmente
window.searchGiftAI = searchGiftAI;
window.getAISuggestions = getAISuggestions;
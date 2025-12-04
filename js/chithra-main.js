// K.S. CHITHRA TRIBUTE WEBSITE - MAIN JAVASCRIPT
// Updated for YOUR Google Sheets columns: Song, Movie, Year, Composer, CoSinger, Genre, YouTube Link, Type

// ===== CONFIGURATION =====
const GOOGLE_SHEETS_CONFIG = {
    malayalam: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=0&single=true&output=csv',
    tamil: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=633202374&single=true&output=csv',
    telugu: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=1972620029&single=true&output=csv',
    kannada: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=1314987480&single=true&output=csv',
    hindi: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=2082159835&single=true&output=csv',
    other: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=91154675&single=true&output=csv'
};

// REPLACE WITH YOUR ACTUAL GOOGLE SHEETS PUBLISHED CSV URLs
// Example: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0'

// ===== GLOBAL STATE =====
let allSongs = [];
let filteredSongs = [];
let currentPage = 1;
const songsPerPage = 50;
let favorites = JSON.parse(localStorage.getItem('chithra_favorites')) || [];
let playlists = JSON.parse(localStorage.getItem('chithra_playlists')) || [];
let queue = JSON.parse(localStorage.getItem('chithra_queue')) || [];
let currentSong = null;
let audioElement = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    const currentPageName = window.location.pathname.split('/').pop();
    
    if (currentPageName === 'index.html' || currentPageName === '') {
        loadHomePage();
    } else if (window.currentLanguage) {
        loadLanguagePage(window.currentLanguage);
    } else if (currentPageName === 'statistics.html') {
        loadStatistics();
    } else if (currentPageName === 'favorites.html') {
        loadFavorites();
    }
    
    setupEventListeners();
}

// ===== HOME PAGE =====
async function loadHomePage() {
    try {
        const languages = ['malayalam', 'tamil', 'telugu', 'kannada', 'hindi', 'other'];
        const allPromises = languages.map(lang => fetchSongs(lang));
        const results = await Promise.all(allPromises);
        
        results.forEach((songs, index) => {
            const lang = languages[index];
            const count = songs.length;
            
            // Update stat cards
            const statElement = document.getElementById(`${lang}Count`);
            if (statElement) statElement.textContent = count.toLocaleString();
            
            const totalElement = document.getElementById(`${lang}Total`);
            if (totalElement) totalElement.textContent = `${count.toLocaleString()} Songs`;
        });
        
        // Calculate total
        const totalSongs = results.reduce((sum, songs) => sum + songs.length, 0);
        const totalElement = document.getElementById('totalSongs');
        if (totalElement) totalElement.textContent = totalSongs.toLocaleString() + '+';
        
        // Setup global search
        setupGlobalSearch(results.flat());
        
    } catch (error) {
        console.error('Error loading home page:', error);
    }
}

function setupGlobalSearch(songs) {
    const searchInput = document.getElementById('globalSearch');
    const searchBtn = document.getElementById('searchBtn');
    const resultsDiv = document.getElementById('searchResults');
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    if (!searchInput || !searchBtn || !resultsDiv) return;
    
    let currentFilter = 'all';
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.language;
            performSearch();
        });
    });
    
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            resultsDiv.innerHTML = '';
            return;
        }
        
        let filteredSongs = songs.filter(song => {
            const matchesSearch = 
                song.Song?.toLowerCase().includes(query) ||
                song.Movie?.toLowerCase().includes(query) ||
                song.Composer?.toLowerCase().includes(query) ||
                song.CoSinger?.toLowerCase().includes(query) ||
                song.Genre?.toLowerCase().includes(query) ||
                song.Year?.toString().includes(query);
            
            const matchesLanguage = currentFilter === 'all' || song.language === currentFilter;
            
            return matchesSearch && matchesLanguage;
        });
        
        displaySearchResults(filteredSongs, resultsDiv);
    }
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

function displaySearchResults(songs, container) {
    if (songs.length === 0) {
        container.innerHTML = '<div class="no-results">No songs found</div>';
        return;
    }
    
    const html = songs.slice(0, 20).map(song => `
        <div class="search-result-item">
            <div class="result-main">
                <h4>${song.Song || 'Unknown'}</h4>
                <p>${song.Movie || 'Unknown'} • ${song.Composer || 'Unknown'}</p>
                ${song.CoSinger ? `<p class="cosinger">With: ${song.CoSinger}</p>` : ''}
            </div>
            <div class="result-meta">
                <span class="language-badge ${song.language}">${song.language}</span>
                <span class="year-badge">${song.Year || 'N/A'}</span>
                ${song.Genre ? `<span class="genre-badge">${song.Genre}</span>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html + 
        (songs.length > 20 ? `<div class="more-results">+${songs.length - 20} more results</div>` : '');
}

// ===== LANGUAGE PAGE =====
async function loadLanguagePage(language) {
    try {
        showLoading();
        allSongs = await fetchSongs(language);
        
        allSongs = allSongs.map(song => ({
            ...song,
            language: language
        }));
        
        filteredSongs = [...allSongs];
        
        updateSongCount();
        populateFilters();
        renderSongs();
        hideLoading();
        setupLanguagePageListeners();
        
    } catch (error) {
        console.error('Error loading language page:', error);
        hideLoading();
        const tbody = document.getElementById('songsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error loading songs. Please check your Google Sheets URL.</td></tr>';
        }
    }
}

async function fetchSongs(language) {
    const url = GOOGLE_SHEETS_CONFIG[language];
    
    if (!url || url.includes('YOUR_')) {
        console.warn(`No URL configured for ${language}`);
        return [];
    }
    
    try {
        const response = await fetch(url);
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error(`Error fetching ${language} songs:`, error);
        return [];
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
            // Handle quoted values that may contain commas
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            
            const song = {};
            headers.forEach((header, index) => {
                song[header] = values[index] || '';
            });
            return song;
        });
}

function setupLanguagePageListeners() {
    document.getElementById('searchInput')?.addEventListener('input', applyFilters);
    document.getElementById('decadeFilter')?.addEventListener('change', applyFilters);
    document.getElementById('composerFilter')?.addEventListener('change', applyFilters);
    document.getElementById('genreFilter')?.addEventListener('change', applyFilters);
    document.getElementById('sortBy')?.addEventListener('change', applySorting);
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
}

function populateFilters() {
    // Composers
    const composers = [...new Set(allSongs.map(s => s.Composer).filter(Boolean))].sort();
    const composerFilter = document.getElementById('composerFilter');
    if (composerFilter) {
        composers.forEach(composer => {
            const option = document.createElement('option');
            option.value = composer;
            option.textContent = composer;
            composerFilter.appendChild(option);
        });
    }
    
    // Genres
    const genres = [...new Set(allSongs.map(s => s.Genre).filter(Boolean))].sort();
    const genreFilter = document.getElementById('genreFilter');
    if (genreFilter) {
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });
    }
}

function applyFilters() {
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const decade = document.getElementById('decadeFilter')?.value || '';
    const composer = document.getElementById('composerFilter')?.value || '';
    const genre = document.getElementById('genreFilter')?.value || '';
    
    filteredSongs = allSongs.filter(song => {
        const matchesSearch = !searchQuery || 
            song.Song?.toLowerCase().includes(searchQuery) ||
            song.Movie?.toLowerCase().includes(searchQuery) ||
            song.Composer?.toLowerCase().includes(searchQuery) ||
            song.CoSinger?.toLowerCase().includes(searchQuery) ||
            song.Genre?.toLowerCase().includes(searchQuery);
        
        const matchesDecade = !decade || song.Year?.startsWith(decade.slice(0, 3));
        const matchesComposer = !composer || song.Composer === composer;
        const matchesGenre = !genre || song.Genre === genre;
        
        return matchesSearch && matchesDecade && matchesComposer && matchesGenre;
    });
    
    currentPage = 1;
    applySorting();
}

function applySorting() {
    const sortBy = document.getElementById('sortBy')?.value || 'year-desc';
    
    filteredSongs.sort((a, b) => {
        switch(sortBy) {
            case 'year-desc':
                return (b.Year || '0') > (a.Year || '0') ? 1 : -1;
            case 'year-asc':
                return (a.Year || '0') > (b.Year || '0') ? 1 : -1;
            case 'song-asc':
                return (a.Song || '').localeCompare(b.Song || '');
            case 'movie-asc':
                return (a.Movie || '').localeCompare(b.Movie || '');
            default:
                return 0;
        }
    });
    
    renderSongs();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('decadeFilter').value = '';
    if (document.getElementById('composerFilter')) document.getElementById('composerFilter').value = '';
    if (document.getElementById('genreFilter')) document.getElementById('genreFilter').value = '';
    document.getElementById('sortBy').value = 'year-desc';
    applyFilters();
}

function updateSongCount() {
    const countElement = document.getElementById('songCount');
    if (countElement) {
        countElement.textContent = `${filteredSongs.length.toLocaleString()} Songs`;
    }
}

function renderSongs() {
    const tbody = document.getElementById('songsTableBody');
    const table = document.getElementById('songsTable');
    const noResults = document.getElementById('noResults');
    
    if (!tbody) return;
    
    updateSongCount();
    
    if (filteredSongs.length === 0) {
        table.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    noResults.style.display = 'none';
    
    const start = (currentPage - 1) * songsPerPage;
    const end = start + songsPerPage;
    const pageSongs = filteredSongs.slice(start, end);
    
    tbody.innerHTML = pageSongs.map((song, index) => `
        <tr>
            <td>
                ${song['YouTube Link'] ? 
                    `<button class="play-btn" onclick="playSong(${start + index})" title="Play on YouTube">▶</button>` :
                    `<button class="play-btn" disabled title="No YouTube link">▶</button>`
                }
            </td>
            <td>${song.Song || 'Unknown'}</td>
            <td>${song.Movie || 'Unknown'}</td>
            <td>${song.Composer || 'Unknown'}</td>
            <td>${song.CoSinger || '-'}</td>
            <td>${song.Year || 'N/A'}</td>
            <td>${song.Genre || '-'}</td>
            <td>
                <button class="action-btn" onclick="addToFavorites(${start + index})" title="Add to Favorites">⭐</button>
                <button class="action-btn" onclick="addToQueue(${start + index})" title="Add to Queue">📋</button>
            </td>
        </tr>
    `).join('');
    
    renderPagination();
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredSongs.length / songsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    if (currentPage > 1) {
        html += `<button class="page-btn" onclick="changePage(${currentPage - 1})">Previous</button>`;
    }
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    if (currentPage < totalPages) {
        html += `<button class="page-btn" onclick="changePage(${currentPage + 1})">Next</button>`;
    }
    
    pagination.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderSongs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== PLAYER FUNCTIONS =====
function playSong(index) {
    currentSong = filteredSongs[index];
    
    if (currentSong['YouTube Link']) {
        // Open YouTube link in new tab
        window.open(currentSong['YouTube Link'], '_blank');
        showNotification(`Opening: ${currentSong.Song}`, 'success');
    } else {
        showNotification('No YouTube link available for this song', 'info');
    }
    
    updatePlayer();
    showPlayer();
}

function updatePlayer() {
    if (!currentSong) return;
    
    const titleElement = document.getElementById('playerSongTitle');
    const metaElement = document.getElementById('playerSongMeta');
    
    if (titleElement) titleElement.textContent = currentSong.Song || 'Unknown';
    if (metaElement) {
        metaElement.textContent = `${currentSong.Movie || 'Unknown'} • ${currentSong.Composer || 'Unknown'}`;
    }
}

function showPlayer() {
    const player = document.getElementById('audioPlayer');
    if (player) player.style.display = 'flex';
}

// ===== FAVORITES FUNCTIONS =====
function addToFavorites(index) {
    const song = filteredSongs[index];
    
    if (favorites.some(fav => fav.Song === song.Song && fav.Movie === song.Movie)) {
        showNotification('Already in favorites!', 'info');
        return;
    }
    
    favorites.push(song);
    localStorage.setItem('chithra_favorites', JSON.stringify(favorites));
    showNotification('Added to favorites!', 'success');
}

function addToQueue(index) {
    const song = filteredSongs[index];
    queue.push(song);
    localStorage.setItem('chithra_queue', JSON.stringify(queue));
    showNotification('Added to queue!', 'success');
}

// ===== FAVORITES PAGE =====
function loadFavorites() {
    const container = document.getElementById('favoritesContainer');
    const countElement = document.getElementById('favCount');
    
    if (!container) return;
    
    if (countElement) {
        countElement.textContent = `${favorites.length} favorite${favorites.length !== 1 ? 's' : ''}`;
    }
    
    if (favorites.length === 0) {
        container.innerHTML = '<div class="no-results">No favorites yet. Start adding songs!</div>';
        return;
    }
    
    container.innerHTML = favorites.map((song, index) => `
        <div class="favorite-card">
            <div class="favorite-info">
                <h3>${song.Song}</h3>
                <p>${song.Movie} • ${song.Composer}</p>
                ${song.CoSinger ? `<p class="cosinger">With: ${song.CoSinger}</p>` : ''}
                <div class="favorite-badges">
                    <span class="language-badge ${song.language}">${song.language}</span>
                    ${song.Genre ? `<span class="genre-badge">${song.Genre}</span>` : ''}
                    <span class="year-badge">${song.Year}</span>
                </div>
            </div>
            <div class="favorite-actions">
                ${song['YouTube Link'] ? 
                    `<button class="action-btn" onclick="playFavorite(${index})">▶ Play</button>` : 
                    ''}
                <button class="action-btn" onclick="removeFavorite(${index})">🗑️ Remove</button>
            </div>
        </div>
    `).join('');
}

function playFavorite(index) {
    const song = favorites[index];
    if (song['YouTube Link']) {
        window.open(song['YouTube Link'], '_blank');
        showNotification(`Playing: ${song.Song}`, 'success');
    }
}

function removeFavorite(index) {
    favorites.splice(index, 1);
    localStorage.setItem('chithra_favorites', JSON.stringify(favorites));
    loadFavorites();
    showNotification('Removed from favorites', 'success');
}

// ===== STATISTICS PAGE =====
async function loadStatistics() {
    const languages = ['malayalam', 'tamil', 'telugu', 'kannada', 'hindi', 'other'];
    const allPromises = languages.map(lang => fetchSongs(lang));
    const results = await Promise.all(allPromises);
    
    const allSongsData = results.flat();
    displayStatistics(allSongsData, results, languages);
}

function displayStatistics(allSongs, languageData, languages) {
    // Language-wise stats
    const languageStatsDiv = document.getElementById('languageStats');
    if (languageStatsDiv) {
        languageStatsDiv.innerHTML = languageData.map((songs, index) => `
            <div class="stat-card">
                <div class="stat-icon">🎵</div>
                <div class="stat-value">${songs.length.toLocaleString()}</div>
                <div class="stat-name">${languages[index].charAt(0).toUpperCase() + languages[index].slice(1)}</div>
            </div>
        `).join('');
    }
    
    // Decade-wise breakdown
    const decades = {};
    allSongs.forEach(song => {
        if (song.Year) {
            const decade = Math.floor(parseInt(song.Year) / 10) * 10 + 's';
            decades[decade] = (decades[decade] || 0) + 1;
        }
    });
    
    const decadeChartDiv = document.getElementById('decadeChart');
    if (decadeChartDiv) {
        decadeChartDiv.innerHTML = Object.entries(decades)
            .sort()
            .map(([decade, count]) => `
                <div class="decade-bar">
                    <div class="decade-label">${decade}</div>
                    <div class="decade-bar-fill" style="width: ${(count / Math.max(...Object.values(decades))) * 100}%">
                        ${count} songs
                    </div>
                </div>
            `).join('');
    }
}

// ===== UTILITY FUNCTIONS =====
function showLoading() {
    const loading = document.getElementById('loading');
    const table = document.getElementById('songsTable');
    if (loading) loading.style.display = 'block';
    if (table) table.style.display = 'none';
}

function hideLoading() {
    const loading = document.getElementById('loading');
    const table = document.getElementById('songsTable');
    if (loading) loading.style.display = 'none';
    if (table) table.style.display = 'table';
}

function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function setupEventListeners() {
    // Player controls
    document.getElementById('playPauseBtn')?.addEventListener('click', togglePlayPause);
    document.getElementById('prevBtn')?.addEventListener('click', playPrevious);
    document.getElementById('nextBtn')?.addEventListener('click', playNext);
}

function togglePlayPause() {
    if (currentSong && currentSong['YouTube Link']) {
        window.open(currentSong['YouTube Link'], '_blank');
    }
}

function playPrevious() {
    if (queue.length > 0) {
        const song = queue.shift();
        if (song['YouTube Link']) {
            window.open(song['YouTube Link'], '_blank');
        }
        localStorage.setItem('chithra_queue', JSON.stringify(queue));
    }
}

function playNext() {
    if (queue.length > 0) {
        const song = queue.shift();
        if (song['YouTube Link']) {
            window.open(song['YouTube Link'], '_blank');
        }
        localStorage.setItem('chithra_queue', JSON.stringify(queue));
    }
}

// Export functions to global scope
window.playSong = playSong;
window.playFavorite = playFavorite;
window.addToFavorites = addToFavorites;
window.addToQueue = addToQueue;
window.changePage = changePage;
window.removeFavorite = removeFavorite;

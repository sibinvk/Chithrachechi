// K.S. CHITHRA TRIBUTE WEBSITE - MAIN JAVASCRIPT
// Complete functionality for Phases 1-7

// ===== CONFIGURATION =====
const GOOGLE_SHEETS_CONFIG = {
    malayalam: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=0&single=true&output=csv',
    tamil: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=633202374&single=true&output=csv',
    telugu: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=1972620029&single=true&output=csv',
    kannada: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=1314987480&single=true&output=csv',
    hindi: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=2082159835&single=true&output=csv',
    other: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=91154675&single=true&output=csv'
};

//REPLACE WITH YOUR ACTUAL GOOGLE SHEETS PUBLISHED CSV URLs
// Example: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv'

// ===== GLOBAL STATE =====
let allSongs = [];
let filteredSongs = [];
let currentPage = 1;
const songsPerPage = 50;
let favorites = JSON.parse(localStorage.getItem('chithra_favorites')) || [];
let playlists = JSON.parse(localStorage.getItem('chithra_playlists')) || [];
let queue = JSON.parse(localStorage.getItem('chithra_queue')) || [];
let currentSong = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'index.html' || currentPage === '') {
        loadHomePage();
    } else if (window.currentLanguage) {
        loadLanguagePage(window.currentLanguage);
    } else if (currentPage === 'statistics.html') {
        loadStatistics();
    } else if (currentPage === 'favorites.html') {
        loadFavorites();
    }
    
    setupEventListeners();
}

// ===== HOME PAGE =====
async function loadHomePage() {
    try {
        // Load all languages for statistics
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
                song.songName?.toLowerCase().includes(query) ||
                song.movie?.toLowerCase().includes(query) ||
                song.musicDirector?.toLowerCase().includes(query) ||
                song.year?.toString().includes(query);
            
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
                <h4>${song.songName || 'Unknown'}</h4>
                <p>${song.movie || 'Unknown'} • ${song.musicDirector || 'Unknown'}</p>
            </div>
            <div class="result-meta">
                <span class="language-badge ${song.language}">${song.language}</span>
                <span class="year-badge">${song.year || 'N/A'}</span>
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
        document.getElementById('songsTableBody').innerHTML = 
            '<tr><td colspan="6" style="text-align:center; color:red;">Error loading songs. Please check your Google Sheets URL.</td></tr>';
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
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const song = {};
            headers.forEach((header, index) => {
                song[header.toLowerCase().replace(/ /g, '')] = values[index] || '';
            });
            return song;
        });
}

function setupLanguagePageListeners() {
    // Search
    document.getElementById('searchInput')?.addEventListener('input', applyFilters);
    
    // Filters
    document.getElementById('decadeFilter')?.addEventListener('change', applyFilters);
    document.getElementById('directorFilter')?.addEventListener('change', applyFilters);
    document.getElementById('sortBy')?.addEventListener('change', applySorting);
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
}

function populateFilters() {
    // Music Directors
    const directors = [...new Set(allSongs.map(s => s.musicdirector).filter(Boolean))].sort();
    const directorFilter = document.getElementById('directorFilter');
    if (directorFilter) {
        directors.forEach(director => {
            const option = document.createElement('option');
            option.value = director;
            option.textContent = director;
            directorFilter.appendChild(option);
        });
    }
}

function applyFilters() {
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const decade = document.getElementById('decadeFilter')?.value || '';
    const director = document.getElementById('directorFilter')?.value || '';
    
    filteredSongs = allSongs.filter(song => {
        const matchesSearch = !searchQuery || 
            song.songname?.toLowerCase().includes(searchQuery) ||
            song.movie?.toLowerCase().includes(searchQuery) ||
            song.musicdirector?.toLowerCase().includes(searchQuery);
        
        const matchesDecade = !decade || song.year?.startsWith(decade.slice(0, 3));
        const matchesDirector = !director || song.musicdirector === director;
        
        return matchesSearch && matchesDecade && matchesDirector;
    });
    
    currentPage = 1;
    applySorting();
}

function applySorting() {
    const sortBy = document.getElementById('sortBy')?.value || 'year-desc';
    
    filteredSongs.sort((a, b) => {
        switch(sortBy) {
            case 'year-desc':
                return (b.year || '0') > (a.year || '0') ? 1 : -1;
            case 'year-asc':
                return (a.year || '0') > (b.year || '0') ? 1 : -1;
            case 'song-asc':
                return (a.songname || '').localeCompare(b.songname || '');
            case 'movie-asc':
                return (a.movie || '').localeCompare(b.movie || '');
            default:
                return 0;
        }
    });
    
    renderSongs();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('decadeFilter').value = '';
    document.getElementById('directorFilter').value = '';
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
            <td><button class="play-btn" onclick="playSong(${start + index})">▶</button></td>
            <td>${song.songname || 'Unknown'}</td>
            <td>${song.movie || 'Unknown'}</td>
            <td>${song.musicdirector || 'Unknown'}</td>
            <td>${song.year || 'N/A'}</td>
            <td>
                <button class="action-btn" onclick="addToFavorites(${start + index})">⭐</button>
                <button class="action-btn" onclick="addToQueue(${start + index})">📋</button>
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
    updatePlayer();
    showPlayer();
    showNotification(`Playing: ${currentSong.songname}`, 'success');
}

function updatePlayer() {
    document.getElementById('playerSongTitle').textContent = currentSong.songname || 'Unknown';
    document.getElementById('playerSongMeta').textContent = 
        `${currentSong.movie || 'Unknown'} • ${currentSong.musicdirector || 'Unknown'}`;
}

function showPlayer() {
    document.getElementById('audioPlayer').style.display = 'flex';
}

// ===== FAVORITES FUNCTIONS =====
function addToFavorites(index) {
    const song = filteredSongs[index];
    
    if (favorites.some(fav => fav.songname === song.songname && fav.movie === song.movie)) {
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
    if (!container) return;
    
    if (favorites.length === 0) {
        container.innerHTML = '<div class="no-results">No favorites yet. Start adding songs!</div>';
        return;
    }
    
    container.innerHTML = favorites.map((song, index) => `
        <div class="favorite-card">
            <div class="favorite-info">
                <h3>${song.songname}</h3>
                <p>${song.movie} • ${song.musicdirector}</p>
                <span class="language-badge ${song.language}">${song.language}</span>
            </div>
            <div class="favorite-actions">
                <button class="action-btn" onclick="playFavorite(${index})">▶ Play</button>
                <button class="action-btn" onclick="removeFavorite(${index})">🗑️ Remove</button>
            </div>
        </div>
    `).join('');
}

function removeFavorite(index) {
    favorites.splice(index, 1);
    localStorage.setItem('chithra_favorites', JSON.stringify(favorites));
    loadFavorites();
    showNotification('Removed from favorites', 'success');
}

// ===== STATISTICS PAGE =====
async function loadStatistics() {
    // Load all songs
    const languages = ['malayalam', 'tamil', 'telugu', 'kannada', 'hindi', 'other'];
    const allPromises = languages.map(lang => fetchSongs(lang));
    const results = await Promise.all(allPromises);
    
    const allSongsData = results.flat();
    
    // Calculate statistics
    displayStatistics(allSongsData, results);
}

function displayStatistics(allSongs, languageData) {
    // Implementation for statistics page
    // Show charts, decade-wise breakdown, director statistics, etc.
}

// ===== UTILITY FUNCTIONS =====
function showLoading() {
    document.getElementById('loading')?.style.setProperty('display', 'block');
    document.getElementById('songsTable')?.style.setProperty('display', 'none');
}

function hideLoading() {
    document.getElementById('loading')?.style.setProperty('display', 'none');
    document.getElementById('songsTable')?.style.setProperty('display', 'table');
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
    // Implementation for play/pause
}

function playPrevious() {
    // Implementation for previous song
}

function playNext() {
    // Implementation for next song
}

// Export functions to global scope
window.playSong = playSong;
window.addToFavorites = addToFavorites;
window.addToQueue = addToQueue;
window.changePage = changePage;
window.removeFavorite = removeFavorite;

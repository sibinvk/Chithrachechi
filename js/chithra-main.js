// K.S. CHITHRA TRIBUTE WEBSITE - FINAL VERSION
// With embedded YouTube player and N/A for missing videos

// ===== CONFIGURATION =====
const GOOGLE_SHEETS_CONFIG = {
    malayalam: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=0&single=true&output=csv',
    tamil: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=633202374&single=true&output=csv',
    telugu: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=1972620029&single=true&output=csv',
    kannada: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=1314987480&single=true&output=csv',
    hindi: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=2082159835&single=true&output=csv',
    other: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQF_EQ0k9tK0NMr_K4ig_fDGK7JGyJ-APUrm8jO00eb0VsKsHno2PUspQ2w6XayF_sIAkZbkyZkwGW0/pub?gid=91154675&single=true&output=csv'
};

// ===== GLOBAL STATE =====
let allSongs = [];
let filteredSongs = [];
let currentPage = 1;
const songsPerPage = 50;
let favorites = JSON.parse(localStorage.getItem('chithra_favorites')) || [];
let playlists = JSON.parse(localStorage.getItem('chithra_playlists')) || [];
let queue = JSON.parse(localStorage.getItem('chithra_queue')) || [];
let currentSong = null;
let currentVideoId = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    createVideoPlayer();
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

// ===== CREATE EMBEDDED VIDEO PLAYER =====
function createVideoPlayer() {
    // Check if player already exists
    if (document.getElementById('videoPlayerModal')) return;
    
    const playerHTML = `
        <div id="videoPlayerModal" class="video-modal" style="display: none;">
            <div class="video-modal-content">
                <div class="video-header">
                    <div class="video-info">
                        <h3 id="videoSongTitle">Song Title</h3>
                        <p id="videoSongMeta">Movie • Composer</p>
                    </div>
                    <button class="video-close" onclick="closeVideoPlayer()">&times;</button>
                </div>
                <div class="video-container">
                    <iframe id="youtubePlayer" 
                            width="100%" 
                            height="100%" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                    </iframe>
                </div>
                <div class="video-controls">
                    <button class="video-btn" onclick="playPrevious()">⏮ Previous</button>
                    <button class="video-btn" onclick="addCurrentToFavorites()">⭐ Favorite</button>
                    <button class="video-btn" onclick="playNext()">Next ⏭</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', playerHTML);
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
            
            const statElement = document.getElementById(`${lang}Count`);
            if (statElement) statElement.textContent = count.toLocaleString();
            
            const totalElement = document.getElementById(`${lang}Total`);
            if (totalElement) totalElement.textContent = `${count.toLocaleString()} Songs`;
        });
        
        const totalSongs = results.reduce((sum, songs) => sum + songs.length, 0);
        const totalElement = document.getElementById('totalSongs');
        if (totalElement) totalElement.textContent = totalSongs.toLocaleString() + '+';
        
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

// ===== EXTRACT YOUTUBE VIDEO ID =====
function extractYouTubeID(url) {
    if (!url) return null;
    
    // Handle different YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    
    return null;
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
    
    tbody.innerHTML = pageSongs.map((song, index) => {
        const hasVideo = song['YouTube Link'] && extractYouTubeID(song['YouTube Link']);
        return `
        <tr>
            <td>
                ${hasVideo ? 
                    `<button class="play-btn" onclick="playSong(${start + index})" title="Play Video">▶</button>` :
                    `<span class="na-badge">N/A</span>`
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
    `}).join('');
    
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

// ===== VIDEO PLAYER FUNCTIONS =====
function playSong(index) {
    currentSong = filteredSongs[index];
    const videoId = extractYouTubeID(currentSong['YouTube Link']);
    
    if (videoId) {
        openVideoPlayer(videoId, currentSong);
    } else {
        showNotification('No video available for this song', 'info');
    }
}

function openVideoPlayer(videoId, song) {
    currentVideoId = videoId;
    
    // Update player info
    document.getElementById('videoSongTitle').textContent = song.Song || 'Unknown';
    document.getElementById('videoSongMeta').textContent = 
        `${song.Movie || 'Unknown'} • ${song.Composer || 'Unknown'}`;
    
    // Set video source
    const iframe = document.getElementById('youtubePlayer');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    
    // Show modal
    document.getElementById('videoPlayerModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeVideoPlayer() {
    const modal = document.getElementById('videoPlayerModal');
    const iframe = document.getElementById('youtubePlayer');
    
    // Stop video
    iframe.src = '';
    
    // Hide modal
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
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

function addCurrentToFavorites() {
    if (currentSong) {
        if (favorites.some(fav => fav.Song === currentSong.Song && fav.Movie === currentSong.Movie)) {
            showNotification('Already in favorites!', 'info');
            return;
        }
        favorites.push(currentSong);
        localStorage.setItem('chithra_favorites', JSON.stringify(favorites));
        showNotification('Added to favorites!', 'success');
    }
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
    
    container.innerHTML = favorites.map((song, index) => {
        const hasVideo = song['YouTube Link'] && extractYouTubeID(song['YouTube Link']);
        return `
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
                ${hasVideo ? 
                    `<button class="action-btn" onclick="playFavorite(${index})">▶ Play</button>` : 
                    `<span class="na-badge">N/A</span>`
                }
                <button class="action-btn" onclick="removeFavorite(${index})">🗑️ Remove</button>
            </div>
        </div>
    `}).join('');
}

function playFavorite(index) {
    const song = favorites[index];
    const videoId = extractYouTubeID(song['YouTube Link']);
    if (videoId) {
        currentSong = song;
        openVideoPlayer(videoId, song);
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
    // Close modal on click outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('videoPlayerModal');
        if (e.target === modal) {
            closeVideoPlayer();
        }
    });
    
    // Close modal on Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeVideoPlayer();
        }
    });
}

function playPrevious() {
    const currentIndex = filteredSongs.findIndex(s => s === currentSong);
    if (currentIndex > 0) {
        playSong(currentIndex - 1);
    } else {
        showNotification('This is the first song', 'info');
    }
}

function playNext() {
    const currentIndex = filteredSongs.findIndex(s => s === currentSong);
    if (currentIndex < filteredSongs.length - 1) {
        playSong(currentIndex + 1);
    } else {
        showNotification('This is the last song', 'info');
    }
}

// Export functions to global scope
window.playSong = playSong;
window.playFavorite = playFavorite;
window.addToFavorites = addToFavorites;
window.addCurrentToFavorites = addCurrentToFavorites;
window.addToQueue = addToQueue;
window.changePage = changePage;
window.removeFavorite = removeFavorite;
window.closeVideoPlayer = closeVideoPlayer;
window.playPrevious = playPrevious;
window.playNext = playNext;

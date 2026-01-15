// --- State Management ---
const DB_KEY = 'beyond_data';

function getEntries() {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveEntries(entries) {
    localStorage.setItem(DB_KEY, JSON.stringify(entries));
}

// Global reference for open swipes to close them
let currentOpenSwipe = null;

function deleteEntry(timestamp) {
    let entries = getEntries();
    entries = entries.filter(e => e.timestamp !== timestamp);
    saveEntries(entries);
    // If we are in detail view, close it
    const detailView = document.getElementById('detail-view');
    if (detailView.classList.contains('open')) {
        closeDetail();
    }
    render();
}

// --- Core Logic ---
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function calculateStreak(entries) {
    if (!entries || entries.length === 0) return 0;

    const dates = new Set(entries.map(e => e.date));
    const today = getTodayDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    let streak = 0;
    let currentCheckDate = yesterday; // Start by validating yesterday

    // Check if user completed today
    if (dates.has(today)) {
        streak++;
    }

    // Check backwards from yesterday
    while (true) {
        if (dates.has(currentCheckDate)) {
            streak++;
            // Go back one more day
            const d = new Date(currentCheckDate);
            d.setDate(d.getDate() - 1);
            currentCheckDate = d.toISOString().split('T')[0];
        } else {
            // Break streak if a day is missed
            break;
        }
    }

    return streak;
}

// --- UI Rendering ---
function render() {
    const entries = getEntries();
    const todayStr = getTodayDateString();
    
    // 1. Update Streak
    const streak = calculateStreak(entries);
    document.getElementById('streak-count').textContent = streak;

    // 2. Toggle Input/Message
    const hasEntryToday = entries.some(e => e.date === todayStr);
    const inputSection = document.getElementById('input-section');
    const messageSection = document.getElementById('message-section');

    if (hasEntryToday) {
        inputSection.classList.add('hidden');
        messageSection.classList.remove('hidden');
    } else {
        inputSection.classList.remove('hidden');
        messageSection.classList.add('hidden');
    }

    // 3. Render History
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    // Sort descending
    const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

    sortedEntries.forEach(entry => {
        const wrapper = document.createElement('div');
        wrapper.className = 'entry-wrapper';

        // 1. Actions Layer (Behind)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'entry-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn-action';
        deleteBtn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
        `;
        deleteBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent opening detail
            if (confirm('Cancellare questa nota?')) {
                deleteEntry(entry.timestamp);
            }
        };

        actionsDiv.appendChild(deleteBtn);

        // 2. Content Layer (Front)
        const contentDiv = document.createElement('div');
        contentDiv.className = 'entry-content';

        const dateDiv = document.createElement('div');
        dateDiv.className = 'entry-date';
        // Use full date as Title
        const dateObj = new Date(entry.timestamp);
        dateDiv.textContent = dateObj.toLocaleDateString('it-IT', {
            weekday: 'long', day: 'numeric', month: 'long'
        });

        const textPreviewDiv = document.createElement('div');
        textPreviewDiv.className = 'entry-text-preview';
        textPreviewDiv.textContent = entry.text;

        contentDiv.appendChild(dateDiv);
        contentDiv.appendChild(textPreviewDiv);

        wrapper.appendChild(actionsDiv);
        wrapper.appendChild(contentDiv);
        historyList.appendChild(wrapper);

        // --- Touch Logic for Swipe ---
        let startX = 0;
        const threshold = -50;
        let isSwiping = false;

        contentDiv.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            // Close other open swipes if any
            if (currentOpenSwipe && currentOpenSwipe !== contentDiv) {
                currentOpenSwipe.style.transform = 'translateX(0)';
                currentOpenSwipe = null;
            }
            contentDiv.style.transition = 'none'; 
        }, { passive: true });

        contentDiv.addEventListener('touchmove', (e) => {
            const touchX = e.touches[0].clientX;
            const diff = touchX - startX;

            // Only allow left swipe
            if (diff < 0) {
                isSwiping = true;
                const translateX = Math.max(diff, -100); 
                contentDiv.style.transform = `translateX(${translateX}px)`;
            }
        }, { passive: true });

        contentDiv.addEventListener('touchend', (e) => {
            contentDiv.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
            const endX = e.changedTouches[0].clientX;
            const diff = endX - startX;

            if (diff < threshold) {
                // Snap open
                contentDiv.style.transform = 'translateX(-80px)';
                currentOpenSwipe = contentDiv;
            } else {
                // Snap closed
                contentDiv.style.transform = 'translateX(0)';
                if (currentOpenSwipe === contentDiv) {
                    currentOpenSwipe = null;
                }
            }

            // Click handling (if it wasn't a swipe)
            if (Math.abs(diff) < 5) { 
                openDetail(entry);
            }
            
            isSwiping = false;
        });
    });
}

function openDetail(entry) {
    const detailView = document.getElementById('detail-view');
    const detailDate = document.getElementById('detail-date');
    const detailBody = document.getElementById('detail-body');

    const dateObj = new Date(entry.timestamp);
    detailDate.textContent = dateObj.toLocaleDateString('it-IT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    detailBody.textContent = entry.text;

    detailView.classList.add('open');
}

function closeDetail() {
    document.getElementById('detail-view').classList.remove('open');
}

document.getElementById('detail-back').addEventListener('click', closeDetail);


// --- Event Handlers ---
document.getElementById('save-btn').addEventListener('click', () => {
    const input = document.getElementById('daily-input');
    const text = input.value.trim();

    if (!text) {
        alert("Scrivi qualcosa prima di salvare!");
        return;
    }

    const entries = getEntries();
    const newEntry = {
        date: getTodayDateString(),
        timestamp: Date.now(),
        text: text
    };

    entries.push(newEntry);
    saveEntries(entries);
    
    input.value = '';
    render();
});

document.getElementById('export-btn').addEventListener('click', () => {
    const entries = getEntries();
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `beyond_backup_${getTodayDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Initialize
render();

// --- State Management ---
const DB_KEY = 'beyond_data';

function getEntries() {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveEntries(entries) {
    localStorage.setItem(DB_KEY, JSON.stringify(entries));
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
        const card = document.createElement('div');
        card.className = 'entry-card';

        const dateDiv = document.createElement('div');
        dateDiv.className = 'entry-date';
        // Format date nicely (e.g., "14/01/2026")
        const dateObj = new Date(entry.timestamp);
        dateDiv.textContent = dateObj.toLocaleDateString('it-IT', {
            weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
        });

        const textDiv = document.createElement('div');
        textDiv.className = 'entry-text';
        textDiv.textContent = entry.text;

        card.appendChild(dateDiv);
        card.appendChild(textDiv);
        historyList.appendChild(card);
    });
}

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

// ========================================
// Global Variables
// ========================================
let startTime = null;
let rankings = [];
const TARGET_TIME = 10.00;

// DOM Elements
const playerNameInput = document.getElementById('playerName');
const gameButton = document.getElementById('gameButton');
const timerText = document.getElementById('timerText');
const diffText = document.getElementById('diffText');
const resultMessage = document.getElementById('resultMessage');
const retryButton = document.getElementById('retryButton');
const rankingBody = document.getElementById('rankingBody');
const flashOverlay = document.getElementById('flash-overlay');
const resetAllButton = document.getElementById('resetAllButton');
const body = document.body;

// ========================================
// Initialization
// ========================================
window.addEventListener('load', () => {
    loadRankings();
    // 初回はハイライトなしで描画
    renderRanking(null);
    createSnow();
});

// ========================================
// Game Logic
// ========================================

gameButton.addEventListener('click', () => {
    const buttonState = gameButton.getAttribute('data-state');

    if (!buttonState || buttonState === 'start') {
        startGame();
    } else if (buttonState === 'stop') {
        stopGame();
    }
});

retryButton.addEventListener('click', resetGame);

function startGame() {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert("名前を入力してください (Please enter your name)");
        playerNameInput.focus();
        return;
    }

    // UI Update
    gameButton.textContent = "STOP !";
    gameButton.setAttribute('data-state', 'stop');
    gameButton.classList.add('stop-mode');
    playerNameInput.disabled = true;
    retryButton.classList.add('hidden');
    resultMessage.textContent = "COUNTING...";
    resultMessage.style.color = "#fff";
    
    timerText.classList.add('timer-blur');
    timerText.textContent = "??.??";
    diffText.textContent = "TARGET: 10.00";

    startTime = Date.now();
}

function stopGame() {
    const stopTime = Date.now();
    const elapsedTime = (stopTime - startTime) / 1000;
    
    gameButton.disabled = true;
    gameButton.textContent = "JUDGING...";
    resultMessage.textContent = "ANALYZING...";
    body.classList.add('heartbeat-mode');

    startSlotMachineEffect(elapsedTime, () => {
        finishGame(elapsedTime);
    });
}

function finishGame(finalTime) {
    body.classList.remove('heartbeat-mode');
    timerText.classList.remove('timer-blur');
    gameButton.disabled = false;
    gameButton.classList.add('hidden');
    retryButton.classList.remove('hidden');

    const diff = Math.abs(finalTime - TARGET_TIME);
    const formattedTime = finalTime.toFixed(2);
    const formattedDiff = diff.toFixed(2);

    timerText.textContent = formattedTime;
    diffText.textContent = `DIFF: ${formattedDiff}`;

    if (diff < 0.05) {
        resultMessage.textContent = "🎄 MERRY CHRISTMAS!! (PERFECT) 🎄";
        resultMessage.style.color = "var(--gold-primary)";
        triggerFlash();
        triggerParticles(100);
    } else if (diff < 0.50) {
        resultMessage.textContent = "EXCELLENT !!";
        resultMessage.style.color = "var(--red-bright)";
        triggerParticles(30);
    } else if (diff < 1.00) {
        resultMessage.textContent = "GOOD JOB";
        resultMessage.style.color = "#fff";
    } else {
        resultMessage.textContent = "TOO BAD...";
        resultMessage.style.color = "#888";
    }

    // Save with ID for highlight animation
    const newId = Date.now(); // 一意のIDとしてタイムスタンプを使用
    saveResult(playerNameInput.value, formattedTime, formattedDiff, newId);
}

function resetGame() {
    gameButton.textContent = "START";
    gameButton.setAttribute('data-state', 'start');
    gameButton.classList.remove('stop-mode', 'hidden');
    retryButton.classList.add('hidden');
    playerNameInput.disabled = false;
    playerNameInput.value = "";
    playerNameInput.focus();
    
    timerText.textContent = "00.00";
    timerText.classList.remove('timer-blur');
    diffText.textContent = "READY?";
    resultMessage.textContent = "PRESS START";
    resultMessage.style.color = "#aaa";
}

// ========================================
// Visual Effects
// ========================================

function startSlotMachineEffect(finalVal, callback) {
    let count = 0;
    const duration = 2500;
    const interval = 50; 
    
    const slotInterval = setInterval(() => {
        const randomVal = (8.00 + Math.random() * 4).toFixed(2);
        timerText.textContent = randomVal;
        
        count += interval;
        if (count >= duration) {
            clearInterval(slotInterval);
            callback();
        }
    }, interval);
}

function triggerFlash() {
    flashOverlay.style.opacity = 1;
    setTimeout(() => {
        flashOverlay.style.opacity = 0;
    }, 150);
}

function triggerParticles(amount) {
    const container = document.getElementById('particles-container');
    const colors = ['#d4af37', '#ff1a1a', '#008000', '#ffffff'];
    
    const rect = timerText.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < amount; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        
        if(Math.random() > 0.5) p.style.borderRadius = '0%';
        
        const size = Math.random() * 10 + 4;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        p.style.left = `${centerX}px`;
        p.style.top = `${centerY}px`;
        
        container.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 300 + 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        const rotate = Math.random() * 360;

        p.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) rotate(${rotate}deg)`, opacity: 0 }
        ], {
            duration: 1200,
            easing: 'cubic-bezier(0, .9, .57, 1)'
        }).onfinish = () => p.remove();
    }
}

function createSnow() {
    const snowContainer = document.getElementById('snow-container');
    const snowflakesCount = 50; 

    for(let i=0; i<snowflakesCount; i++) {
        const snow = document.createElement('div');
        snow.classList.add('snowflake');
        snow.textContent = '❄'; 
        
        snow.style.left = Math.random() * 100 + '%';
        snow.style.animationDuration = (Math.random() * 5 + 5) + 's, ' + (Math.random() * 2 + 2) + 's';
        snow.style.animationDelay = (Math.random() * 5) + 's, ' + (Math.random() * 2) + 's';
        snow.style.fontSize = (Math.random() * 1.5 + 0.5) + 'rem';
        
        snowContainer.appendChild(snow);
    }
}

// ========================================
// Data Management
// ========================================

function saveResult(name, time, diff, id) {
    rankings.push({ 
        id: id, // アニメーション識別用ID
        name: name, 
        time: time, 
        diff: parseFloat(diff) 
    });
    
    rankings.sort((a, b) => a.diff - b.diff);
    
    localStorage.setItem('aijp_ranking_v2', JSON.stringify(rankings));
    
    // 今回追加したIDを渡してレンダリング
    renderRanking(id);
}

function loadRankings() {
    const data = localStorage.getItem('aijp_ranking_v2');
    if (data) {
        rankings = JSON.parse(data);
    }
}

function renderRanking(highlightId) {
    rankingBody.innerHTML = '';
    
    rankings.forEach((item, index) => {
        const div = document.createElement('div');
        div.classList.add('ranking-row');
        
        // 上位の装飾クラス
        if (index === 0) div.classList.add('rank-1');
        if (index === 1) div.classList.add('rank-2');
        if (index === 2) div.classList.add('rank-3');

        // 今回追加された行ならアニメーションクラスを付与
        if (item.id === highlightId) {
            div.classList.add('just-added');
        }

        div.innerHTML = `
            <span class="rank-num">#${index + 1}</span>
            <span class="p-name">${escapeHtml(item.name)}</span>
            <span class="p-time">${item.time}s</span>
            <span class="p-diff">±${item.diff.toFixed(2)}</span>
        `;
        rankingBody.appendChild(div);
        
        // 新規追加の場合、その要素が見えるようにスクロール（必要であれば）
        if (item.id === highlightId) {
            setTimeout(() => {
                div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    });
}

resetAllButton.addEventListener('click', () => {
    if(confirm('WARNING: データを全て削除しますか？')) {
        rankings = [];
        localStorage.removeItem('aijp_ranking_v2');
        renderRanking(null);
        resetGame();
    }
});

function escapeHtml(str) {
    if(!str) return "";
    return str.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[match];
    });
}

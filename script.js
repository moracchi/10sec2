// ========================================
// Sound Assets
// ========================================
const audioStart = new Audio('se_button_start.mp3');
const audioStop = new Audio('se_button_stop.mp3');
const audioResult = new Audio('se_result_near.mp3');
const audioRankNew = new Audio('se_rank_new.mp3');

// 音声の事前読み込み設定（任意）
audioStart.preload = 'auto';
audioStop.preload = 'auto';
audioResult.preload = 'auto';
audioRankNew.preload = 'auto';

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

// Interruption Overlay
const rankOverlay = document.getElementById('rank-interruption');
const overlayLabel = document.querySelector('.interruption-label');
const overlayRank = document.getElementById('interruption-rank-text');
const overlayName = document.getElementById('interruption-name-text');

// ========================================
// Initialization
// ========================================
window.addEventListener('load', () => {
    loadRankings();
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
        alert("ENTRY NAME REQUIRED");
        playerNameInput.focus();
        return;
    }

    // SE: Start
    playSound(audioStart);

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
    
    // SE: Stop
    playSound(audioStop);

    gameButton.disabled = true;
    gameButton.textContent = "JUDGING...";
    resultMessage.textContent = "ANALYZING...";
    body.classList.add('heartbeat-mode'); // 画面振動開始

    // 2.5秒の溜め
    startSlotMachineEffect(elapsedTime, () => {
        finishGame(elapsedTime);
    });
}

async function finishGame(finalTime) {
    body.classList.remove('heartbeat-mode');
    timerText.classList.remove('timer-blur');

    // SE: Result Display
    playSound(audioResult);

    const diff = Math.abs(finalTime - TARGET_TIME);
    const formattedTime = finalTime.toFixed(2);
    const formattedDiff = diff.toFixed(2);
    const playerName = playerNameInput.value;

    // 結果表示
    timerText.textContent = formattedTime;
    diffText.textContent = `DIFF: ${formattedDiff}`;

    // 評価メッセージ & パーティクル
    if (diff < 0.05) {
        resultMessage.textContent = "JACKPOT! (PERFECT)";
        resultMessage.style.color = "var(--gold-primary)";
        triggerFlash();
        triggerParticles(150); 
    } else if (diff < 0.50) {
        resultMessage.textContent = "EXCELLENT !!";
        resultMessage.style.color = "var(--red-bright)";
        triggerParticles(50);
    } else if (diff < 1.00) {
        resultMessage.textContent = "GOOD JOB";
        resultMessage.style.color = "#fff";
    } else {
        resultMessage.textContent = "TOO BAD...";
        resultMessage.style.color = "#888";
    }

    // ランクイン予測と演出
    const tempRank = calculateProjectedRank(diff);

    // 5位以内なら「割り込み演出」
    if (tempRank <= 5) {
        await playRankInterruption(tempRank, playerName);
    }

    // データ保存 & 更新
    const newId = Date.now();
    saveResult(playerName, formattedTime, formattedDiff, newId);

    // UI復帰
    gameButton.disabled = false;
    gameButton.classList.add('hidden');
    retryButton.classList.remove('hidden');
}

// ========================================
// Rank Interruption & Sound
// ========================================
function calculateProjectedRank(diff) {
    const tempArray = [...rankings, { diff: diff }];
    tempArray.sort((a, b) => a.diff - b.diff);
    return tempArray.findIndex(item => item.diff === diff) + 1;
}

function playRankInterruption(rank, name) {
    return new Promise((resolve) => {
        // SE: New Rank Record
        playSound(audioRankNew);

        let labelText = "NEW RECORD";
        let rankText = `RANK ${rank}`;
        let delay = 3000; // SEの長さに合わせて調整

        if (rank === 1) {
            labelText = "NEW CHAMPION";
            rankText = "NO.1";
            delay = 4000;
            triggerFlash();
        }

        overlayLabel.textContent = labelText;
        overlayRank.textContent = rankText;
        overlayName.textContent = name;

        rankOverlay.classList.remove('hidden');
        triggerParticles(100);

        setTimeout(() => {
            rankOverlay.classList.add('hidden');
            resolve();
        }, delay);
    });
}

// 音声再生ヘルパー
function playSound(audioObj) {
    audioObj.currentTime = 0;
    audioObj.play().catch(e => console.log("Sound play blocked:", e));
}

// ========================================
// Reset & Effects Utility
// ========================================
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

function startSlotMachineEffect(finalVal, callback) {
    let count = 0;
    const duration = 2000;
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
    setTimeout(() => { flashOverlay.style.opacity = 0; }, 150);
}

function triggerParticles(amount) {
    const container = document.getElementById('particles-container');
    const colors = ['#d4af37', '#ff0033', '#ffffff'];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < amount; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        const size = Math.random() * 15 + 5;
        p.style.width = `${size}px`; p.style.height = `${size}px`;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = `${centerX}px`; p.style.top = `${centerY}px`;
        container.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 500 + 200;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        p.animate([
            { transform: 'translate(0,0)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px)`, opacity: 0 }
        ], {
            duration: 1500, easing: 'cubic-bezier(0, .9, .57, 1)'
        }).onfinish = () => p.remove();
    }
}

function createSnow() {
    const snowContainer = document.getElementById('snow-container');
    for(let i=0; i<50; i++) {
        const snow = document.createElement('div');
        snow.classList.add('snowflake');
        snow.textContent = '❄'; 
        snow.style.left = Math.random() * 100 + '%';
        snow.style.animationDuration = (Math.random() * 5 + 5) + 's, ' + (Math.random() * 2 + 2) + 's';
        snow.style.fontSize = (Math.random() * 1 + 0.5) + 'rem';
        snowContainer.appendChild(snow);
    }
}

// ========================================
// Data Management
// ========================================
function saveResult(name, time, diff, id) {
    rankings.push({ id, name, time, diff: parseFloat(diff) });
    rankings.sort((a, b) => a.diff - b.diff);
    localStorage.setItem('aijp_ranking_final', JSON.stringify(rankings));
    renderRanking(id);
}

function loadRankings() {
    const data = localStorage.getItem('aijp_ranking_final');
    if (data) rankings = JSON.parse(data);
}

function renderRanking(highlightId) {
    rankingBody.innerHTML = '';
    rankings.forEach((item, index) => {
        const div = document.createElement('div');
        div.classList.add('ranking-row');
        
        if (index === 0) div.classList.add('rank-1');
        if (index === 1) div.classList.add('rank-2');
        if (index === 2) div.classList.add('rank-3');

        if (item.id === highlightId) {
            div.style.backgroundColor = "rgba(212, 175, 55, 0.5)";
            setTimeout(() => div.style.backgroundColor = "", 2000);
        }

        div.innerHTML = `
            <span class="rank-num">#${index + 1}</span>
            <span class="p-name">${escapeHtml(item.name)}</span>
            <span class="p-time">${item.time}s</span>
            <span class="p-diff">±${item.diff.toFixed(2)}</span>
        `;
        rankingBody.appendChild(div);
        
        if (item.id === highlightId) {
            setTimeout(() => div.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
    });
}

resetAllButton.addEventListener('click', () => {
    if(confirm('DELETE ALL DATA?')) {
        rankings = [];
        localStorage.removeItem('aijp_ranking_final');
        renderRanking(null);
        resetGame();
    }
});

function escapeHtml(str) {
    if(!str) return "";
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m]));
}

// file: script.js
/*
  10.00s CHALLENGE - RICH EDITION
*/

// ========================================
// Sound Assets
// ========================================
const audioStart = new Audio('se_button_start.mp3');
const audioStop = new Audio('se_button_stop.mp3');
const audioResult = new Audio('se_result_near.mp3');
const audioRankNew = new Audio('se_rank_new.mp3');
const audioOver = new Audio('over.mp3');

// Preload
[audioStart, audioStop, audioResult, audioRankNew, audioOver].forEach(a => a.preload = 'auto');

// ========================================
// Global State
// ========================================
let startTime = null;
let timerInterval = null;
let rankings = [];
const TARGET_TIME = 10.00;

// DOM Elements
const playerNameInput = document.getElementById('playerName');
const actionButton = document.getElementById('actionButton');
const retryButton = document.getElementById('retryButton');
const timerText = document.getElementById('timerText');
const diffText = document.getElementById('diffText');
const resultMessage = document.getElementById('resultMessage');

const showRankingButton = document.getElementById('showRankingButton');
const rankingModal = document.getElementById('rankingModal');
const rankingList = document.getElementById('rankingList');
const closeModalButton = document.getElementById('closeModal');
const dqOverlay = document.getElementById('dq-overlay');
const resetAllButton = document.getElementById('resetAllButton');

// ========================================
// Initialization
// ========================================
window.addEventListener('load', () => {
    loadRankings();
    createSnow(); // Keep the snow/particles
});

// ========================================
// Game Logic
// ========================================
// ========================================
// Game Logic
// ========================================
let gameState = 'IDLE'; // IDLE, RUNNING, FINISHED

actionButton.addEventListener('click', () => {
    if (gameState === 'IDLE') {
        const name = playerNameInput.value.trim();
        if (!name) {
            alert("お名前を入力してください");
            playerNameInput.focus();
            return;
        }
        startGame();
    } else if (gameState === 'RUNNING') {
        stopGame();
    }
});

retryButton.addEventListener('click', resetGame);

function startGame() {
    playSound(audioStart);
    gameState = 'RUNNING';

    // Update Button State
    actionButton.textContent = "STOP";
    actionButton.classList.add('state-stop');

    playerNameInput.disabled = true;
    retryButton.classList.add('hidden');

    timerText.textContent = "00.00";
    resultMessage.textContent = "GO !!";
    resultMessage.style.color = "#fff";

    startTime = Date.now();

    // Start Timer Loop
    timerInterval = setInterval(updateTimerVisuals, 50);
}

function updateTimerVisuals() {
    const current = Date.now();
    const elapsed = (current - startTime) / 1000;

    // Blur effect during counting
    timerText.classList.add('timer-blur');
    timerText.textContent = (Math.random() * 10).toFixed(2); // Random scramble effect

    // Reach Effect (Heartbeat / Red Flash)
    if (elapsed > 9.00 && elapsed < 10.00) {
        document.body.style.boxShadow = `inset 0 0 ${Math.random() * 100}px rgba(255,0,0,0.5)`;
    } else {
        document.body.style.boxShadow = 'none';
    }
}

function stopGame() {
    const stopTime = Date.now();
    clearInterval(timerInterval);
    document.body.style.boxShadow = 'none';
    gameState = 'FINISHED';

    const elapsedTime = (stopTime - startTime) / 1000;

    playSound(audioStop);
    actionButton.disabled = true; // Disable until reset or result
    resultMessage.textContent = "JUDGING...";

    // Slot Machine Effect for Result
    startSlotMachineEffect(elapsedTime, () => {
        finishGame(elapsedTime);
    });
}

function finishGame(finalTime) {
    timerText.classList.remove('timer-blur');

    const playerName = playerNameInput.value;
    const formattedTime = finalTime.toFixed(2);

    let isDQ = false;
    let diff = 0;

    if (finalTime > TARGET_TIME) {
        isDQ = true;
        diff = finalTime - TARGET_TIME;
    } else {
        isDQ = false;
        diff = TARGET_TIME - finalTime;
    }

    timerText.textContent = formattedTime;

    if (isDQ) {
        // --- DQ ---
        playSound(audioOver);
        diffText.textContent = "OVER LIMIT";
        resultMessage.textContent = "DISQUALIFIED";
        resultMessage.style.color = "red";

        dqOverlay.classList.remove('hidden');
        setTimeout(() => { dqOverlay.classList.add('hidden'); }, 3000);

    } else {
        // --- SUCCESS ---
        if (finalTime >= 9.00) {
            playSound(audioRankNew);
            triggerParticles(200); // Medium explosion
            timerText.style.animation = "pulseGold 0.5s 2";
            setTimeout(() => timerText.style.animation = "", 1000);
        } else {
            playSound(audioResult);
        }

        diffText.textContent = `DIFF: ${diff.toFixed(2)}`;

        if (diff === 0) {
            resultMessage.textContent = "PERFECT JACKPOT!!";
            resultMessage.style.color = "var(--gold-primary)";
            triggerParticles(500); // Massive explosion
        } else if (diff < 0.1) {
            resultMessage.textContent = "EXCELLENT!";
            resultMessage.style.color = "#fff";
            if (finalTime < 9.00) triggerParticles(100); // Only trigger if not already triggered by high score
        } else {
            resultMessage.textContent = "SAFE RECORD";
            resultMessage.style.color = "#aaa";
        }
    }

    saveResult(playerName, formattedTime, diff, isDQ);

    actionButton.disabled = true; // Keep disabled until retry
    retryButton.classList.remove('hidden');
}

// ========================================
// Ranking Logic
// ========================================
showRankingButton.addEventListener('click', showRankingAnimation);
closeModalButton.addEventListener('click', () => rankingModal.classList.add('hidden'));

function showRankingAnimation() {
    rankingModal.classList.remove('hidden');
    rankingList.innerHTML = '';

    const validRecords = rankings.filter(r => !r.isDQ).sort((a, b) => b.timeVal - a.timeVal); // Closer to 10 is bigger timeVal (if not DQ)?? Wait. 
    // Logic check: Closer to 10.00 is better. 9.99 > 9.00. So descending sort is correct for "Longest valid time".

    const invalidRecords = rankings.filter(r => r.isDQ).sort((a, b) => a.timeVal - b.timeVal); // Smallest DQ (10.01) is "better" than 11.00? Usually DQ is just bottom.

    const finalRankings = [...validRecords, ...invalidRecords];

    if (finalRankings.length === 0) {
        rankingList.innerHTML = '<div style="color:#fff; text-align:center; margin-top:50px;">NO RECORDS</div>';
        return;
    }

    finalRankings.forEach((item, index) => {
        const rank = index + 1;
        const row = document.createElement('div');
        row.classList.add('rank-row');
        row.id = `rank-row-${index}`;

        if (rank <= 3) row.classList.add('rank-top-tier');
        if (rank === 1) row.classList.add('rank-1');
        if (rank === 2) row.classList.add('rank-2');
        if (rank === 3) row.classList.add('rank-3');
        if (rank === 4) row.classList.add('rank-4');
        if (rank === 5) {
            row.classList.add('rank-5');
            row.classList.add('rank-cutoff');
        }
        if (item.isDQ) row.classList.add('rank-dq');

        let timeDisplay = `${item.time}s`;
        if (item.isDQ) timeDisplay = `DQ (${item.time}s)`;

        row.innerHTML = `
            <div class="rank-num">${rank}位</div>
            <div class="rank-name">${escapeHtml(item.name)}</div>
            <div class="rank-time">${timeDisplay}</div>
        `;
        rankingList.appendChild(row);
    });

    // Animation - Reverse Order (Bottom to Top)
    const totalCount = finalRankings.length;
    let currentDelay = 0;

    // Iterate from last index to 0
    for (let i = totalCount - 1; i >= 0; i--) {
        const row = document.getElementById(`rank-row-${i}`);
        const rank = i + 1;

        // Dynamic Delay Calculation
        let step = 50; // Very fast for lower ranks

        if (rank <= 5) step = 500; // Slow down from 5th
        if (rank <= 3) step = 1200; // More tension for Top 3
        if (rank === 1) step = 2000; // Maximum tension for 1st

        currentDelay += step;

        setTimeout(() => {
            row.classList.add('revealed');

            // Scroll to show the revealed item
            if (rank === 1) {
                // Force scroll to top for 1st place
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Also try to scroll container to top just in case
                rankingList.scrollTop = 0;
            } else {
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Effects based on Rank
            if (rank > 5) {
                // No sound for 6th and below
            } else if (rank > 3) {
                // Standard pop sound for 4th and 5th
                const clickSound = audioStop.cloneNode();
                clickSound.volume = 0.3;
                clickSound.play().catch(() => { });
            } else if (rank === 3) {
                // Rank 3 Effect
                playSound(audioResult);
                row.style.transform = "scale(1.1)";
                setTimeout(() => row.style.transform = "scale(1)", 300);
            } else if (rank === 2) {
                // Rank 2 Effect
                playSound(audioResult);
                row.style.transform = "scale(1.15)";
                setTimeout(() => row.style.transform = "scale(1)", 300);
                triggerParticles(50); // Small confetti
            } else if (rank === 1) {
                // Rank 1 Effect (Grand)
                playSound(audioRankNew);
                triggerParticles(300); // Big confetti
                row.style.animation = "pulseGold 1s infinite";
            }

        }, currentDelay);
    }
}

// ========================================
// Data Management
// ========================================
function saveResult(name, timeStr, diff, isDQ) {
    const newRecord = {
        id: Date.now(),
        name: name,
        time: timeStr,
        timeVal: parseFloat(timeStr),
        diff: parseFloat(diff),
        isDQ: isDQ,
        date: new Date().toISOString()
    };
    rankings.push(newRecord);
    localStorage.setItem('aijp_ranking_rich', JSON.stringify(rankings));
}

function loadRankings() {
    const data = localStorage.getItem('aijp_ranking_rich');
    if (data) rankings = JSON.parse(data);
}

resetAllButton.addEventListener('click', () => {
    if (confirm('全てのランキングデータを消去しますか？')) {
        rankings = [];
        localStorage.removeItem('aijp_ranking_rich');
        alert("データをリセットしました");
    }
});

// ========================================
// Utils
// ========================================
function resetGame() {
    gameState = 'IDLE';
    actionButton.disabled = false;
    actionButton.textContent = "START";
    actionButton.classList.remove('state-stop');

    retryButton.classList.add('hidden');
    playerNameInput.disabled = false;
    playerNameInput.value = "";
    playerNameInput.focus();
    timerText.textContent = "00.00";
    diffText.textContent = "READY?";
    resultMessage.textContent = "PRESS START";
    resultMessage.style.color = "var(--gold-shine)";
    document.body.style.boxShadow = 'none';
}

function startSlotMachineEffect(finalVal, callback) {
    let count = 0;
    const duration = 1500;
    const interval = 50;
    const slotInterval = setInterval(() => {
        const randomVal = (8.00 + Math.random() * 3.00).toFixed(2);
        timerText.textContent = randomVal;
        count += interval;
        if (count >= duration) {
            clearInterval(slotInterval);
            callback();
        }
    }, interval);
}

function playSound(audioObj) {
    audioObj.currentTime = 0;
    audioObj.play().catch(e => console.log(e));
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[m]));
}

function triggerParticles(amount) {
    const container = document.getElementById('particles-container');
    const colors = ['#ffd700', '#ff0033', '#ffffff', '#b8860b'];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < amount; i++) {
        const p = document.createElement('div');
        p.style.position = 'absolute';
        p.style.width = (Math.random() * 12 + 4) + 'px';
        p.style.height = (Math.random() * 12 + 4) + 'px'; // Confetti shape
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = centerX + 'px';
        p.style.top = centerY + 'px';
        p.style.pointerEvents = 'none';
        p.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 400 + 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        const rot = Math.random() * 720;

        p.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`, opacity: 0 }
        ], {
            duration: 1200 + Math.random() * 500, easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
        }).onfinish = () => p.remove();
    }
}

function createSnow() {
    const snowContainer = document.getElementById('snow-container');
    if (snowContainer.childElementCount > 0) return;
    for (let i = 0; i < 30; i++) {
        const s = document.createElement('div');
        s.textContent = Math.random() > 0.5 ? '✨' : '❄'; // Mix sparkles
        s.style.position = 'absolute';
        s.style.color = 'gold';
        s.style.left = Math.random() * 100 + '%';
        s.style.top = -20 + 'px';
        s.style.opacity = 0.4;
        s.style.fontSize = (Math.random() + 0.5) + 'rem';
        s.animate([
            { transform: `translateY(0vh) rotate(0deg)` },
            { transform: `translateY(100vh) rotate(360deg)` }
        ], {
            duration: 5000 + Math.random() * 5000,
            iterations: Infinity,
            delay: -Math.random() * 5000
        });
        snowContainer.appendChild(s);
    }
}

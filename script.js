// file: script.js
/*
  10.00s CHALLENGE - 昭島国際法務PFI忘年会 ver.
*/

// ========================================
// Sound Assets
// ========================================
const audioStart = new Audio('se_button_start.mp3');
const audioStop = new Audio('se_button_stop.mp3');
const audioResult = new Audio('se_result_near.mp3'); 
const audioRankNew = new Audio('se_rank_new.mp3');

// 失格用サウンド（ブブー）
const audioOver = new Audio('over.mp3');

// 音声の事前読み込み
audioStart.preload = 'auto';
audioStop.preload = 'auto';
audioResult.preload = 'auto';
audioRankNew.preload = 'auto';
audioOver.preload = 'auto';

// ========================================
// Global State
// ========================================
let startTime = null;
let rankings = []; // { id, name, time, diff, isDQ, date }
const TARGET_TIME = 10.00;

// DOM Elements
const playerNameInput = document.getElementById('playerName');
const gameButton = document.getElementById('gameButton');
const timerText = document.getElementById('timerText');
const diffText = document.getElementById('diffText');
const resultMessage = document.getElementById('resultMessage');
const retryButton = document.getElementById('retryButton');

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
    updateStatusMonitor();
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
        alert("お名前を入力してください");
        playerNameInput.focus();
        return;
    }

    playSound(audioStart);
    
    gameButton.textContent = "STOP !";
    gameButton.setAttribute('data-state', 'stop');
    gameButton.classList.add('stop-mode');
    
    playerNameInput.disabled = true;
    retryButton.classList.add('hidden');
    resultMessage.textContent = "COUNTING...";
    timerText.classList.add('timer-blur');
    timerText.textContent = "??.??";
    diffText.textContent = "TARGET: 10.00";
    
    startTime = Date.now();
}

function stopGame() {
    const stopTime = Date.now();
    const elapsedTime = (stopTime - startTime) / 1000;

    playSound(audioStop);
    gameButton.disabled = true;
    gameButton.textContent = "JUDGING...";
    
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

    // 10.00秒判定
    if (finalTime > TARGET_TIME) {
        isDQ = true;
        diff = finalTime - TARGET_TIME;
    } else {
        isDQ = false;
        diff = TARGET_TIME - finalTime;
    }

    timerText.textContent = formattedTime;
    
    if (isDQ) {
        // --- 失格演出 ---
        playSound(audioOver); // ブブー音再生

        diffText.textContent = "OVER LIMIT";
        resultMessage.textContent = "DISQUALIFIED";
        resultMessage.style.color = "red";
        
        dqOverlay.classList.remove('hidden');
        setTimeout(() => { dqOverlay.classList.add('hidden'); }, 2500);

    } else {
        // --- 成功演出 ---
        playSound(audioResult);
        diffText.textContent = `DIFF: ${diff.toFixed(2)}`;
        
        if (diff === 0) {
            resultMessage.textContent = "PERFECT JACKPOT!!";
            resultMessage.style.color = "var(--gold-primary)";
            triggerParticles(200);
        } else if (diff < 0.1) {
            resultMessage.textContent = "EXCELLENT!";
            resultMessage.style.color = "#fff";
            triggerParticles(50);
        } else {
            resultMessage.textContent = "SAFE RECORD";
            resultMessage.style.color = "#888";
        }
    }

    saveResult(playerName, formattedTime, diff, isDQ);

    gameButton.disabled = false;
    gameButton.classList.add('hidden');
    retryButton.classList.remove('hidden');
}

// ========================================
// Ranking Logic Update (Delay Added)
// ========================================

showRankingButton.addEventListener('click', () => {
    showRankingAnimation();
});

closeModalButton.addEventListener('click', () => {
    rankingModal.classList.add('hidden');
});

function showRankingAnimation() {
    rankingModal.classList.remove('hidden');
    rankingList.innerHTML = '';

    // 1. ソート処理 (有効記録を優先、失格は後回し)
    const validRecords = rankings.filter(r => !r.isDQ)
                                 .sort((a, b) => b.timeVal - a.timeVal);
    const invalidRecords = rankings.filter(r => r.isDQ)
                                   .sort((a, b) => a.timeVal - b.timeVal);

    // 結合
    const finalRankings = [...validRecords, ...invalidRecords];

    if (finalRankings.length === 0) {
        rankingList.innerHTML = '<div style="color:#fff; text-align:center; margin-top:50px;">NO RECORDS</div>';
        return;
    }

    // 2. DOM生成
    finalRankings.forEach((item, index) => {
        const rank = index + 1;
        const row = document.createElement('div');
        row.classList.add('rank-row');
        row.id = `rank-row-${index}`;

        // スタイル分岐
        if (rank <= 5) {
            row.classList.add('rank-top-tier');
            if (rank === 1) row.classList.add('rank-1');
            if (rank === 2) row.classList.add('rank-2');
            if (rank === 3) row.classList.add('rank-3');
        } else {
            row.classList.add('rank-low-tier');
        }

        if (item.isDQ) {
            row.classList.add('rank-dq');
        }

        // 表示内容
        let timeDisplay = `${item.time}s`;
        if (item.isDQ) timeDisplay = "DQ (" + item.time + "s)";

        row.innerHTML = `
            <div class="rank-num">#${rank}</div>
            <div class="rank-name">${escapeHtml(item.name)}</div>
            <div class="rank-time">${timeDisplay}</div>
        `;
        rankingList.appendChild(row);
    });

    // 3. アニメーション実行 (ビリから順にタメて表示)
    const totalCount = finalRankings.length;
    let currentDelay = 0;

    for (let i = totalCount - 1; i >= 0; i--) {
        const row = document.getElementById(`rank-row-${i}`);
        const rank = i + 1;
        
        // --- 間隔（タメ）の調整 ---
        let step = 400; // 基本スピード（下位はサクサク）

        // 中位層のタメ
        if (rank === 5 || rank === 4) step = 900;

        // 上位3名はしっかりタメる（ワクワク感）
        if (rank === 3) step = 1500;
        if (rank === 2) step = 2000;
        if (rank === 1) step = 2600;

        currentDelay += step;

        setTimeout(() => {
            row.classList.add('revealed');
            
            // 効果音
            if (rank === 1) {
                playSound(audioRankNew);
                triggerParticles(120);
            } else if (rank <= 3) {
                const clickSound = audioStop.cloneNode();
                clickSound.volume = 0.6;
                clickSound.play();
            } else if (rank <= 5) {
                const clickSound = audioStop.cloneNode();
                clickSound.volume = 0.4;
                clickSound.play();
            }
            
            // スクロール追従 (上位5位まで)
            if (rank <= 5) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    localStorage.setItem('aijp_ranking_bonenkai', JSON.stringify(rankings));
    
    updateStatusMonitor();
}

function loadRankings() {
    const data = localStorage.getItem('aijp_ranking_bonenkai');
    if (data) rankings = JSON.parse(data);
}

function updateStatusMonitor() {
    const valid = rankings.filter(r => !r.isDQ);
    document.getElementById('entryCount').textContent = rankings.length;
    
    if (valid.length > 0) {
        const best = valid.reduce((prev, current) => (prev.timeVal > current.timeVal) ? prev : current);
        document.getElementById('topScoreDisplay').textContent = best.time + "s";
    } else {
        document.getElementById('topScoreDisplay').textContent = "--.--";
    }
}

resetAllButton.addEventListener('click', () => {
    if(confirm('全てのランキングデータを消去しますか？')) {
        rankings = [];
        localStorage.removeItem('aijp_ranking_bonenkai');
        updateStatusMonitor();
        alert("データをリセットしました");
    }
});

// ========================================
// Utils
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
    diffText.textContent = "READY?";
    resultMessage.textContent = "PRESS START";
    resultMessage.style.color = "#aaa";
}

function startSlotMachineEffect(finalVal, callback) {
    let count = 0;
    const duration = 1200;
    const interval = 40;
    const slotInterval = setInterval(() => {
        const randomVal = (8.00 + Math.random() * 1.99).toFixed(2);
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
    if(!str) return "";
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
}

function triggerParticles(amount) {
    const container = document.getElementById('particles-container');
    const colors = ['#d4af37', '#ff0033', '#ffffff'];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    for (let i = 0; i < amount; i++) {
        const p = document.createElement('div');
        p.style.position = 'absolute';
        p.style.width = (Math.random() * 10 + 5) + 'px';
        p.style.height = p.style.width;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = centerX + 'px';
        p.style.top = centerY + 'px';
        p.style.borderRadius = '50%';
        p.style.pointerEvents = 'none';
        container.appendChild(p);
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 300 + 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        p.animate([
            { transform: 'translate(0,0)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px)`, opacity: 0 }
        ], {
            duration: 1000, easing: 'ease-out'
        }).onfinish = () => p.remove();
    }
}

function createSnow() {
    const snowContainer = document.getElementById('snow-container');
    if(snowContainer.childElementCount > 0) return;
    for(let i=0; i<20; i++) {
        const s = document.createElement('div');
        s.textContent = '❄';
        s.style.position = 'absolute';
        s.style.color = 'white';
        s.style.left = Math.random()*100 + '%';
        s.style.top = -10 + 'px';
        s.style.opacity = 0.3;
        s.style.fontSize = (Math.random()+0.5)+'rem';
        s.animate([
            { transform: `translateY(0vh)` },
            { transform: `translateY(100vh)` }
        ], {
            duration: 5000 + Math.random()*5000,
            iterations: Infinity,
            delay: -Math.random()*5000
        });
        snowContainer.appendChild(s);
    }
}

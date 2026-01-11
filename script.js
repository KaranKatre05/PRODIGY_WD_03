// --- DOM ELEMENTS ---
const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status-text');
const soundBtn = document.getElementById('soundBtn');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');
const winnerOverlay = document.getElementById('winnerOverlay');
const winnerText = document.getElementById('winnerText');

// --- STATE ---
let board = Array(9).fill("");
let currentPlayer = "X";
let isGameActive = true;
let gameMode = "PvP";
let scores = { X: 0, O: 0, Draw: 0 };
let soundEnabled = true;

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// --- SOUND FX (Web Audio API - No files needed) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration) {
    if (!soundEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playClickSound() { playTone(600, 'sine', 0.1); }
function playWinSound() { 
    playTone(400, 'triangle', 0.2); 
    setTimeout(() => playTone(600, 'triangle', 0.2), 200);
    setTimeout(() => playTone(800, 'triangle', 0.4), 400);
}
function playDrawSound() { playTone(200, 'sawtooth', 0.3); }

// --- GAME LOGIC ---
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
soundBtn.addEventListener('click', toggleSound);

function toggleSound() {
    soundEnabled = !soundEnabled;
    soundBtn.innerHTML = soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    soundBtn.style.color = soundEnabled ? 'white' : '#555';
}

function handleCellClick(e) {
    const idx = e.target.getAttribute('data-index');
    if (board[idx] !== "" || !isGameActive) return;

    makeMove(idx, currentPlayer);

    if (gameMode === "AI" && isGameActive && currentPlayer === "O") {
        statusText.innerText = "CPU THINKING...";
        setTimeout(makeAiMove, 600);
    }
}

function makeMove(idx, player) {
    board[idx] = player;
    cells[idx].classList.add(player.toLowerCase());
    cells[idx].innerText = player;
    playClickSound();

    if (checkWin(player)) {
        endGame(player);
    } else if (board.every(cell => cell !== "")) {
        endGame("Draw");
    } else {
        switchPlayer();
    }
}

function switchPlayer() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusText.innerText = `PLAYER ${currentPlayer}'S TURN`;
    
    // Highlight Scorebox
    document.querySelector('.p1').classList.toggle('active-turn', currentPlayer === "X");
    document.querySelector('.p2').classList.toggle('active-turn', currentPlayer === "O");
}

function checkWin(player) {
    return winningConditions.some(combination => {
        if (combination.every(index => board[index] === player)) {
            combination.forEach(index => cells[index].classList.add('win'));
            return true;
        }
        return false;
    });
}

function endGame(result) {
    isGameActive = false;
    if (result === "Draw") {
        statusText.innerText = "GAME DRAW!";
        winnerText.innerText = "DRAW!";
        scores.Draw++;
        scoreDrawEl.innerText = scores.Draw;
        playDrawSound();
    } else {
        statusText.innerText = `PLAYER ${result} WINS!`;
        winnerText.innerText = `${result} WINS!`;
        scores[result]++;
        if (result === 'X') scoreXEl.innerText = scores.X;
        if (result === 'O') scoreOEl.innerText = scores.O;
        playWinSound();
        startConfetti();
    }
    setTimeout(() => winnerOverlay.classList.add('show'), 1000);
}

function resetGame() {
    board.fill("");
    isGameActive = true;
    currentPlayer = "X";
    cells.forEach(cell => {
        cell.innerText = "";
        cell.className = "cell";
    });
    statusText.innerText = "PLAYER X'S TURN";
    winnerOverlay.classList.remove('show');
    document.querySelector('.p1').classList.add('active-turn');
    document.querySelector('.p2').classList.remove('active-turn');
    stopConfetti();
}

function setMode(mode) {
    gameMode = mode;
    document.getElementById('btn-pvp').classList.toggle('active', mode === 'PvP');
    document.getElementById('btn-ai').classList.toggle('active', mode === 'AI');
    scores = { X: 0, O: 0, Draw: 0 }; // Reset scores on mode change
    scoreXEl.innerText = 0; scoreOEl.innerText = 0; scoreDrawEl.innerText = 0;
    resetGame();
}

// --- AI LOGIC (Minimax-ish / Smart Block) ---
function makeAiMove() {
    // 1. Try to Win
    let move = findBestMove("O");
    // 2. Block X
    if (move === null) move = findBestMove("X");
    // 3. Random
    if (move === null) {
        const available = board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
        move = available[Math.floor(Math.random() * available.length)];
    }
    makeMove(move, "O");
}

function findBestMove(player) {
    for (let condition of winningConditions) {
        const [a, b, c] = condition;
        if (board[a] === player && board[b] === player && board[c] === "") return c;
        if (board[a] === player && board[c] === player && board[b] === "") return b;
        if (board[b] === player && board[c] === player && board[a] === "") return a;
    }
    return null;
}

// --- CONFETTI ---
const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let particles = [];
let animationId;

function startConfetti() {
    particles = [];
    for(let i=0; i<100; i++) {
        particles.push({
            x: window.innerWidth / 2, y: window.innerHeight / 2,
            dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10,
            color: `hsl(${Math.random()*360}, 100%, 50%)`
        });
    }
    animateConfetti();
}

function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
        p.x += p.dx; p.y += p.dy; p.dy += 0.1;
        ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 5, 5);
        if (p.y > canvas.height) particles.splice(i, 1);
    });
    if (particles.length > 0) animationId = requestAnimationFrame(animateConfetti);
}
function stopConfetti() { cancelAnimationFrame(animationId); ctx.clearRect(0,0,canvas.width,canvas.height); }
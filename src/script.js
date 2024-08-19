let score = 0;
const gameArea = document.getElementById('game-area');
const result = document.getElementById('result');
const restartBtn = document.getElementById('restart-btn');
const timeCounter = document.getElementById('time-counter');
const hitCounter = document.getElementById('hit-counter');
const seedInput = document.getElementById('seed-input');
const pauseMessage = document.getElementById('pause-message');
var currentTarget;
var previousTarget;
var latestHitTargetRect;
let gameInterval;
let timeInterval;
var seed = 2332;
let gamePaused = false;
let gameLength = 3; // 3 seconds

let state = {
    hitData: [],
    startTime: 0,
    timeLeft: 3,
    lastTargetTime: 0
};

function random(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function getRandomPosition() {
    const x = random(seed) * (window.innerWidth - 30);
    const y = random(seed + 1) * (window.innerHeight - 30);
    seed = seed + 2;
    return { x, y };
}

function getRectDistance(rectA, rectB) {
    // Calculate the center of rectangle A
    const centerA_X = rectA.left + rectA.width / 2;
    const centerA_Y = rectA.top + rectA.height / 2;

    // Calculate the center of rectangle B
    const centerB_X = rectB.left + rectB.width / 2;
    const centerB_Y = rectB.top + rectB.height / 2;

    // Calculate the distance between the centers
    const deltaX = centerB_X - centerA_X;
    const deltaY = centerB_Y - centerA_Y;

    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function getDistanceRectToPoint(rect, x, y) {
    // Calculate the center of the rectangle
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate the distance between the center of the rectangle and the point
    const deltaX = x - centerX;
    const deltaY = y - centerY;

    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function createTarget() {
    const target = document.createElement('div');
    target.className = 'target';
    const { x, y } = getRandomPosition(seed);
    const now = performance.now();

    state.startTime = now;
    state.lastTargetTime = performance.now();
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;

    target.addEventListener('click', () => {
        const now = performance.now();
        latestHitTargetRect = target.getBoundingClientRect();
        const hitTime = now - state.lastTargetTime; // Correct order of subtraction
        // get all target children of gameArea
        const targets = gameArea.querySelectorAll('.target');
        // if there are no targets left, create a new one
        if (targets.length === 1) {
            createTarget();
        }
        gameArea.removeChild(target);
        score++;
        playSound('hit');
        let targetRec = target.getBoundingClientRect();
        let distance = getRectDistance(latestHitTargetRect, targetRec);
        state.hitData.push({
            x: targetRec.left,
            y: targetRec.top,
            time: hitTime,
            distance
        });
        state.lastTargetTime = now; // Update lastTargetTime for the next target
        hitCounter.textContent = `Hits: ${score}`;
    });

    gameArea.appendChild(target);
    previousTarget = currentTarget;
    currentTarget = target;
}

function playSound(type) {
    const audio = new Audio(type === 'hit' ? 'audio/hit.wav' : 'audio/miss.wav');
    audio.play();
}

function startGame() {
    // if (!document.fullscreenElement) {
    //     requestFullscreen();
    // }
    score = 0;
    state.timeLeft = gameLength;
    state.hitData = [];
    state.startTime = performance.now();
    state.lastTargetTime = state.startTime; // Initialize lastTargetTime
    state.endTime = state.startTime + (gameLength * 1000); // Use gameLength variable

    result.style.display = 'none';
    restartBtn.style.display = 'none';
    seedInput.style.display = 'none';
    pauseMessage.style.display = 'none';
    timeCounter.style.display = 'block';
    timeCounter.textContent = `Time: ${state.timeLeft}`;
    hitCounter.textContent = `Hits: 0`;

    timeInterval = setInterval(() => {
        const currentTime = performance.now();
        state.timeLeft = Math.max(0, (state.endTime - currentTime) / 1000);
        timeCounter.textContent = `Time: ${state.timeLeft.toFixed(2)}`;
        if (currentTime >= state.endTime) {
            clearInterval(timeInterval);
            endGame();
        }
    }, 16); // Update roughly 60 times per second

    createTarget();
}
const statsModal = document.getElementById('stats-modal');
const statsContent = document.getElementById('stats-content');
const closeBtn = document.querySelector('.close');

function showStats() {
    const totalTime = 3; // Game duration in seconds
    const totalTargets = state.hitData.length;
    const targetsPerMinute = (totalTargets / totalTime) * 60;
    const validHitTimes = state.hitData.map(hit => Math.max(0, hit.time)); // Ensure non-negative times
    const totalHitTime = validHitTimes.reduce((sum, time) => sum + time, 0);
    const avgHitTime = totalHitTime / totalTargets;
    const fastestHit = Math.min(...validHitTimes);
    const slowestHit = Math.max(...validHitTimes);

    statsContent.innerHTML = `
        <p>Targets Hit: ${totalTargets} targets in ${gameLength} seconds</p>
        <p>Game Area: ${window.innerWidth}px x ${window.innerHeight}px</p>
        <p>Avg. Hit Time: ${avgHitTime.toFixed(2)}ms | ${targetsPerMinute.toFixed(2)} Targets Per Minute</p>
        <p>Fastest Hit: ${fastestHit.toFixed(2)}ms</p>
        <p>Slowest Hit: ${slowestHit.toFixed(2)}ms</p>
        <table>
            <tr><th>#</th><th>Time</th><th>Distance</th></tr>
            ${state.hitData.map((data, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${Math.max(0, data.time).toFixed(2)}ms</td>
                    <td>${data.distance.toFixed(2)}px</td>
                </tr>
            `).join('')}
        </table>
    `;

    const ctx = document.getElementById('stats-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.hitData.map((_, i) => i + 1),
            datasets: [{
                label: 'Hit Time (ms)',
                data: state.hitData.map(({ time }) => time),
                borderColor: 'rgba(75,192,192,1)',
                backgroundColor: 'rgba(75,192,192,0.2)',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Hit Number'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Time (ms)'
                    }
                }
            }
        }
    });


    statsModal.style.display = 'flex';
}

closeBtn.onclick = function() {
    statsModal.style.display = 'none';
};

window.onclick = function(event) {
    if (event.target === statsModal) {
        statsModal.style.display = 'none';
    }
}

function endGame(shouldShowStats = true) {
    gameArea.innerHTML = '';
    timeCounter.style.display = 'none';
    restartBtn.style.display = 'block';
    seedInput.style.display = 'block';
    if(shouldShowStats) {
        showStats();
    }
}

function requestFullscreen() {
    return
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) { // Firefox
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari, and Opera
        document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
        document.documentElement.msRequestFullscreen();
    }
}

function checkFullscreen() {
    if (!document.fullscreenElement) {
        pauseGame();
    } else if (gamePaused) {
        resumeGame();
    }
}

function pauseGame() {
    clearInterval(timeInterval);
    gamePaused = true;
    pauseMessage.style.display = 'block';
}

function resumeGame() {
    gamePaused = false;
    pauseMessage.style.display = 'none';
    timeInterval = setInterval(() => {
        state.timeLeft = state.timeLeft - 1;
        timeCounter.textContent = `Time: ${ state.timeLeft }`;
        if (state.timeLeft <= 0) {
            clearInterval(timeInterval);
            endGame();
        }
    }, 1000);
}

restartBtn.addEventListener('click', () => {
    latestHitTargetRect = restartBtn.getBoundingClientRect();
    seed = parseInt(seedInput.value, 10);
    startGame();
});

// gameArea.addEventListener('mousemove', (event) => {
//     if (currentTarget) {
//         const targetRect = currentTarget.getBoundingClientRect();
//         const distance = getDistanceRectToPoint(targetRect, event.clientX, event.clientY);
//         if (distance <= 15) {
//             createTarget();
//         }
//     }
// });
gameArea.addEventListener('click', (event) => {
    // if event is not target then play miss sound
    if (event.target.className !== 'target') {
        playSound('miss');
    }
    // TODO: add a miss to the data
});

document.addEventListener('fullscreenchange', checkFullscreen);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
    pauseGame();
}
});

// Initial state is the end screen
endGame(false);
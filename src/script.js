let score = 0;
const gameArea = document.getElementById('game-area');
const result = document.getElementById('result');
const controls = document.getElementById('controls');
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
let chartInstance = null;
var seed = 2332;
let gamePaused = false;
let gameLength = 10; // 3 seconds
const minDistanceInput = document.getElementById('min-distance');
const maxDistanceInput = document.getElementById('max-distance');
let minDistance = 0;
let maxDistance = 1000;
const MAX_ATTEMPTS = 100; // Prevent infinite loops


let state = {
    hitData: [],
    startTime: 0,
    timeLeft: 3,
    lastTargetTime: 0,
    missedClicks: 0
};
function random(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// function getRandomPosition() {
//     const x = random(seed) * (window.innerWidth - 30);
//     const y = random(seed + 1) * (window.innerHeight - 30);
//     seed = seed + 2;
//     return { x, y };
// }

function getRandomPosition() {
    // gets a random position within a certain distance
    let x, y, distance;
    let attempts = 0;
    do {
        x = random(seed) * window.innerWidth;
        y = random(seed + 1) * window.innerHeight;
        seed = seed + 2;
        if(!latestHitTargetRect) {
            return { x, y };
        }
        distance = getDistanceRectToPoint(latestHitTargetRect, x, y);
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
            console.warn("Couldn't find a position within the specified range. Using the last generated position.");
            break;
        }
    } while (distance < minDistance || distance > maxDistance);
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
        // hitCounter.textContent = `Hits: ${score} gameArea: ${gameArea.getBoundingClientRect().width}x${gameArea.getBoundingClientRect().height}`;
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
    if (!document.fullscreenElement) {
        requestFullscreen();
    }
    seed = parseInt(seedInput.value, 10);
    minDistance = parseInt(minDistanceInput.value, 10);
    maxDistance = parseInt(maxDistanceInput.value, 10);
    score = 0;
    state.missedClicks = 0;
    state.timeLeft = gameLength;
    state.hitData = [];
    state.startTime = performance.now();
    state.lastTargetTime = state.startTime; // Initialize lastTargetTime
    state.endTime = state.startTime + (gameLength * 1000); // Use gameLength variable

    result.style.display = 'none';
    
    controls.style.display = 'none';

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
    const totalTime = gameLength;
    const totalTargets = state.hitData.length;
    const totalClicks = totalTargets + state.missedClicks;
    const accuracy = (totalTargets / totalClicks * 100).toFixed(2);
    const targetsPerMinute = (totalTargets / totalTime) * 60;
    const validHitTimes = state.hitData.map(hit => Math.max(0, hit.time));
    const totalHitTime = validHitTimes.reduce((sum, time) => sum + time, 0);
    const avgHitTime = totalHitTime / totalTargets;
    const fastestHit = Math.min(...validHitTimes);
    const slowestHit = Math.max(...validHitTimes);

    statsContent.innerHTML = `
        <h2>Score</h2>
        <p>${totalTargets} targets</p>
        <h2>${targetsPerMinute.toFixed(2)} TPM (Targets Per Minute)</h2>
        <p>------------------------</p>
        <p>Accuracy: ${accuracy}% (${totalTargets} hits, ${state.missedClicks} misses)</p>
        <p>Total Game Length: ${gameLength} seconds</p>
        <p>Game Area: ${window.innerWidth}px x ${window.innerHeight}px</p>
        <p>Avg. Hit Time: ${avgHitTime.toFixed(2)}ms</p>
        <p>Fastest Hit: ${fastestHit.toFixed(2)}ms (Distance: ${state.hitData.find(hit => hit.time === fastestHit).distance.toFixed(2)}px)</p>
        <p>Slowest Hit: ${slowestHit.toFixed(2)}ms (Distance: ${state.hitData.find(hit => hit.time === slowestHit).distance.toFixed(2)}px)</p>
        <table>
            <tr><th>#</th><th>Distance (px)</th><th>Time (ms)</th></tr>
            ${state.hitData.map((data, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${data.distance.toFixed(2)}</td>
                    <td>${data.time.toFixed(2)}</td>
                </tr>
            `).join('')}
        </table>
    `;

    // Sort data for the chart
    const sortedHitData = [...state.hitData].sort((a, b) => a.distance - b.distance);

    // Prepare data for the chart
    const chartData = sortedHitData.map(hit => ({
        x: hit.distance,
        y: hit.time
    }));

    // Calculate linear regression
    const n = chartData.length;
    const sumX = chartData.reduce((sum, point) => sum + point.x, 0);
    const sumY = chartData.reduce((sum, point) => sum + point.y, 0);
    const sumXY = chartData.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumX2 = chartData.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const lineFitData = [
        { x: chartData[0].x, y: slope * chartData[0].x + intercept },
        { x: chartData[chartData.length - 1].x, y: slope * chartData[chartData.length - 1].x + intercept }
    ];

    const ctx = document.getElementById('stats-chart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }
    chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Hit Time vs Distance',
                data: chartData,
                backgroundColor: 'rgba(75,192,192,0.6)',
                borderColor: 'rgba(75,192,192,1)',
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: true,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Distance to Target (px)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Hit Time (ms)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Distance: ${context.parsed.x.toFixed(2)}px, Time: ${context.parsed.y.toFixed(2)}ms`;
                        }
                    }
                }
            }
        }
    });

    statsModal.style.display = 'flex';
}
closeBtn.onclick = function () {
    statsModal.style.display = 'none';
    // Clear the chart canvas to prevent ghosting
    const ctx = document.getElementById('stats-chart').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
};

function endGame(shouldShowStats = true) {
    gameArea.innerHTML = '';
    timeCounter.style.display = 'none';
    controls.style.display = 'block';
    result.style.display = 'block';
    result.textContent = `You clicked ${score} targets!`;
    if (shouldShowStats) {
        setTimeout(showStats(), 100);
    }
}

function requestFullscreen() {
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
        state.missedClicks++;
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
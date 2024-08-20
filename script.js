    // Variables for settings
    var seed = localStorage.getItem('seed') ? parseInt(localStorage.getItem('seed'), 10) : 1;
    let cursorType = localStorage.getItem('cursorType') || 'default';
    let RADIUS_UNIT_LENGTH = localStorage.getItem('RADIUS_UNIT_LENGTH') ? parseFloat(localStorage.getItem('RADIUS_UNIT_LENGTH')) : 20;

    // Update the modal inputs with the saved settings
    document.getElementById('map-select').value = seed;
    document.getElementById('cursor-select').value = cursorType;
    document.getElementById('circle-radius').value = RADIUS_UNIT_LENGTH;
    document.getElementById('radius-value').textContent = RADIUS_UNIT_LENGTH;
    let score = 0;
    const gameArea = document.getElementById('game-area');
    const result = document.getElementById('result');
    const controls = document.getElementById('controls');
    const fullscreenCheckbox = document.getElementById('fullscreen-checkbox');
    const restartBtn = document.getElementById('restart-btn');
    const preGameModal = document.getElementById('pre-game-modal');
    const startGameButton = document.getElementById('start-game-btn');
    const timeCounter = document.getElementById('time-counter');
    const hitCounter = document.getElementById('hit-counter');
    const seedInput = document.getElementById('map-select');
    const resumeButton = document.getElementById('resume-btn');
    const pauseMessage = document.getElementById('pause-message');
    var currentTarget;
    var previousTarget;
    var upcomingDistance;
    var latestHitTargetRect;
    let gameInterval;
    let timeInterval;
    var gameInFullscreen = false;
    let chartInstance = null;
    let gamePaused = false;
    let gameLength = 10; // 3 seconds
    // const minDistanceInput = document.getElementById('min-distance');
    // const maxDistanceInput = document.getElementById('max-distance');
    let minDistance = 0;
    let maxDistance = 100000;
    const MAX_ATTEMPTS = 100; // Prevent infinite loops
    // const SHOULD_SHOW_NEXT_TARGET = true;
    const NEXT_TARGET_OPACITY = 0.3;
    var unit = 1;
    var TARGET_DIAMETER = 0;
    function calculateUnit() {
        const diagonal = Math.sqrt(window.screen.width ** 2 + window.screen.height ** 2);
        unit = diagonal / 1000;
        TARGET_DIAMETER = unit * RADIUS_UNIT_LENGTH * 2;
        console.log("unit", unit);
        console.log("Diameter Unit Length", RADIUS_UNIT_LENGTH);
        console.log("TARGET_DIAMETER", TARGET_DIAMETER);
    }
    // Function to set cursor type
    function setCursor() {
        switch (cursorType) {
            case 'circular-white':
                // document.body.style.cursor = 'url(white-circular.png), auto';
                document.body.style.cursor = 'url(crosshair.png), auto';
                break;
            case 'circular-red':
                document.body.style.cursor = 'url(red-circular.png), auto';
                break;
            default:
                document.body.style.cursor = 'auto';
        }
    }
    let GAME_STATE = {
        NOT_STARTED: 0,
        INIT: 1,
        STARTED: 1,
        PAUSED: 2,
        ENDED: 3,
    };
    let state = {
        hitData: [],
        startTime: 0,
        timeLeft: 3,
        lastTargetTime: 0,
        missedClicks: 0,
        gameState: GAME_STATE.NOT_STARTED, // 0 - not started, 1 - started, 2 - paused, 3 - ended
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
            console.log("Generating with seed", seed);
            const gameRect = gameArea.getBoundingClientRect();
            const maxWidth = gameRect.width - TARGET_DIAMETER;
            const maxHeight= gameRect.height - TARGET_DIAMETER;
            x = random(seed) * maxWidth;
            y = random(seed + 1) * maxHeight;
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

    // function createTarget() {
    //     const target = document.createElement('div');
    //     target.className = 'target';
    //     const { x, y } = getRandomPosition(seed);
    //     const now = performance.now();

    //     state.startTime = now;
    //     state.lastTargetTime = performance.now();
    //     target.style.left = `${x}px`;
    //     target.style.top = `${y}px`;

    //     target.addEventListener('click', () => {
    //         const now = performance.now();
    //         latestHitTargetRect = target.getBoundingClientRect();
    //         const hitTime = now - state.lastTargetTime; // Correct order of subtraction
    //         // get all target children of gameArea
    //         const targets = gameArea.querySelectorAll('.target');
    //         // if there are no targets left, create a new one
    //         if (targets.length === 1) {
    //             createTarget();
    //         }
    //         gameArea.removeChild(target);
    //         score++;
    //         playSound('hit');
    //         let targetRec = target.getBoundingClientRect();
    //         let distance = getRectDistance(latestHitTargetRect, targetRec);
    //         state.hitData.push({
    //             x: targetRec.left,
    //             y: targetRec.top,
    //             time: hitTime,
    //             distance
    //         });
    //         state.lastTargetTime = now; // Update lastTargetTime for the next target
    //         hitCounter.textContent = `Hits: ${score}`;
    //         // hitCounter.textContent = `Hits: ${score} gameArea: ${gameArea.getBoundingClientRect().width}x${gameArea.getBoundingClientRect().height}`;
    //     });

    //     gameArea.appendChild(target);
    //     previousTarget = currentTarget;
    //     currentTarget = target;
    // }

    function createTarget(isInitial = false) {
        const target = document.createElement('div');
        target.className = 'target';

        const { x, y } = getRandomPosition(seed);

        target.style.left = `${x}px`;
        target.style.top = `${y}px`;
        target.style.width = `${TARGET_DIAMETER}px`;
        target.style.height = `${TARGET_DIAMETER}px`;
        if (isInitial) {
            // Set the initial target to be red and clickable
            target.style.backgroundColor = 'red';
            target.style.pointerEvents = 'auto';
            target.style.zIndex = '1000';
            target.style.opacity = 1.0;
            state.startTime = performance.now();
            state.lastTargetTime = state.startTime; // Initialize lastTargetTime

            target.addEventListener('click', () => handleHit(target));
        } else {
            // Grey target
            target.style.backgroundColor = 'grey';
            target.style.zIndex = '1';
            target.style.pointerEvents = 'none';
            target.style.opacity = NEXT_TARGET_OPACITY;
        }

        gameArea.appendChild(target);

        if (isInitial) {
            previousTarget = null;
            currentTarget = target;
        }

        return target;
    }

    function startTimer() {
        state.gameState = GAME_STATE.IN_PROGRESS;
        timeInterval = setInterval(() => {
            const currentTime = performance.now();
            state.timeLeft = Math.max(0, (state.endTime - currentTime) / 1000);
            timeCounter.textContent = `Time: ${state.timeLeft.toFixed(2)}`;
            if (state.timeLeft <= 0) {
                clearInterval(timeInterval);
                endGame();
            }
        }, 16); // Update roughly 60 times per second
    }

    function handleHit(target) {
        const now = performance.now();
        latestHitTargetRect = target.getBoundingClientRect();
        if(!state.endTime) {
            // Start the timer when the first target is clicked
            state.endTime = now + (gameLength * 1000); // Set the endTime based on the game length
            startTimer();
        }
        const hitTime = now - state.lastTargetTime; // Correct order of subtraction

        // Play hit sound and update score
        playSound('hit');
        score++;
        hitCounter.textContent = `Hits: ${score}`;

        // Calculate the distance to the previous target
        let targetRec = target.getBoundingClientRect();
        // let distance = getRectDistance(latestHitTargetRect, targetRec);
        // let distance = getRectDistance(previousTarget.getBoundingClientRect(), currentTarget.getBoundingClientRect());
        // console.log(upcomingDistance);
        // Record the hit data
        state.hitData.push({
            x: targetRec.left,
            y: targetRec.top,
            time: hitTime,
            distance: parseFloat(upcomingDistance),
        });

        state.lastTargetTime = now; // Update lastTargetTime for the next target

        // Remove the clicked target
        gameArea.removeChild(target);

        // Turn the grey target red and make it clickable
        const greyTarget = currentTarget;
        greyTarget.style.backgroundColor = 'red';
        greyTarget.style.zIndex = '1000';
        greyTarget.style.pointerEvents = 'auto'; // Allow clicking
        greyTarget.style.opacity = 1.0;
        greyTarget.removeEventListener('click', () => { }); // Remove previous listener if any
        greyTarget.addEventListener('click', () => handleHit(greyTarget));

        // Create a new grey target
        const newGreyTarget = createTarget();

        // Update the targets
        previousTarget = greyTarget;
        currentTarget = newGreyTarget;

        // Draw the connecting line and label
        drawLineAndLabel(previousTarget, currentTarget);
    }

    function drawLineAndLabel(redTarget, greyTarget) {
        const line = document.getElementById('line') || document.createElement('div');
        line.id = 'line';
        line.style.position = 'absolute';
        line.style.borderTop = '2px dotted yellow';
        line.style.transformOrigin = '0 0';

        const redRect = redTarget.getBoundingClientRect();
        const greyRect = greyTarget.getBoundingClientRect();

        const x1 = redRect.left + redRect.width / 2;
        const y1 = redRect.top + redRect.height / 2;
        const x2 = greyRect.left + greyRect.width / 2;
        const y2 = greyRect.top + greyRect.height / 2;

        const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2).toFixed(2);
        upcomingDistance = distance;
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
        const length = distance;

        line.style.width = `${length}px`;
        line.style.left = `${x1}px`;
        line.style.top = `${y1}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.opacity = NEXT_TARGET_OPACITY;

        const label = document.getElementById('distance-label') || document.createElement('div');
        label.id = 'distance-label';
        label.style.position = 'absolute';
        label.style.left = `${(x1 + x2) / 2}px`;
        label.style.top = `${(y1 + y2) / 2}px`;
        label.style.backgroundColor = 'grey';
        // set opacity to 0.5
        label.style.opacity = NEXT_TARGET_OPACITY;
        label.style.padding = '2px 5px';
        label.style.borderRadius = '3px';
        label.textContent = `${distance} px`;

        if (!document.getElementById('line')) {
            gameArea.appendChild(line);
        }
        if (!document.getElementById('distance-label')) {
            gameArea.appendChild(label);
        }
    }

    // Add a function call to `startGame` wherever necessary in your code.

    function playSound(type) {
        const audio = new Audio(type === 'hit' ? 'audio/hit.wav' : 'audio/miss.wav');
        audio.play();
    }

    function startGame() {
        state.gameState = GAME_STATE.INIT;
        calculateUnit();
        seed = parseInt(document.getElementById('map-select').value, 10);
        console.log("Started game with seed", seed);
        cursorType = document.getElementById('cursor-select').value;
        RADIUS_UNIT_LENGTH = parseFloat(document.getElementById('circle-radius').value);

        // Save settings to local storage
        localStorage.setItem('seed', seed);
        localStorage.setItem('cursorType', cursorType);
        localStorage.setItem('RADIUS_UNIT_LENGTH', RADIUS_UNIT_LENGTH);

        // Set cursor type
        setCursor();

        // Hide modal and start game
        document.getElementById('pre-game-modal').style.display = 'none';
        seed = parseInt(seedInput.value, 10);
        score = 0;
        state.missedClicks = 0;
        state.hitData = [];
        state.startTime = performance.now();
        state.timeLeft = gameLength;
        state.lastTargetTime = 0; // Reset lastTargetTime
        state.endTime = 0; // Set endTime to 0 to indicate the timer hasn't started yet

        result.style.display = 'none';
        preGameModal.style.display = 'none';
        pauseMessage.style.display = 'none';

        timeCounter.style.display = 'block';
        timeCounter.textContent = `Time: [Starts after 1st target]`;
        hitCounter.textContent = `Hits: 0`;


        // Create the initial red and grey targets
        const initialRedTarget = createTarget(true);
        currentTarget = createTarget();

        // Draw the connecting line and label
        drawLineAndLabel(initialRedTarget, currentTarget);

        previousTarget = initialRedTarget;

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
        const gameRect = gameArea.getBoundingClientRect();
        // Get the screen width and height in pixels
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const devicePixelRatio = window.devicePixelRatio;
        statsContent.innerHTML = `
            <h2>Score</h2>
            <p>${totalTargets} targets</p>
            <h2>${targetsPerMinute.toFixed(2)} TPM (Targets Per Minute)</h2>
            <p>------------------------</p>
            <p>Accuracy: ${accuracy}% (${totalTargets} hits, ${state.missedClicks} misses)</p>
            <p>Total Game Length: ${gameLength} seconds</p>
            <p>Screen Resolution: ${screenWidth}px x ${screenHeight}px @${devicePixelRatio}x</p>
            <p>1 Unit = ${unit.toFixed(2)}px</p>
            <p>Target Diameter: ${RADIUS_UNIT_LENGTH*2} units, ${(TARGET_DIAMETER).toFixed(2)}px</p>
            <p>Game Area: ${gameRect.width}px x ${gameRect.height}px</p>
            <p>Window Area: ${window.innerWidth}px x ${window.innerHeight}px</p>
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
        state.gameState = GAME_STATE.ENDED; // Game has ended
        gameArea.innerHTML = '';
        gameInFullscreen = false;
        timeCounter.style.display = 'none';
        preGameModal.style.display = 'flex';
        result.style.display = 'block';
        result.textContent = `You clicked ${score} targets!`;
        if (shouldShowStats) {
            setTimeout(showStats(), 100);
        } else {
            preGameModal.style.display = 'flex';
        }
    }
    document.addEventListener('DOMContentLoaded', () => {
        calculateUnit();
        preGameModal.style.display = 'flex';
    });
    // Update circle radius display
    document.getElementById('circle-radius').addEventListener('input', (e) => {
        RADIUS_UNIT_LENGTH = e.target.value;
        document.getElementById('radius-value').textContent = RADIUS_UNIT_LENGTH;
    });


    function requestFullscreen() {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) { // Firefox
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) { // Safari, Chrome, Opera
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { // IE/Edge
            element.msRequestFullscreen();
        } else {
            console.log("Fullscreen API is not supported by this browser.");
        }
    }

    function checkFullscreen() {
        // if(!gameInFullscreen) return;
        if (document.fullscreenElement) {
            // Yes Full Screen
            if (state.gameState === GAME_STATE.PAUSED) {
                resumeGame();
            }
        } else {
            // No Full Screen
            if(state.gameState === GAME_STATE.IN_PROGRESS) {
                pauseGame();
            }
            pauseGame();
        }
    }

    function pauseGame() {
        if(!state.gameState === GAME_STATE.IN_PROGRESS) {
            return;
        }
        clearInterval(timeInterval);
        state.gameState = GAME_STATE.PAUSED;
        pauseMessage.style.display = 'block';
    }

    function resumeGame() {
        if (!state.gameState === GAME_STATE.PAUSED) {
            return;
        }
        state.gameState = GAME_STATE.IN_PROGRESS;
        pauseMessage.style.display = 'none';
        startTimer();
    }

    // restartBtn.addEventListener('click', () => {
    //     latestHitTargetRect = restartBtn.getBoundingClientRect();
    //     startGame();
    // });

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

    let cursorX = 0;
    let cursorY = 0;

    // Track cursor position
    document.addEventListener('mousemove', (event) => {
        cursorX = event.clientX;
        cursorY = event.clientY;
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'z' || event.key === 'x') {
            // Create a new click event
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: cursorX,
                clientY: cursorY
            });

            // Dispatch the event to the element under the cursor
            const elementAtCursor = document.elementFromPoint(cursorX, cursorY);
            if (elementAtCursor) {
                elementAtCursor.dispatchEvent(clickEvent);
            }
        }
        // pause the game on escape key
        if (event.key == 'Escape') {
            pauseGame();
        }
    });

    // Initial state is the end screen
    endGame(false);

    // Start game button click event
    startGameButton.addEventListener('click', () => {
        gameInFullscreen = fullscreenCheckbox.checked;
        if (fullscreenCheckbox.checked && !document.fullscreenElement) {
            requestFullscreen();
        }
        startGame();
    });

    resumeButton.addEventListener('click', () => {
        if (gameInFullscreen) {
            requestFullscreen();
        }
        resumeGame();
    });

const retryButton = document.getElementById('retry-btn');
const nextMapButton = document.getElementById('next-map-btn');
const configureButton = document.getElementById('configure-btn');

// retryButton.addEventListener('click', () => {
//     // Start the game again with the same map
//     startGame();
// });

// nextMapButton.addEventListener('click', () => {
//     // Increment the map seed and start the game
//     seed++;
//     document.getElementById('map-select').value = seed;
//     startGame();
// });

// configureButton.addEventListener('click', () => {
//     // Close the stats modal and show the pre-game modal
//     statsModal.style.display = 'none';
//     preGameModal.style.display = 'flex';
// });
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const commandElement = document.getElementById('command');
const userGestureElement = document.getElementById('user-gesture');
const approvalMessageElement = document.getElementById('approval-message');
const gestureImageElement = document.getElementById('gesture-image');
// const timesUpMessageElement = document.getElementById('times-up-message');

const gestures = [{
    name: 'Thumbs Up',
    image: 'Images/thumb_UP.jpg'
},
// {
//     name: 'Thumbs Down',
//     image: 'Images/Thumb_Down.jpg'
// },
{
    name: 'Closed Fist',
    image: 'Images/close_fist.jpg'
},
{
    name: 'Open Hand',
    image: 'Images/Open_Hand.jpg'
},
{
    name: 'Index Finger',
    image: 'Images/index_fingur.jpg'
},
{
    name: 'Two Fingers',
    image: 'Images/2_Fingur.jpg'
},
{
    name: 'Three Fingers',
    image: 'Images/3_Fingur.png'
}

];

let currentGesture = '';
let approvalTimeout = null;
let gestureMatchStartTime = null;
let timesUpTimeout = null;
const requiredHoldTime = 2000;

navigator.mediaDevices.getUserMedia({
    video: true
})
    .then((stream) => {
        videoElement.srcObject = stream;
        videoElement.addEventListener('loadedmetadata', () => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        });
    });

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.3,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({
            image: videoElement
        });
    },
    width: 640,
    height: 480
});
camera.start();

function onResults(results) {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        let gestureDetected = false;

        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 5
            });
            drawLandmarks(canvasCtx, landmarks, {
                color: '#FF0000',
                lineWidth: 2
            });

            const gesture = recognizeGesture(landmarks);
            if (gesture !== 'Unknown') {
                userGestureElement.textContent = `User Gesture: ${gesture}`;
                gestureDetected = true;

                if (currentGesture !== '' && gesture === currentGesture) {
                    if (gestureMatchStartTime === null) {
                        gestureMatchStartTime = Date.now();
                        startApprovalTimer();
                    }
                } else {
                    gestureMatchStartTime = null;
                    resetApprovalTimer();
                }
            }
        }

        if (!gestureDetected) {
            userGestureElement.textContent = 'User Gesture: None';
        }
    } else {
        userGestureElement.textContent = 'User Gesture: None';
        resetApprovalTimer();
    }

    if (currentGesture === '') {
        setTimeout(() => {
            const randomGesture = getRandomGesture();
            currentGesture = randomGesture.name;
            commandElement.textContent = `Command: ${currentGesture}`;
            gestureImageElement.src = randomGesture.image;
            approvalMessageElement.textContent = '';

            gestureMatchStartTime = null;
            resetApprovalTimer();
            startTimesUpTimer();
        }, 1000);
    }
}

function recognizeGesture(landmarks) {
    const thumbCMC = landmarks[1];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const thumbMCP = landmarks[2];
    const indexMCP = landmarks[5];
    const thumbIP = landmarks[3];
    const indexPIP = landmarks[6];
    const middlePIP = landmarks[10];
    const ringPIP = landmarks[14];
    const pinkyPIP = landmarks[18];
    const pinkyMCP = landmarks[17];
    const ringMCP = landmarks[13];
    const middleMCP = landmarks[9];


    const thumbIsUp = (thumbTip.y < indexTip.y) && (thumbIP.x < thumbTip.x) && (thumbIP.y > thumbTip.y);
    // const thumbIsDown = thumbTip.y > thumbMCP.y && thumbTip.y > thumbCMC.y && thumbTip.x < indexMCP.x;
    const fingersAreExtended = (indexTip.y < indexPIP.y) && (middleTip.y < middlePIP.y) && (ringTip.y < ringPIP.y) && (pinkyTip.y < pinkyPIP.y);
    const fingersAreClosed = (indexTip.y > indexPIP.y) && (middleTip.y > middlePIP.y) && (ringTip.y > ringPIP.y) && (pinkyTip.y > pinkyPIP.y);
    const indexFingerExtended = (indexTip.y < indexPIP.y) && (middleTip.x > middlePIP.x) && (ringTip.x > ringPIP.x) && (pinkyTip.y > pinkyPIP.y);
    const twoFingersExtended = (indexTip.y < indexPIP.y) && (middleTip.y < middlePIP.y) && (ringTip.y > ringPIP.y) && (pinkyTip.y > pinkyPIP.y);
    const threeFingersExtended = (indexTip.y < indexPIP.y) && (middleTip.y < middlePIP.y) && (ringTip.y < ringPIP.y) && (pinkyTip.y > pinkyPIP.y);

    if (thumbIsUp) {
        return 'Thumbs Up';
    }

    // if (thumbIsDown) {
    //     return 'Thumbs Down';
    // }

    if (fingersAreExtended) {
        return 'Open Hand';
    }

    if (fingersAreClosed) {
        return 'Closed Fist';
    }

    if (twoFingersExtended) {
        return 'Two Fingers';
    }

    if (threeFingersExtended) {
        return 'Three Fingers';
    }

    if (indexFingerExtended) {
        return 'Index Finger';
    }

    return 'Unknown';



}

function getRandomGesture() {
    const randomIndex = Math.floor(Math.random() * gestures.length);
    return gestures[randomIndex];
}

function startApprovalTimer() {
    approvalTimeout = setInterval(() => {
        if (Date.now() - gestureMatchStartTime >= requiredHoldTime) {
            document.getElementById("approval-message").textContent = 'User Approved!';
            document.getElementById("approval-message").style.color = "green";
            currentGesture = ''; // Reset current gesture after approval
            clearInterval(approvalTimeout);
            stopProgram();
        }
    }, 100);
}

function resetApprovalTimer() {
    clearInterval(approvalTimeout);
}

function startTimesUpTimer() {
    clearTimeout(timesUpTimeout);
    timesUpTimeout = setTimeout(() => {
        stopProgram();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        commandElement.textContent = 'Command: None';
        userGestureElement.textContent = 'User Gesture: None';
        approvalMessageElement.textContent = '';

        document.getElementById("approval-message").textContent = 'User Failed to follow the command!';
        document.getElementById("approval-message").style.color = "red";
        currentGesture = '';
    }, 111111000);
}

function stopProgram() {
    hands.close();
    camera.stop();
    var tracks = videoElement.srcObject.getTracks();
    tracks.forEach(track => track.stop());
}

document.getElementById('reset').addEventListener('click', function () {
    location.reload();
});
document.getElementById('back').addEventListener('click', function () {
    window.history.back();
});
const attemptPercentageElement = document.getElementById('attempt-percentage');

function onResults(results) {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    let attemptPercentage = 100;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        let gestureDetected = false;
        attemptPercentage = 100; // If the hand is detected, set attempt to 50%

        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 5
            });
            drawLandmarks(canvasCtx, landmarks, {
                color: '#FF0000',
                lineWidth: 2
            });

            const gesture = recognizeGesture(landmarks);
            if (gesture !== 'Unknown') {
                userGestureElement.textContent = `User Gesture: ${gesture}`;
                gestureDetected = true;

                if (currentGesture !== '' && gesture === currentGesture) {
                    attemptPercentage = 0; // If the gesture matches the command, set attempt to 100%
                    if (gestureMatchStartTime === null) {
                        gestureMatchStartTime = Date.now();
                        startApprovalTimer();
                    }
                } else {
                    gestureMatchStartTime = null;
                    resetApprovalTimer();
                }
            }
        }

        if (!gestureDetected) {
            userGestureElement.textContent = 'User Gesture: None';
        }
    } else {
        userGestureElement.textContent = 'User Gesture: None';
        resetApprovalTimer();
    }

    // Update attempt percentage
    attemptPercentageElement.textContent = `Attempt Percentage: ${attemptPercentage}%`;

    if (currentGesture === '') {
        setTimeout(() => {
            const randomGesture = getRandomGesture();
            currentGesture = randomGesture.name;
            commandElement.textContent = `Command: ${currentGesture}`;
            gestureImageElement.src = randomGesture.image;
            approvalMessageElement.textContent = '';

            gestureMatchStartTime = null;
            resetApprovalTimer();
            startTimesUpTimer();
        }, 1000);
    }
}


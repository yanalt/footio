let io = require('socket.io-client');
let Canvas = require('./canvas');
let global = require('./global');



//let playerNameInput = document.getElementById('playerNameInput');
let socket;
let reason;
let currentFrame = 0;
let comArr = [];
let adArr = [];
let comIndex = 0;
let adIndex = 0;
let characterSprites = [];
let characterAmount = 999;
let ballSprites = [];
let currentBallSprite = 0;
let disconnected = false;

function prepCharacterSprites() {
    for (let i = 0; i <= characterAmount; i++) {
        characterSprites[i] = new Image();
    }
}

function loadCharacterSprites(sprite) {
    if (!sprite) 
        characterSprites[0].src = "/img/0.png";
    else if (characterSprites[sprite] && characterSprites[sprite].src == "") 
        characterSprites[sprite].src = "/img/" + sprite + ".png";
    }

function loadBallSprites() {
    for (let i = 0; i <= 7; i++) {
        ballSprites[i] = new Image();
        ballSprites[i].src = "/img/ball_" + i + ".png";
    }
}

let debug = function (args) {
    if (console && console.log) {
        console.log(args);
    }
};

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
    global.usingMobileVersion = true;
} else {
    global.usingMobileVersion = false;
}

function initCommercialImages() {
    for (let i = 0; i < global.commercialCount; i++) {
        comArr[i] = new Image();
        comArr[i].src = "/img/commercials/" + i + ".png";
    }
    for (let i = 8; i < 8+ global.adCount; i++) {
        comArr[i] = new Image();
        comArr[i].src = "/img/commercials/" + i + ".png";
    }
}

function emojiAlignment(resizing) {
    let element;
    if (global.usingMobileVersion && !resizing) {
        element = document.getElementById('poopyNum');
        element
            .parentNode
            .removeChild(element);
        element = document.getElementById('fingerNum');
        element
            .parentNode
            .removeChild(element);
        element = document.getElementById('xdNum');
        element
            .parentNode
            .removeChild(element);
        element = document.getElementById('hmmmNum');
        element
            .parentNode
            .removeChild(element);
        element = document.getElementById('angryNum');
        element
            .parentNode
            .removeChild(element);
    }
    if (!global.usingMobileVersion && element != null) {
        element = document.getElementById('fullscreen');
        element
            .parentNode
            .removeChild(element);
    }
    // if (global.buttonAlignment == 'left') {
    // document.getElementById('smiley').style.left = (global.screenWidth - 40) +
    // 'px';     document.getElementById('poopy').style.left = (global.screenWidth -
    // 40) + 'px';     document.getElementById('finger').style.left =
    // (global.screenWidth - 40) + 'px'; document.getElementById('xd').style.left =
    // (global.screenWidth - 40) + 'px'; document.getElementById('hmmm').style.left
    // = (global.screenWidth - 40) + 'px';
    // document.getElementById('angry').style.left = (global.screenWidth - 40) +
    // 'px'; }
}

function startGame() {
    prepCharacterSprites();
    loadBallSprites();
    initCommercialImages();
    //window.alert(window.innerWidth+"x"+window.innerHeight);
    global.playerName = "";
    //global.playerType = type;
    global.screenWidth = window.innerWidth;
    global.screenHeight = window.innerHeight;
    if (window.innerWidth <= 1024) {
        let viewport = document.querySelector("meta[name=viewport]");
        let iscale = global.screenWidth / 1024;
        window.canvas.cv.width = 1024;
        //window.alert(window.canvas.cv.width);
        viewport.setAttribute('content', 'width=device-width, initial-scale=' + iscale + ', maximum-scale=1.0, user-scalable=0');
    } else {
        //window.alert("ok");
    }
    emojiAlignment(false);

    //document.getElementById('startMenuWrapper').style.maxHeight = '0px';
    document
        .getElementById('gameAreaWrapper')
        .style
        .opacity = 1;
    if (!socket) {
        socket = io({query: "type=player"});
        setupSocket(socket);
    }
    if (!global.animLoopHandle) {
        animloop();
    }
    socket.emit('respawn');
    window.canvas.socket = socket;
    global.socket = socket;
}

window.onload = function () {
    startGame();
};

let playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

let player = {
    id: -1,
    screenWidth: global.screenWidth,
    screenHeight: global.screenHeight,
    target: {
        x: global.screenWidth / 2,
        y: global.screenHeight / 2
    }
};
global.player = player;

let goalkeepers = [];
goalkeepers[0] = {
    position: {
        x: 0,
        y: 0
    }
};
goalkeepers[1] = {
    position: {
        x: 0,
        y: 0
    }
};
let users = [];
let score = {
    blue: 0,
    red: 0
};

let usersExpanded = [];
let ball = {

    id: null,
    target: {
        x: 0,
        y: 0
    },
    x: 0,
    y: 0,
    frame: 0,
    speed: 1,
    ballsprite: 0
};

let target = {
    x: global.screenWidth / 2,
    y: global.screenHeight / 2
};
global.target = target;

window.canvas = new Canvas();

let c = window.canvas.cv;
let graph = c.getContext('2d');

$('body').on('contextmenu', '#cvs', function (e) {
    return false;
});
$('body').on('contextmenu', '#kick', function (e) {
    return false;
});
$('body').on('contextmenu', '#emoji', function (e) {
    return false;
});

// socket stuff.
function setupSocket(socket) {
    // Handle ping.
    socket
        .on('pongcheck', function () {
            let latency = Date.now() - global.startPingTime;
            console.log('Latency: ' + latency + 'ms');
        });

    // Handle error.
    socket.on('connect_failed', function () {
        socket.close();
        global.disconnected = true;
    });

    socket.on('disconnect', function () {
        socket.close();
        global.disconnected = true;
    });

    // Handle connection.
    socket.on('welcome', function (playerSettings) {
        player = playerSettings;
        player.name = global.playerName;
        player.screenWidth = global.screenWidth;
        player.screenHeight = global.screenHeight;
        player.target = window.canvas.target;
        let searchParams = new URLSearchParams(window.location.search);
        if (searchParams != null && searchParams != undefined && searchParams != "undefined" && searchParams != "") {
            player.conf = searchParams.get('conf');
            player.name = searchParams.get('name');
        } else {
            player.conf = "";
            player.name = "";
        }
        if (player.name == "null" || player.name == null) {
            player.name = "";
        }
        global.player = player;
        socket.emit('gotit', player);
        global.gameStart = true;
        c.focus();
    });

    socket.on('gameSetup', function (data) {
        global.gameWidth = data.gameWidth;
        global.gameHeight = data.gameHeight;
        global.goalWidth = data.goalWidth;
        global.goalkeeperRadius = data.goalkeeperRadius;
        resize();
    });

    // Handle movement.
    socket.on('3', function (userData, serverBall, serverGoalkeepers) {
        let playerData;
        for (let i = 0; i < userData.length; i++) {
            if (typeof(userData[i].id) == "undefined") {
                playerData = userData[i];
                i = userData.length;
            }
        }
        player.xoffset = player.x - playerData.x;
        player.yoffset = player.y - playerData.y;

        player.x = playerData.x;
        player.y = playerData.y;
        player.xoffset = isNaN(player.xoffset)
            ? 0
            : player.xoffset;
        player.yoffset = isNaN(player.yoffset)
            ? 0
            : player.yoffset;

        users = userData;
        ball = serverBall;
        goalkeepers = serverGoalkeepers;
    });

    //slower socket for non-movement information

    socket.on('4', function (serverScore, serverUsers, ballsprite) {
        if (serverScore) {
            score = serverScore;
        }
        usersExpanded = serverUsers;
        usersExpanded.forEach(u => {
            loadCharacterSprites(u.skinsprite);
        });
        if(ballsprite && ballsprite != 0 && currentBallSprite != ballsprite)
            currentBallSprite = ballsprite;
    });

    socket.on('kick', function (data) {
        global.gameStart = false;
        reason = data;
        global.kicked = true;
        socket.close();
    });

    socket.on('goal', function (data) {
        let soundId = "goal" + (Math.floor(Math.random() * (4 - 1)) + 1);
        // console.log(soundId);
        document
            .getElementById(soundId)
            .volume = 0.01;
        document
            .getElementById(soundId)
            .play();
    });

}

function drawCircle(centerX, centerY, radius, sides) {
    let theta = 0;
    let x = 0;
    let y = 0;

    graph.beginPath();

    for (let i = 0; i < sides; i++) {
        theta = (i / sides) * 2 * Math.PI;
        x = centerX + radius * Math.sin(theta);
        y = centerY + radius * Math.cos(theta);
        graph.lineTo(x, y);
    }

    graph.closePath();
    graph.stroke();
    graph.fill();
}

function drawCommercials() {
    try{
        let comDiv = 8;
        let comHeight = 70;
        for (let i = 0; i < comDiv; i++) {
            let x = global.screenWidth / 2 - player.x + i * global.gameWidth / comDiv;
            let y = global.screenHeight / 2 - player.y - comHeight;
            graph.drawImage(comArr[comIndex + i % 2], x, y, global.gameWidth / comDiv, comHeight);
        }

        for (let i = 0; i < comDiv; i++) {
            let a = global.screenWidth / 2 - player.x + i * global.gameWidth / comDiv;
            let b = global.gameHeight + global.screenHeight / 2 - player.y;
            graph.drawImage(comArr[comIndex + i % 2], a, b, global.gameWidth / comDiv, comHeight);
        }
    } catch(e) {
        console.log(comIndex);
        console.log(e);
    }
}

function drawOverlayAdForMobile(){
    try{
        let width = global.screenWidth/3;
        let height = width/3.75;

        if(width > 600){
            width = 600;
            height = 160;
        }

        if(global.overlayAdWidth == 0){
            global.overlayAdWidth = width;
            global.overlayAdHeight = height;
        }

        graph.drawImage(comArr[8 + adIndex], global.screenWidth/2 - width/2, 0, width, height);
    } catch(e) {
        console.log(e);
    }
}

function drawBall(ball) {
    graph.strokeStyle = 'hsl(120, 0%, 70%)';
    graph.fillStyle = 'hsl(120, 0%, 75%)';
    graph.lineWidth = playerConfig.border + 10;
    drawCircle(ball.x - player.x + global.screenWidth / 2, ball.y - player.y + global.screenHeight / 2, 10 - 5, 18 + (~~ (10 / 5)));
    // let character = new Image(); character.src = "/img/ball" +
    // (Math.floor(ball.frame / 10) % 10) + ".png";
    let ballX = ball.x - player.x + global.screenWidth / 2;
    let ballY = ball.y - player.y + global.screenHeight / 2;
    // graph.drawImage(character, ballX - 15, ballY - 15, 30, 30);
    // console.log(ball.frame);
    if (!ball.frame) 
        ball.frame = 0;
    let width = 124;
    srcX = (Math.floor(ball.frame / 10) % 10) *  width;
    srcY = 0;
    
    graph.drawImage(ballSprites[currentBallSprite],srcX,srcY,  124, 126,ballX - 15, ballY - 15,  30, 30);
}

function drawGoalkeeper(goalkeepers) {
    // graph.strokeStyle = 'hsl(220, 40%, 45%)'; graph.fillStyle = 'hsl(220, 40%,
    // 50%)'; graph.lineWidth = playerConfig.border + 10;
    let fontSize = 80;
    // let handDist = 0;
    let x = goalkeepers[0].position.x - player.x + global.screenWidth / 2;
    let y = goalkeepers[0].position.y - player.y + global.screenHeight / 2;
    // drawCircle(x, y, global.goalkeeperRadius, 18);

    graph.fillStyle = playerConfig.textColor;
    graph.font = 'bold ' + fontSize + 'px arial';

    // graph.strokeText("????????????", x - handDist, y);
    graph.fillText("????", x - 60, y - 20);
    graph.scale(-1, 1);
    graph.fillText("????", -60 - x, y - 20);
    graph.scale(-1, 1);
    graph.fillText("????", x, y);

    x = goalkeepers[1].position.x - player.x + global.screenWidth / 2;
    y = goalkeepers[1].position.y - player.y + global.screenHeight / 2;

    // graph.strokeStyle = 'hsl(0, 100%, 45%)'; graph.fillStyle = 'hsl(0, 100%,
    // 50%)'; graph.lineWidth = playerConfig.border + 10; drawCircle(x, y,
    // global.goalkeeperRadius, 18); graph.strokeText("????????????", x - handDist, y);
    // graph.fillText("????????????", x - handDist, y);
    graph.fillText("????", x - 60, y - 20);
    graph.scale(-1, 1);
    graph.fillText("????", -60 - x, y - 20);
    graph.scale(-1, 1);
    graph.fillText("????", x, y);
}

function drawGoalDirection(team) {
    graph.lineWidth = playerConfig.textBorderSize;
    graph.fillStyle = 'Black';
    graph.strokeStyle = playerConfig.textBorder;
    graph.miterLimit = 1;
    graph.lineJoin = 'round';
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    graph.font = 'bold ' + 14 + 'px arial';
    let distance;
    let emojiDeltaX;
    let emojiDeltaY;
    if (team == 1) {
        distance = Math.sqrt(Math.pow(player.x, 2) + Math.pow((player.y - global.screenHeight / 2), 2)); //only towards left
        emojiDeltaX = (0 - player.x * 60) / distance;
        emojiDeltaY = ((global.gameHeight / 2 - player.y) * 60) / distance;
    } else if (team == 0) {
        distance = Math.sqrt(Math.pow(global.gameWidth - player.x, 2) + Math.pow((player.y - global.screenHeight / 2), 2)); //only towards right
        emojiDeltaX = ((global.gameWidth - player.x) * 60) / distance;
        emojiDeltaY = ((global.gameHeight / 2 - player.y) * 60) / distance;
    }
    if (emojiDeltaX > 60) 
        emojiDeltaX = 60;
    if (emojiDeltaX < -60) 
        emojiDeltaX = -60;
    if (emojiDeltaY > 60) 
        emojiDeltaY = 60;
    if (emojiDeltaY < -60) 
        emojiDeltaY = -60;
    graph.fillText('????', global.screenWidth / 2 + emojiDeltaX, global.screenHeight / 2 + emojiDeltaY);
}

function drawBallDirection() {
    if (player.x >= ball.x - 10 && player.x <= ball.x + 10 && player.y >= ball.y - 10 && player.y <= ball.y + 10) {
        return;
    } else {
        let distance = Math.sqrt(Math.pow(ball.x - player.x, 2) + Math.pow(ball.y - player.y, 2)); //only towards left
        graph.lineWidth = playerConfig.textBorderSize;
        graph.fillStyle = 'Black';
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = 'round';
        graph.textAlign = 'center';
        graph.textBaseline = 'middle';
        graph.font = 'bold ' + 14 + 'px arial';
        graph.fillText('???', global.screenWidth / 2 + (ball.x - player.x) * 60 / distance, global.screenHeight / 2 + (ball.y - player.y) * 60 / distance);
    }
}

function drawScore(score) {
    graph.lineWidth = playerConfig.textBorderSize;
    graph.fillStyle = playerConfig.textColor;
    graph.strokeStyle = playerConfig.textBorder;
    graph.miterLimit = 1;
    graph.lineJoin = 'round';
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    graph.font = 'bold ' + 14 + 'px sans-serif';
    graph.strokeText('BLUE ' + score.blue + ' : ' + score.red + ' RED', 100, 50);
    graph.fillText('BLUE ' + score.blue + ' : ' + score.red + ' RED', 100, 50);
}

function drawButton() {

    let buttonSize = window.canvas.cv.width / 12;

    graph.strokeStyle = 'hsl(280, 100%, 45%, 0)';
    graph.fillStyle = 'hsla(280, 0%, 50%, 0.4)';
    graph.lineWidth = playerConfig.border + 10;
    drawCircle(global.screenWidth - buttonSize, global.screenHeight - buttonSize, buttonSize, 50);
    // drawCircle(global.screenWidth / 2, global.screenHeight - buttonSize,
    // buttonSize, 50);
    drawCircle(global.screenWidth - 3 * buttonSize - 10, global.screenHeight - buttonSize, buttonSize, 50);
    drawCircle(buttonSize, global.screenHeight - buttonSize, buttonSize, 50);
    let fontSize = Math.max(40 / 3, 12);
    graph.lineWidth = playerConfig.textBorderSize;
    graph.fillStyle = playerConfig.textColor;
    graph.strokeStyle = playerConfig.textBorder;
    graph.miterLimit = 1;
    graph.lineJoin = 'round';
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    fontSize = 36;
    graph.font = 'bold ' + fontSize + 'px arial';
    if (global.buttonAlignment == 'right') {
        graph.strokeText("???", global.screenWidth - buttonSize, global.screenHeight - buttonSize);
        graph.fillText("???", global.screenWidth - buttonSize, global.screenHeight - buttonSize);
        graph.strokeText("????", buttonSize, global.screenHeight - buttonSize);
        graph.fillText("????", buttonSize, global.screenHeight - buttonSize);
    } else {
        graph.strokeText("???", buttonSize, global.screenHeight - buttonSize);
        graph.fillText("???", buttonSize, global.screenHeight - buttonSize);
        graph.strokeText("????", global.screenWidth - buttonSize, global.screenHeight - buttonSize);
        graph.fillText("???????", global.screenWidth - buttonSize, global.screenHeight - buttonSize);
    }
    graph.strokeText("????", global.screenWidth - 3 * buttonSize - 10, global.screenHeight - buttonSize);
    graph.fillText("????", global.screenWidth - 3 * buttonSize - 10, global.screenHeight - buttonSize);
    fontSize = Math.max(40 / 3, 12);
    graph.font = 'bold ' + fontSize + 'px sans-serif';
}

function drawPlayers() {
    // console.log(c);
    let start = {
        x: player.x - (global.screenWidth / 2),
        y: player.y - (global.screenHeight / 2)
    };
    for (let z = 0; z < users.length; z++) {
        let userCurrent = users[z];
        //console.log(userCurrent.frame);
        let x = 0;
        let y = 0;
        let cellCurrent = userCurrent;
        for (let i = 0; i < usersExpanded.length; i++) {
            if (usersExpanded[i].id == userCurrent.id || usersExpanded[i].id == userCurrent.idz) {
                // console.log(usersExpanded[i]);
                cellCurrent = usersExpanded[i];
                break;
            }
        }
        if (player.x == userCurrent.x && player.y == userCurrent.y) 
            drawGoalDirection(cellCurrent.team);
        
        let points = 30 + ~~ (30 / 5);
        let increase = Math.PI * 2 / points;
        if (cellCurrent.hue != undefined) {
            graph.strokeStyle = 'hsl(' + cellCurrent.hue + ', 40%, 45%)';
            graph.fillStyle = 'hsl(' + cellCurrent.hue + ', 40%, 50%)';
        } else {
            graph.strokeStyle = 'hsl(290, 40%, 45%)';
            graph.fillStyle = 'hsl(290, 40%, 50%)';
        }
        graph.lineWidth = playerConfig.border;

        let xstore = [];
        let ystore = [];

        global.spin += 0.0;

        let circle = {
            x: userCurrent.x - start.x,
            y: userCurrent.y - start.y
        };

        for (let i = 0; i < points; i++) {

            x = 28 * Math.cos(global.spin) + circle.x;
            y = 28 * Math.sin(global.spin) + circle.y;
            if (typeof(userCurrent.id) == "undefined") {
                x = valueInRange(-userCurrent.x + global.screenWidth / 2, global.gameWidth - userCurrent.x + global.screenWidth / 2, x);
                y = valueInRange(-userCurrent.y + global.screenHeight / 2, global.gameHeight - userCurrent.y + global.screenHeight / 2, y);
            } else {
                x = valueInRange(-userCurrent.x - player.x + global.screenWidth / 2 + (40 / 3), global.gameWidth - userCurrent.x + global.gameWidth - player.x + global.screenWidth / 2 - (40 / 3), x);
                y = valueInRange(-userCurrent.y - player.y + global.screenHeight / 2 + (40 / 3), global.gameHeight - userCurrent.y + global.gameHeight - player.y + global.screenHeight / 2 - (40 / 3), y);
            }
            global.spin += increase;
            xstore[i] = x;
            ystore[i] = y;
        }
        for (let i = 0; i < points; ++i) {
            if (i === 0) {
                graph.beginPath();
                graph.moveTo(xstore[i], ystore[i]);
            } else if (i > 0 && i < points - 1) {
                graph.lineTo(xstore[i], ystore[i]);
            } else {
                graph.lineTo(xstore[i], ystore[i]);
                graph.lineTo(xstore[0], ystore[0]);
            }

        }
        graph.lineJoin = 'round';
        graph.lineCap = 'round';
        //graph.fill();
        graph.stroke();
        let nameCell = "";

        if (cellCurrent.name != undefined && cellCurrent.name != null) {
            nameCell = cellCurrent.name;
        } else {
            nameCell = "Loading...";
        }
        if (cellCurrent.name == null) {
            nameCell = "";
        }
        // nameCell = cellCurrent.id;
        let fontSize = 24;
        graph.lineWidth = playerConfig.textBorderSize;
        graph.fillStyle = 'Black';
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = 'round';
        graph.textAlign = 'center';
        graph.textBaseline = 'middle';
        graph.font = 'bold ' + fontSize + 'px arial';
        let emojiStr = "";
        if (cellCurrent.emoji != -1) {
            switch (cellCurrent.emoji) {
                case 0:
                    emojiStr = "????";
                    break;
                case 1:
                    emojiStr = "????";
                    break;
                case 2:
                    emojiStr = "????";
                    break;
                case 3:
                    emojiStr = "????";
                    break;
                case 4:
                    emojiStr = "????";
                    break;
            }
            //graph.strokeText(emojiStr, circle.x - 20, circle.y - 130);
            graph.fillText(emojiStr, circle.x - 20, circle.y - 130);
        }
        fontSize = 40 / 3;
        graph.fillStyle = playerConfig.textColor;
        graph.font = 'bold ' + fontSize + 'px sans-serif';

        graph.strokeText(nameCell, circle.x, circle.y);
        graph.fillText(nameCell, circle.x, circle.y);
        graph.font = 'bold ' + Math.max(fontSize / 3 * 2, 10) + 'px sans-serif';
        if (nameCell.length === 0) 
            fontSize = 0;

        let srcX;
        let srcY;

        let sheetWidth = 1440;
        let sheetHeight = 1600;

        let cols = 12;
        let rows = 8;

        let width = sheetWidth / cols;
        let height = sheetHeight / rows;

        srcX = (userCurrent.frame % 12) * width;
        srcY = Math.floor(userCurrent.frame / 12) * height;

        if (cellCurrent.skinsprite != null && cellCurrent.skinsprite != "") 
            graph.drawImage(characterSprites[cellCurrent.skinsprite], srcX, srcY, width, height, circle.x - 60, circle.y - 160, width, height);
        else 
            graph.drawImage(characterSprites[0], srcX, srcY, width, height, circle.x - 60, circle.y - 160, width, height);

            // let character = new Image(); if (cellCurrent.skinsprite != null &&
            // cellCurrent.skinsprite != "")     character.src = "/img/" +
            // cellCurrent.skinsprite + ".png"; else     character.src = "/img/0.png";
            // graph.drawImage(character, srcX, srcY, width, height, circle.x - 60, circle.y
            // - 190, width, height);
        }
    // //the following are to draw a line in the movement direction
    // graph.beginPath(); let deg = 0; let rad = 28; if (player.xoffset != 0) { deg
    // = Math.atan2(player.yoffset, player.xoffset); } else {     deg =
    // player.yoffset >= 0         ? Math.PI / 2         : 3 * Math.PI / 2; }
    // graph.moveTo(global.screenWidth / 2, global.screenHeight / 2);
    // graph.lineTo(global.screenWidth / 2 - rad * Math.cos(deg),
    // global.screenHeight / 2 - rad * Math.sin(deg)); graph.stroke();
}

function valueInRange(min, max, value) {
    return Math.min(max, Math.max(min, value));
}

function drawgoals() {
    graph.fillStyle = 'green';
    graph.fillRect(global.screenWidth / 2 - player.x - 100, (global.screenHeight / 2 - player.y) + (global.gameHeight / 2) - (global.goalWidth / 2), 100, global.goalWidth);
    graph.fillRect(global.gameWidth + global.screenWidth / 2 - player.x, (global.screenHeight / 2 - player.y) + (global.gameHeight / 2) - (global.goalWidth / 2), 100, global.goalWidth);
    graph.strokeStyle = '#FFFFFF';
    let rectTopLeft = {
        x: global.screenWidth / 2 - player.x - 100,
        y: (global.screenHeight / 2 - player.y) + (global.gameHeight / 2) - (global.goalWidth / 2)
    }

    drawNet(rectTopLeft);
    rectTopLeft = {
        x: global.gameWidth + global.screenWidth / 2 - player.x,
        y: (global.screenHeight / 2 - player.y) + (global.gameHeight / 2) - (global.goalWidth / 2)
    }
    drawNet(rectTopLeft);
}

function drawNet(rectTopLeft) {
    let netWidth = 15;
    let start = {
        x: rectTopLeft.x,
        y: rectTopLeft.y
    };
    for (let i = 0; i < global.goalWidth; i += netWidth) {
        for (let j = 0; j < 100; j += netWidth) {
            if (i * j != 0) 
                continue;
            graph.beginPath();
            graph.moveTo(start.x + j, start.y + i);
            let cutEnd = {
                x: start.x + 100 + j,
                y: start.y + 100 + i
            }
            if (cutEnd.x > rectTopLeft.x + 100) {
                cutEnd.x = rectTopLeft.x + 100
                cutEnd.y -= j;
            }
            if (cutEnd.y > rectTopLeft.y + global.goalWidth) {
                cutEnd.y = rectTopLeft.y + global.goalWidth;
                cutEnd.x -= i - global.goalWidth + 100;
            }
            graph.lineTo(cutEnd.x, cutEnd.y);
            graph.stroke();
        }
    }
    for (let i = 0; i < global.goalWidth; i += netWidth) {
        for (let j = 0; j < 100; j += netWidth) {
            if (i * j != 0) 
                continue;
            graph.beginPath();
            graph.moveTo(2 * start.x + 100 - (start.x + j), start.y + i);
            let cutEnd = {
                x: start.x + 100 + j,
                y: start.y + 100 + i
            }
            if (cutEnd.x > rectTopLeft.x + 100) {
                cutEnd.x = rectTopLeft.x + 100
                cutEnd.y -= j;
            }
            if (cutEnd.y > rectTopLeft.y + global.goalWidth) {
                cutEnd.y = rectTopLeft.y + global.goalWidth;
                cutEnd.x -= i - global.goalWidth + 100;
            }
            graph.lineTo(2 * start.x + 100 - cutEnd.x, cutEnd.y);
            graph.stroke();
        }
    }
}

function drawGoalText(ball) {
    if (ball.x < 0 || ball.x > global.gameWidth) {
        graph.lineWidth = playerConfig.textBorderSize;
        graph.fillStyle = 'Yellow';
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = 'round';
        graph.textAlign = 'center';
        graph.textBaseline = 'middle';
        graph.font = 'bold ' + 72 + 'px sans-serif';
        let scoringTeam = "";
        if (ball.x < 0) 
            scoringTeam = "RED";
        else 
            scoringTeam = "BLUE";
        graph.strokeText('GOAL! ' + scoringTeam + ' SCORED!', global.screenWidth / 2, global.screenHeight / 2);
        graph.fillText('GOAL! ' + scoringTeam + ' SCORED!', global.screenWidth / 2, global.screenHeight / 2);
        let winners = "";
        if (score.blue == 10) 
            winners = 'BLUE';
        if (score.red == 10) 
            winners = 'RED';
        if (winners != "") {
            graph.strokeText(winners + ' TEAM WON THE GAME!', global.screenWidth / 2, global.screenHeight / 2 + 100);
            graph.fillText(winners + ' TEAM WON THE GAME!', global.screenWidth / 2, global.screenHeight / 2 + 100);
        }
    }
}

function drawborder() {
    // console.log(global.screenWidth)
    graph.lineWidth = 1;
    graph.strokeStyle = playerConfig.borderColor;

    // Big mid circle graph.beginPath(); graph.ellipse(global.gameWidth / 2 +
    // global.screenWidth / 2 - player.x, global.gameHeight / 2 +
    // global.screenHeight / 2 - player.y, 100, 100, 45 * Math.PI / 180, 0, 2 *
    // Math.PI);
    graph.strokeStyle = global.lineColor;
    // graph.stroke();
    drawCircle(global.gameWidth / 2 + global.screenWidth / 2 - player.x, global.gameHeight / 2 + global.screenHeight / 2 - player.y, 100, 50);

    // Mid dot
    graph.beginPath();
    graph.ellipse(global.gameWidth / 2 + global.screenWidth / 2 - player.x, global.gameHeight / 2 + global.screenHeight / 2 - player.y, 2, 2, 45 * Math.PI / 180, 0, 2 * Math.PI);
    graph.strokeStyle = global.lineColor;
    graph.stroke();

    // Mid-vertical
    graph.beginPath();
    graph.moveTo(global.gameWidth / 2 + global.screenWidth / 2 - player.x, 0
        ? player.y > global.screenHeight / 2
        : global.screenHeight / 2 - player.y);
    graph.lineTo(global.gameWidth / 2 + global.screenWidth / 2 - player.x, global.gameHeight + global.screenHeight / 2 - player.y);
    graph.strokeStyle = global.lineColor;
    graph.stroke();

    // Left-vertical.
    if (player.x <= global.screenWidth / 2) {
        graph.beginPath();
        graph.moveTo(global.screenWidth / 2 - player.x, 0
            ? player.y > global.screenHeight / 2
            : global.screenHeight / 2 - player.y);
        graph.lineTo(global.screenWidth / 2 - player.x, global.gameHeight + global.screenHeight / 2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }

    // Top-horizontal.
    if (player.y <= global.screenHeight / 2) {
        graph.beginPath();
        graph.moveTo(0
            ? player.x > global.screenWidth / 2
            : global.screenWidth / 2 - player.x, global.screenHeight / 2 - player.y);
        graph.lineTo(global.gameWidth + global.screenWidth / 2 - player.x, global.screenHeight / 2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }

    // Right-vertical.
    if (global.gameWidth - player.x <= global.screenWidth / 2) {
        graph.beginPath();
        graph.moveTo(global.gameWidth + global.screenWidth / 2 - player.x, global.screenHeight / 2 - player.y);
        graph.lineTo(global.gameWidth + global.screenWidth / 2 - player.x, global.gameHeight + global.screenHeight / 2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }

    // Bottom-horizontal.
    if (global.gameHeight - player.y <= global.screenHeight / 2) {
        graph.beginPath();
        graph.moveTo(global.gameWidth + global.screenWidth / 2 - player.x, global.gameHeight + global.screenHeight / 2 - player.y);
        graph.lineTo(global.screenWidth / 2 - player.x, global.gameHeight + global.screenHeight / 2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }
}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 24);
    };
})();

window.cancelAnimFrame = (function (handle) {
    return window.cancelAnimationFrame || window.mozCancelAnimationFrame;
})();

let alpha = 0;

function pingCheck() {
    global.startPingTime = Date.now();
    socket.emit('pingcheck');


    // if(alpha>=2*Math.PI)
    //     alpha = 0;
    // let trgt = {
    //     x: 50*Math.cos(alpha),
    //     y: 50*Math.sin(alpha)
    // }
    // alpha+=0.1;
    // console.log(trgt);
    // socket.emit('0', trgt);

}

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();
}

function gameLoop() {
    if (!global.disconnected) {
        if (global.gameStart) {
            graph.fillStyle = global.backgroundColor;
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            drawCommercials();
            drawborder();
            drawgoals();
            drawBallDirection();
            drawScore(score);
            drawGoalkeeper(goalkeepers);
            drawPlayers();
            drawGoalText(ball);
            drawBall(ball);
            if (global.usingMobileVersion) 
                drawButton();

            drawOverlayAdForMobile();
            
            socket.emit('0', window.canvas.target); // playerSendTarget "Heartbeat".

        } else {
            graph.fillStyle = '#333333';
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            graph.textAlign = 'center';
            graph.fillStyle = '#FFFFFF';
            graph.font = 'bold 30px sans-serif';
            graph.fillText('Loading...', global.screenWidth / 2, global.screenHeight / 2);
        }
    } else {
        if (!disconnected) {
            disconnected = true; //this is to prevent GPU from working while disconnected
            graph.fillStyle = '#333333';
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            graph.textAlign = 'center';
            graph.fillStyle = '#FFFFFF';
            graph.font = 'bold 30px sans-serif';
            if (global.kicked) {
                if (reason !== '') {
                    graph.fillText('You were disconnected due to ' + reason, global.screenWidth / 2, global.screenHeight / 2 - 20);
                } else {
                    graph.fillText('You were kicked!', global.screenWidth / 2, global.screenHeight / 2);
                }
            } else {
                graph.fillText('Disconnected!', global.screenWidth / 2, global.screenHeight / 2);
            }
        }
    }
}

window.addEventListener('resize', resize);

document
    .getElementById('poopy')
    .addEventListener('touchstart', sendEmoji);
document
    .getElementById('finger')
    .addEventListener('touchstart', sendEmoji);
document
    .getElementById('xd')
    .addEventListener('touchstart', sendEmoji);
document
    .getElementById('hmmm')
    .addEventListener('touchstart', sendEmoji);
document
    .getElementById('angry')
    .addEventListener('touchstart', sendEmoji);

function sendEmoji(e) {
    //console.log(e.srcElement.id);
    switch (e.srcElement.id) {
        case 'poopy':
            socket.emit('5', 4);
            break;
        case 'xd':
            socket.emit('5', 3);
            break;
        case 'finger':
            socket.emit('5', 2);
            break;
        case 'hmmm':
            socket.emit('5', 1);
            break;
        case 'angry':
            socket.emit('5', 0);
            break;
    }
}

function resize() {
    if (!socket) 
        return;
    let minWidth = 1024, //TRY TO FIX FULLSCREEN AND JOISTICK CONFLICT
        ratio = window.devicePixelRatio || 1;
    let minHeight = minWidth / ratio;

    let w = screen.width * ratio;
    let h = screen.height * ratio;

    // if (window.innerWidth < minWidth || window.innerHeight < minHeight) {
    // player.screenWidth = c.width = global.screenWidth = w; player.screenHeight =
    // c.height = global.screenHeight = h; } else {
    player.screenWidth = c.width = global.screenWidth = window.innerWidth;
    player.screenHeight = c.height = global.screenHeight = window.innerHeight;
    // }

    emojiAlignment(true);
    // window.alert(global.screenWidth + "x" + global.screenHeight);
    socket.emit('windowResized', {
        screenWidth: global.screenWidth,
        screenHeight: global.screenHeight
    });
}

function comIndexNext() { // rolls commercial signs
    comIndex += 2;
    comIndex = comIndex % global.commercialCount;
    adIndex++;
    adIndex=adIndex%global.adCount;
    global.adIndex = adIndex;
}

setInterval(comIndexNext, 30 * 1000);
setInterval(pingCheck, 10 * 1000);
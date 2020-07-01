/*jslint bitwise: true, node: true */
'use strict';

// Import game settings.
var c = require('../../config.json');

// Import utilities.
var util = require('./lib/util');

// Import quadtree.
var quadtree = require('simple-quadtree');

// IP configurations. change in the config and not here.
var ipaddress = c.host || process.env.OPENSHIFT_NODEJS_IP || process.env.IP;
var serverport = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || c.port;

var express = require('express');
var fs = require('fs');
var app = express();
var http = require('http').Server(app);
const https = require("https"),
    helmet = require("helmet");

var options = {};
var ServerTLS = {};
var io = {};
if (ipaddress == '0.0.0.0') {
    options = {
        key: fs.readFileSync("/etc/letsencrypt/live/footio.com.de/privkey.pem"),
        cert: fs.readFileSync("/etc/letsencrypt/live/footio.com.de/fullchain.pem")
    };
    ServerTLS = https.createServer(options, app);
    io = require('socket.io')(ServerTLS);
} else {
    io = require('socket.io')(http);
}

var SAT = require('sat');
const axios = require('axios');

if (process.argv[2] != "config.json") {
    serverport = process.argv[2];
}

var tree = quadtree(0, 0, c.gameWidth, c.gameHeight);

var controllingTeam = -1;
var users = [];
var chasers = [];
chasers[0] = 0;
chasers[1] = 0;
var gatherers = [];
gatherers[0] = 0;
gatherers[1] = 0;
var bandwidth = 0;
var totalBandwidth = 0;
var bandwidthTime = Date.now();
var listOfIds = [
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1
];
var ball = { //this is done by the server so goalkeepers can react

    id: null,
    isLoose: true,
    target: {
        x: c.gameWidth / 2,
        y: c.gameHeight / 2
    },
    x: c.gameWidth / 2,
    y: c.gameHeight / 2,
    speed: 1,
    frame: 0
};
var teams = [];
teams[0] = { //blue, attacks to right
    player_amount: 0,
    score: 0
};
teams[1] = { //red, attacks to left
    player_amount: 0,
    score: 0
};
var goalkeepers = [];
goalkeepers[0] = {
    position: {
        x: 0,
        y: c.gameHeight / 2
    }
};
goalkeepers[1] = {
    position: {
        x: c.gameWidth,
        y: c.gameHeight / 2
    }
};
var sockets = {};

var V = SAT.Vector;
var C = SAT.Circle;

app.use(express.static(__dirname + '/../client'));

function updateCapacity(port) {
    try {
        fs
            .readFile('../capacity.json', 'utf8', function readFileCallback(err, data) {
                if (err) {
                    console.log(err);
                    console.log("read failure");
                } else if (port > 3001) {
                    console.log(data);
                    let obj = JSON.parse(data);
                    obj.ports[port - 3001 - 1].players = users.length;
                    let json = JSON.stringify(obj);
                    fs.writeFile('../capacity.json', json, 'utf8', function writeFileCallback(err, data) {
                        if (err) {
                            console.log(err);
                            console.log("write failure");
                        }
                    });
                } else {
                    console.log("port not in range");
                }
            });
    } finally {
        console.log('lol');
    }
}

function moveGoalkeeper() {

    var leftGoal = {
        x: 0,
        top: (c.gameHeight / 2) - (c.goalWidth / 2),
        bot: (c.gameHeight / 2) + (c.goalWidth / 2)
    };

    var rightGoal = {
        x: c.gameWidth,
        top: (c.gameHeight / 2) - (c.goalWidth / 2),
        bot: (c.gameHeight / 2) + (c.goalWidth / 2)
    };

    var goalkeeperSpeed = 6.5;

    // goal calculation
    if (ball.x >= 0 && ball.x <= c.gameWidth) {
        if (goalkeepers[0].position.x < (c.goalWidth / 2)) {
            if (ball.x > goalkeepers[0].position.x) {
                goalkeepers[0].position.x += goalkeeperSpeed;
            }
            if (ball.x < goalkeepers[0].position.x) {
                goalkeepers[0].position.x -= goalkeeperSpeed;
            }
        } else 
            goalkeepers[0].position.x -= goalkeeperSpeed;
        if (goalkeepers[0].position.y < leftGoal.bot && goalkeepers[0].position.y > leftGoal.top) {
            if (ball.y > goalkeepers[0].position.y) {
                goalkeepers[0].position.y += goalkeeperSpeed;
            }
            if (ball.y < goalkeepers[0].position.y) {
                goalkeepers[0].position.y -= goalkeeperSpeed;
            }
        } else {
            if (goalkeepers[0].position.y > leftGoal.bot) 
                goalkeepers[0].position.y -= goalkeeperSpeed;
            if (goalkeepers[0].position.y < leftGoal.top) 
                goalkeepers[0].position.y += goalkeeperSpeed;
            }
        
        // right goal calculation
        if (goalkeepers[1].position.x > rightGoal.x - (c.goalWidth / 2)) {
            if (ball.x > goalkeepers[1].position.x) {
                goalkeepers[1].position.x += goalkeeperSpeed;
            }
            if (ball.x < goalkeepers[1].position.x) {
                goalkeepers[1].position.x -= goalkeeperSpeed;
            }
        } else 
            goalkeepers[1].position.x += goalkeeperSpeed;
        if (goalkeepers[1].position.y < leftGoal.bot && goalkeepers[1].position.y > leftGoal.top) {
            if (ball.y > goalkeepers[1].position.y) {
                goalkeepers[1].position.y += goalkeeperSpeed;
            }
            if (ball.y < goalkeepers[1].position.y) {
                goalkeepers[1].position.y -= goalkeeperSpeed;
            }
        } else {
            if (goalkeepers[1].position.y > leftGoal.bot) 
                goalkeepers[1].position.y -= goalkeeperSpeed;
            if (goalkeepers[1].position.y < leftGoal.top) 
                goalkeepers[1].position.y += goalkeeperSpeed;
            }
        }
}

function movePlayer(player) {
    if (player) {
        if (player.sprint >= 950) 
            player.speed = 8;
        if (player.sprint > 0) 
            player.sprint--;
        if (player.sprint < 0) 
            player.sprint = 0;
        
        // var x = 0,     y = 0;
        var target = {
            x: player.target.x,
            y: player.target.y
        };
        var dist = Math.sqrt(Math.pow(target.y, 2) + Math.pow(target.x, 2));
        var deg = Math.atan2(target.y, target.x);
        var slowDown = 1;
        if (!player.speed) 
            player.speed = 5.25;
        var deltaY = player.speed * Math.sin(deg) / slowDown;
        var deltaX = player.speed * Math.cos(deg) / slowDown;

        if (player.speed > 5.25) {
            player.speed -= 0.5;
        }
        if (dist < (50 + c.playerRadius)) {
            deltaY *= dist / (50 + c.playerRadius);
            deltaX *= dist / (50 + c.playerRadius);
        }
        if (!isNaN(deltaY)) {
            player.lastY = player.y;
            player.y += deltaY;
        }
        if (!isNaN(deltaX)) {
            player.lastX = player.x;
            player.x += deltaX;
        }

        if (player.carrier) { //if the current player is the carrier then we update the ball position from here.
            if (!isNaN(deltaY)) {
                ball.y = player.y + deltaY;
            } else {
                ball.y = player.y;
            }
            if (!isNaN(deltaX)) {
                ball.x = player.x + deltaX;
            } else {
                ball.x = player.x;
            }
            if (player.target.x >= 0) 
                ball.frame += Math.floor(player.speed);
            if (player.target.x < 0) 
                ball.frame -= Math.floor(player.speed);
            if (ball.frame > 100) 
                ball.frame = 0;
            if (ball.frame < 0) 
                ball.frame = 100;
            }
        var borderCalc = 12;
        if (player.x > c.gameWidth - borderCalc) {
            kickBall(player, 1, 1);
            player.x = c.gameWidth - borderCalc;
        }
        if (player.y > c.gameHeight - borderCalc) {
            player.y = c.gameHeight - borderCalc;
            kickBall(player, 1, 1);
        }
        if (player.x < borderCalc) {
            player.x = borderCalc;
            kickBall(player, 1, 1);
        }
        if (player.y < borderCalc) {
            player.y = borderCalc;
            kickBall(player, 1, 1);
        }
    }
}

function moveBall(ball) {
    var deg = Math.atan2(ball.target.y, ball.target.x);
    var deltaY = ball.speed * Math.sin(deg);
    var deltaX = ball.speed * Math.cos(deg);

    if (ball.speed != 0) {
        if (ball.target.x >= 0) 
            ball.frame += Math.floor(ball.speed);
        if (ball.target.x < 0) 
            ball.frame -= Math.floor(ball.speed);
        if (ball.frame > 100) 
            ball.frame = 0;
        if (ball.frame < 0) 
            ball.frame = 100;
        }
    ball.speed -= 0.2;
    if (ball.speed < 0) {
        ball.speed = 0;
    }
    if (!isNaN(deltaY)) {
        ball.y += deltaY;
    }
    if (!isNaN(deltaX)) {
        ball.x += deltaX;
    }

    var borderCalc = 7;

    //these function mirror the ball away from the goal keeper

    let distance = Math.sqrt(Math.pow(ball.x - goalkeepers[0].position.x, 2) + Math.pow(ball.y - goalkeepers[0].position.y, 2));
    if (distance < c.goalkeeperRadius) { //check if left(blue) goalkeeper caught the ball
        ball.x = goalkeepers[0].position.x + c.goalkeeperRadius;
        ball.y = goalkeepers[0].position.y;
        ball.target.x = -1 * ball.target.x;
        if (ball.speed < 9 && ball.speed > 0) 
            ball.speed = 9;
        }
    distance = Math.sqrt(Math.pow(ball.x - goalkeepers[1].position.x, 2) + Math.pow(ball.y - goalkeepers[1].position.y, 2));
    if (distance < c.goalkeeperRadius) { //check if right(red) goalkeeper caught the ball
        ball.x = goalkeepers[1].position.x - c.goalkeeperRadius;
        ball.y = goalkeepers[1].position.y;
        ball.target.x = -1 * ball.target.x;
        if (ball.speed < 9 && ball.speed > 0) 
            ball.speed = 9;
        }
    
    // these functions check if the mass is out of bounds. could be used to check if
    // the ball is out of bounds, and trigger a restart or something. they will also
    // check if a goal is scored

    if (ball.x > c.gameWidth - borderCalc) {
        if (ball.y > c.gameHeight / 2 - c.goalWidth / 2 && ball.y < c.gameHeight / 2 + c.goalWidth / 2) {
            if (ball.x <= c.gameWidth + 100) {
                users
                    .forEach(function (u) {
                        if (!u.isBot) {
                            sockets[u.socketId].emit('goal');
                        }
                    });
                teams[0].score++;
                ball.speed = 0;
                ball.x = c.gameWidth + 200;
                ball.y = c.gameHeight / 2;
                return setTimeout(() => {
                    goalRestart(c.gameWidth / 4);
                }, 3000); //red scored, so ball should be with blue now
                //goalRestart(c.gameWidth / 4);
            }
        } else {
            ball.target.x = -1 * ball.target.x;
            ball.x = c.gameWidth - borderCalc;
        }
    }
    if (ball.y > c.gameHeight - borderCalc) {
        ball.target.y = -1 * ball.target.y;
        ball.y = c.gameHeight - borderCalc;
    }
    if (ball.x < borderCalc) {
        if (ball.y > c.gameHeight / 2 - c.goalWidth / 2 && ball.y < c.gameHeight / 2 + c.goalWidth / 2) {
            if (ball.x >= 0 - 100) {
                users
                    .forEach(function (u) {
                        if (!u.isBot) {
                            sockets[u.socketId].emit('goal');
                        }
                    });
                teams[1].score++;
                ball.speed = 0;
                ball.x = 0 - 200;
                ball.y = c.gameHeight / 2;
                return setTimeout(() => {
                    goalRestart(-1 * c.gameWidth / 4);
                }, 3000); //red scored, so ball should be with blue now
                //goalRestart(-1 * c.gameWidth / 4);
            }
        } else {
            ball.target.x = -1 * ball.target.x;
            ball.x = borderCalc;
        }
    }
    if (ball.y < borderCalc) {
        ball.target.y = -1 * ball.target.y;
        ball.y = borderCalc;
    }
}

// Fix balanceTeams() and test it

function balanceTeams() {
    teams[0].player_amount = 0;
    teams[1].player_amount = 0;
    for (let i = 0; i < users.length; i++) {
        teams[users[i].team].player_amount++;
    }
    if (teams[0].player_amount - teams[1].player_amount > 1) {
        for (let i = 0; i < teams[0].player_amount - teams[1].player_amount; i++) {
            users[i].team = 1;
            users[i].hue = 0;
            teams[0].player_amount--;
            teams[1].player_amount++;
        }
    } else if (teams[1].player_amount - teams[0].player_amount > 1) {
        for (let i = 0; i < teams[1].player_amount - teams[0].player_amount; i++) {
            users[i].team = 0;
            users[i].hue = 220;
            teams[1].player_amount--;
            teams[0].player_amount++;
        }
    }
    teams[0].player_amount = 0;
    teams[1].player_amount = 0;
    for (let i = 0; i < users.length; i++) {
        teams[users[i].team].player_amount++;
    }
}

function confirmSkin(conf) {
    if (ipaddress == '0.0.0.0') {
        ipaddress = 'www.footio.com.de';
    }
    // console.log(conf);
    return axios({
            method: 'post', url: 'http://localhost:3001/users/skinconfirm',
            // url: 'https://' + ipaddress + ':443/users/skinconfirm', //change this when
            // deployed
            data: {
                skin: conf
            }
        }).then(function (response) {
        return response.data;
    }).catch((e) => {
            console.log('failed response from skins');
            // console.log(e);
        });
}

io
    .on('connection', function (socket) {
        console.log('A user connected!', socket.handshake.query.type);

        var type = socket.handshake.query.type;
        var radius = c.playerRadius;
        var position = {
            x: 0,
            y: 0
        };
        var currentPlayer = {
            id: -1,
            socketId: socket.id,
            skinsprite: 0,
            frame: 0,
            hue: 0,
            team: 0,
            sprint: 0,
            x: 0,
            y: 0,
            lastX: -1,
            lastY: -1,
            w: 50,
            h: 50,
            emoji: -1,
            carrier: false,
            target: {
                x: 0,
                y: 0
            },
            speed: 0
        };
        socket.on('gotit', function (player) {

            if (users.length >= c.maxPlayers) {
                socket.emit('kick', 'Full server.');
                socket.disconnect();
            } else if (util.findIndex(users, player.id) > -1) {
                socket.disconnect();
            } else if (!util.validNick(player.name) || util.slurNick(player.name)) {
                socket.emit('kick', 'Invalid username.');
                socket.disconnect();
            } else {
                confirmSkin(player.conf).then((response) => {
                    updateCapacity(serverport);
                    sockets[player.socketId] = socket;
                    if (response) 
                        player.skinsprite = response.skinsprite;
                    else 
                        player.skinsprite = 0;
                    player.hue = teams[0].player_amount > teams[1].player_amount
                        ? 0
                        : 220;
                    player.team = teams[0].player_amount > teams[1].player_amount
                        ? 1
                        : 0;

                    var radius = c.playerRadius;
                    var position = util.randomTeamPosition(radius, player.team);
                    player.target.x = 0;
                    player.target.y = 0;
                    player.frame = 0;
                    player.x = position.x;
                    player.y = position.y;
                    teams[player.team].player_amount++;
                    player.carrier = false;
                    player.w = 50;
                    player.h = 50;
                    player.sprint = 0;
                    player.lastX = -1;
                    player.lastY = -1;
                    player.speed = 0;
                    // player.id = pickId();
                    currentPlayer = player;
                    users.push(currentPlayer);

                    io.emit('playerJoin', {name: currentPlayer.name});

                    socket.emit('gameSetup', {
                        gameWidth: c.gameWidth,
                        gameHeight: c.gameHeight,
                        goalWidth: c.goalWidth,
                        goalkeeperRadius: c.goalkeeperRadius
                    });
                    console.log('Total players: ' + users.length);
                });

            }

        });

        socket.on('pingcheck', function () {
            socket.emit('pongcheck');
        });

        socket.on('windowResized', function (data) {
            currentPlayer.screenWidth = data.screenWidth;
            currentPlayer.screenHeight = data.screenHeight;
        });

        socket.on('respawn', function () {
            if (util.findIndex(users, currentPlayer.id) > -1) 
                users.splice(util.findIndex(users, currentPlayer.id), 1);
            socket.emit('welcome', currentPlayer);
        });

        socket.on('disconnect', function () {
            if (util.findIndex(users, currentPlayer.id) > -1) {
                kickBall(currentPlayer, 1, 1);
                teams[currentPlayer.team].player_amount++;
                users.splice(util.findIndex(users, currentPlayer.id), 1);
            }
            updateCapacity(serverport);
            socket
                .broadcast
                .emit('playerDisconnect', {id: currentPlayer.id});
        });

        socket.on('5', function (data) { //emoji
            if (data >= 0 && data <= 5) 
                currentPlayer.emoji = data;
            }
        );

        socket.on('kick', function (data) {
            if (currentPlayer.admin) {
                var reason = '';
                var worked = false;
                for (var e = 0; e < users.length; e++) {
                    if (users[e].name === data[0] && !users[e].admin && !worked) {
                        if (data.length > 1) {
                            for (var f = 1; f < data.length; f++) {
                                if (f === data.length) {
                                    reason = reason + data[f];
                                } else {
                                    reason = reason + data[f] + ' ';
                                }
                            }
                        }
                        if (reason !== '') {} else {}
                        socket.emit('serverMSG', 'User ' + users[e].name + ' was kicked by ' + currentPlayer.name);
                        if (sockets[users[e].socketId]) {
                            sockets[users[e].socketId].emit('kick', reason);
                            sockets[users[e].socketId].disconnect();
                            users.splice(e, 1);
                        }
                        worked = true;
                    }
                }
                if (!worked) {
                    socket.emit('serverMSG', 'Could not locate user or user is an admin.');
                }
            } else {
                socket.emit('serverMSG', 'You are not permitted to use this command.');
            }
        });

        // Heartbeat function, update everytime.
        socket.on('0', function (target) {
            if (target.x !== currentPlayer.x || target.y !== currentPlayer.y) {
                currentPlayer.target = target;
            }
        });

        socket.on('1', function (power) {
            if (currentPlayer.carrier) {
                if (power > 10) 
                    power = 10;
                kickBall(currentPlayer, power, 1);
                currentPlayer.carrier = false;
            }
        });

        socket.on('sprint', function () {
            if (!currentPlayer.carrier && currentPlayer.sprint == 0) {
                currentPlayer.sprint = 1000;
            }
        });
    });

function kickBall(currentPlayer, power, direction) { //direction is for reverse kicking...
    if (currentPlayer.carrier) {
        currentPlayer.carrier = false;
        ball.isLoose = true;
        ball.id = currentPlayer.id;
        ball.target = {
            x: (currentPlayer.x - currentPlayer.x + currentPlayer.target.x) * direction,
            y: (currentPlayer.y - currentPlayer.y + currentPlayer.target.y) * direction
        };
        ball.x = currentPlayer.x;
        ball.y = currentPlayer.y;
        ball.speed = 9 + power * 1.5;
    }
}

function goalRestart(where) {
    for (let i = 0; i < users.length; i++) {
        var position = util.randomTeamPosition(7, users[i].team);
        users[i].x = position.x;
        users[i].y = position.y;
        users[i].carrier = false;
    }
    if (teams[0].score == 10 || teams[1].score == 10) {
        teams[0].score = 0;
        teams[1].score = 0;
    }
    balanceTeams();
    ballspawn(where);
}

function tickPlayer(currentPlayer) {
    movePlayer(currentPlayer);

    if (!currentPlayer.carrier) {
        if (SAT.pointInCircle(new V(ball.x, ball.y), new C(new V(currentPlayer.x, currentPlayer.y), c.playerRadius))) {
            if (ball.id != currentPlayer.id) {
                currentPlayer.carrier = true;
                ball.id = currentPlayer.id;
                ball.isLoose = false;
                controllingTeam = currentPlayer.team;
            } else {
                if (ball.speed < 4) {
                    currentPlayer.carrier = true;
                    ball.id = currentPlayer.id;
                    controllingTeam = currentPlayer.team;
                } else {
                    controllingTeam = -1;
                }
            }

        }
    } else {
        controllingTeam = currentPlayer.team;
    }

    function check(user) {
        if (user.id !== currentPlayer.id) {
            var response = new SAT.Response();
            var collided = SAT.testCircleCircle(new C(new V(currentPlayer.x, currentPlayer.y), c.playerRadius), new C(new V(user.x, user.y), c.playerRadius), response);
            if (collided) {
                response.aUser = currentPlayer;
                response.bUser = {
                    id: user.id,
                    x: user.x,
                    y: user.y,
                    carrier: user.carrier
                };
                playerCollisions.push(response);
            }
        }

        return true;
    }

    function collisionCheck(collision) {
        //the following checks whether there is a tackle (collision + ball) or not
        var distance = Math.sqrt(Math.pow(collision.aUser.x - collision.bUser.x, 2) + Math.pow(collision.aUser.y - collision.bUser.y, 2));
        var diff = collision.aUser.radius - distance;
        if (collision.aUser.carrier && !(collision.bUser.carrier)) {
            var numUser = util.findIndex(users, collision.bUser.id);
            if (numUser > -1) {
                //the following are made by me. it is supposed to dispossess the tackled player
                kickBall(collision.aUser, 1, -1);
                collision.aUser.carrier = false;
            }
        }
    }

    if (typeof(currentPlayer.speed) == "undefined") 
        currentPlayer.speed = 6.25;
    
    tree.clear();

    users.forEach(tree.put);
    var playerCollisions = [];
    var otherUsers = tree.get(currentPlayer, check);
    playerCollisions.forEach(collisionCheck);

}

function moveloop() {
    if (users.length < 20) {
        controlBots();
    }
    moveGoalkeeper();
    var carrier = -1;
    for (let i = 0; i < users.length; i++) {
        tickPlayer(users[i]);
        if (users[i]) {
            if (users[i].carrier) 
                carrier = i;
            }
        }
    moveBall(ball);
    if (carrier != -1) {
        ball.x = users[carrier].x;
        ball.y = users[carrier].y;
    }
    let distance = Math.sqrt(Math.pow(ball.x - goalkeepers[0].position.x, 2) + Math.pow(ball.y - goalkeepers[0].position.y, 2));
    if (distance < c.goalkeeperRadius) { //check if left(blue) goalkeeper caught the ball
        for (let i = 0; i < users.length; i++) {
            if (users[i]) {
                kickBall(users[i], 0, -1);
            }
        }
    }
    distance = Math.sqrt(Math.pow(ball.x - goalkeepers[1].position.x, 2) + Math.pow(ball.y - goalkeepers[1].position.y, 2));
    if (distance < c.goalkeeperRadius) { //check if right(red) goalkeeper caught the ball
        for (let i = 0; i < users.length; i++) {
            if (users[i]) {
                kickBall(users[i], 0, -1);
            }
        }
    }
}

function checkAssist(team) {
    let bestFriendDistanceFromKeeper = -1,
        myDistanceFromKeeper = -1,
        bestFriendDistanceFromLine = -1,
        myDistanceFromLine = -1;
    let bestFriendPos = {
        x: -1,
        y: -1
    };
    users.forEach(u => {
        if (!u.carrier) {
            if (u.team == team && util.getRealDistance(u, goalkeepers[1 - u.team].position) < c.gameWidth / 5) {
                let friendDistanceFromKeeper = util.getRealDistance(u, goalkeepers[1 - u.team].position);
                if (friendDistanceFromKeeper > bestFriendDistanceFromKeeper) {
                    bestFriendPos.x = u.x;
                    bestFriendPos.y = u.y;
                    bestFriendDistanceFromKeeper = friendDistanceFromKeeper;
                    bestFriendDistanceFromLine = Math.abs(u.x - c.gameWidth * (1 - u.team));
                }
            }
        } else {
            myDistanceFromKeeper = util.getRealDistance(u, goalkeepers[1 - u.team].position);
            myDistanceFromLine = Math.abs(u.x - c.gameWidth * (1 - u.team));
        }
    });
    if (bestFriendDistanceFromKeeper > myDistanceFromKeeper && bestFriendDistanceFromLine - 10 <= myDistanceFromLine) {
        return bestFriendPos;
    } else {
        return false;
    }
}

var bot = {
    id: -1,
    name: "",
    isBot: true,
    command: -1,
    frame: 0,
    hue: 0,
    team: 0,
    x: 0,
    y: 0,
    w: 50,
    h: 50,
    carrier: false,
    target: {
        x: 0,
        y: 0
    },
    absTarget: {
        x: 0,
        y: 0
    },
    speed: 0
};

// bot commands: -1 - stand still 0 - go to random position in blue side 1 - go
// to random position in red side 2 - run towards blue goal 3 - run towards red
// goal 4 - shoot 5 - chase ball 6 - gather a loose ball

function controlBots() {
    // we need to know which team controls the ball when a teammate holds the ball,
    // friendly bots should stay at a distance while close-by enemies should chase
    // when the ball is on the loose, close-by bots should move towards the ball
    //
    // if (chasers[0] < 0)
    chasers[0] = 0;
    // if (chasers[1] < 0)
    chasers[1] = 0;
    // if (gatherers[0] < 0)
    gatherers[0] = 0;
    // if (gatherers[1] < 0)
    gatherers[1] = 0;
    users.forEach(u => {
        if (u.command == 6) 
            gatherers[u.team]++;
        if (u.command == 5) 
            chasers[u.team]++;
        }
    );
    for (let i = 0; i < users.length; i++) {
        // users[i].name = users[i].x + "," + users[i].y;
        if (users[i].isBot) {
            if(users[i].target.x==users[i].x&&users[i].target.y==users[i].y){
                console.log('warning! bug!');
                users[i].command = users[i].team;
            }
            if (Math.abs(users[i].target.x) < 1 && Math.abs(users[i].target.y) < 1) {
                users[i].command = -1;
            }
            if (Math.abs(users[i].absTarget.x - users[i].x) < 1 && Math.abs(users[i].absTarget.y - users[i].y) < 1) {
                users[i].command = -1;
            }
            if (users[i].team == controllingTeam) {
                if (!users[i].carrier) {
                    if (users[i].command != 1 - users[i].team) {
                        users[i].command = 1 - users[i].team; //blue(0) will attack towards red side (1-0=1) and vice versa
                        users[i].absTarget = util.randomTeamPosition(c.playerRadius, users[i].command);
                    }
                } else {
                    if ((users[i].team == 1 && users[i].x < c.goalWidth / 2 + 200) || (users[i].team == 0 && users[i].x > c.gameWidth - (c.goalWidth / 2 + 200))) {
                        if (users[i].command != 4) {
                            users[i].command = 4;
                        }
                    } else {
                        users[i].command = 1 - users[i].team + 2; //blue(0) will attack towards red goal (3-0=3) and vice versa
                    }
                }
            } else {
                if (Math.abs(users[i].x - ball.x) < (c.gameWidth / 2) && Math.abs(users[i].y - ball.y) < (c.gameHeight / 2) && (users[i].command == -1 || (users[i].command == users[i].team && users[i].id != ball.id && chasers[users[i].team] == 0))) {
                    if (chasers[users[i].team] < 2) {
                        chasers[users[i].team]++;
                        users[i].command = 5;
                    }
                } else {
                    if (users[i].command != users[i].team && users[i].command != 5) {
                        users[i].command = users[i].team;
                        users[i].absTarget = util.randomTeamPosition(c.playerRadius, users[i].command);
                    }
                }
            }
            if (gatherers[users[i].team] < 2 && util.getRealDistance(users[i], ball) < 400 && ball.isLoose) { //if he is close enough, then gather a loose ball
                users[i].command = 6;
                gatherers[users[i].team]++;
            }

            let ambitionX,
                ambitionY,
                commandString = "";
            switch (users[i].command) {
                case 0:
                    commandString = "go left!";
                    ambitionX = users[i].absTarget.x - users[i].x;
                    ambitionY = users[i].absTarget.y - users[i].y;
                    // users[i].target.x = users[i].absTarget.x - users[i].x; users[i].target.y =
                    // users[i].absTarget.y - users[i].y;
                    break;
                case 1:
                    commandString = "go right!";
                    ambitionX = users[i].absTarget.x - users[i].x;
                    ambitionY = users[i].absTarget.y - users[i].y;
                    // users[i].target.x = users[i].absTarget.x - users[i].x; users[i].target.y =
                    // users[i].absTarget.y - users[i].y;
                    break;
                case 2:
                    commandString = "go left goal!";
                    ambitionX = 0 - users[i].x;
                    ambitionY = c.gameHeight / 2 - users[i].y;
                    // users[i].target.x = 0 - users[i].x; users[i].target.y = c.gameHeight / 2 -
                    // users[i].y;
                    break;
                case 3:
                    commandString = "go right goal!";
                    ambitionX = c.gameWidth - users[i].x;
                    ambitionY = c.gameHeight / 2 - users[i].y;
                    // users[i].target.x = c.gameWidth - users[i].x; users[i].target.y =
                    // c.gameHeight / 2 - users[i].y;
                    break;
                case 4:
                    commandString = "kick ball!";
                    let assistChance = checkAssist(users[i].team);
                    if (assistChance) {
                        let assistOffset = users[i].team == 0
                            ? -20
                            : 20; //an assist should be a bit ahead of player
                        users[i].target.x = assistChance.x - users[i].x + assistOffset;
                        users[i].target.y = assistChance.y - users[i].y;
                        kickBall(users[i], 4, 1);
                    } else {
                        users[i].target.y = c.gameHeight / 2 + util.randomInRange(-0.5 * c.goalWidth, 0.5 * c.goalWidth) - users[i].y;
                        kickBall(users[i], 7, 1);
                    }
                    ambitionX = users[i].target.x;
                    ambitionY = users[i].target.y;
                    break;
                case 5:
                    commandString = "chase!";
                    ambitionX = ball.x - users[i].x;
                    ambitionY = ball.y - users[i].y;
                    // users[i].target.x = ball.x - users[i].x; users[i].target.y = ball.y -
                    // users[i].y;
                    break;
                case 6:
                    commandString = "gather!";
                    ambitionX = ball.x - users[i].x;
                    ambitionY = ball.y - users[i].y;
                    // users[i].target.x = ball.x - users[i].x; users[i].target.y = ball.y -
                    // users[i].y;
                    break;
                default:

            }
            if (Math.abs(ambitionX) < 1) 
                users[i].target.x = ambitionX;
            else 
                users[i].target.x += (ambitionX - users[i].target.x) / 50;
            
            if (Math.abs(ambitionY) < 1) 
                users[i].target.y = ambitionY;
            else 
                users[i].target.y += (ambitionY - users[i].target.y) / 50;
            
            if (isNaN(users[i].target.x) || isNaN(users[i].target.y)) {
                users[i].target.x = 20;
                users[i].target.y = 20;
                users[i].command = users[i].team + 1;
            }

            users[i].name = "BOT" + users[i].id;
        }
    }
}

function balanceBots() {
    let botMax = 6;
    if (users.length < botMax) {

        bot.hue = teams[0].player_amount > teams[1].player_amount
            ? 0
            : 220;
        bot.team = teams[0].player_amount > teams[1].player_amount
            ? 1
            : 0;
        // bot.hue = 0; bot.team = 1;

        var radius = c.playerRadius;
        let characterAmount = 40;
        var position = util.randomTeamPosition(radius, bot.team);

        users.push({
            id: bot.id,
            name: "BOT",
            skinsprite: util.randomInRange(1, characterAmount) + "",
            isBot: true,
            command: -1,
            frame: 0,
            hue: bot.hue,
            team: bot.team,
            x: position.x,
            y: position.y,
            w: 50,
            h: 50,
            carrier: false,
            target: {
                x: 0,
                y: 0
            },
            absTarget: {
                x: 0,
                y: 0
            },
            speed: 0
        });
        teams[bot.team].player_amount++;

    } else if (users.length > botMax) {
        // for (let i = users.length - 1; i >= 0; --i) {     if (users[i].id == bot.id)
        // {         users.splice(i, 1);     } }
        for (let i = 0; i < users.length; i++) {
            if (users[i].isBot) {
                listOfIds[users[i].id] = -1;
                users.splice(i, 1);
                break;
            }
        }
    }
}

function chasersFix() { //bandaid fix for chaser count being non zero while no one is chasing
    let count = 0;
    for (let i = 0; i < users.length; i++) {
        if (users[i].isBot && users[i].command == 5) {
            count++;
        }
    }
    if (count <= 0) {
        chasers[0] = 0;
        chasers[1] = 0;
    }
}

function updateIdOfUsers() {
    let strOfArr = "";
    for (let i = 0; i < listOfIds.length; i++) {
        // strOfArr+=","+listOfIds[i];
        listOfIds[i] = -1;
    }

    users.forEach(u => {
        if (u.id) {
            listOfIds[u.id] = 1;
        }
    });

    users.forEach(u => {
        if ((!u.id && u.id != 0) || u.id == -1) {

            for (let i = 0; i < listOfIds.length; i++) {
                if (listOfIds[i] == -1) {
                    listOfIds[i] = 1;
                    u.id = i;
                }

            }
        }
    });
}

function gameloop() {
    if (users.length > 0) {
        updateIdOfUsers();
        balanceBots();

        users.forEach(function (u) {
            if (!u.isBot) {
                addToBandWidth({
                    a: {
                        blue: teams[0].score,
                        red: teams[1].score
                    },
                    b: users
                });
                sockets[u.socketId].emit('4', {
                    blue: teams[0].score,
                    red: teams[1].score
                }, users);
            }
        });
    }
}

function resetEmoji() {
    // chasersFix(); //I put this here because I don't want to check this too
    // frequently ======> make it independant
    if (users.length > 0) {
        users
            .forEach(function (u) {
                if (!u.isBot) {
                    u.emoji = -1;
                }
            });
    }
}

function sendUpdates() {
    users
        .forEach(function (u) {

            var target = {
                x: u.target.x,
                y: u.target.y
            };
            var dist = Math.sqrt(Math.pow(target.y, 2) + Math.pow(target.x, 2));
            var deg = Math.atan2(target.y, target.x);

            var slowDown = 1;

            // var deltaY = u.speed * Math.sin(deg) / slowDown; var deltaX = u.speed *
            // Math.cos(deg) / slowDown;

            let dir = 0;
            if (deg > -1 * Math.PI / 8 && deg <= Math.PI / 8) {
                dir = 2;
            }
            if (deg > Math.PI / 8 && deg <= 3 * Math.PI / 8) {
                dir = 3;
            }
            if (deg > 3 * Math.PI / 8 && deg <= 5 * Math.PI / 8) {
                dir = 4;
            }
            if (deg > 5 * Math.PI / 8 && deg <= 7 * Math.PI / 8) {
                dir = 5;
            }
            if (deg > 7 * Math.PI / 8 || deg <= -7 * Math.PI / 8) {
                dir = 6;
            }
            if (deg > -7 * Math.PI / 8 && deg <= -5 * Math.PI / 8) {
                dir = 7;
            }
            if (deg > -5 * Math.PI / 8 && deg <= -3 * Math.PI / 8) {
                dir = 0;
            }
            if (deg > -3 * Math.PI / 8 && deg <= -1 * Math.PI / 8) {
                dir = 1;
            }
            if (dist < (c.playerRadius)) {
                u.frame = u.frame - u.frame % 12 + 3; //if he is really slow, we want him to stay at the 4th frame
            } else {
                u.frame++; //if he isn't that slow, move to next frame
            }
            if (u.frame % 12 == 0) {
                u.frame = u.frame - 12; //make sure the frames are looping in twelves
            }
            u.frame = u.frame % 12 + dir * 12; //if the direction changed, we should change the row of the frames.

            if (!u.isBot) {

                // center the view if x/y is undefined, this will happen for spectators
                u.x = u.x || c.gameWidth / 2;
                u.y = u.y || c.gameHeight / 2;

                var visibleCells = users.map(function (f) {
                    if (f.x + c.playerRadius > u.x - u.screenWidth / 2 - 20 && f.x - c.playerRadius < u.x + u.screenWidth / 2 + 20 && f.y + c.playerRadius > u.y - u.screenHeight / 2 - 20 && f.y - c.playerRadius < u.y + u.screenHeight / 2 + 20) {
                        if (f.id !== u.id) {
                            return {
                                id: f.id,
                                frame: f.frame,
                                x: Math.floor(f.x),
                                y: Math.floor(f.y)
                            };
                        } else {
                            return {
                                idz: f.id,
                                frame: f.frame,
                                x: Math.floor(f.x),
                                y: Math.floor(f.y)
                            };
                            }
                        }
                    })
                    .filter(function (f) {
                        return f;
                    });
                var visibleBall = {
                    x: ball.x,
                    y: ball.y,
                    frame: ball.frame
                };
                sockets[u.socketId].emit('3', visibleCells, visibleBall, goalkeepers);
                addToBandWidth({a: '3', b: visibleCells, c: visibleBall, d: goalkeepers});

            }
        });
}

function roughSizeOfObject(object) {

    var objectList = [];
    var stack = [object];
    var bytes = 0;

    while (stack.length) {
        var value = stack.pop();

        if (typeof value === 'boolean') {
            bytes += 4;
        } else if (typeof value === 'string') {
            bytes += value.length * 2;
        } else if (typeof value === 'number') {
            bytes += 8;
        } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
            objectList.push(value);

            for (let i in value) {
                stack.push(value[i]);
            }
        }
    }
    return bytes;
}

function ballspawn(where) {
    ball.id = null;
    ball.target = {
        x: c.gameWidth / 2 + where,
        y: c.gameHeight / 2
    };
    ball.x = c.gameWidth / 2 + where;
    ball.y = c.gameHeight / 2;
    ball.speed = 1;
}

function afkCheck() {
    for (var i = 0; i < users.length; i++) {
        if (users[i].x == users[i].lastX && users[i].y == users[i].lastY) {
            if (sockets[users[i].socketId]) {
                sockets[users[i].socketId].emit('kick', 'Inactivity.');
                sockets[users[i].socketId].disconnect();
                users.splice(i, 1);
            }
            console.log("KICKED " + i);
        }
    }
}

function addToBandWidth(obj) {
    let currentSize = roughSizeOfObject(obj) + 17;
    bandwidth += currentSize;
    totalBandwidth += currentSize;
}

var bandWidthIteration = 5000;
function bandwidthCheck() {
    let milliseconds = (Date.now() - bandwidthTime),
        average = totalBandwidth / milliseconds;
    console.log(Math.floor((bandwidth / bandWidthIteration)) + "KB, (" + Math.floor(average) + "KB avg)");
    bandwidth = 0;
}

ballspawn(0);
setInterval(moveloop, 1000 / 60);
setInterval(gameloop, 1000);
setInterval(sendUpdates, 1000 / c.networkUpdateFactor);
setInterval(resetEmoji, 3000);
// setInterval(afkCheck, 60000); //change this to 1 minute
// setInterval(bandwidthCheck, bandWidthIteration);

if (ipaddress == 'www.footio.com.de' || ipaddress == 'localhost') {
    http
        .listen(serverport, '0.0.0.0', function () {
            console.log('[DEBUG] Listening on ' + ipaddress + ':' + serverport);
        });
} else {
    console.log('Running on TLS');
    ServerTLS.listen(serverport);
}

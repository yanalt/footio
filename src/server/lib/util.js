/* jslint node: true */

'use strict';

var cfg = require('../../../config.json');

function isAlphabetic(str){
    str = str.toLowerCase();
    let alphabet = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < str.length; i++) {
        let success = false;
        for (let j = 0; j < alphabet.length; j++) {
            if(str[i]== alphabet[j])
                success = true;
        }
        if(!success)
            return false;
    }
    return true;
}

exports.validNick = function (nickname) {
    // var regex = /^\w*$/;
    // return regex.exec(nickname) !== null;
};


exports.slurNick = function (nickname) {
    if(!isAlphabetic(nickname))
        return 'h4x0r';

    let roodypoo = ['nig','niq','nlg','nlq']; 
    let oyvey = ['kike','klke','hitler','h1tler'];
    let speedy = ['spic','splc','wetback'];
    let bbq =  ['tranny','trany','tranni','trani','tranl','trannl','troon'];
    let bop = ['kill','rape','gas','genocide','burn'];
    let ninja = ['chink','gook','nip','chlnk','nlp'];
    let candyass = ['fag','phag','fgt','phgt'];
    
    let loweredNickname=nickname.toLowerCase();

    for (let i = 0; i < roodypoo.length; i++) {
        // console.log(roodypoo[i] + ' ' + nickname + ' ' + '/'+roodypoo[i]+'/i' + nickname.search(roodypoo[i]));
        if(loweredNickname.search(roodypoo[i])!=-1)
            return 'roodypoo';
    }
    
    for (let i = 0; i < candyass.length; i++) 
        if(loweredNickname.search(candyass[i])!=-1)
            return 'candyass';

    for (let i = 0; i < oyvey.length; i++) 
        if(loweredNickname.search(oyvey[i])!=-1)
            return 'oyvey';
    

    for (let i = 0; i < speedy.length; i++) 
        if(loweredNickname.search(speedy[i])!=-1)
            return 'speedy';
    

    for (let i = 0; i < bbq.length; i++) 
        if(loweredNickname.search(bbq[i])!=-1)
            return 'bbq';
    

    for (let i = 0; i < bop.length; i++) 
        if(loweredNickname.search(bop[i])!=-1)
            return 'bop';
    

    for (let i = 0; i < ninja.length; i++) 
        if(loweredNickname.search(ninja[i])!=-1)
            return 'ninja';
                    
    return nickname;            
        
};

// determine mass from radius of circle
exports.massToRadius = function (mass) {
    return 4 + Math.sqrt(mass) * 6;
};


// overwrite Math.log function
exports.log = (function () {
    var log = Math.log;
    return function (n, base) {
        return log(n) / (base ? log(base) : 1);
    };
})();

// get the Euclidean distance between the edges of two shapes
exports.getDistance = function (p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)) - p1.radius - p2.radius;
};

exports.getRealDistance = function (p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

exports.randomInRange = function (from, to) {
    return Math.floor(Math.random() * (to - from)) + from;
};

// generate a random position within the field of play
exports.randomPosition = function (radius) {
    return {
        x: exports.randomInRange(radius, cfg.gameWidth - radius),
        y: exports.randomInRange(radius, cfg.gameHeight - radius)
    };
};

exports.randomTeamPosition = function (radius, team) {
    return {
        x: exports.randomInRange(team * cfg.gameWidth / 2 + radius, (1 + team) * cfg.gameWidth / 2 - radius),
        y: exports.randomInRange(radius, cfg.gameHeight - radius)
    };
};

exports.uniformPosition = function (points, radius) {
    var bestCandidate, maxDistance = 0;
    var numberOfCandidates = 10;

    if (points.length === 0) {
        return exports.randomPosition(radius);
    }

    // Generate the candidates
    for (var ci = 0; ci < numberOfCandidates; ci++) {
        var minDistance = Infinity;
        var candidate = exports.randomPosition(radius);
        candidate.radius = radius;

        for (var pi = 0; pi < points.length; pi++) {
            var distance = exports.getDistance(candidate, points[pi]);
            if (distance < minDistance) {
                minDistance = distance;
            }
        }

        if (minDistance > maxDistance) {
            bestCandidate = candidate;
            maxDistance = minDistance;
        } else {
            return exports.randomPosition(radius);
        }
    }

    return bestCandidate;
};

exports.findIndex = function (arr, id) {
    var len = arr.length;

    while (len--) {
        if (arr[len].id === id) {
            return len;
        }
    }

    return -1;
};

exports.randomColor = function () {
    var color = '#' + ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
    var c = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    var r = (parseInt(c[1], 16) - 32) > 0 ? (parseInt(c[1], 16) - 32) : 0;
    var g = (parseInt(c[2], 16) - 32) > 0 ? (parseInt(c[2], 16) - 32) : 0;
    var b = (parseInt(c[3], 16) - 32) > 0 ? (parseInt(c[3], 16) - 32) : 0;

    return {
        fill: color,
        border: '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    };
};

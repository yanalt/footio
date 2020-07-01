module.exports = {
    // Keys and other mathematical constants
    KEY_ENTER: 13,
    KEY_KICK: 119,
    KEY_LEFT: 37,
    KEY_UP: 38,
    KEY_RIGHT: 39,
    KEY_DOWN: 40,
    borderDraw: false,
    spin: -Math.PI,
    enemySpin: -Math.PI,
    mobile: false,

    // Canvas
    commercialCount: 8,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    gameWidth: 0,
    gameHeight: 0,
    gameStart: false,
    disconnected: false,
    kicked: false,
    startPingTime: 0,
    backgroundColor: '#7EC850',
    lineColor: '#000000',
    buttonAlignment: 'right',
    usingMobileVersion: true,
};
var global = require('./global');

var buttonSize;

class Canvas {
    constructor(params) {
        this.directionLock = false;
        this.target = global.target;
        this.resend = true;
        this.socket = global.socket;
        this.directions = [];
        this.powerTime = 0;
        this.bench = 0;
        var self = this;

        this.benchmark = function () {
            global.target.x = 500 * Math.cos(self.bench);
            global.target.y = 500 * Math.sin(self.bench);
            self.bench++;
            if (self.bench > 1000)
                self.bench = 1;
        };
        this.cv = document.getElementById('cvs');
        this.cv.width = global.screenWidth;
        this.cv.height = global.screenHeight;
        this.cv.addEventListener('mousemove', this.gameInput, false);
        this.cv.addEventListener('mouseout', this.outOfBounds, false);
        this.cv.addEventListener('keypress', this.keyInput, false);
        this.cv.addEventListener('keyup', function (event) {
            self.resend = true;
            self.directionUp(event);
            var key = (event.which || event.keyCode) + 32;
            if (key === global.KEY_KICK && this.parent.resend && self.powerTime != 0) {
                self.powerTime = (new Date().getTime() - self.powerTime);
                this.parent.socket.emit('1', self.powerTime / 100);
                this.parent.resend = false;
                self.powerTime = 0;
            }
        }, false);
        this.cv.addEventListener('keydown', this.directionDown, false);
        this.cv.addEventListener('touchstart', this.touchInput, false);
        this.cv.addEventListener('touchmove', this.touchMove, false);
        this.cv.addEventListener("touchend", this.touchEnd, false);
        this.cv.addEventListener("mousedown", this.mouseDown, false);
        this.cv.addEventListener("mouseup", this.mouseUp, false);
        this.cv.parent = self;
        global.canvas = this;
    }

    mouseDown(event) {
        if (event.button == 0) {
            this.parent.socket.emit('sprint');
        } else if (event.button == 2) {
            if (this.parent.powerTime == 0)
                this.parent.powerTime = new Date().getTime();
            this.parent.resend = false;
        }
    }

    mouseUp(event) {
        if (event.button == 2) {
            this.parent.powerTime = (new Date().getTime() - this.parent.powerTime);
            this.parent.socket.emit('1', this.parent.powerTime / 100);
            this.parent.resend = false;
            this.parent.powerTime = 0;
        }
    }

    // Function called when a key is pressed, will change direction if arrow key.
    directionDown(event) {
        var key = event.which || event.keyCode;
        var self = this.parent; // have to do this so we are not using the cv object
        if (self.directional(key) && this.parent.bench == 0) {
            // self.directionLock = true;
            if (self.newDirection(key, self.directions, true)) {
                self.updateTarget(self.directions);
                self.socket.emit('0', self.target);
            }
        }
    }

    // Function called when a key is lifted, will change direction if arrow key.
    directionUp(event) {
        var key = event.which || event.keyCode;
        if (this.directional(key) && this.parent.bench == 0) { // this == the actual class
            if (this.newDirection(key, this.directions, false)) {
                this.updateTarget(this.directions);
                if (this.directions.length === 0) this.directionLock = false;
                this.socket.emit('0', this.target);
            }
        }
    }

    // Updates the direction array including information about the new direction.
    newDirection(direction, list, isAddition) {
        var result = false;
        var found = false;
        for (var i = 0, len = list.length; i < len; i++) {
            if (list[i] == direction) {
                found = true;
                if (!isAddition) {
                    result = true;
                    // Removes the direction.
                    list.splice(i, 1);
                }
                break;
            }
        }
        // Adds the direction.
        if (isAddition && found === false) {
            result = true;
            list.push(direction);
        }

        return result;
    }


    directional(key) {
        return this.horizontal(key) || this.vertical(key);
    }

    horizontal(key) {
        return key == global.KEY_LEFT || key == global.KEY_RIGHT;
    }

    vertical(key) {
        return key == global.KEY_DOWN || key == global.KEY_UP;
    }

    // Register when the mouse goes off the canvas.
    outOfBounds() {
        if (!global.continuity && this.parent.bench == 0) {
            this.parent.target = {
                x: 0,
                y: 0
            };
            global.target = this.parent.target;
        }
    }

    gameInput(mouse) {
        if (!this.directionLock && this.parent.bench == 0) {
            this.parent.target.x = mouse.clientX - this.width / 2;
            this.parent.target.y = mouse.clientY - this.height / 2;
            global.target = this.parent.target;
        }
    }

    touchMove(touch) {
        buttonSize = global.screenWidth / 12;
        touch.preventDefault();
        touch.stopPropagation();
        if (!this.directionLock) {
            if (global.buttonAlignment == 'right') {
                if (touch.touches[0].clientX <= 2.5 * buttonSize || touch.touches[0].clientY <= this.height - 2 * buttonSize) {
                    this.parent.target.x = 2 * (touch.touches[0].clientX - buttonSize);
                    this.parent.target.y = 2 * (touch.touches[0].clientY - (this.height - buttonSize));
                    global.target = this.parent.target;
                }
            } else {
                if (touch.touches[0].clientX >= this.width - 2.5 * buttonSize || touch.touches[0].clientY <= this.height - 2 * buttonSize) {
                    this.parent.target.x = 2 * (touch.touches[0].clientX - (this.width - buttonSize));
                    this.parent.target.y = 2 * (touch.touches[0].clientY - (this.height - buttonSize));
                    global.target = this.parent.target;
                }
            }
        }
    }


    touchInput(touch) {
        touch.preventDefault();
        touch.stopPropagation();
        buttonSize = global.screenWidth / 12;
        // console.log(touch.touches[0].clientX + "," + touch.touches[0].clientY);
        // console.log(this);
        if (!this.directionLock) {
            if (touch.touches[1]) {

                if (touch.touches[1].clientX <= this.width -3*buttonSize - 10 + buttonSize && touch.touches[1].clientX >= this.width -3*buttonSize - 10 - buttonSize) {
                    if (touch.touches[1].clientY <= this.height && touch.touches[1].clientY >= this.height - 2 * buttonSize) {
                        this.parent.socket.emit('sprint');
                    }
                } else if (global.buttonAlignment == 'right') {
                    if (touch.touches[1].clientX <= this.width && touch.touches[1].clientX >= this.width - 2 * buttonSize) {
                        if (touch.touches[1].clientY <= this.height && touch.touches[1].clientY >= this.height - 2 * buttonSize) {

                            this.parent.powerTime = new Date().getTime();
                        }
                    }
                } else {
                    if (touch.touches[1].clientX <= 2 * buttonSize && touch.touches[1].clientX >= 0) {
                        if (touch.touches[1].clientY <= this.height && touch.touches[1].clientY >= this.height - 2 * buttonSize) {

                            this.parent.powerTime = new Date().getTime();
                        }
                    }
                }
            } else {
                if (touch.touches[0].clientX <= this.width -3*buttonSize - 10 + buttonSize && touch.touches[0].clientX >= this.width -3*buttonSize - 10 - buttonSize) {
                    if (touch.touches[0].clientY <= this.height && touch.touches[0].clientY >= this.height - 2 * buttonSize) {
                        this.parent.socket.emit('sprint');
                    }
                } else if (global.buttonAlignment == 'right') {
                    if (touch.touches[0].clientX <= this.width && touch.touches[0].clientX >= this.width - 2 * buttonSize) {
                        if (touch.touches[0].clientY <= this.height && touch.touches[0].clientY >= this.height - 2 * buttonSize) {

                            this.parent.powerTime = new Date().getTime();
                        }
                    } else {
                        this.parent.target.x = 2 * (touch.touches[0].clientX - buttonSize);
                        this.parent.target.y = 2 * (touch.touches[0].clientY - (this.height - buttonSize));
                        global.target = this.parent.target;
                    }
                } else {
                    if (touch.touches[0].clientX <= 2 * buttonSize && touch.touches[0].clientX >= 0) {
                        if (touch.touches[0].clientY <= this.height && touch.touches[0].clientY >= this.height - 2 * buttonSize) {

                            this.parent.powerTime = new Date().getTime();
                        }
                    } else {
                        this.parent.target.x = 2 * (touch.touches[0].clientX - (this.width - buttonSize));
                        this.parent.target.y = 2 * (touch.touches[0].clientY - (this.height - buttonSize));
                        global.target = this.parent.target;
                    }
                }
            }
        }
    }

    touchEnd(touch) {
        // console.log(this.width + "," + buttonSize);
        touch.preventDefault();
        buttonSize = global.screenWidth / 12;
        if (!this.directionLock) {
            if (touch.touches[1]) {
                if (touch.touches[1].clientX <= this.width && touch.touches[1].clientX >= this.width - 2 * buttonSize) {
                    if (touch.touches[1].clientY <= this.height && touch.touches[1].clientY >= this.height - 2 * buttonSize) {
                        this.parent.socket.emit('1', (new Date().getTime() - this.parent.powerTime) / 100);
                        this.parent.resend = false;
                        this.parent.powerTime = 0;
                    }
                }
            } else if (touch.changedTouches[0]) {
                if (touch.changedTouches[0].clientX <= this.width && touch.changedTouches[0].clientX >= this.width - 2 * buttonSize) {
                    if (touch.changedTouches[0].clientY <= this.height && touch.changedTouches[0].clientY >= this.height - 2 * buttonSize) {
                        this.parent.socket.emit('1', (new Date().getTime() - this.parent.powerTime) / 100);
                        this.parent.resend = false;
                        this.parent.powerTime = 0;
                    }
                }
            } else if (this.parent.powerTime != 0) {
                this.parent.socket.emit('1', (new Date().getTime() - this.parent.powerTime) / 100);
                this.parent.resend = false;
                this.parent.powerTime = 0;
            }
        }
    }

    keyInput(event) {
        var key = (event.which || event.keyCode);
        if (key === global.KEY_KICK) {
            if (this.parent.powerTime == 0)
                this.parent.powerTime = new Date().getTime();
            this.parent.resend = false;
        } else if (key === 101) {
            // setInterval(this.parent.benchmark, 100);
            this.parent.socket.emit('sprint');
        } else if (key >= 49 && key <= 54) {
            //console.log(key-49);
            this.parent.socket.emit('5', key - 49);
        } else if (event.key === 'r') {
            setInterval(this.parent.benchmark, 100);
        }
    }
}

module.exports = Canvas;

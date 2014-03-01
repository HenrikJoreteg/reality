// Simmer is a simulation runner for Newton.js designed
// to be used in rich UI applications (not games) where
// you want to be able to run simulations until particles
// you care about have stopped and then automatically
// halt the simulation.

// The defalt constraints are the window's inner dimensions
var Newton = require('newton');
var root = (typeof window !== 'undefined') ? window : global;
var WildEmitter = require('wildemitter');


function Simmer(spec) {
    WildEmitter.call(this);

    // our defaults
    this.spec = {
        border: true,
        width: root.innerWidth || 500,
        height: root.innerHeight || 500
    };
    this.renderCallbacks = [];
    this.simCallbacks = [];

    // update our settings with passed in options
    for (var item in this.spec) {
        if (spec && spec.hasOwnProperty(item)) this.spec[item] = spec[item];
    }

    this.simulator = Newton.Simulator(this._simulate.bind(this), this._render.bind(this));

    if (this.spec.border) {
        this.border = Newton.BoxConstraint(0, 0, this.spec.width, this.spec.height);
        this.simulator.add(this.border);
    }
}

Simmer.prototype = Object.create(WildEmitter.prototype, {
    constructor: Simmer
});

Simmer.prototype.addSimFunction = function (func) {
    this.simCallbacks.push(func);
};

Simmer.prototype.addRenderFunction = function (func) {
    this.renderCallbacks.push(func);
};

Simmer.prototype._render = function () {
    var i = 0;
    var l = this.renderCallbacks.length;
    for (; i < l; i++) {
        this.renderCallbacks[i].apply(this, arguments);
    }
};

// internal simulation callback
Simmer.prototype._simulate = function (frame, simulator) {
    var self = this;
    var i = 0;
    var l = this.simCallbacks.length;
    var moving;
    for (; i < l; i++) {
        this.simCallbacks[i].apply(this, arguments);
    }
    // see if any of our particles are moving
    this.simulator.particles.forEach(function (particle) {
        if (self.isMoving(particle)) {
            moving = true;
            delete particle.stillCount;
        } else {
            particle.stillCount++ || (particle.stillCount = 1);

            if (particle.stillCount < 10) {
                moving = true;
            }
        }
    });

    // if none of them are moving, stop the simulator
    if (!moving) {
        this.stop();
    }
};

Simmer.prototype.isMoving = function (particle) {
    return Math.abs(particle.velocity.x) > 0.01 || Math.abs(particle.velocity.y) > 0.01;
};

Simmer.prototype.stop = function () {
    // reset all particle still counters then stop
    this.simulator.particles.forEach(function (particle) {
        delete particle.stillCount;
    });
    this.simulator.stop();
    this.emit('stop');
};

Simmer.prototype.addAndRun = function (thing) {
    this.add(thing);
    this.simulator.start();
    this.emit('start');
};

// Helper for convenience.
Simmer.prototype.addGravity = function (strength, direction) {
    this.gravity = new Newton.LinearGravity(direction || 0, strength || 0.001);
    this.simulator.add(this.gravity);
};

Simmer.prototype.add = function (thing) {
    try {
        this.simulator.add(thing);
    } catch (e) {
        this.simulator.addParticles([thing])
    }
};

Simmer.prototype.getDebugCanvas = function () {
    if (!root.document) return;
    var canvas = document.createElement('canvas');
    var renderer;
    canvas.width = this.spec.width;
    canvas.height = this.spec.height;
    renderer = Newton.Renderer(canvas, this.spec.width, this.spec.height);
    this.addRenderFunction(renderer.callback);
    return canvas;
};

Simmer.prototype.showDebugCanvas = function () {
    if (!root.document) return;
    var canvas = this.getDebugCanvas();
    canvas.style.position = "fixed";
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.zIndex = -1;
    document.body.appendChild(canvas);
};


module.exports = Simmer;

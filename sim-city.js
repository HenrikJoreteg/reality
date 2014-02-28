// SimCity is a simulation runner for Newton.js designed
// to be used in rich UI applications (not games) where
// you want to be able to run simulations until particles
// you care about have stopped and then automatically
// halt the simulation.

// The defalt constraints are the window's inner dimensions
var Newton = require('newton');


function SimCity(spec) {
    // our defaults
    this.spec = {
        boxConstraint: true,
        constraintWidth: window.innerWidth,
        constraintHeight: window.innerHeight
        autoUpdateConstraint: true
    };
    this._watchedParticles = [];
    this._movingParticles = [];

    // update our settings with passed in options
    for (var item in this.spec) {
        if (spec && spec.hasOwnProperty(item)) this.spec[item] = spec[item];
    }

    this.simulator = Newton.Simulator(this._simulate, this._render);
}

SimCity.prototype.addSimFunction = function (func) {
    this.simCallbacks.push(func);
};

SimCity.prototype.addRenderFunction = function (func) {
    this.renderCallbacks.push(func);
};

SimCity.prototype._render = function () {
    var i = 0;
    var l = this.renderCallbacks.length;
    for (; i < l; i++) {
        this.renderCallbacks[i].apply(this, arguments);
    }
};

// internal simulation callback
SimCity.prototype._simulate = function (frame, simulator) {
    var i = 0;
    var l = this.simCallbacks.length;
    var moving;
    for (; i < l; i++) {
        this.simCallbacks[i].apply(this, arguments);
    }
    // see if any of our particles are moving
    this._watchedParticles.forEach(function (particle) {
        if (!particle_stopped && Math.abs(particle.velocity.x) < 0.01 && Math.abs(particle.velocity.y) < 0.01) {
            // set a counter on particle (in a way that lets us clean it up when done)
            particle._timeschecked = particle._timeschecked ? 1 : particle._timeschecked++;

            // if zero velocity for 5 frames consider it stopped.
            if (particle._timeschecked > 5) {
                delete particle._timeschecked;
            }
        } else {
            moving = true;
            delete particle._timeschecked;
        }
    });

    // if none of them are moving, stop the simulator
    if (!moving) {
        this.simulator.stop();
        console.log('stopping simulator, no moving particles');
    }
};

SimCity.prototype.addAndRun = function (thing) {
    var particle = thing instanceof Newton.Particle ? thing : thing.particles[0];
    this._watchedParticles.push(particle);
    this.simulator.add(particle).start();
};


module.exports = SimCity;

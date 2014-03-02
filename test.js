var assert = require('assert');
var Reality = require('./reality');
var Newton = require('./newton');

var sim = new Reality();

var p = Newton.Particle(100, 100);

sim.on('start', function () {
    console.log('start event');
    assert.ok(true, 'start event');
});

sim.on('stop', function () {
    console.log('stop event');
    assert.ok(true, 'stop event');
});

sim.addGravity();
sim.addAndRun(p);
sim.showDebugCanvas();


if (typeof window !== 'undefined') window.sim = sim;

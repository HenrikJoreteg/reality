# reality

Helper for using a physics simulator for an application interface. 

It runs a [Newton Simulator](https://github.com/hunterloftis/newton) (a cool, written-from-the-ground-up-in-JS physics engine) in a way that makes it easy to work with for building rich interactions into a clientside javascript application.

Physics simulations can be useful for JavaScript application UIs. Giving DOM elements momentum, weight and applying gravity can make for some really awesome app interfaces. But, unlike games, when running simulations for UIs you typically don't want to keep the simulator running all the time. 

A better pattern is to only run your simulation until all the particles are stopped (or really close to stopped), that way you don't leave it looping at full speed for no reason.

But, that's not how physics engines are typically designed to work.

So, I wrote this. 

This is still in early development, more to come. 

## credits

[@HenrikJoreteg](http://twitter.com/henrikjoreteg)

## license

MIT

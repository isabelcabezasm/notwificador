'use strict';
var five = require("johnny-five");
var Edison = require("edison-io");
// Pin 13 is the default pin on the large Arduino breakout board.
var LEDPIN = 13

// Create a Johnny Five board instance to represent your Arduino.
// board is simply an abstraction of the physical hardware, whether it is 
// an Intel Edison, Arduino, Raspberry Pi or other boards. 
// For boards other than Arduino you must specify the IO plugin.
var board = new five.Board({
    io: new Edison()
});


// The board.on() executes the anonymous function when the
// board reports back that it is initialized and ready. 
board.on("ready", function () {
    console.log("Board connected...");
    
    var led = new five.Led(LEDPIN);
    led.blink(1000);

});

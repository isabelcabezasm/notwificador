'use strict';
var five = require("johnny-five");

var Edison = require("edison-io");

// Define the sensors you will use
var button, led;

// Define the board, which is an abstraction of the Intel Edison
var board = new five.Board({
    io: new Edison()
});



// The board.on() executes the anonymous function when the
// board reports back that it is initialized and ready. 

board.on("ready", function () {
    console.log("Board connected...");

    // Plug the LED module into the
    // Grove Shield's D6 jack.
    led = new five.Led(6);

    // Plug the Button module into the
    // Grove Shield's D4 jack.
    button = new five.Button(4);

    // *********************************************
    // The button.on('press') invokes the anonymous 
    // callback when the button is pressed.
    // *********************************************
    button.on('press', function () {
        console.log('PRESSED');
        led.on();
    });

    // *********************************************
    // The button.on('release') invokes the
    // anonymous callback when the button is
    // released.
    // *********************************************
    button.on('release', function () {
        console.log('RELEASED');
        led.off();
    });
});

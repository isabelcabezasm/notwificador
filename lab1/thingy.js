'use strict';

var five = require("johnny-five");
var Edison = require("edison-io");

// Define the sensors you will use
var button, led, lcd, temperature;

// Define some variable for holding sensor values
var tempC, tempF, humidity, r, g, b = 0;

// Define the board, which is an abstraction of the Intel Edison
var board = new five.Board({
    io: new Edison()
});




// *********************************************
// The board.on() executes the anonymous
// function when the 'board' reports back that
// it is initialized and ready.
// *********************************************
board.on('ready', function () {
    console.log('Board connected...');

    // Plug the Temperature sensor module
    // into the Grove Shield's A0 jack
    // The controller defines the type of 
    // Temperature sensor this is.
    temperature = new five.Thermometer({
        controller: "GROVE",
        pin: "A0"
    });

    // Plug the LCD module into any of the
    // Grove Shield's I2C jacks.
    // The controller specifies the type of LCD this is.
    lcd = new five.LCD({
        controller: 'JHD1313M1'
    });

    // Plug the LED module into the
    // Grove Shield's D6 jack.
    led = new five.Led(6);

    // Plug the Button module into the
    // Grove Shield's D4 jack.
    button = new five.Button(4);

    // *********************************************
    // The thermometer object will invoke a callback
    // everytime it reads data as fast as every 25ms
    // or whatever the 'freq' argument is set to.
    // *********************************************
    temperature.on('data', function () {
        // Set the state of the variables based on the 
        // value read from the thermometer
        // 'this' scope is the thermometer
        tempC = this.celsius;
        tempF = this.fahrenheit;



        // Use a simple linear function to determine
        // the RGB color to paint the LCD screen.
        // The LCD's background will change color
        // according to the temperature.
        // Hot -> Moderate -> Cold
        // 122°F ->  77°F  -> 32°F
        // 50°C  ->  25°C  -> 0°C
        // Red ->  Violet  -> Blue
        r = linear(0x00, 0xFF, tempC, 50);
        g = linear(0x00, 0x00, tempC, 50);
        b = linear(0xFF, 0x00, tempC, 50);

        // Paint the LCD and print the temperture
        // (rounded up to the nearest whole integer)
        lcd.bgColor(r, g, b).cursor(0, 0).print('Fahrenheit: ' + Math.ceil(tempF));
        lcd.bgColor(r, g, b).cursor(1, 0).print('Celsius: ' + Math.ceil(tempC));
    });

    // *********************************************
    // The button.on('press') invokes the anonymous 
    // callback when the button is pressed.
    // *********************************************
    button.on('press', function () {
        led.on();
        console.log('PRESSED');
    });

    // *********************************************
    // The button.on('release') invokes the
    // anonymous callback when the button is
    // released.
    // *********************************************
    button.on('release', function () {
        led.off();
        console.log('RELEASED');
    });
});


// *********************************************
// Helper method for painting the LCD.
// Linear Interpolation
// (https://en.wikipedia.org/wiki/Linear_interpolation)
// *********************************************
function linear(start, end, step, steps) {
    return (end - start) * step / steps + start;
}
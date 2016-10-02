'use strict';
// Define the objects you will be working with
var five = require('johnny-five');
var Edison = require('edison-io');
var device = require('azure-iot-device');

// Define the client object that communicates with Azure IoT Hubs
var Client = require('azure-iot-device').Client;

// Define the message object that will define the message format going into Azure IoT Hubs
var Message = require('azure-iot-device').Message;

// Define the protocol that will be used to send messages to Azure IoT Hub
// For this lab we will use AMQP over Web Sockets. The usage of Web Sockets allows using
// AMQP also in environments where standard AMQP ports do not work (for example,
// because of network restrictions).
var Protocol = require('azure-iot-device-amqp-ws').AmqpWs;


// The device-specific connection string to your Azure IoT Hub
var connectionString = process.env.IOTHUB_DEVICE_CONN || 'HostName=Notwificador.azure-devices.net;DeviceId=Edison;SharedAccessKey=8CZpKf2lmErzR1bQweIf9WkQfEZ/GImpzZXnsRJ66co=';

// Create the client instanxe that will manage the connection to your IoT Hub
// The client is created in the context of an Azure IoT device.
var client = Client.fromConnectionString(connectionString, Protocol);




// Extract the Azure IoT Hub device ID from the connection string
var deviceId = device.ConnectionString.parse(connectionString).DeviceId;

// location is simply a string that you can filter on later
var location = process.env.DEVICE_LOCATION || 'intel';





// Define the sensors you will use
var button, led, lcd, temperature;

// Define some variable for holding sensor values
var tempC, tempF, humidity, r, g, b = 0;




// Define the board, which is an abstraction of the Intel Edison
var board = new five.Board({
    io: new Edison()
});




// *********************************************
// Send a messae to Azure IoT Hub.
// Always send the same message format (to 
// ensure the StreamAnalytics job doesn't fail)
// includng deviceId, location and the sensor 
// type/value combination.
// *********************************************

function sendMessage(src, val) {
    // Define the message body
    var payload = JSON.stringify({
        deviceId: deviceId,
        location: location,
        sensorType: src,
        sensorValue: val
    });

    // Create the message based on the payload JSON
    var message = new Message(payload);

    // For debugging purposes, write out the message payload to the console
    console.log('Sending message: ' + message.getData());

    // Send the message to Azure IoT Hub
    client.sendEvent(message, printResultFor('send'));

    console.log('- - - -');
}

// *********************************************
// Helper function to print results in the console
// *********************************************
function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

// *********************************************
// Open the connection to Azure IoT Hub.
// When the connection respondes (either open or 
// error) the anonymous function is executed.
// *********************************************
var connectCallback = function (err) {
    console.log('Open Azure IoT connection...');

    // *********************************************
    // If there is a connection error, display it 
    // in the console.
    // *********************************************
    if (err) {
        console.error('...could not connect: ' + err);

        // *********************************************
        // If there is no error, send and receive
        // messages, and process completed messages.
        // *********************************************
    } else {
        console.log('...client connected');

        // *********************************************
        // Create a message and send it to the IoT Hub
        // every two-seconds
        // *********************************************
        var sendInterval = setInterval(function () {
            sendMessage('temperature', tempC);
        }, 2000);

        // *********************************************
        // Listen for incoming messages
        // *********************************************
        client.on('message', function (msg) {
            console.log('*********************************************');
            console.log('**** Message Received - Id: ' + msg.messageId + ' Body: ' + msg.data);
            console.log('*********************************************');

            var parsedData = JSON.parse(msg.data);
            // Toggle LED state based on the value received
            if (parsedData.ledState === 1) {
                led.on();
            } else {
                led.off();
            }

            // *********************************************
            // Process completed messages and remove them 
            // from the message queue.
            // *********************************************
            client.complete(msg, printResultFor('completed'));
            // reject and abandon follow the same pattern.
            // /!\ reject and abandon are not available with MQTT
        });

        // *********************************************
        // If the client gets an error, dsiplay it in
        // the console.
        // *********************************************
        client.on('error', function (err) {
            console.error(err.message);
        });

        // *********************************************
        // If the client gets disconnected, cleanup and
        // reconnect.
        // *********************************************
        client.on('disconnect', function () {
            clearInterval(sendInterval);
            client.removeAllListeners();
            client.connect(connectCallback);
        });
    }
}





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
        console.log('*********************************************');
        sendMessage('led', 'on');
        console.log('*********************************************');
    });

    // *********************************************
    // The button.on('release') invokes the
    // anonymous callback when the button is
    // released.
    // *********************************************
    button.on('release', function () {
        led.off();
        console.log('*********************************************');
        sendMessage('led', 'off');
        console.log('*********************************************');
    });

    // *********************************************
    // Open the connection to Azure IoT Hubs and
    // begin sending messages.
    // *********************************************
    client.open(connectCallback);

});


// *********************************************
// Helper method for painting the LCD.
// Linear Interpolation
// (https://en.wikipedia.org/wiki/Linear_interpolation)
// *********************************************
function linear(start, end, step, steps) {
    return (end - start) * step / steps + start;
}
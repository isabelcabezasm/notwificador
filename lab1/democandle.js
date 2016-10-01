'use strict';
var connectionString = 'HostName=Notwificador.azure-devices.net;DeviceId=Edison;SharedAccessKey=8CZpKf2lmErzR1bQweIf9WkQfEZ/GImpzZXnsRJ66co='

var Playbulb = require('./playbulb.js');
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-amqp-ws').AmqpWs;

function randInt(n) {
    return Math.floor(Math.random() * n);
}

var pb = new Playbulb.PlaybulbCandle("PLAYBULB CANDLE");//("bombi  ");
var pbReady = false;
pb.ready(function () {
    pbReady = true;
    //console.log("Playbulb Candle Demo Mode");
    //var flashMax = 20;
    //var changeColours = function (flashCount) {
    //        var r = randInt(256), g = randInt(256), b = randInt(256);
    //        console.log("Setting colour to red: " + r + ", green: " + g + ", blue: " + b);
    //        pb.setColor(255, r, g, b);
    //        setTimeout(function () { changeColours(flashCount - 1); }, 100);
    //};
    //changeColours(flashMax);
});

var client = Client.fromConnectionString(connectionString, Protocol);

function connected(err) {
    if (err) {
        console.log("connection error: " + err);
    } else {
        client.on('message', function (msg) {
            if (pbReady) {
                console.log("Message received " + msg.messageId + " " + msg.getData());
                //var values = JSON.parse(msg.getData());
                //console.log(values);
                //pb.setColor(values.s, values.r, values.g, values.b);
                client.complete(msg, function (msgErr) {
                    if (msgErr)
                        console.log(msgErr);
                    else
                        console.log("done");
                });
            }
            else {
                console.log("candle not ready");
            }
        });
    }
}

client.open(connected);

'use strict';

var noble = require('noble');

var Smartbulb = require('./smartbulb.js'); // esto es OK


//var Playbulb = require('playbulb');


//noble.on('stateChange', function (state) {
    //if (state === 'poweredOn')
    {
        var pb = new Smartbulb.SmartbulbCandle("PLAYBULB CANDLE");// Playbulb.PlaybulbCandle("PLAYBULB CANDLE");
        console.log("PLAYBULB");
        pb.ready(function () {
            console.log("Set color to green");
            pb.setColor(255, 255, 255, 0); // set fixed color in Saturation, R, G, B
        });

    }
    //else
    //    noble.stopScanning();
//});
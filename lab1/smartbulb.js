'use strict';
var noble = require('noble');

var SETCOLOR = -1;
var types = {
    COLOR: {
        colorUuid: "0018",
        effectsUuid: "0016",
        modes: {
            FLASH: 0,
            PULSE: 1,
            RAINBOWJUMP: 2,
            RAINBOWFADE: 3
        }
    },
    CANDLE: {
        colorUuid: "fffb",
        effectsUuid: "fffc",
        modes: {
            FADE: 0,
            JUMPRGB: 1,
            FADERGB: 2,
            FLICKER: 3
        }
    }
};


var Smartbulb = function (type, playbulbName, colorUuid, effectsUuid) {

    console.log("He entrao en Smartbulb");
    //console.log(type);
    //console.log(playbulbName);
    //console.log(colorUuid);  //aquí no hay nada 
    //console.log(effectsUuid); //aquí no hay nada

    playbulbName = playbulbName || "Smartbulb";

    colorUuid = colorUuid || types[type].colorUuid;
    effectsUuid = effectsUuid || types[type].effectsUuid;

    
    //console.log(playbulbName); //bombi
    //console.log(colorUuid);  //0018
    //console.log(effectsUuid); //a0016



    var colorChar, effectsChar;
    var yesReady = false;
    var waiting = [];
    var modes = types[type].modes;


    //no tengo ni idea de qué hace esto
    var isReady = function (callback) {

        console.log("is ready");

        if (callback) {
            console.log("hay callback");

            if (yesReady) {
                setTimeout(callback, 0); // run async
            } else {
                waiting.push(callback);
            }
        } else if (colorChar !== null && effectsChar !== null) {
            yesReady = true;
            var waiter;

            while (waiting.length > 0) {
                waiter = waiting.pop(0);
                setTimeout(waiter, 0); // run each waiter async
            }
        }
    };

    var decimalToHexBytes = function (speed, max) {

        var speedRanged = speed * max;
        var speedHex = speedRanged.toString(16);
        while (speedHex.length < 4) {
            speedHex = "0" + speedHex;
        }

        return [parseInt(speedHex.substring(0, 2), 16), parseInt(speedHex.substring(2, 4), 16)];
    };

    var runEffect = function (saturation, r, g, b, effect, speed) {
        console.log("runEffect");

        if (!isReady) {
            throw "playbulb not ready";
        }
        if (saturation < 0 || saturation > 255 || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
            throw "saturation, r, g and b must be between 0 and 255";

        }
        if (effect !== SETCOLOR) {
            if (speed < 0 || speed > 1) {
                throw "speed must be between 0 and 1";
            }
            var max;
            var speedBytes;


            if (type === "COLOR") {
                speed = 1 - speed; // 0 is slow, 1 is fast
                max = effect === modes.PULSE ? 7710 : 17990;
                speedBytes = decimalToHexBytes(speed, max); // max hex is: 1E 1E


            } else if (type === "CANDLE") {
                max = 255;
                // special handling for this:
                // 00-> ff, 00 => really slow, 01 => really fast, 02 => slower
                if (speed === 0) {
                    speedBytes = 0;
                } else if (speed === 1) {
                    speedBytes = 1;
                } else {
                    speedBytes = decimalToHexBytes(speed, max); // max hex is: 1E 1E
                    if (speedBytes < 3) {
                        speedBytes = 3;
                    }
                }
            }


            var effectBytes = new Buffer([0, r, g, b, effect, 0, speedBytes[0], speedBytes[1]]);
            effectsChar.write(effectBytes);


        } else {
            console.log("vamos a escribir");
            var colorBytes = new Buffer([saturation, r, g, b]);
            colorChar.write(colorBytes);
            console.log("escrito");
        }
    };

    // connect to device and get characteristics, callback to ready listeners when done
  
    noble.startScanning();
    noble.on('discover', function (peripheral) {
        console.log(peripheral.advertisement.localName + "===" + playbulbName +"?");
        if (peripheral.advertisement.localName === playbulbName) {
            console.log("yes");

            peripheral.connect(function (error) {
                if (error) {
                    throw error;
                }


                peripheral.discoverAllServicesAndCharacteristics();

                peripheral.on('servicesDiscover', function (services) {
  



                    services.map(function (service) {
                        //console.log(service);
                        service.on('characteristicsDiscover', function (characteristics) {



                            characteristics.map(function (characteristic) {

                          //      console.log(characteristic);

                                /** por aquí nunca va a pasar**/

                                if (characteristic.uuid === colorUuid) { //si la caracteristica es el "color"
                                    console.log("colorUuid found");
                                    colorChar = characteristic;

                                    isReady();
                                } else if (characteristic.uuid === effectsUuid) {  //si la caracteristica es los "efectos"

                                    effectsChar = characteristic;
                                    isReady();
                                }

                                //por aquí debe entrar
                                //   name: 'Device Name',
                                if (characteristic.uuid === "8888") { //si la caracteristica es el "device name"

                                    console.log("He encontrado una caracteristica");
                                    colorChar = characteristic; //venga lo que sea
                                    isReady();
                                } 




                            });
                        });
                    });
                });
            });
        }
    });

    return {
        runEffect: runEffect,
        ready: function (callback) {
            isReady(callback);
        }
    };
};

var SmartbulbColor = function (deviceName) {
    console.log("He entrao");
    console.log("devicename: " + deviceName);

    var type = "COLOR";
    var pb = new Smartbulb(type, deviceName);

    console.log("pb: "+pb);

    return {
        setColor: function (saturation, r, g, b) {
            console.log("setColor");
            pb.runEffect(saturation, r, g, b, SETCOLOR);
        },
        setPulse: function (saturation, r, g, b, speed) {
            pb.runEffect(saturation, r, g, b, types[type].modes.PULSE, speed);
        },
        setFlash: function (saturation, r, g, b, speed) {
            pb.runEffect(saturation, r, g, b, types[type].modes.FLASH, speed);
        },
        setRainbowJump: function (saturation, r, g, b, speed) {
            pb.runEffect(saturation, r, g, b, types[type].modes.RAINBOWJUMP, speed);
        },
        setRainbowFade: function (saturation, r, g, b, speed) {
            pb.runEffect(saturation, r, g, b, types[type].modes.RAINBOWFADE, speed);
        },
        ready: function (callback) {
            pb.ready(callback);
        }
    };
};

var SmartbulbCandle = function (deviceName) {
    var type = "CANDLE";
    var pb = new Smartbulb(type, deviceName);

    return {
        setColor: function (saturation, r, g, b) {
            pb.runEffect(saturation, r, g, b, SETCOLOR);
        },
        setFade: function (saturation, r, g, b, speed) {
            pb.runEffect(saturation, r, g, b, types[type].modes.FADE, speed);
        },
        setJumpRGB: function (saturation, r, g, b, speed) {
            pb.runEffect(saturation, r, g, b, types[type].modes.JUMPRGB, speed);
        },
        setFadeRGB: function (saturation, r, g, b, speed) {
            pb.runEffect(saturation, r, g, b, types[type].modes.FADERGB, speed);
        },
        setFlicker: function (saturation, r, g, b, speed) {
            pb.runEffect(saturation, r, g, b, types[type].modes.FLICKER, speed);
        },
        ready: function (callback) {
            pb.ready(callback);
        }
    };
};

module.exports = {
    SmartbulbColor: SmartbulbColor,
    SmartbulbCandle: SmartbulbCandle
};
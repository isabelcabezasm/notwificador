var iothub = require('azure-iothub');
var connectionString = 'HostName=Notwificador.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=SwFLUdj5il1qTE61SCQd6uGSu4qGmDBh+AzWeG+RBd4=';
var registry = iothub.Registry.fromConnectionString(connectionString);
var client = iothub.Client.fromConnectionString(connectionString);

var counter = 0;
function randInt(n) {
    return Math.floor(Math.random() * n);
}
function a() {
    var colorObj = { s: randInt(256), r: randInt(256), g: randInt(256), b: randInt(256) };
    var color = JSON.stringify(colorObj);
    client.send('Edison', color, function (err) {
        if (err) {
            console.log('Error: ' + err);
        }
    });
    console.log(color+' :' + counter++);
    setTimeout(a, 10000);
}

client.open(a);
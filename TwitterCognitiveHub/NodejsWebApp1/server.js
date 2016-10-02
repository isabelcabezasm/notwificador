var twitter = require('twitter');
var request = require('request');
var iothub = require('azure-iothub');

var connectionString = 'HostName=Notwificador.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=SwFLUdj5il1qTE61SCQd6uGSu4qGmDBh+AzWeG+RBd4='; 
var hubClient = iothub.Client.fromConnectionString(connectionString);
var redObj = { s:255, r: 255, g: 0, b: 0 };
var red = JSON.stringify(redObj);
var blueObj = { s: 255, r: 0, g: 0, b: 255 };
var blue = JSON.stringify(blueObj);
var greenObj = { s: 255, r: 0, g: 0, b: 255 };
var green = JSON.stringify(greenObj);

var client = new twitter({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

var tweetsTopic = "TechSummit";
var tweetsLanguage = "en"; //"es", "en", "fr", "pt"
var tweetsText = '';
var sentiment = 0.5;
var counter = 0;


function search() {
    var myJSON = { "documents": [] };
    var stream = client.stream('statuses/filter', { track: tweetsTopic, language: tweetsLanguage });

    stream.on('data', function (event) {
        var retweeted = event.retweeted_status;
        var tweet = (retweeted == null ? event.text : event.retweeted_status.text);
        var cleanTweet = cleanText(tweet);
        tweetsText += " " + cleanTweet;
    });

    stream.on('error', function (error) {
        console.log(error);
    });
}

function analyzeTweets() {
    if (tweetsText.length > 0) {
        analyzeText(tweetsText);
        tweetsText = '';
    }
}

//setInterval(analyzeTweets, 1000);

function analyzeText(tweet) {
    var score = 0;
    var myJSON = { "documents": [{ id: 1, text: tweet }] };
    var options = {
        url: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment',
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': process.env.SUBSCRIPTION_KEY,
            'Accept': 'application/json'
        },

        method: "POST",
        body: JSON.stringify(myJSON)
    };
    var result = request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var color = '';
            var info = JSON.parse(body);
            score = info.documents[0].score;
            sentiment = (sentiment + score) / 2;
            if (sentiment > 0.6)
                color = green;
            else if (sentiment < 0.4)
                color = red;
            else
                color = blue;

            hubClient.send('Edison', color, function (err) {
                if (err) {
                    console.log('Error: ' + err);
                }
            });
            console.log(counter + " - " + sentiment + " - " + red);
        }
        else
            console.log(error);
    });
    setTimeout(analyzeTweets, 10000);
}

hubClient.open(search);

//Helper functions

function cleanText(text) {
    var urlLess_text = text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
    var myCleanText = urlLess_text.replace(/\B@[a-z0-9_-]+/gi, '');

    return myCleanText;
}

function randInt(n) {
    return Math.floor(Math.random() * n);
}

search();
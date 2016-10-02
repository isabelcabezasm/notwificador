var twitter = require('twitter');
var request = require('request');
var iothub = require('azure-iothub');

var connectionString = process.env.CONNECTION_STRING; 
var hubClient = iothub.Client.fromConnectionString(connectionString);
var redObj = { s:0, r: 255, g: 0, b: 0 };
var red = JSON.stringify(redObj);
var blueObj = { s: 0, r: 0, g: 0, b: 255 };
var blue = JSON.stringify(blueObj);
var greenObj = { s: 0, r: 0, g: 0, b: 255 };
var green = JSON.stringify(greenObj);

var client = new twitter({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

var tweetsTopic = "TechSummit";
var tweetsLanguage = "es"; //"es", "en", "fr", "pt"
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

    analyzeTweets();
}

function analyzeTweets() {
    try {
        if (tweetsText.length > 0) {
            analyzeText(tweetsText);
            tweetsText = '';
        }
    } catch (err) {
        console.log(err);
    }

    setTimeout(analyzeTweets, 1000);
}

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
            console.log(counter + " - " + sentiment + " - " + color);
        }
        else
            console.log(error);
    });
}

function cleanText(text) {
    var urlLess_text = text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
    var myCleanText = urlLess_text.replace(/\B@[a-z0-9_-]+/gi, '');

    return myCleanText;
}

function randInt(n) {
    return Math.floor(Math.random() * n);
}

hubClient.open(search);
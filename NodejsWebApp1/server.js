/*Environment variables to add: 
Twitter: 
CONSUMER_KEY
CONSUMER_SECRET
ACCESS_TOKEN_KEY
ACCESS_TOKEN_SECRET

Cognitive:
SUBSCRIPTION_KEY

IotHub:
CONNECTION_STRING

Topic:
TWEETS_TOPIC
*/

var twitter = require('twitter');
var request = require('request');
var iothub = require('azure-iothub');
var azure = require('azure-storage');

var connectionString = process.env.CONNECTION_STRING; 
var hubClient = iothub.Client.fromConnectionString(connectionString);
var redObj = { s:0, r: 255, g: 0, b: 0 };
var red = JSON.stringify(redObj);
var blueObj = { s: 0, r: 0, g: 0, b: 255 };
var blue = JSON.stringify(blueObj);
var greenObj = { s: 0, r: 0, g: 255, b: 0 };
var green = JSON.stringify(greenObj);

var client = new twitter({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

var tweetsTopic = process.env.TWEETS_TOPIC; 
var tweetsLanguage = "es"; //"es", "en", "fr", "pt"
var tweetsText = '';
var sentiment = 0.5;
var counter = 0;
var stream;

function handleTweet(event) {
    var retweeted = event.retweeted_status;
    var tweet = (retweeted == null ? event.text : event.retweeted_status.text);
    var cleanTweet = cleanText(tweet);
    tweetsText += " " + cleanTweet;
};

function search() {
    var myJSON = { "documents": [] };
    stream = client.stream('statuses/filter', { track: tweetsTopic, language: tweetsLanguage });

    stream.on('data', handleTweet);

    stream.on('error', function (error) {
        console.log(error);
    });

    analyzeTweets();
}

var analyzeLoop;

function analyzeTweets() {
    try {
        if (tweetsText.length > 0) {
            analyzeText(tweetsText);
            tweetsText = '';
        }
    } catch (err) {
        console.log(err);
    }

    analyzeLoop = setTimeout(analyzeTweets, 1000);
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
            console.log(counter + " - " + sentiment + " - c:" + color + " - s:" + score + " - t:" + tweet);
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

function listenQueue() {
    var queueSvc = azure.createQueueService();

    function listen() {
        queueSvc.getMessages('notwiqueue', function (error, result, response) {
            if (!error) {
                if (result.length > 0) {
                    // Message text is in messages[0].messageText
                    var message = result[0];
                    console.log(message.messageText);

                    clearTimeout(analyzeLoop);
                    stream.removeListener('data', handleTweet);
                    stream.destroy();
                    sentiment = 0.5;
                    tweetsTopic = message.messageText;
                    search();

                    queueSvc.deleteMessage('notwiqueue', message.messageId, message.popReceipt, function (error, response) {
                        if (!error) {
                            //message deleted
                        }
                    });
                }
            }
        });
    }
    setInterval(listen, 1000);
}

listenQueue();

hubClient.open(search);
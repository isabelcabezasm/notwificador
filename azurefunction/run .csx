#r "NewtonSoft.Json"

using System.Net;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web;
using System.Text;
using Newtonsoft.Json;


public static async Task<HttpResponseMessage> Run(HttpRequestMessage req, TraceWriter log)
{
    log.Info($"C# HTTP trigger function processed a request. RequestUri={req.RequestUri}");

    // parse query parameter
    string tweet = req.GetQueryNameValuePairs()
        .FirstOrDefault(q => string.Compare(q.Key, "tweet", true) == 0)
        .Value;

    log.Info($"Tweet is {tweet}");

    var client = new HttpClient();
    client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", "a0a1de9bba144890b532a52131193bad");

    var uri = "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment";

    HttpResponseMessage response;

    byte[] byteData = Encoding.UTF8.GetBytes("{\"documents\": [{\"language\": \"en\",\"id\": \"1\",\"text\": \"" + tweet + "\"}]}");

    using (var content = new ByteArrayContent(byteData))
    {
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        response = await client.PostAsync(uri, content);
    }

    string body = await response.Content.ReadAsStringAsync();
    log.Info(body);
    dynamic d = Newtonsoft.Json.JsonConvert.DeserializeObject(body);
    double score = (double)d["documents"][0]["score"];

    log.Info($"Score is {score}");

    // send to IoT Hub

    return req.CreateResponse(HttpStatusCode.OK);
}
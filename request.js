var https = require('follow-redirects').https;

async function makeRequest({
    method, 
    hostname,
    path,
    data,
}) {
    return new Promise((resolve, reject) => {
        var options = {
            'method': method,
            'hostname': hostname,
            'path': path,
            'headers': {
                'Content-Type': 'application/json'
            },
            'maxRedirects': 20
        };
            
        var req = https.request(options, function (res) {
            var chunks = [];
            
            res.on("data", function (chunk) {
                chunks.push(chunk);
            });
            
            res.on("end", function (chunk) {
                var body = Buffer.concat(chunks);
                resolve(body.toString());
            });
            
            res.on("error", function (error) {
                console.error(error);
                reject(error);
            });
        });
            
        var postData = JSON.stringify(data);
            
        req.write(postData);

        req.end();
    });
}

export default makeRequest;
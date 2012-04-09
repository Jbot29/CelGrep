var sys = require('util')
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');

var child;
var http = require("http");
var url = require("url");
var qs = require('querystring');

var history = [];

var config_file = 'celgrepconfig.js';

eval(fs.readFileSync(config_file, encoding="ascii"));

console.log('CelGrep Starting up');
for (var k in settings)
{
    console.log('Settings:'+settings[k]);
}

function exec_with(command,server,response)
{
    
    child = exec(command, function (error, stdout, stderr) {
    
    response.write(server + stdout.replace(/\n/g,'</br>'));
    response.count -= 1;

    response.write('End server:'+server + '</br>');
    
    if (response.count == 0)
    {
	response.write('End');
	response.end();
    }
    

});


}

function run_grep(command,args,path,response)
{
    header_html = '<a href="/">Back</a></br>'+command+'</br>';
    response.write(header_html);
    
    var grep_command = "grep " + args + " \"" + command + "\" " + path;

    var servers = settings.servers;

    history.push([args,command,path]);
    console.log(history);
    response.count = 0;
    for (var i = 0; i < servers.length;i++)
    {
	var ssh_command = "ssh " + settings.user+ "@" + servers[i] + " '" + grep_command + "'"; 
	console.log(ssh_command);

	response.count += 1;
	exec_with(ssh_command,servers[i],response);

    }


}

function return_form(response)
{

script = '<script type="text/javascript"> \
function postwith (to,p) { \
  var myForm = document.createElement("form"); \
  myForm.method="post" ; \
  myForm.action = to ; \
  for (var k in p) { \
    var myInput = document.createElement("input") ;\
    myInput.setAttribute("name", k) ;\
    myInput.setAttribute("value", p[k]);\
    myForm.appendChild(myInput) ;\
  } \
  document.body.appendChild(myForm) ;\
  myForm.submit() ;\
  document.body.removeChild(myForm) ;\
} </script>';

response.write(script);

form_html = "<form  name=\"input\" action=\"/rungrep\" method=\"post\"> \
Args: <input size=32 type=\"text\" name=\"args\" /> \
Grep: <input size=64 type=\"text\" name=\"grep\" /> \
Path: <input value=\""+settings.dpath+"\" size=32 type=\"text\" name=\"path\"  /> \
<input type=\"submit\" value=\"Submit\" /> \
</form>"

    
    response.write(form_html);


    history_html = JSON.stringify(history);

    history_html = 'History:</br><td>';

    for (h in history)
    {
	history_html += '<tr><a href="javascript:postwith(\'/rungrep\',';
        history_html += '{args:\''+history[h][0]+'\',grep:\''+history[h][1]+'\',path:\''+history[h][2]+'\'})">'
        history_html += history[0]+'</a></tr>';
    }

    history_html +='</td>';
    response.write(history_html);


}

http.createServer(function(request, response) {
var pathname = url.parse(request.url).pathname;
  
    console.log("Request for " + pathname + " received.");

    console.log(request.method);
    if (pathname == "/rungrep")
    {
	response.writeHead(200, {"Content-Type": "text/html"});
    if (request.method == 'POST') {
        var body = '';
	console.log("Got post");
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {
	    console.log("got end:"+ body);
            var POST = qs.parse(body);
            // use POST
	    console.log(POST.grep);
	    run_grep(POST.grep,POST.args,POST.path,response);

        });
    }
	
    }
    else if (pathname == "/")
    {
	response.writeHead(200, {"Content-Type": "text/html"});
	return_form(response);
	response.end();
    }

  
}).listen(8888);


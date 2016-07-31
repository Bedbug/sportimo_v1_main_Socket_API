
var WebSocketServer = require('ws').Server,
http = require('http'),
express = require('express'),
app = express();
var server = http.createServer(app);
server.listen(process.env.PORT || 3033);



// Cross Domain Code
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
};

//app.use(require('logger')('dev'));
app.use(require('body-parser')());

app.use(allowCrossDomain);

app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
    res.write("RebelCrew Games' SoccerApp notification server - is active and running on the server.\n");
    res.end();
});

app.get( "/crossdomain.xml", onCrossDomainHandler );
function onCrossDomainHandler( req, res ) {
    var xml = '<?xml version="1.0"?>\n<!DOCTYPE cross-domain-policy SYSTEM' +
        ' "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">\n<cross-domain-policy>\n';
    xml += '<allow-access-from domain="*" to-ports="*"/>\n';
    xml += '</cross-domain-policy>\n';

    req.setEncoding('utf8');
    res.writeHead( 200, {'Content-Type': 'text/xml'} );
    res.end( xml );
}

// concerns the processing of POST requests about a specific match that have originated from the app server,
// that should be broadcasted to all clients that are inside the specific match (match_id) room.
app.get('/insert', function (req, res) {
    res.write("GET is not supported in /insert. Please use POST.\n");
    res.end();
});
app.post('/insert', function (req, res) {
    var obj = JSON.parse(req.body.data);
    //console.log("/Insert");


    res.writeHead(200, {
        'Content-Type': 'plain/text',
    });
    res.write("ok");
    res.end();

    lastEventID++;
    var evtData = {
        id: lastEventID,
        data: req.body.data
    };

    // Change The Last Event of The Match
    ActiveGames[obj.data.match_id] = evtData;
    io.broadcast(JSON.stringify(evtData));
    // Loop through channel entries and send events
    // ChannelEntry.find({ channelID: obj.data.match_id }, function(err, users)
    // {
    //     console.log(users);
    //     // users.foreach(function(ChannelUser){
    //     //     ChannelUser.userSocket.send(JSON.stringify(evtData));
    //     // })
    // })
    // console.log(JSON.stringify(evtData));
console.log("Publishing to Channel");
    redisclient.publish("socketServers", JSON.stringify(evtData) );
});


app.post('/update', function (req, res) {
 console.log(req.body);

    var obj = {} 
    
    if(typeof req.body.data == "string")
    obj = JSON.parse(req.body.data);
    else obj = req.body.data;
    
   
    res.writeHead(200, {
        'Content-Type': 'plain/text',
    });
    res.write("ok");
    res.end();

    lastEventID++;
    var evtData = {
        id: lastEventID,
        data: req.body.data
    };


    //io.sockets.(obj.data.match_id+"mobile").send(JSON.stringify(evtData));
    //io.sockets.emit("event", evtData);

});



//----------------
//  Server Vars
//----------------
var lastEventID = 0;
var LogStatus = 1;
var ActiveGames = {};

//-------------------------------------
//  Web Sockets / Notification System
//-------------------------------------
var io = new WebSocketServer({server: server});

io.broadcast = function(data) {
  for (var i in this.clients)
    this.clients[i].send(data);
};

 io.on('connection', function(socket) {

    var user = addUser();

    // Heartbeat
    var heartbeatTimeout;
   
    function sendHeartbeat () {
        //console.log((new Date()) +": ping");
        socket.send(JSON.stringify({users:users.length}));
        heartbeatTimeout = setTimeout(sendHeartbeat, 60000);
    }
    console.log((new Date()) +": A user has connected");

    socket.on('subscribe', function (data,callback){
        // Register user to to match channel
        console.log("subscribe to:"+data.room);
        user.channelID = data.room;
    });

    socket.on('unsubscribe', function (data){
        // Unregister user from match channel;
        console.log(user.userID+" unsubscribed from:"+data.room);
        user.channelID = 0;
    });

    socket.on('close', function () {
        console.log("Client disconected");
         clearTimeout(heartbeatTimeout);
         removeUser(user);
        //ChannelEntry.remove(user,function(err) { console.log("error:"+err); })
    });

    socket.on("message", function(data){

        var parsedData = JSON.parse(data);

        if(parsedData.id)
        {
            // for(var i = 0; i<users.length; i++)
            // {
            //     if(users[i].userid == parsedData.id){
            //     users[i].socket.send(JSON.stringify({message:"You are logged out because someone else logged in with your account"}));
            //      users[i].socket.send(JSON.stringify({logout:true}));
            //      //users[i].socket.disconnect();
            //     }
            // }

            user.userID = parsedData.id;
            
            sendHeartbeat();
            console.log((new Date()) +": Registered user in server with ID: "+ user.userID);

        }
        else if(parsedData.subscribe)
        {
            user.channelID = parsedData.subscribe;
           
            console.log((new Date()) +": "+user.userID+" subscribed to: "+user.channelID);
        }
        else if (parsedData.unsubscribe)
        {
            console.log((new Date()) +": "+user.userID+" unsubscribed from: "+ user.channelID);
            user.channelID = 0;
           
        }
//      else if(parsedData.disconnect)
//         {
//             removeUser(user);
//          socket.disconnect();
//         }
    });
});



//----------------------------------------
//              Users
//----------------------------------------
var users = [];

var addUser = function() {
    var user = {};
    users.push(user)
    return user;
};

var removeUser = function(user) {
    for(var i=0; i<users.length; i++) {
        if(user.name === users[i].name) {
            if(LogStatus==1) console.log("removed user: "+users[i].userid);
            users.splice(i, 1);

            return;
        }
    }
};



// Initialize and connect to the Redis datastore
var RedisIP = 'pub-redis-11162.us-east-1-3.6.ec2.redislabs.com';
var RedisPort = 11162;
var RedisAuth = 'a21th21';

// Initialize and connect to the Redis datastore
var redis = require('redis');
var redisclient = redis.createClient(RedisPort, RedisIP);


redisclient.auth(RedisAuth, function (err) {
  if (err) { throw err; }
  // You are now connected to your redis.
  console.log("Connected to SocketServers Channel.");
  
});

setInterval(function(){
    console.log("PING"); 
    redisclient.publish("socketServers", "ping" );
    // redisclient.ping(function (err, reply) {
    //     console.log(reply.toString())
    //     });
        }, 60000);
   

redisclient.on("error", function (err) {
  console.log("{''Error'': ''" + err + "''}");
});

redisclient.on("end", function () {
  console.log("{Connection ended}");
});

redisclient.on("unsubscribe", function(channel,count){
  console.log("SOCKET unsubscribed from PUB/SUB channel");
});



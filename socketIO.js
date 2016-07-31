/*
 * Module dependencies
 */

var Moniker = require("moniker");
var express = require('express');
var app = express();
var io = require('socket.io').listen(app.listen(process.env.PORT || 8080));




// Server Data
var lastEventID = 0;
var LogStatus = 1;

var ActiveGames = {};



var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
};

app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(allowCrossDomain);

app.use(express.static(__dirname + '/public'));

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

app.get('/', function (req, res) {
    res.write("socketIO.js - RebelCrew Games' SoccerApp notification server - is active and running on the server.\n");
    res.end();
});

// Events SafeGuard
// Elias: This part is commented out, in order to test mobile clients' refactored Unity code with better socket behavior,
// without re-emitting each message.

setInterval(function() {
emitLastEvents();
}, 15000);

function emitLastEvents()
{
    for(var i in ActiveGames){
        io.sockets.in(i+"mobile").send(JSON.stringify(ActiveGames[i]));
        //console.log("Reminder Sent");
    }
}

// concerns the processing of POST requests about a specific match that have originated from the app server,
// that should be broadcasted to all clients that are inside the specific match (match_id) room.
app.post('/insert', function (req, res) {
    var obj = JSON.parse(req.body.data);

    if(LogStatus==1) console.log(req.body.data);

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

	io.sockets.in(obj.data.match_id+"mobile").send(JSON.stringify(evtData));
    io.sockets.in(obj.data.match_id).emit("event", evtData);
    console.log(JSON.stringify(evtData));

	//io.sockets.in(obj.data.match_id+"mobile").send(JSON.stringify({"event":"wakeup"}));
});

// concerns the processing of POST requests about all server updates that have originated from the app server,
// that should be broadcasted to all clients that are inside the specific match (match_id) room.
app.post('/update', function (req, res) {
    var obj = JSON.parse(req.body.data);

    if(LogStatus==1) console.log(req.body.data);

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
    io.sockets.emit("event", evtData);
    console.log(JSON.stringify(evtData));
});


// io.configure('production', function(){
//         console.log(" set config for production");
//         io.enable('browser client minification');  // send minified client
//         io.enable('browser client etag');          // apply etag caching logic based on version number
//         io.enable('browser client gzip');          // gzip the file
//         io.set('log level', 0);                    // reduce logging
// 		io.set('flash policy port', -1);			// testing limiting other ports for flash transport, according to https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
//         io.set('transports', [                     // enable all transports (optional if you want flashsocket)
//             'websocket'
//           , 'flashsocket'
//           , 'htmlfile'
//           , 'xhr-polling'
//           , 'jsonp-polling'
//         ]);
// 		io.set("polling duration", 10);
//      });

// io.configure('development', function(){
// 		console.log(" set config for development");
// 	// HEROKU recommended code, assuming io is the Socket.IO server object
// 		 io.enable('browser client minification');  // send minified client
//         io.enable('browser client etag');          // apply etag caching logic based on version number
//         io.enable('browser client gzip');          // gzip the file
//         io.set('log level', 0);                    // reduce logging
// 		io.set('flash policy port', -1);			// testing limiting other ports for flash transport, according to https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
//         io.set('transports', [                     // enable all transports (optional if you want flashsocket)
//             'websocket'
//           //, 'flashsocket'
// //          , 'htmlfile'
// //          , 'xhr-polling'
// //          , 'jsonp-polling'
//         ]);
// 		io.set("polling duration", 10);
// 		//io.disable('heartbeats');
// 		//io.disable('browser client cache');
// });


// io.sockets.on('connection', function (socket) {
io.on('connection', function (socket) {

    var user = addUser();
    user.socket = socket;

	console.log("Connected.");

	// response to client acknowledgment on the succesful receipt of an event
    socket.on("lastEvent", function(data){
    });


    socket.on('subscribe', function (data,callback){
        var response = {};
        // response.error = "error";
        callback(response);
        console.log("subscribe to:"+data.room);
        socket.join(data.room);
    });


	socket.on('unsubscribe', function (data){
        console.log("unsubscribe to:"+data.room);
        socket.leave(data.room);
    });


    socket.on('disconnect', function () {
        if(LogStatus==1) console.log("Client disconected:"+ user.userid);
        removeUser(user);
    });


    socket.on("message", function(data){

        var parsedData = JSON.parse(data);

        if(parsedData.id)
        {
            for(var i = 0; i<users.length; i++)
            {
                if(users[i].userid == parsedData.id){
                users[i].socket.send(JSON.stringify({message:"You are logged out because someone else logged in with your account"}));
                 users[i].socket.send(JSON.stringify({logout:true}));
                 //users[i].socket.disconnect();
                }
            }

            user.userid = parsedData.id;
            console.log("Register user:" + user.userid);
			if(LogStatus==1) console.log("Registered user in server with ID: "+parsedData.id);
            //socket.send(JSON.stringify({message:"You are logged in and registered as:"+user.name}));
        }
        else if(parsedData.subscribe)
        {
			socket.join(parsedData.subscribe+"mobile");
			if(LogStatus==1) console.log(user.userid+" subscribed to "+parsedData.subscribe);
            socket.send(JSON.stringify({lastEvent: lastEventID}));
        }
		else if (parsedData.unsubscribe)
		{
			socket.leave(parsedData.unsubscribe+"mobile");
			if(LogStatus==1) console.log(user.userid+" unsubscribed from "+parsedData.unsubscribe);
		}
		else if(parsedData.disconnect)
        {
            removeUser(user);
			socket.disconnect();
        }
    });
});





var users = [];

var addUser = function() {
    var user = {
        name: Moniker.choose(),
    };
    users.push(user);
	console.log(" a user has connected.");
  //  updateUsers();
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

function updateUsers()
{
     io.sockets.emit("users", {users: users.length});
}


/* THE FOLLOWING CODE IS RELATED TO TEMPORARY TESTING OF GHOST RIDER'S FRIENDSBOARD SERVICE AND SHOULD BE DELETED AFTER TESTING */

// Initialize and connect to the Redis datastore
var redis = require('redis');
var redisclient = redis.createClient(6379, 'nodejitsudb9955772792.redis.irstack.com');

redisclient.auth('nodejitsudb9955772792.redis.irstack.com:f327cfe980c971946e80b8e975fbebb4', function (err) {
	if (err) { throw err; }
	// You are now connected to your redis.
});

redisclient.on("error", function (err) {
	console.log("{''Error'': ''" + err + "''}");
});


app.post('/friendsboard', function (req, res) {
	if (req.body.parameter) {
		console.log("input params:" + req.body.parameter);

		// convert back the request parameter from JSON to objects
		var response = JSON.parse(req.body.parameter);

		if (response.friends) {
			if (response.player_id)
				process_request_player(req, res, response);
			else
				process_request_friends(req, res, response);
		}
		else {
			res.end("{''friends'':{}, ''error'': ''You reached friendsboard with no friends array in the parameter''}");
			console.log("Server Response: {''friends'':{}, ''error'': ''You reached friendsboard with no friends array in the parameter''}\n");
		}
	}
	else {
		res.end("{''friends'':{}, ''error'': ''The request did not contain a parameter with the name ''parameter''''}");
		console.log("Server Response: {''friends'':{}, ''error'': ''The request did not contain a parameter with the name ''parameter''''}\n");
	}
});


process_request_player = function(req, res, response) {
	redisclient.hget("player_ids", response.player_id, function(error, reply) {
		//console.log("Redis replied to hget of player_id " + response.player_id + " with " + reply);

		if (!reply) {
			//First, store the player_id, which should be present in the request
			redisclient.hset("player_ids", response.player_id, response.score);
		}
		else {
			// Check the retrieved reply if it is lower than the new score. If it is then store.
			if (response.score > reply)
				redisclient.hset("player_ids", response.player_id, response.score);
		}

		// try to get the score for the facebook_id of the player, if not found then store it (hset it)
		if (response.facebook_id) {
			redisclient.hget("facebook_ids", response.facebook_id, function(err, rply) {
				if (!rply)
					redisclient.hset("facebook_ids", response.facebook_id, response.score);
				else {
					//console.log("received score is " + response.score + " and the existing score is " + rply);
					if (response.score > rply)
						redisclient.hset("facebook_ids", response.facebook_id, response.score);
				}
			});
		}

		// Sequentially, call the process to get back all the friends, and to send back the response
		process_request_friends(req, res, response);
	});
}


process_request_friends = function(req, res, response) {
	//console.log("The response has " + response.friends.length + " friends");

	if (response.friends.length > 0) {
		// For each friend's facebook_id in the array, search the redis for matches and put scores in the friendsList array
		// The loop is asynchronous, therefore it is implemented as a recursive function.
		var friendsList = new Array();

		function loopFriends(friendIndex) {
			if (friendIndex < response.friends.length) {
				redisclient.hget("facebook_ids", response.friends[friendIndex], function(error3, reply3) {
					//console.log("Reply for " + friendIndex + " friend " + response.friends[friendIndex] + " is:" + reply3);
					if (reply3) {
						var friend = new Object();
						friend.facebook_id = response.friends[friendIndex];
						friend.score = parseInt(reply3);
						friendsList.push(friend);
					}
					loopFriends(friendIndex + 1);
				});
			}
			else {
				//console.log("Number of friends found:" + friendsList.length);
				// Construct the main response object
				var responseObject = new Object();
				// Add to that, the friends list (array of objects)
				responseObject.friends = friendsList;
				// Send it back, after converting it to a JSON string
				var responseString = JSON.stringify(responseObject);
				//console.log("Server Response: " + responseString + "\n");
				res.end(responseString);
			}
		}

		loopFriends(0);
	}
	else {
		// The friends array is found empty with 0 elements, send back an empty respose:
		res.end("{}");
		//console.log("Server Response: {}\n");
	}
}



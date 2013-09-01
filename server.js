// State outside ws: clients, peers, client.id, client.peer
var Server = require('ws').Server;
var ws = new Server({port: process.env.PORT || 8000});

var URL = require('url');

var clients = {};
var peers = {};

ws.on('connection', function(client) {
  client.id = Math.random().toString(36).substring(7);
  clients[client.id] = client;
  var peerId = URL.parse(client.upgradeReq.url).pathname;

  // Connect peers together
  if (!(peerId in peers) || peers[peerId] === client.id) {
    peers[peerId] = client.id;
  } else {
    client.peer = peers[peerId];
    clients[client.peer].peer = client.id;
    delete peers[peerId];

    clients[client.peer].send(JSON.stringify({type: 'offerer'}));
    client.send(JSON.stringify({type: 'answerer'}));
  }

  // Relay message
  client.on('message', function(data) {
    if (client.peer in clients)
      clients[client.peer].send(data);
  });

  client.on('close', function() {
    if (client.id in clients)
      delete clients[client.id];
    if (peerId in peers)
      delete peers[peerId];

    if (client.peer in clients)
      clients[client.peer].close();
  });
});

console.log('started on', process.env.PORT || 8000);

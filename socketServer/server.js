// server.js
'use strict';

const express = require('express');
const wsLib = require('ws');
const SocketServer = wsLib.Server;
const http = require('http');
const PORT = 3001;

const server = express()
    // Make the express server serve static assets (html, javascript, css) from the /public folder
    .use(express.static('public'))
    .listen(PORT, '0.0.0.0', 'localhost', () => console.log(`Listening on ${ PORT }`));
// .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({ server });
//sendLineInfo is a function that sends names of the people in line to every client
//plus the position of that client that recieves the message
function sendLineInfo(line) {
  wss.clients.forEach(function each(client, index) {
    if (client.readyState === wsLib.OPEN) {
        var def = ['', ''];
        var lineout = def.map((l, i) => {
          return line[i] ? line[i].name : l;
        })
        .concat(line.slice(def.length).map(l => l.name))
        .concat(line.findIndex(l => l.ws === client));

        client.send(JSON.stringify({ type: "lineInfo", lineInfo: lineout}));
        console.log("message to client", lineout);
    }
  });
}

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
      if (client.readyState === wsLib.OPEN) {
          client.send(data);
      }
  });
};

var linesend =[];
var controller = {};
var line = [];
var clientInfo = [];
var lineIndex = 0;
var commander = {};
var oldLineLength = 0;
var start;
var now = 0;
setInterval(function() {
  //Next 4 lines assign the first one in the line as the commander
  if (!commander.readyState && line.length > 0) {
    commander = line[0].ws;
    start = new Date().getTime();
    wss.broadcast(JSON.stringify({ type: "commander changed"}));
  }
  //Next 11 lines  remove the current commander from the line and empty the commander
  let timeDifference = new Date().getTime() - start;
  if ((timeDifference > (30 * 1000)) && (timeDifference < (31 * 1000))) {
    console.log("time passed")
    oldLineLength = line.length;
    line.shift();
    commander = {};
    // to check if the line changed (line was not empty before)
    if (oldLineLength !== line.length) {
        console.log("new line is sent to clients");
        sendLineInfo(line);
    }
  }
}, 500);


wss.on('connection', (ws) => {
  wss.broadcast(JSON.stringify({ type: "count", count: wss.clients.size - 1 }));
  ws.on('message', (str) => {
    // console.log(theData.content);
    var theData = JSON.parse(str);

    var messType = theData.type;

    if (messType === "controller") {
        controller = ws;
        controller.send(JSON.stringify({ content: "I am recognized as the controller" }));
        // putting the controller client in the controller variable
    }else if(messType === "time"){
      wss.broadcast(str);
      // console.log(theData.time)
    } else if (messType === "postNotification" || messType === "name") {
        wss.broadcast(str);
    } else if (messType === "command" && commander === ws) {
        controller.send(str)
    } else if (messType === "request") {
        if (theData.reqstate === 1) { //if it is controll request
            line.push({ ws: ws, name: theData.name });
        } else if (theData.reqstate === -1) { //if it is cancel request removes the client from line
            lineIndex = line.findIndex(arr => arr.ws === ws);
            line.splice(lineIndex, 1);
            if(commander === ws){
              commander ={};
            }
        }
        sendLineInfo(line);
    }
  });

  ws.on('close', () => {
    // removing the client from line when their connection is closed
    lineIndex = line.findIndex(arr => arr.ws === ws);
    if (lineIndex > -1) {
      line.splice(lineIndex, 1);
      if (commander === ws) {
          commander = {};
      }
    }
    sendLineInfo(line);
    wss.broadcast(JSON.stringify({ type: "count", count: wss.clients.size }));
  });

});

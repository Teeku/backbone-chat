/* httpserver.js
 * Main JS file for the Backbone Chat HTTP Server */

/* Packages Imports */

const express = require("express");
const http = require("http");
const vorpal = require("vorpal")();
const colors = require("colors");


/* Console Coloring */

// Colors theme
colors.setTheme({
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

// Tags for messages
const logtag = {
    info: "[".white + "Info".info.bold + "] ".white,
    warn: "[".white + "Info".warn.bold + "] ".white,
    error: "[".white + "Info".error.bold + "] ".white,
};


/* HTTP Server */

var httpServ = {
    serv: null,
    httphdl: null,
    port: 80,
    running: false,
    closing: false,
    
    start: function(port) {
        if(this.closing) {
            vorpal.log("Server is being closed".warn);
            return;
        }
        if(this.running) {
            vorpal.log("Server is already running on port ".warn + this.port);
            return;
        }

        this.serv = express();

        // Static files
        this.serv.use(express.static("public"));

        // Main page
        this.serv.get("/", function (req, res) {
            vorpal.log("GET / from ".verbose + req.ip);
            res.sendFile(__dirname + "/www/index.html");
        });

        // Open server to port 8080 (HTTP)
        this.httphdl = this.serv.listen(port, () => {
            this.port = port;
            vorpal.log(logtag.info + "Server listening on port ".info + this.port);
        });
        
        if(this.serv === null || this.httphdl === null) {
            vorpal.log(logtag.error + " Server could not be started".error)
            this.serv = null;
            this.httphdl = null;
            this.running = false;
            return;
        }
        
        this.running = true;
    },
    
    stop: function() {
        if(this.closing) {
            vorpal.log("Server already closing".warn);
            return;
        }
        if(!this.running) {
            vorpal.log("Couldn't stop, server not running".warn);
            return;
        }
        
        vorpal.log(logtag.info + "Server closing...".info)

        this.httphdl.close(function() {
            vorpal.log(logtag.info + "Server closed ".info);
            this.running = false;
            this.closing = false;
        });
        this.httphdl = null;
        this.serv = null;
        this.closing = true;
    }
}


/* CLI */

vorpal 
    .command("start <port>")
    .description("Starts the server")
    .action(function (args, callback) {
        var port = parseInt(args.port);
        if(port <= 0) {
            this.log("Port must be a non-zero integer".help);
            return callback();
        }

        httpServ.start(port);

        callback();
    });

vorpal
    .command("close")
    .description("Closes the server")
    .action(function (args, callback) {
        httpServ.stop();
        
        callback();
    });


vorpal
    .delimiter(">".prompt)
    .show();



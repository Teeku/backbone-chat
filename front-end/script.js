/* front-end/script.js
 * JS code for the Webapp */

$(function () {
    "use strict";
    
    /* formatTime(in Date)
     * Formats a Date object into a human-readable hh:mm time */
    function formatTime(date) {
        var min = date.getMinutes();
        return date.getHours() + ":" + (min < 10 ? "0" : "") + min;
    }

    
    /* MODEL: Message
     * A single chat message */
    var Message = Backbone.Model.extend({
        defaults: function () {
            return {
                sender: "unknown",
                time: formatTime(new Date(0)),
                content: "none",
                origin: "none" // server or client
            };
        }
    });
    
    /* COLLECTION: MessageList
     * A collection of Message */
    var MessageList = Backbone.Collection.extend({
        model: Message
    });
    
    /* VIEW: MessageView
     * View for a Message */
    var MessageView = Backbone.View.extend({
        tagName: "p",
        template: _.template($("#template-msg").html()),
        
        initialize: function () {
            this.listenTo(this.model, "change", this.render);
            
            this.render();
        },
        
        render: function () {
            console.log("MessageView: render");
            this.$el.html(this.template(this.model.toJSON()));

            switch (this.model.get("origin")) {
            case "error":
                this.$el.css("color", "red");
                this.$el.css("font-weight", "bold");
                break;
            
            case "info":
                this.$el.css("color", "blue");
                break;
            }
            return this;
        }
    });

    /* VIEW: ChatboxView
     * View for the chatbox (rendering MessageList) */
    var ChatboxView = Backbone.View.extend({
        initialize: function () {
            this.listenTo(this.collection, "add", this.msgAdded);
        },
        
        msgAdded: function (mdl) {
            console.log("ChatboxView: msgAdded");
            var view = new MessageView({model: mdl});
            this.$el.append(view.el);
            // Scrolls to bottom
            this.$el.scrollTop(this.$el[0].scrollHeight);
        }
    });
    
    /* VIEW: InputView
     * View for the input field */
    var InputView = Backbone.View.extend({
        events: {
            "keydown"  :   "keyPressed"
        },
        
        keyPressed: function (ev) {
            switch (ev.key) {
            case "Enter":
                this.sendMessage();
                break;
            }
        },
        
        sendMessage: function () {
            var msg = this.$el.val();
            if (msg !== "" && this.model.get("connected")) {
                console.log("InputView: sendMessage");
                this.model.sendMessage(this.$el.val());
                this.$el.val("");
            }
        }
    });
    
    /* MODEL: App
     * The whole chat application */
    var App = Backbone.Model.extend({
        messages: null,
        chatbox: null,
        input : null,
        
        defaults: function () {
            return {
                username: "unknown",
                socket: null,
                connected: false
            };
        },
        
        initialize: function () {
            this.messages = new MessageList();
            this.chatbox = new ChatboxView({collection: this.messages, el: $("#chatbox")});
        },
        
        servConnected: function () {
            this.logInfo("Successfully connected to server.");
            
            this.set("connected", true);
            
            // Requests name registration to server
            this.servSend({type: "reg", name: this.get("username")});
            
            // Requests list of users
            this.servSend({type: "ulist"});

            // Allows input to be used only if connected to server
            this.input = new InputView({model: this, el: $("#usrmsg")});
        },
        
        servSend: function (obj) {
            try {
                this.get("socket").send(JSON.stringify(obj));
            } catch (e) {
                this.logError("Couldn't send message", 0);
            }
        },
        
        servClose: function () {
            this.set("socket", null);
            this.set("connected", false);
        },
        
        recvMessage: function (msg) {
            this.messages.add(new Message(msg));
        },
        
        sendMessage: function (msg) {
            var message = new Message({sender: this.get("username"),
                                       time: formatTime(new Date()),
                                       content: msg,
                                       origin: "client"});
            
            this.messages.create(message);
        },
        
        logInfo : function (msg, title) {
            var message = new Message({sender: (title !== undefined ? title : ""),
                                       time: formatTime(new Date()),
                                       content: msg,
                                       origin: "info"});
            
            this.messages.add(message);
        },
        
        logError : function (err, code) {
            var message = new Message({sender: "Error",
                                       time: formatTime(new Date()),
                                       content: err + " (" + code + ")",
                                       origin: "error"});
            
            this.messages.add(message);
            this.servClose();
        },

        /* syncDeleg: Handles CRUD requests from Backbone to the server */
        syncDeleg: function (method, model, options) {
            switch (method) {
            case "create":
                console.log("Create");
                this.servSend({type: "msg", msg: model.toJSON()});
                break;

            case "read":
                console.log("Read");
                break;

            case "update":
                console.log("Update");
                break;

            case "patch":
                console.log("Patch");
                break;

            case "delete":
                console.log("Delete");
                break;

            default:
                break;
            }
        }
    });
    
    
    // Creates an instance of the chat
    var app = new App({username: prompt("Enter username")});
    
    // Web Socket
    var wsocket = null;

    
    // Replaces Backbone.sync RESTful communication with ours
    Backbone.sync = function () {
        app.syncDeleg.apply(app, arguments);
    };

    
    // Connects to server
    try {
        wsocket = new SockJS("http://localhost:8081/echo");
        app.set({socket: wsocket});
    } catch (e) {
        app.logError("Socket could not be created.", 0);
        throw e;
    }

    // Event when connection is successful
    wsocket.onopen = function () {
        app.servConnected();
    };

    // Event when a message is received from the server
    wsocket.onmessage = function (e) {
        var data = JSON.parse(e.data);

        switch (data.type) {
        // Message received
        case "msg":
            app.recvMessage(data.msg);
            break;

        // User list received
        case "ulist":
            app.logInfo(data.ulist.join(", "), "Users online");
            break;

        // Presence information
        case "pres":
            switch (data.pres) {
            case 1:
                app.logInfo("User " + data.name + " connected");
                break;

            case 2:
                app.logInfo("User " + data.name + " disconnected");
                break;
            }
            break;

        // Error from server
        case "err":
            app.logError(data.reason, data.code);
            break;
        }
    };
    
    // Event when connection is closed/interrupted
    wsocket.onclose = function (e) {
        if (e.code !== 1000) {
            app.logError(e.reason, e.code);
        }

        app.logInfo("Connection to server closed");
        app.servClose();
    };
});
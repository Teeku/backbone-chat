$(function () {
    "use strict";
    
    function formatTime(date) {
        return date.getHours() + ":" + date.getMinutes();
    }
    
    var Message = Backbone.Model.extend({
        defaults: function () {
            return {
                sender: "unknown",
                time: formatTime(new Date(0)),
                content: "none",
                origin: "none"
            };
        }
    });
    
    var MessageList = Backbone.Collection.extend({
        model: Message
    });
    
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
            return this;
        }
    });

    
    var ChatboxView = Backbone.View.extend({
        initialize: function () {
            this.listenTo(this.collection, "add", this.msgAdded);
        },
        
        msgAdded: function (mdl) {
            console.log("ChatboxView: msgAdded");
            var view = new MessageView({model: mdl});
            this.$el.append(view.el);
            this.$el.scrollTop(this.$el.height());
        }
    });
    
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
            if(msg !== "") {
                console.log("InputView: sendMessage");
                this.model.sendMessage(this.$el.val());
                this.$el.val("");
            }
        }
    });
    
    
    var App = Backbone.Model.extend({
        messages: null,
        chatbox: null,
        input : null,

        socket: null,
        
        defaults: function () {
            return {
                username: "unknown",
                socketaddr: "ws://localhost:8080"
            };
        },
        
        initialize: function () { 
            this.messages = new MessageList({url: "messages"});
            this.chatbox = new ChatboxView({collection: this.messages, el: $("#chatbox")});
            this.input = new InputView({model: this, el: $("#usrmsg")});
            
            this.socket = new WebSocket(this.get("socketaddr"));
        },
        
        sendMessage: function (msg) {
            var message = new Message({sender: this.get("username"),
                                       time: formatTime(new Date()),
                                       content: msg,
                                       origin: "client"});
            
            this.messages.create(message);
        },

        
        syncDeleg: function(method, model, options) {
            switch (method) {
                case "create":
                    console.log("Create");
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

    
    var app = new App({username: "Teeku", socketaddr: "ws://localhost:8080"});

    Backbone.sync = function () {
        app.syncDeleg.apply(this, arguments);
    }
});
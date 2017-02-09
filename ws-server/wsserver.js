var http = require("http");
var sockjs = require("sockjs");

var connectedUsrs = [];

function formatTime(date) {
    var min = date.getMinutes();
    return date.getHours() + ":" + (min < 10 ? "0" : "") + min;
}

function log(hd, addr, reas) {
    console.log("[" + hd + " " + addr + "] " + reas);
}

var echo = sockjs.createServer({sockjs_url: "https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.1.2/sockjs.min.js"});
echo.on("connection", function (conn) {
    var currUsr = {name: "", sock: conn};

    connectedUsrs.push(currUsr);

    log("C", conn.address.address, "User connected");

    conn.on("data", function (d) {
        var i = 0;
        var nameList = [];
        var data = JSON.parse(d);
        
        switch (data.type) {
            case "reg":
                if (!data.name || data.name.length <= 0 || !/^[a-z0-9]+$/i.test(data.name)) {
                    log("E:REG DENIED", conn.address.address, "Name incorrect");
                    conn.close(4002, "Name incorrect");
                    break;
                }
    
                data.name = data.name.substr(0, 15);
                log("R:REG REQ", conn.address.address, data.name);
                
                for (i = 0; i < connectedUsrs.length; i++) {
                    if (connectedUsrs[i].name === data.name) {
                        log("E:REG DENIED", conn.address.address, "Name already in use");
                        conn.close(4001, "Username already in use");
                        break;
                    }
                }
                if (i !== connectedUsrs.length)
                    break;
                
                currUsr.name = data.name;
                conn.write(JSON.stringify({type: "regok"}));

                for (i = 0 ; i < connectedUsrs.length; i++) {
                    if (connectedUsrs[i] === currUsr)
                        continue;
                    
                    connectedUsrs[i].sock.write(JSON.stringify({type: "pres", pres: 1, name: currUsr.name}));
                }
                
                break;
                
            case "ulist":
                log("R:ULIST REQ", conn.address.address, "");

                for (i = 0 ; i < connectedUsrs.length; i++) {
                    if(connectedUsrs[i].name !== "")
                        nameList.push(connectedUsrs[i].name);
                }
                
                conn.write(JSON.stringify({type: "ulist", ulist: nameList}));
                break;
            
            case "msg": 
               log("R:MSG", conn.address.address, data.msg.sender + ": " + data.msg.content);
                
                if (currUsr.name === "") {
                    log("E:ULIST DENIED", conn.address.address, "Not registered on server");
                    conn.write(JSON.stringify({type: "err", code: 4001, reason: "Not registered on server"}));
                    break;
                }

                for (i = 0 ; i < connectedUsrs.length; i++) {
                    if (connectedUsrs[i] === currUsr)
                        continue;

                    connectedUsrs[i].sock.write(JSON.stringify({type: "msg",
                                                                msg: {
                                                                    sender: currUsr.name,
                                                                    time: formatTime(new Date()),
                                                                    content: data.msg.content,
                                                                    origin: "server"}}));
                }
                break;
        }
    });

    conn.on("close", function () {
        var i = 0;
        var id = 0;
        
        log("D", conn.address.address, "User " + currUsr.name + " disconnected");
        
        if (currUsr.name !== "") {
            for (i = 0 ; i < connectedUsrs.length; i++) {
                if (connectedUsrs[i] === currUsr)
                    continue;

                connectedUsrs[i].sock.write(JSON.stringify({type: "pres", pres: 2, name: currUsr.name}));
            }
        }

        id = connectedUsrs.findIndex(function (el) {
            return el === currUsr;
        });

        connectedUsrs.splice(id, 1);
    });
});

var server = http.createServer();
echo.installHandlers(server, {prefix: "/echo"});
server.listen(8081);
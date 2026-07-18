// 서버
import { instrument } from "@socket.io/admin-ui";
import express from "express";
import http from "http";
// import SocketIO from "socket.io";
import { Server } from "socket.io";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const httpServer = http.createServer(app);
// const wsServer = SocketIO(httpServer);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
    }
});

instrument(wsServer, {
    auth: false
});

function publicRooms(){
    const sids = wsServer.sockets.adapter.sids;
    const rooms = wsServer.sockets.adapter.rooms;
    /**
     *  const { sockets: {adapter: {sids, rooms}}} = wsServer; //구조분해할당
     */
    const publicRooms = [];
    rooms.forEach((value, key)=>{
        if(sids.get(key) === undefined){
            publicRooms.push(key);
        }
    })

    return publicRooms;
}

function countRoom(roomName){
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket)=>{
    // console.log(socket);
    // socket.on("enter_room", (roomName)=>{console.log(roomName)})
    socket["nickname"] = "Anon";
    socket.onAny((event)=>{
        console.log(wsServer.sockets.adapter)
        console.log(`Socket Event : ${event}`)
    })
    socket.on("enter_room", (roomName, done)=>{
        done();
        // console.log(roomName)
        // console.log(socket.id)
        // console.log(socket.rooms)
        socket.join(roomName)
        console.log(socket.rooms)
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms())
        // setTimeout(()=>{
        //     done()
        // }, 5000);
    });

    socket.on("disconnecting", ()=> { // socket 연결이 완전히 해제 되기 직전
        socket.rooms.forEach(room => socket.to(room).emit("bye", socket.nickname, countRoom(room)-1))
    });

    socket.on("disconnect", ()=> { // socket 연결이 완전히 해제 되기 직후
        wsServer.sockets.emit("room_change", publicRooms())
    });

    socket.on("new_message", (msg, room, done)=> {
        /**
         *                msg    room      done
         * "new_message", value, roomName, ()=>{addMessage(`You : ${value}`)
         */
        socket.to(room).emit("send_message", `${socket.nickname} : ${msg}`); // send_message 이벤트를 client(프론트엔드) 에 보냄
        done();
    });

    socket.on("nickname", (nickname) => (socket["nickname"] = nickname))
})

const handleListen = () => {console.log("Listening on http://localhost:3000")}
httpServer.listen(3000, handleListen);
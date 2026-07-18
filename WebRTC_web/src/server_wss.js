// // 서버
// import express from "express";
// import http from "http";
// import WebSocket from "ws";

// const app = express();

// app.set("view engine", "pug");
// app.set("views", __dirname + "/views");
// app.use("/public", express.static(__dirname + "/public"));
// app.get("/", (req, res) => res.render("home"));
// app.get("/*", (req, res) => res.redirect("/"));

// const handleListen = () => {
//     console.log("Listening on http://localhost:3000")
// }

// // app.listen(3000, handleListen);

// const server = http.createServer(app);
// const wss = new WebSocket.Server({server});

// const sockets = [];

// // function handleConnecion(socket){
// //     console.log(socket);
// // }

// // wss.on("connection", handleConnecion);

// wss.on("connection", (socket) => { //익명함수 처리
//     sockets.push(socket)
//     socket["nickname"] = "Anonymous";
//     console.log("Connected to Browser");
//     socket.on("close",()=>{console.log("Disconnected from Browser")});
//     socket.on("message", (msg)=>{
//         // 프론트에서 socket.send 로 보낸 데이터 받음
//         // console.log(`${message}`)
//         // socket.send(`${message}`);
//         const message = JSON.parse(msg);
//         // console.log(message.type, message.payload)
//         // sockets.forEach(aSocket => aSocket.send(`${message}`));
//         switch(message.type){
//             case "new_message":
//                 sockets.forEach(aSocket => aSocket.send(`${socket.nickname}:${message.payload}`));
//                 break;
//             case "nickname":
//                 socket["nickname"] = message.payload;
//                 break;
//         }
//     })
//     // socket.send("Hello!")
// })

// server.listen(3000, handleListen);
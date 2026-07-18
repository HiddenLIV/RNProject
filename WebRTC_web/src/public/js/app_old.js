// // 프론트 엔드
// // alert("hi");
// // console.log("hi");
// // const socket = new WebSocket("http://localhost:3000");

// const messageList = document.querySelector("ul");
// // const messageForm = document.querySelector("form");
// const nickForm = document.querySelector("#nick");
// const messageForm = document.querySelector("#message");
// const socket = new WebSocket(`ws://${window.location.host}`);

// socket.addEventListener("open", ()=>{
//     console.log("Connected to Server");
// })

// socket.addEventListener("message", (message)=>{
//     // 서버에서 socket.send로 보낸 메시지 받음
//     // console.log("Just got this:",message.data,"from the Server");
//     const li = document.createElement("li");
//     li.innerText = message.data;
//     messageList.append(li);
// })

// socket.addEventListener("close", ()=>{
//     console.log("Disconnected from Server");
// })

// // setTimeout(()=>{
// //     socket.send("hello from browser")
// // }, 5000)

// function makeMessage(type, payload){
//     const data ={type, payload}
//     return JSON.stringify(data);
// }

// function handleSubmit(event){
//     event.preventDefault();
//     const input = messageForm.querySelector("input");
//     // socket.send(input.value);
//     socket.send(makeMessage("new_message", input.value))
//     input.value = "";
// }

// function handleNickSubmit(event){
//     event.preventDefault();
//     const input = nickForm.querySelector("input");
//     // socket.send(input.value);
//     // socket.send({
//     //     type: "nickname",
//     //     payload: input.value
//     // });
//     socket.send(makeMessage("nickname", input.value));
//     input.value = "";
// }

// messageForm.addEventListener("submit", handleSubmit)
// nickForm.addEventListener("submit", handleNickSubmit)

const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;

let roomName;

function addMessage(message){
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function handleMessageSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#msg input");
    const value = input.value;
    socket.emit("new_message", value, roomName, ()=>{ //new_message 이벤트는 server에서 발생
        addMessage(`You : ${value}`)
    })
    input.value='';
}

function handleNicknameSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#name input");
    const value = input.value;
    socket.emit("nickname", value)
    input.value='';
}

function showRoom(){
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`;
    const msgForm = room.querySelector('#msg');
    const nameForm = room.querySelector('#name');
    msgForm.addEventListener("submit", handleMessageSubmit)
    nameForm.addEventListener("submit", handleNicknameSubmit)
}

function handleRoomSubmit(event){
    event.preventDefault();
    const input = form.querySelector("input")
    // socket.emit("enter_room", {payload : input.value})
    // socket.emit("enter_room", input.value, ()=>{
    //     console.log("server is done!!")
    // })

    socket.emit("enter_room", input.value, showRoom);
    roomName = input.value;
    input.value = "";

}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (userNickname, newCount)=>{
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    
    addMessage(`${userNickname} joined!!`);
});

socket.on("bye", (userNickname, newCount)=>{
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    
    addMessage(`${userNickname} left!!`);
});

socket.on("send_message", (msg)=>{
    addMessage(msg);
})

socket.on("room_change", (rooms)=>{
    console.log(rooms)
    const roomList = welcome.querySelector('ul');
    roomList.innerHTML="";
    if(rooms.length === 0){
        return;
    }

    rooms.forEach((room)=>{
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    })
})


// 프론트 엔드
const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const call = document.getElementById("call");
let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

async function getCameras(){
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log(devices);
        const cameras = devices.filter((device)=>device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.push({deviceId: '123123123', label:'test카메라'})
        console.log(cameras);
        cameras.forEach((camera)=>{
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label == camera.label){
                option.selected = true;
            }
            cameraSelect.appendChild(option);
        })

    } catch (error) {
        console.log(error)
    }
}

async function getMedia(deviceId){
    const initialConstraints = {
        audio : true,
        video: { facingMode : "user"}
    }

    const cameraConstraints = {
        audio : true,
        video: { deviceId: { exact: deviceId}}
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(deviceId ? cameraConstraints : initialConstraints);
        console.log(myStream);
        myFace.srcObject = myStream;
        if(!deviceId){
            getCameras();
        }

    } catch (error) {
        console.log(error)
    }
}

// getMedia();

function handleMuteClick(){
    console.log(myStream.getAudioTracks())
    myStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
    });
    if(!muted){
        muteBtn.innerText = "UnMute"
        muted = true
    }
    else {
        muteBtn.innerText = "Mute"
        muted = false
    }
}

function handleCameraClick(){
    console.log(myStream.getVideoTracks())
    myStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
    });
    if(!cameraOff){
        cameraBtn.innerText = "Turn Camera On"
        cameraOff = true
    }
    else {
        cameraBtn.innerText = "Turn Camera Off"
        cameraOff = false
    }
}

async function handleCameraChange(){
    await getMedia(cameraSelect.value);
    if(myPeerConnection){
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection.getSenders().find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

//welcome form
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

call.hidden = true;

async function initCall(){
    console.log("start media !!!")
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSumbit(event){
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    console.log('join room !')
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSumbit);

//Socket

socket.on("welcome", async()=>{
    // console.log("someone joined !!!");
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (event)=>{
        console.log(event);
    });
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async(offer) => {
    myPeerConnection.addEventListener("datachannel", (event)=>{
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", (event)=>{
            console.log(event); //event.data => 채팅 기능 구현시 채팅 text 정보 출력
        })
    });
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("sent the answer");
});

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (candidate) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(candidate);
});

//RTC

function makeConnection(){
    myPeerConnection = new RTCPeerConnection(
        {
            iceServers: [
                {
                    urls: [
                        "stun:stun.l.google.com:19302",
                        "stun:stun1.l.google.com:19302",
                        "stun:stun2.l.google.com:19302",
                        "stun:stun3.l.google.com:19302",
                        "stun:stun4.l.google.com:19302",
                    ]
                }
            ]
        }
    );
    myPeerConnection.addEventListener("icecandidate", handleIce)
    myPeerConnection.addEventListener("addstream", handleAddStream)
    myStream.getTracks().forEach(track => {
        myPeerConnection.addTrack(track, myStream)
    });
}

function handleIce(data){
    console.log("sent candidate");
    socket.emit('ice', data.candidate, roomName);
}
function handleAddStream(data){
    // console.log("got a stream from peer");
    // console.log("Peer Stream", data.stream);
    // console.log("mystream", myStream);

    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;

}

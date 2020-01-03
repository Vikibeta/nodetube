const pathName = window.location.pathname;

const regexp = /\/user\/(.*)\/live/;

const username = pathName.match(regexp)[1];

let webSocketUrl = `wss://${location.host}/one2many`;

webSocketUrl = 'ws://' + 'localhost:8443' + '/one2many';

webSocketUrl = `${'wss://' + 'localhost:8080' + '/stream/'}${username}`;

// webSocketUrl = 'wss://' + 'live.pewtube.com' + '/stream/' + username;

// webSocketUrl = 'wss://' + 'livestream.pew.tube:8443' + '/one2many';

console.log(webSocketUrl);

const ws = new WebSocket(webSocketUrl);

console.log(ws);

let messageUrl = `ws://${location.host}/messages`;

messageUrl = `${'wss://' + 'localhost:8080' + '/messages/'}${username}`;

// messageUrl = 'wss://' + 'live.pewtube.com' + '/messages/' + username;

// messageUrl = 'wss://' + '144.217.180.135' + '/messages/' + anthony

// 'wss://' + 'live.pewtube.com' + '/messages/' + 'anthony'

console.log(messageUrl);

const messageSocket = new WebSocket(messageUrl);

const onUserConnection = {
  username,
  message: 'CONNECTING'
};

messageSocket.onopen = function(event){
  messageSocket.send(JSON.stringify(onUserConnection));
};

console.log(messageSocket);

function onError(error){
  console.log(error);
}

let video;
let webRtcPeer;
let webRtcPeerScreencast;

window.onload = function(){
  // console = new Console();
  video = document.getElementById('video');

  document.getElementById('call').addEventListener('click', () => { presenter(); });
  document.getElementById('viewer').addEventListener('click', () => { viewer(); });
  document.getElementById('terminate').addEventListener('click', () => { stop(); });
};

window.onbeforeunload = function(){
  ws.close();
};

ws.onmessage = function(message){
  // console.log(message);

  const parsedMessage = JSON.parse(message.data);
  // console.info('Received message: ' + message.data);

  switch(parsedMessage.id){
  case'presenterResponse':
    presenterResponse(parsedMessage);
    break;
  case'viewerResponse':
    viewerResponse(parsedMessage);
    break;
  case'stopCommunication':
    dispose();
    break;
  case'iceCandidate':
    webRtcPeer.addIceCandidate(parsedMessage.candidate);
    break;
  default:
    if(parsedMessage.message !== 'Invalid message keep-alive'){
      console.error('Unrecognized message', parsedMessage);
    }
  }
};

function presenterResponse(message){
  console.log(message);

  if(message.response != 'accepted'){
    const errorMsg = message.message ? message.message : 'Unknown error';
    console.warn(`Call not accepted for the following reason: ${errorMsg}`);
    dispose();
    swal(`Call not accepted for the following reason: ${errorMsg}`);
  } else {
    webRtcPeer.processAnswer(message.sdpAnswer);
    swal('Your stream has begun, please click "Watch As Viewer"');
  }
}

function viewerResponse(message){
  console.log(message);

  if(message.response != 'accepted'){
    const errorMsg = message.message ? message.message : 'Unknown error';
    console.warn(`Call not accepted for the following reason: ${errorMsg}`);
    dispose();

    if(message.message == 'No active presenter. Try again later...'){
      swal('The presenter is not currently presenting, try again later');
    }
  } else {
    webRtcPeer.processAnswer(message.sdpAnswer);
  }
}

function presenter(){
  if(!webRtcPeer){
    showSpinner(video);

    let options;

    if(streamType == 'screenshare'){
      options = {
        audioStream,
        videoStream: desktopStream,
        localVideo: video,
        onicecandidate: onIceCandidate,
        sendSource: 'screen'
      };
    } else if(streamType == 'video'){
      options = {
        videoStream,
        localVideo: video,
        onicecandidate: onIceCandidate
      };
    } else {
      throw new Error('Not a video share or a screen share');
    }

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error){
      console.log(`error${error}`);

      if(error)return onError(error); // You'll need to use whatever you use for handling errors

      console.log('running here');

      this.generateOffer(onOfferPresenter);
    });
  }
}

function onOfferPresenter(error, offerSdp){
  console.log(error);

  if(error)return onError(error);

  // console.log(offerSdp);

  // TODO: need to add a name for the presenter here

  const message = {
    presenter: username,
    id: 'presenter',
    sdpOffer: offerSdp
  };
  sendMessage(message);
}

function viewer(){
  if(!webRtcPeer){
    showSpinner(video);

    // TODO: send the username here

    const options = {
      remoteVideo: video,
      onicecandidate: onIceCandidate
    };

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error){
      if(error)return onError(error);

      this.generateOffer(onOfferViewer);
    });
  }
}

function onOfferViewer(error, offerSdp){
  if(error)return onError(error);

  const message = {
    presenter: username,
    id: 'viewer',
    sdpOffer: offerSdp
  };
  sendMessage(message);
}

function onIceCandidate(candidate){
  // console.log('Local candidate' + JSON.stringify(candidate));

  const message = {
    id: 'onIceCandidate',
    candidate
  };
  sendMessage(message);
}

function stop(){
  if(webRtcPeer){
    const message = {
      id: 'stop'
    };
    sendMessage(message);
    dispose();
  }
}

function dispose(){
  if(webRtcPeer){
    webRtcPeer.dispose();
    webRtcPeer = null;
  }
  hideSpinner(video);
}

function sendMessage(message){
  const jsonMessage = JSON.stringify(message);
  // console.log('Sending message: ' + jsonMessage);
  ws.send(jsonMessage);
}

function showSpinner(){
  for(let i = 0; i < arguments.length; i++){
    arguments[i].poster = '/images/livestreaming/transparent-1px.png';
    arguments[i].style.background = 'center transparent url("./images/livestreaming/spinner.gif") no-repeat';
  }
}

function hideSpinner(){
  for(let i = 0; i < arguments.length; i++){
    arguments[i].src = '';
    arguments[i].poster = '/images/livestreaming/webrtc.png';
    arguments[i].style.background = '';
  }
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event){
  event.preventDefault();
  $(this).ekkoLightbox();
});

ws.onclose = function(one, two, three){
  console.log(one);
  console.log(two);
  console.log(three);
};

ws.onerror = function(one, two, three){
  console.log(one);
  console.log(two);
  console.log(three);
};

/** MESSAGING FUNCTIONALITY* */

const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function escapeHtml(string){
  return String(string).replace(/[&<>"'`=\/]/g, s => entityMap[s]);
}

let usernamePicked = false;

// var usernamePicked = true;
let messagingUsername;

$(document).ready(() => {
  // username selection functionality
  $('.message-text').on('focus', () => {
    if(usernamePicked == false){
      swal({
        title: 'Pick Username',
        text: 'Please write your username below',
        type: 'input',
        showCancelButton: true,
        closeOnConfirm: false,
        animation: 'slide-from-top',
        inputPlaceholder: 'Username'
      },
        (inputValue) => {
          if(inputValue === false)return false;

          if(inputValue === ''){
            swal.showInputError('You need to write something!');
            return false;
          }

          messagingUsername = inputValue;
          usernamePicked = true;

          swal({
            title: 'Nice',
            text: `You selected the username: ${inputValue}`,
            type: 'success'
          },

            () => {
              setTimeout(() => {
                $('.message-text').focus();
              }, 500);
            });
        });
    }
  });

  // send message via websocket
  function sendChatMessage(){
    let messageText = $('.message-text').val();

    if(messageText == ''){
      return;
    }

    messageText = `${messagingUsername}: ${messageText}`;

    // make sure this username is the username of the streamer
    const onSendMessage = {
      username,
      message: messageText
    };

    messageSocket.send(JSON.stringify(onSendMessage));

    messageText = $('.message-text').val('');
  }

  // when send message button clicked
  $('.send-text').on('click', (e) => {
    e.preventDefault();

    sendChatMessage();
  });

  // when enter button clicked
  $(document).keypress((e) => {
    if(e.which == 13){
      sendChatMessage();
    }
  });
});

let connectedUsersAmount = 0;

// receive connected user amounts and new messages
messageSocket.onmessage = function(message){
  data = JSON.parse(message.data);

  console.log(data);

  // if message, prepend it to messages list
  if(data.message && data.message !== 'undefined: undefined'){
    const escapedMessage = escapeHtml(data.message);

    $('.message-list').prepend(`<li>${escapedMessage}</li>`).html();
  }

  // if its to do with connected users, append
  if(data.connectedUsersAmount){
    connectedUsersAmount = data.connectedUsersAmount;

    $('.userAmount').text(`Users In Room: ${connectedUsersAmount}`);

    // console.log(connectedUsersAmount);
  }
};

// close socket on page reload
window.onbeforeunload = function(event){
  console.log('closing!');

  const onUserDisconnection = {
    username,
    message: 'DISCONNECTING'
  };

  messageSocket.send(JSON.stringify(onUserDisconnection));
  messageSocket.close();
  ws.close();
};

// keep socket open for messages
setInterval(() => {
  messageSocket.send(JSON.stringify({ message: 'KEEP-ALIVE' }));

  sendMessage('keep-alive');
}, 1000 * 10);

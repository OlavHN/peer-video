'use strict';

// Cross browser shims
var PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

function Peer(id) {
  this.id = id;

  this.servers = {
    iceServers: [
      {
        url: 'stun:23.21.150.121'
      },
      {
        url: 'stun:stun.l.google.com:19302'
      }
    ]
  };

  this.options = {
    optional: [
      {
        DtlsSrtpKeyAgreement: true
      }
    ]
  };
}

Peer.prototype = {

  createPeerConnection: function() {
    this.pc = new PeerConnection(this.servers, this.options);
    this.pc.onicecandidate = this._onicecandidate.bind(this);
    this.pc.onaddstream = this._onaddstream.bind(this);
    this.pc.addStream(this.local);
    console.log(this);
  },

  _onicecandidate: function(e) {
    if (!e.candidate)
      return;
    this.pc.onicecandidate = null; // TODO: What to do with the rest?
    this.socket.send(JSON.stringify({
      type: 'ice',
      candidate: e.candidate
    }));
  },

  // TODO: Should trigger on a proper DOM element
  _onaddstream: function(e) {
    console.log(this, e);
    var stream = e.stream;
    this.remote = stream;
    if (this.onaddstream && typeof this.onaddstream === 'function')
      this.onaddstream(stream);
  },

  addStream: function(stream) {
    this.local = stream;
    this._signaling();
  },

  _signaling: function() {
    var self = this;

    this.socket = new WebSocket('ws://0.0.0.0:8000/' + this.id);
    this.socket.addEventListener('message', function handleMessage(e) {
      var data = JSON.parse(e.data);
      switch (data.type) {
        case 'offerer':
          self.type = data.type;
          self.createPeerConnection();

          self.pc.createOffer(function(offer) {
            console.log(offer);
            self.pc.setLocalDescription(offer);

            self.socket.send(JSON.stringify({
              type: 'offer',
              offer: offer
            }));
          }, function errorHandler(err) {
            console.log('offer error', err);
          }, {
            mandatory: {
              OfferToReceiveAudio: true,
              OfferToReceiveVideo: true
            }
          });
          break;

        case 'answerer':
          self.type = data.type;
          self.createPeerConnection();
          break;

        case 'ice':
          self.pc.addIceCandidate(new IceCandidate(data.candidate));
          break;

        case 'offer':
          self.pc.setRemoteDescription(new SessionDescription(data.offer));

          self.pc.createAnswer(function(answer) {
            self.pc.setLocalDescription(answer);

            self.socket.send(JSON.stringify({
              type: 'answer',
              answer: answer
            }));
          }, function errorHandler(err) {
            console.log('error answering', err);
          }, {
            mandatory: {
              OfferToReceiveAudio: true,
              OfferToReceiveVideo: true
            }
          });
          break;

        case 'answer':
          self.pc.setRemoteDescription(new SessionDescription(data.answer));
          break;

        default:
          console.log('Got strange signal:', data);
      }
    });
  }
};

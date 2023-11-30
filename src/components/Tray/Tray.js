import React, { useCallback, useState } from 'react';
import {
  useDaily,
  useAppMessage,
  useScreenShare,
  useLocalParticipant,
  useVideoTrack,
  useAudioTrack,
  useDailyEvent,
} from '@daily-co/daily-react';

import MeetingInformation from '../MeetingInformation/MeetingInformation';
import Chat from '../Chat/Chat';

import './Tray.css';
import {
  CameraOn,
  Leave,
  CameraOff,
  MicrophoneOff,
  MicrophoneOn,
  Screenshare,
  Info,
  ChatIcon,
  ChatHighlighted,
} from './Icons';

export default function Tray({ leaveCall }) {
  const callObject = useDaily();
  const { isSharingScreen, startScreenShare, stopScreenShare } = useScreenShare();

  const [showMeetingInformation, setShowMeetingInformation] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [newChatMessage, setNewChatMessage] = useState(false);

  const localParticipant = useLocalParticipant();
  const localVideo = useVideoTrack(localParticipant?.session_id);
  const localAudio = useAudioTrack(localParticipant?.session_id);
  const mutedVideo = localVideo.isOff;
  const mutedAudio = localAudio.isOff;

  /* When a remote participant sends a message in the chat, we want to display a differently colored
   * chat icon in the Tray as a notification. By listening for the `"app-message"` event we'll know
   * when someone has sent a message. */
  useAppMessage({
    onAppMessage: useCallback(() => {
      /* Only light up the chat icon if the chat isn't already open. */
      if (!showChat) {
        setNewChatMessage(true);
      }
    }, [showChat]),
  });

  const toggleVideo = useCallback(() => {
    callObject.setLocalVideo(mutedVideo);
  }, [callObject, mutedVideo]);

  const toggleAudio = useCallback(() => {
    callObject.setLocalAudio(mutedAudio);
  }, [callObject, mutedAudio]);

  const toggleScreenShare = () => (isSharingScreen ? stopScreenShare() : startScreenShare());

  const toggleMeetingInformation = () => {
    setShowMeetingInformation(!showMeetingInformation);
  };

  const toggleChat = () => {
    setShowChat(!showChat);
    if (newChatMessage) {
      setNewChatMessage(!newChatMessage);
    }
  };
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);

  const startRecording = useCallback(() => {
    // TODO: check if MediarRecorder is supported by client browser: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder#browser_compatibility

    if (localParticipant) {
      // Create two video elements: one local video track and the other local screen share track
      // Also note that screen share needs to be started BEFORE starting recording in order for it to show up in the recording
      // Can be improved by listening to screen share state change and dynamically adding/removing tracks to MediaRecorder via addTrack() and removeTrack()

      const localVideoTrack = localParticipant.tracks.video.track;
      const localScreenVideoTrack = isSharingScreen
        ? localParticipant.tracks.screenVideo.track
        : null;

      const videoEl1 = document.createElement('video');
      videoEl1.srcObject = new MediaStream([localVideoTrack]);
      videoEl1.style.display = 'none';
      videoEl1.play();
      const videoEls = [videoEl1];

      if (localScreenVideoTrack) {
        const videoEl2 = document.createElement('video');
        videoEl2.srcObject = new MediaStream([localScreenVideoTrack]);
        videoEl2.style.display = 'none';
        videoEl2.play();
        videoEls.push(videoEl2);
      }

      // Creating a canvas element for rendering the video tracks
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      ctx.canvas.hidden = true;

      // Get the video track settings for layout math
      const videoTrackSettings1 = localVideoTrack.getSettings();
      const videoTrackSettings2 = localScreenVideoTrack
        ? localScreenVideoTrack.getSettings()
        : null;

      // Set the canvas width to be the sum of the widths of the video tracks
      canvas.width =
        videoTrackSettings1.width + (videoTrackSettings2 ? videoTrackSettings2.width : 0);
      // Set the canvas height to be the maximum height of the video tracks
      canvas.height = Math.max(
        videoTrackSettings1.height,
        videoTrackSettings2 ? videoTrackSettings2.height : 0,
      );

      // Draw each video onto a separate part of the canvas
      const drawVideos = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width1 = videoTrackSettings1.width;
        const height1 = videoTrackSettings1.height;
        ctx.drawImage(videoEls[0], 0, 0, width1, height1);

        if (videoTrackSettings2) {
          const width2 = videoTrackSettings2.width;
          const height2 = videoTrackSettings2.height;
          ctx.drawImage(videoEls[1], width1, 0, width2, height2);
        }

        requestAnimationFrame(drawVideos);
      };

      drawVideos();

      // Get local audio track also
      const localAudioTrack = localParticipant.tracks.audio.track;
      const audioContext = new AudioContext();
      const audioDestination = audioContext.createMediaStreamDestination();
      const localAudioStream = new MediaStream([localAudioTrack]);
      const audioSource = audioContext.createMediaStreamSource(localAudioStream);
      audioSource.connect(audioDestination);

      const stream = canvas.captureStream();
      stream.addTrack(audioDestination.stream.getAudioTracks()[0]);

      // Adjust as per needed. Note that VP9 support may not be available for all hardware and browsers, so VP8 might be a better default - so highly recommend placing checks to see if VP9 is supported
      const options = {
        audioBitsPerSecond: 48000,
        videoBitsPerSecond: 2000000,
        mimeType: 'video/webm;codecs="vp9,opus"',
      };
      const newMediaRecorder = new MediaRecorder(stream, options);
      setMediaRecorder(newMediaRecorder);

      // Start recording
      newMediaRecorder.start(5000);
      console.log('Recording started');
      newMediaRecorder.onerror = (e) => {
        console.log('MediaRecorder error:', e);
      };
      // Listen for dataavailable event to collect the recorded chunks
      newMediaRecorder.ondataavailable = (e) => {
        console.log('Data available:', e.data);
        setRecordedChunks((prev) => [...prev, e.data]);
      };
    }
  }, [localParticipant]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      // Stop recording
      mediaRecorder.stop();
      console.log('Recording stopped');

      // Create a Blob from the recorded chunks
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      console.log('Blob created:', blob);

      // Create a Blob URL for the Blob
      const url = URL.createObjectURL(blob);
      console.log('Blob URL:', url);

      // Create a link element and programmatically click it to download the file
      const link = document.createElement('a');
      link.href = url;
      link.download = 'recorded-video.webm';
      link.click();
      console.log('File downloaded:', link.download);
    }
  }, [mediaRecorder, recordedChunks]);

  return (
    <div className="tray">
      {showMeetingInformation && <MeetingInformation />}
      {/*  The chat messages 'live' in the <Chat/> component's state. We can't just remove the component */}
      {/*  from the DOM when hiding the chat, because that would cause us to lose that state. So we're */}
      {/*  choosing a slightly different approach of toggling the chat: always render the component, but only */}
      {/*  render its HTML when showChat is set to true. */}

      {/*   We're also passing down the toggleChat() function to the component, so we can open and close the chat */}
      {/*   from the chat UI and not just the Tray. */}
      <Chat showChat={showChat} toggleChat={toggleChat} />
      <div className="tray-buttons-container">
        <div className="controls">
          <button onClick={toggleVideo} type="button">
            {mutedVideo ? <CameraOff /> : <CameraOn />}
            {mutedVideo ? 'Turn camera on' : 'Turn camera off'}
          </button>
          <button onClick={toggleAudio} type="button">
            {mutedAudio ? <MicrophoneOff /> : <MicrophoneOn />}
            {mutedAudio ? 'Unmute mic' : 'Mute mic'}
          </button>
        </div>
        <div className="actions">
          <button onClick={toggleScreenShare} type="button">
            <Screenshare />
            {isSharingScreen ? 'Stop sharing screen' : 'Share screen'}
          </button>
          <button onClick={toggleMeetingInformation} type="button">
            <Info />
            {showMeetingInformation ? 'Hide info' : 'Show info'}
          </button>
          <button onClick={toggleChat} type="button">
            {newChatMessage ? <ChatHighlighted /> : <ChatIcon />}
            {showChat ? 'Hide chat' : 'Show chat'}
          </button>
          <button onClick={startRecording} type="button">
            Start Recording
          </button>
          <button onClick={stopRecording} type="button">
            Stop Recording
          </button>
        </div>
        <div className="leave">
          <button onClick={leaveCall} type="button">
            <Leave /> Leave call
          </button>
        </div>
        <canvas style={{ visibility: 'hidden', display: 'none' }} />
      </div>
    </div>
  );
}

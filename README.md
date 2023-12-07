# Daily React + local recording

> This repository is part of [a Daily blog post series](<[https://www.daily.co/blog/custom-video-app-with-daily-react-hooks-part-one/](https://www.daily.co/blog/tag/daily-react-hooks/)>) on using the [Daily React library](https://docs.daily.co/reference/daily-react) to create a custom video calling app.
> See the original repo for more info: https://github.com/daily-demos/custom-video-daily-react-hooks

This repo implements local recording via [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder). It adds 'Start/Stop recording' buttons that use a `<canvas>` to composite the local participant's video, audio, and screen share, passes it to the MediaRecorder API, and then downloads the file locally to your device once you hit 'stop recording'.

This is meant to be a starting point to build your local recording implementation, so there are gaps:
- cloud upload: The example doesn't handle uploading the local recording obtained in the user's device to the cloud. One way of doing is via AWS multipart upload. You could progressively upload the recorded chunks while the recording is happening. You might want to consider adjusting the frequency of chunks being uploaded based on the user's network conditions and it may not be ideal for users with poor network conditions
- error handling: You might also want to consider other edge cases and better error handling like what happens when the user closes the tab accidentally
- In this example: screen sharing needs to be started before you hit start recording - The code assumes that screen sharing is started before recording. You might need dynamic behavior (like turning on/off screen sharing while recording), for that you'll need to handle adding/removing tracks via addTrack() from MediaRecorder and listening for the screen share state change
- Video layout on the canvas - Currently, the two videos are just laid side by side so it's a basic layout. You might want to create a more sophisticated layout depending on your requirements.
<img width="1919" alt="image" src="https://github.com/daily-solutions/daily-react-local-recording-example/assets/32199592/c0fe3e6c-a867-4687-a528-eb2dc56e03d9">

- Audio recording - The audio from the local microphone is recorded, but not the audio from the remote participants. If you need to record remote audio, you'll need to capture and mix that audio into the recording
- Browser and encoder compatibility - The example uses VP9 codec for video encoding, which might not be supported in all browsers or hardware. You could fall back to VP8 if VP9 is not available, but this requires additional checks, I would recommend testing on some other devices as well w
- Performance - Rendering video ( + screen share track and other remote video tracks) on a canvas and then recording it can be CPU-intensive while also being on a call. In rough tests on a M1 Pro, starting recording increased CPU usage by about 10% but given the wide range of devices your users might be on, you'll want to conduct more testing


## Requirements

To use this demo, you will first need to [create a Daily account](https://dashboard.daily.co/signup). You will also need a Daily room URL, which you can get via two options in this demo:

- To create new Daily rooms directly through this demo's UI, you will need your Daily API key, which can be found on the [Developers](https://dashboard.daily.co/developers) page. This will be used in your environment variables. (Instructions below.)
- Alternatively, you can use existing Daily rooms in the demo by pasting the room URL into the input. The room URL should be in this format to be valid: `https://your-domain.daily.co/room-name`, with `daily-domain` changed to your domain, and `room-name` changed to the name of the existing room you would like to use.

---

## Running locally

To run this demo locally:

1. Install dependencies `npm install`
2. Start dev server `npm start`
3. Then open your browser and go to `http://localhost:3000`.

### Creating new rooms locally

To create new rooms via the app UI while testing locally, follow these additional steps:

- rename `example.env` to `.env`
- add your Daily API key (available in the Daily [dashboard](https://dashboard.daily.co/developers)) to `.env`
- add the value `local` to the `REACT_APP_ROOM_ENDPOINT` variable in `.env`

```dotenv
REACT_APP_DAILY_API_KEY=your-daily-api-key
REACT_APP_ROOM_ENDPOINT=local
```

- Restart your server, i.e. re-run `npm start`

OR...

## Deploy on Netlify

If you want access to the Daily REST API (using the proxy as specified in `netlify.toml`), you can deploy your own copy of this repo with one click via Netlify:

[![Deploy with Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/daily-demos/custom-video-daily-react-hooks)

Note: You'll need your [Daily API key](https://dashboard.daily.co/developers) handy for this step.

Visit the deployed domain provided by Netlify after completing this step to view the app.

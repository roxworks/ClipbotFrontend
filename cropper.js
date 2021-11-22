let Cropper = require('cropperjs');

let currCropDetails = {};
let ipcRenderer = window.ipcRenderer;
let isScreenvas = false;
let screenvasData = undefined;
let util = require('util');
ipcRenderer.on('screenvas_data', (event, arg) => {
  isScreenvas = true;
  screenvasData = arg;
});

let internalWidth = 960;
let internalHeight = 540;

let outputWidth = 1920;
let outputHeight = 1080;

let scaleUpCrop = (crop, video) => {
    crop.x = crop.x / internalWidth;
    crop.y = crop.y / internalHeight;
    crop.width = crop.width / internalWidth;
    crop.height = crop.height / internalHeight;
    crop.isNormalized = true;
    return crop;
};

let scaleDownCrop = (crop, video) => {
  if(crop.isNormalized) {
    console.log('normal');
    let scaleX = internalWidth;
    let scaleY = internalHeight;
    crop.x = crop.x * scaleX;
    crop.y = crop.y * scaleY;
    crop.width = crop.width * scaleX;
    crop.height = crop.height * scaleY;
  }
  else {
    let scaleX = video.videoWidth / internalWidth;
    let scaleY = video.videoHeight / internalHeight;
    crop.x = crop.x / scaleX;
    crop.y = crop.y / scaleY;
    crop.width = crop.width / scaleX;
    crop.height = crop.height / scaleY;
  }
  return crop;
};


const roundTo4Digits = (currAspectRatioNumber) => {
  return Math.round(currAspectRatioNumber * 10000) / 10000;
}
// window.addEventListener("load", async function (event) {
//     //   console.log(video.readyState);
//     //TODO: Disable like 90% of the weird double click and drag functionality holy crap

// });

ipcRenderer.on('crop_data', async (event, arg) => {
  console.log('Crop data event captured: ' + arg);
  let cropDetailsAndClip = JSON.parse(arg);
  let cropDetails = cropDetailsAndClip.cropDetails;
  let clip = cropDetailsAndClip.clip;
  let callback = cropDetailsAndClip.callback;
  let cropType = cropDetailsAndClip.cropType;
  console.log(
    'clip crop details' +
      JSON.stringify(cropDetails) +
      ' ' +
      JSON.stringify(cropDetailsAndClip)
  );

  console.log('loaded');
  // get current crop settings /settings from backend
  if (cropDetails == null || Object.keys(cropDetails).length == 0) {
    console.log('no crop details found');
    cropDetails = await fetch('http://localhost:42074/settings').then((res) =>
      res.json()
    );
    console.log(
      'got crop details from settings:' +
        JSON.stringify(cropDetails?.camCrop) +
        JSON.stringify(cropDetails?.screenCrop)
    );
  }
  if (clip == null) {
    console.log('no clip found');
    let clipsResult = await fetch('http://localhost:42074/clip/last').then(
      (res) => res.json()
    );
    clip = clipsResult?.clip;
  }

  console.log(JSON.stringify(clip));
  //check if current clip is in allClips
  let clipToDisplay = 'https://share.nyx.xyz/reWKYeJmokM';
  if (clip != null) {
    clipToDisplay = clip.download_url;
  }

  const video = document.querySelector('video');
  video.src = clipToDisplay;

  let baseCamCrop = cropDetails.camCrop;
  let baseScreenCrop = cropDetails.screenCrop;

  let ipcRenderer = window.ipcRenderer;

  if (window.camData) {
    console.log(JSON.stringify(camData));
  }
  const image = document.getElementById('cropCanvas');
  console.log(image);

  // start video stuff
  const canvas = image; //document.querySelector("#cropthing");
  // canvas.width = window.innerWidth;
  // canvas.height = "531px";

  const ctx = canvas.getContext('2d');

  let haveRunCropperStuff = false;

  video.addEventListener('readystatechange', function () {
    console.log('ready state changed');
    console.log('readyState: ' + video.readyState);
    if (video.readyState === 4 && haveRunCropperStuff === false) {
      console.log(video);
      haveRunCropperStuff = true;
      doAllCropperStuff(
        baseCamCrop,
        baseScreenCrop,
        video,
        isScreenvas,
        callback,
        canvas,
        clip,
        cropType
      );
      console.log('did stuff');
    }
  });

  video.addEventListener('loadeddata', function () {
    console.log('loaded data ' + video.readyState);
    if (video.readyState > 0 && haveRunCropperStuff === false) {
      haveRunCropperStuff = true;
      doAllCropperStuff(
        baseCamCrop,
        baseScreenCrop,
        video,
        isScreenvas,
        callback,
        canvas,
        image,
        clip,
        cropType
      );
    }
  });
  video.addEventListener('loadedmetadata', function () {
    if (video.readyState > 0 && haveRunCropperStuff === false) {
      haveRunCropperStuff = true;
      doAllCropperStuff(
        baseCamCrop,
        baseScreenCrop,
        video,
        isScreenvas,
        callback,
        canvas,
        image,
        clip,
        cropType
      );
    }
    console.log('loaded metadata ' + video.readyState);
  });

  if (video.readyState === 4 && haveRunCropperStuff === false) {
    haveRunCropperStuff = true;
    console.log(video);
    doAllCropperStuff(
      baseCamCrop,
      baseScreenCrop,
      video,
      isScreenvas,
      callback,
      canvas,
      image,
      clip,
      cropType
    );
    console.log('did stuff');
  }
});

let doAllCropperStuff = (
  baseCamCrop,
  baseScreenCrop,
  video,
  isScreenvas,
  callback,
  canvas,
  image,
  clip,
  cropType
) => {
  console.log('video height' + video.videoHeight);
  console.log('video width' + video.videoWidth);
  let camCrop = baseCamCrop?.width ? scaleDownCrop(baseCamCrop, video) : {};
  let screenCrop = baseScreenCrop?.width
    ? scaleDownCrop(baseScreenCrop, video)
    : {};
  canvas.width = video.clientWidth;
  canvas.height = video.clientHeight;

  let cropper = new Cropper(image, {
    viewMode: 1,
    dragMode: 'crop',
    // preview: '.preview',
    data: isScreenvas ? screenCrop : camCrop,
    zoomable: false,
    background: false,
    modal: false,
    highlight: false,
    crop(event) {
      currCropDetails = {
        x: event.detail.x,
        y: event.detail.y,
        width: event.detail.width,
        height: event.detail.height,
        scaleX: event.detail.scaleX,
        scaleY: event.detail.scaleY,
      };
      console.log(JSON.stringify(currCropDetails));
    },
  });
  //TODO: DELETE
  // window.cropper = cropper;

  console.log(cropper);
  let currAspectRatioNumber = 16 / 9;
  let currRatio = roundTo4Digits(16/9);
  cropper.setAspectRatio(16 / 9);

  if (!camCrop?.width) {
    console.log('setting aspect ratio');
    cropper.setAspectRatio(16 / 9);
  } else {
    if (!isScreenvas) {
      console.log('is not screenvas');
      cropper.setAspectRatio(camCrop.width / camCrop.height);
      currAspectRatioNumber = camCrop.width / camCrop.height;
      currRatio = roundTo4Digits(currAspectRatioNumber);
    }
  }

  const doneButton = document.getElementById('done');
  const doneFunc = () => {
    console.log('done clicked');
    ipcRenderer.send(
      'camvas_closed',
      JSON.stringify({
        cropDetails: {
          camCrop: scaleUpCrop(camCrop, video),
          screenCrop: scaleUpCrop(screenCrop, video),
          cropType: cropType,
          isNormalized: true,
        },
        camData: cropType == 'no-cam' ? scaleUpCrop(currCropDetails, video) : currCropDetails,
        callback: callback,
        isNormalized: true,
        clip: clip,
        cropType: cropType,
      })
    );
    window.close();
  };
  doneButton.addEventListener('click', doneFunc);

  //setAspectRatio

  const ratioButton = document.getElementById('ratio');
  if(cropType == 'no-cam') {
    ratioButton.style.display = 'none';
    currAspectRatioNumber = 9 / 16;
    currRatio = roundTo4Digits(currAspectRatioNumber);
    cropper.setAspectRatio(currAspectRatioNumber);
    console.log('no-cam activated');
  }
  else if(currRatio == roundTo4Digits(9/16)) {
    console.log('Changing ratio back');
    currAspectRatioNumber = 16 / 9;
    currRatio = roundTo4Digits(currAspectRatioNumber);
    cropper.setAspectRatio(currAspectRatioNumber);
    console.log('Ratio fixed');
  }
  else {
    console.log('aspect ratio: ' + cropper.aspectRatio);
  }
  ratioButton.addEventListener('click', () => {
    console.log('ratio clicked');
    // let ipcRenderer = window.ipcRenderer;
    // ipcRenderer.send('canvas_closed', JSON.stringify(currCropDetails));
    // window.close();
    if (currRatio == roundTo4Digits(16/9)) {
      currAspectRatioNumber = 4 / 3;
      currRatio = roundTo4Digits(currAspectRatioNumber);
    } else {
      currAspectRatioNumber = 16 / 9;
      currRatio = roundTo4Digits(currAspectRatioNumber);
    }

    cropper.setAspectRatio(currAspectRatioNumber);
  });

  // set aspect ratio based on the ratio of the cam data detected in the event
  let screenvasDataProcessor = (event, arg) => {
    console.log("OH NO IT'S NOT THE CAMERA");
    document.getElementById('ratio').style.display = 'none';
    document.querySelector('h1').innerHTML = 'Select Your Gameplay Area';

    const cropData = JSON.parse(arg);
    const camData = cropData.camData;
    const callback = cropData.callback; //new data from cam

    let aspectRatio = 1080 / 1320;
    console.log(camData);
    if (camData) {
      if (camData.width / camData.height < 1.5) {
        aspectRatio = 1080 / 1110;
      }
      // calculate aspect ratio based on camdata width and height
      cropper.setAspectRatio(aspectRatio);
    }
    else {

    }
    // log camData camCrop and screenCrop
    console.log(
      `${
        JSON.stringify(camData) +
        JSON.stringify(camCrop) +
        JSON.stringify(screenCrop)
      }`
    );

    if (
      camData.width == camCrop.width &&
      camData.height == camCrop.height &&
      camData.x == camCrop.x &&
      camData.y == camCrop.y &&
      screenCrop
    ) {
      //no change in cam
      console.log('should show screencrop' + JSON.stringify(screenCrop));
      cropper.setData({ x: screenCrop.x, y: screenCrop.y });
      cropper.setData({ width: screenCrop.width, height: screenCrop.height });
      console.log(JSON.stringify(cropper.data));
    }

    let doneButton = document.getElementById('done');
    //remove all event listeners from doneButton
    doneButton.removeEventListener('click', doneFunc);

    // add new event listeners to doneButton
    doneButton.addEventListener('click', () => {
      console.log('done clicked');
      ipcRenderer.send(
        'screenvas_closed',
        JSON.stringify({
          camCrop: scaleUpCrop(camData, video),
          screenCrop: scaleUpCrop(currCropDetails, video),
          isNormalized: true,
          callback: callback,
          cropType: cropType,
        })
      );
      window.close();
    });
  };

  if (isScreenvas) {
    screenvasDataProcessor(undefined, screenvasData);
  } else {
    ipcRenderer.on('screenvas_data', screenvasDataProcessor);
  }
};

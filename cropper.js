let Cropper = require('cropperjs');
let currCropDetails = {};
let ipcRenderer = window.ipcRenderer;
let isScreenvas = false;
let screenvasData = undefined;
ipcRenderer.on('screenvas_data', (event, arg) => {
    isScreenvas = true;
    screenvasData = arg;
});

let internalWidth = 960;
let internalHeight = 540;

let outputWidth = 1920;
let outputHeight = 1080;

let scaleUpCrop = (crop, video) => {
    let scaleX = video.videoWidth/internalWidth;
    let scaleY = video.videoHeight/internalHeight;
    crop.x = crop.x * scaleX;
    crop.y = crop.y * scaleY;
    crop.width = crop.width * scaleX;
    crop.height = crop.height * scaleY;
    return crop;
}

let scaleDownCrop = (crop, video) => {
    let scaleX = video.videoWidth/internalWidth;
    let scaleY = video.videoHeight/internalHeight;
    crop.x = crop.x / scaleX;
    crop.y = crop.y / scaleY;
    crop.width = crop.width / scaleX;
    crop.height = crop.height / scaleY;
    return crop;
}

window.addEventListener("load", async function (event) {
    console.log('loaded');
    // get current crop settings /settings from backend
    let cropDetails = await fetch("http://localhost:42074/settings").then(res => res.json());
    let state = await fetch("http://localhost:42074/state").then(res => res.json());
    let clipToDisplay = state.clipToDisplay;
    const video = document.querySelector("video");
    video.src = clipToDisplay;

    let baseCamCrop = cropDetails.camCrop;
    let baseScreenCrop = cropDetails.screenCrop;

    let ipcRenderer = window.ipcRenderer;

    if(window.camData) {
        console.log(JSON.stringify(camData));
    }
    const image = document.getElementById('cropCanvas');
    console.log(image);

    // start video stuff
    const canvas = image;//document.querySelector("#cropthing");
    // canvas.width = window.innerWidth;
    // canvas.height = "531px";

    const ctx = canvas.getContext("2d");

    //end video stuff

    // function dovideostuff () {
    //     var v = document.querySelector('video');
    //     var canvas = document.getElementById('cropthing');
    //     var context = canvas.getContext('2d');
    //     console.log('doin video stuff');
    //     console.log('v' + v.videoHeight);
    //     console.log('canvas' + canvas);
    //     console.log('context' + context);

        

    //     v.addEventListener('play', function(){
    //         var cw = v.videoWidth;
    //         var ch = v.videoHeight;
    //         canvas.width = cw;
    //         canvas.height = ch;
    //         console.log('played');
    //         draw(this,context,cw,ch);
    //     },false);
        
    //     function draw(v,c,w,h) {
    //         if(v.paused || v.ended) {
    //             console.log('wat');
    //             return false;
    //         }
    //         c.drawImage(v,0,0,w,h);
    //         setTimeout(draw,20,v,c,w,h);
    //     }
    // };
    // dovideostuff();

    

    let doAllCropperStuff = () => {
        console.log("video height" + video.videoHeight);
        console.log("video width" + video.videoWidth);
        let camCrop = baseCamCrop.width ? scaleDownCrop(baseCamCrop, video) : {};
        let screenCrop = baseScreenCrop.width ? scaleDownCrop(baseScreenCrop, video) : {};
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
        window.cropper = cropper;
    
        console.log(cropper);
    
        if(!(camCrop?.width)) {
            console.log("setting aspect ratio");
            cropper.setAspectRatio(16/9);
        }
        else {
            if(!isScreenvas) {
                console.log('is not screenvas');
                cropper.setAspectRatio(camCrop.width / camCrop.height);
            }
        }
    
        const doneButton = document.getElementById('done');
        const doneFunc = () => {
            console.log('done clicked');
            ipcRenderer.send('camvas_closed', JSON.stringify(currCropDetails));
            window.close();
        };
        doneButton.addEventListener('click', doneFunc);
    
        //setAspectRatio
        let currAspectRatioNumber = 16 / 9;
        let currRatio = '16/9';
        const ratioButton = document.getElementById('ratio');
        ratioButton.addEventListener('click', () => {
            console.log('ratio clicked');
            // let ipcRenderer = window.ipcRenderer;
            // ipcRenderer.send('canvas_closed', JSON.stringify(currCropDetails));
            // window.close();
            if(currRatio == '16/9') {
                currAspectRatioNumber = 4/3;
                currRatio = '4/3';
            }
            else {
                currAspectRatioNumber = 16/9;
                currRatio = '16/9';
            }
    
            cropper.setAspectRatio(currAspectRatioNumber);
        });
    
        // set aspect ratio based on the ratio of the cam data detected in the event
        let screenvasDataProcessor = (event, arg) => {
            console.log("OH NO IT'S NOT THE CAMERA");
            document.getElementById('ratio').style.visibility = 'hidden';
            document.querySelector('h1').innerHTML = 'Select Your Gameplay Area';
    
            const camData = JSON.parse(arg); //new data from cam
            
            let aspectRatio = 1080/1320;
            console.log(camData);
            if(camData) {
                if ((camData.width / camData.height) < 1.5) {
                    aspectRatio = 1080/1110;
                }
                // calculate aspect ratio based on camdata width and height
                cropper.setAspectRatio(aspectRatio);
            }
    
            if(camData.width == camCrop.width &&
                camData.height == camCrop.height &&
                camData.x == camCrop.x &&
                camData.y == camCrop.y &&
                screenCrop) {
                    //no change in cam
                console.log('should show screencrop' + JSON.stringify(screenCrop));
                cropper.setData({x: screenCrop.x, y: screenCrop.y});
                cropper.setData({width: screenCrop.width, height: screenCrop.height});
                console.log(JSON.stringify(cropper.data));
            }
    
            let doneButton = document.getElementById('done');
            //remove all event listeners from doneButton
            doneButton.removeEventListener('click', doneFunc);
    
            // add new event listeners to doneButton
            doneButton.addEventListener('click', () => {
                console.log('done clicked');
                ipcRenderer.send('screenvas_closed', JSON.stringify({
                    camCrop: scaleUpCrop(camData, video),
                    screenCrop: scaleUpCrop(currCropDetails, video)
                }));
                window.close();
            });
        };
        
        
           
        if(isScreenvas) {
            screenvasDataProcessor(undefined, screenvasData);
        }
        else {
            ipcRenderer.on('screenvas_data', screenvasDataProcessor); 
        }

    }

    // video.addEventListener('play', () => {
    //     console.log('played');
    //     // console.log('video played');
    //     // console.log(canvas.width);
    //     // function step() {
    //     //     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    //     //     requestAnimationFrame(step);
    //     // }
    //     // requestAnimationFrame(step);
        

    // });
    let haveRunCropperStuff = false;

    video.addEventListener('readystatechange', function() {
        console.log('ready state changed');
        console.log('readyState: ' + video.readyState);
        if(video.readyState === 4 && haveRunCropperStuff === false) {
            console.log(video);
            haveRunCropperStuff = true;
            doAllCropperStuff();
            console.log('did stuff');
        }
      });

      video.addEventListener('loadeddata', function() {
          console.log('loaded data ' + video.readyState);
          if(video.readyState > 0 && haveRunCropperStuff === false) {
            haveRunCropperStuff = true;
            doAllCropperStuff();
          }
      });
      video.addEventListener('loadedmetadata', function() {
          if(video.readyState > 0 && haveRunCropperStuff === false) {
            haveRunCropperStuff = true;
            doAllCropperStuff();

          }
          console.log('loaded metadata '  + video.readyState);
      });

    if(video.readyState === 4 && haveRunCropperStuff === false) {
        haveRunCropperStuff = true;
        console.log(video);
        doAllCropperStuff();
        console.log('did stuff');
    }
    
    //   console.log(video.readyState);
    //TODO: Disable like 90% of the weird double click and drag functionality holy crap
 
});
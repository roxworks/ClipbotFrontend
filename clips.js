// load clips from /clip/all on localhost:42074
let allClips = [];
let state = {};
let displayedClip = undefined;
let currentIndex = 0;
let settingsDidLoad = undefined;
let clipsTotal = 0;
const querystring = require('querystring');
const fields = ['title', 'youtubeTitle', 'youtubeHashtags', 'youtubeTags', 'youtubeDescription', 'tiktokTitle', 'tiktokHashtags', 'startTime', 'endTime']

const setPlaceholders = () => {
  fields.forEach(field => {
    document.getElementById(field).value = '';
    document.getElementById(field).placeholder = displayedClip[field] || 'None (will use normal settings)';
  })
}

const saveAll = async () => {
  let newSettings = getAllFieldsAsObject();
  return updateClipFrontendAndBackend(newSettings).then(setPlaceholders);
}

const getAllFieldsAsObject = () => {
  let newSettings = {};
  fields.forEach(field => {
    let newValue = document.getElementById(field).value;
    if (newValue != '') {
      newSettings[field] = newValue;
    }
  });
  return newSettings;
}

const cropDisplay = (video, vidContainer, clipdata, partOfScreen) => {
  /*"camCrop": {
                "x": 0.846875,
                "y": 0.003703703703703704,
                "width": 0.15104166666666666,
                "height": 0.2013888888888889,
                "scaleX": 1,
                "scaleY": 1,
                "isNormalized": true
            }, */
  /*
  container {
     margin left: -x;
      margin top: -y;
  }
  video {
    width: width * videoWidth;
    height: height * videoHeight;
  }

  */

  const containerHeight = 317;
  const containerWidth = 602;
  let desiredWidth = 550;
  let desiredHeight = 312;

  if(clipdata?.screenCrop && partOfScreen == 'cam') {
    // let heightRatio = clipdata?.screenCrop?.height / clipdata?.camCrop?.height;
    let screenToCamRatio = clipdata?.screenCrop?.width / clipdata?.camCrop?.width;
    desiredWidth = desiredWidth * screenToCamRatio;
    desiredHeight = desiredHeight * screenToCamRatio;

    
  }

  let widthDiff = containerWidth - desiredWidth;
  let heightDiff = containerHeight - desiredHeight;

  let cropToUse = partOfScreen == 'cam' ? clipdata?.camCrop : clipdata?.screenCrop;

  if(cropToUse){
    console.log('cropping frontend ' + partOfScreen);
    console.log('crop: ', cropToUse);
    console.log('video', video);
    console.log('vidContainer', vidContainer);

    // set container style
    video.style.width = desiredWidth + 'px';
    video.style.height = desiredHeight + 'px';
    video.style.marginLeft  = (-cropToUse.x * desiredWidth) + 'px';
    video.style.marginTop = (-cropToUse.y * desiredHeight ) + 'px';

    // set video style
    
    vidContainer.style.overflow = 'hidden';
    vidContainer.style.width = cropToUse.width * desiredWidth + 'px';
    vidContainer.style.height = cropToUse.height * desiredHeight + 'px';
    vidContainer.style.marginBottom = vidContainer.style.height + 'px';
    if(partOfScreen == 'screen'){
      vidContainer.style.display = 'block';
    }
  }
  else {
    console.log('no crop data');
    console.log(clipdata);
  }
}

const setClip = (newIndex) => {
  if (newIndex > -1 && newIndex < allClips.length) {
    let vid = document.getElementsByTagName('video')[0];
    let vidContainer = document.getElementById('vidContainer');

    let vid2 = document.getElementsByTagName('video')?.[1];
    let vidContainer2 = document.getElementById('vidContainer2');
    vid.controls = true;
    displayedClip = allClips[newIndex];
    vid.src = displayedClip.download_url;
    
    cropDisplay(vid, vidContainer, displayedClip?.customCrop, 'cam');
    if (displayedClip?.customCrop?.screenCrop) {
      console.log('screen crop displaying');
      vid2.src = displayedClip.download_url;
      cropDisplay(vid2, vidContainer2, displayedClip?.customCrop, 'screen');
    }
    else {
      vidContainer2.style.display = 'none';
    }
    clipsTotal = allClips.length;
    setPlaceholders();
    changeFrontendStatuses();
    if (currentIndex == allClips.length - 1 && allClips.length > 1) {
      document.getElementById('next').disabled = true;
      document.getElementById('prev').disabled = false;
    } else if (currentIndex == 0 && allClips.length > 1) {
      document.getElementById('next').disabled = false;
      document.getElementById('prev').disabled = true;
    } else if (allClips.length == 0 || allClips.length == 1) {
      document.getElementById('next').disabled = true;
      document.getElementById('prev').disabled = true;
    } else {
      document.getElementById('next').disabled = false;
      document.getElementById('prev').disabled = false;
    }
  } else {
    document.getElementById('title').placeholder =
      'No clips found, load more clips!';
    let vid = document.getElementsByTagName('video')[0];
    vid.src = 'images/noMoClips.mp4';
    vid.pause();
    vid.controls = false;
    displayedClip = {};
    document.getElementById('next').disabled = true;
    document.getElementById('prev').disabled = true;
    changeFrontendStatuses('Change your filters or make new clips!');
  }
};

const changeClipOnFrontend = async (newSettings) => {
  let keys = Object.keys(newSettings);
  for (key of keys) {
    allClips[currentIndex][key] = newSettings[key];
    displayedClip[key] = newSettings[key];
  }
  console.log('frontend clipsettings set');
  return changeFrontendStatuses();
};

const changeFrontendStatuses = async (customStatus) => {
  let settings = await settingsDidLoad;
  if (customStatus) {
    document.getElementById('approvalStatus').innerHTML = customStatus;
  }
  //Change approvalStatus and uploadedStatus text based on displayedClip fields
  if (displayedClip.approved == true) {
    document.getElementById('approvalStatus').value = 'Approved';
  } else if (displayedClip.approved == false) {
    document.getElementById('approvalStatus').value = 'Rejected';
  } else {
    document.getElementById('approvalStatus').value =
      (settings?.defaultApprove == true ||
        settings?.defaultApprove == 'true') &&
      displayedClip.view_count >= settings?.minViewCount
        ? 'Approved By Default'
        : 'Not Yet Approved';
  }
  if (displayedClip.uploaded == true) {
    document.getElementById('uploadedStatus').value = 'Uploaded';
  } else {
    document.getElementById('uploadedStatus').value = 'Not Uploaded';
  }

  let vertVideoEnabled = await getClipOrientationIsVertical();
  if (vertVideoEnabled) {
    document.getElementById('customOrientation').innerText =
      'Change to Horizontal';
    document.getElementById('customCrop').disabled = false;
  } else {
    document.getElementById('customOrientation').innerText =
      'Change to Vertical';
    document.getElementById('customCrop').disabled = true;
  }
  return {
    status: 200,
  };
};

const updateClipOnBackend = async (clipId, newSettings) => {
  //PUT to /clip with   ngs
  let res = await fetch('http://localhost:42074/clip/', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...newSettings, id: clipId }),
  });
  ipcRenderer.send('settings_updated');
  return res;
};

const updateClipFrontendAndBackend = async (newSettings) => {
  await updateClipOnBackend(displayedClip.id, newSettings);
  return changeClipOnFrontend(newSettings);
};

const changeTitle = async (dataToChange) => {
  console.log('Change title');
  // hit setting endpoint with new title
  if (dataToChange == {} || !dataToChange) {
    return false;
  }
  let result = await updateClipFrontendAndBackend(dataToChange);
  if (result.status === 200) {
    SafeSwal.fire({
      icon: 'success',
      title: 'Title(s) changed!',
    });
  } else {
    SafeSwal.fire({
      icon: 'error',
      title: 'Error changing title',
    });
  }
  return true;
};

const setFrontendClips = async (clips) => {
  if (!clips) {
    let clipsResult = await fetch('http://localhost:42074/clip/all').then(
      (res) => res.json()
    );
    console.log(`got ${clipsResult?.clips?.length} clips`);
    allClips = clipsResult.clips;
    state = await fetch('http://localhost:42074/state').then((res) =>
      res.json()
    );
    console.log(JSON.stringify(allClips));
    //check if current clip is in allClips
    let possibleCurrentClipIndex = allClips.findIndex(
      (clip) => clip.id === state.currentClipId
    );
    currentIndex = possibleCurrentClipIndex >= 0 ? possibleCurrentClipIndex : 0;
    if (allClips.length == 0) {
      currentIndex = -1;
    }
  } else {
    allClips = clips;
    currentIndex = 0;
  }

  setClip(currentIndex);
  return allClips;
};

document.addEventListener('DOMContentLoaded', async function () {
  let allClips = await setFrontendClips();

  document.getElementById('prev').addEventListener('click', function () {
    if (currentIndex > 0) {
      currentIndex--;
      setClip(currentIndex);
    }
  });

  document.getElementById('next').addEventListener('click', function () {
    if (currentIndex < allClips.length - 1) {
      currentIndex++;
      setClip(currentIndex);
    }
  });

  setupTitleStuff();
  // setupLoadButton();
  setupApproveRejectButtons();
  setupCloseButton();
  setupOrientationButtons();
  setupFilterFunctionality();
  setClipsCount();
  setupTutorial();
});

const changeTitleFrontend = (titleDidChange, dataChangedId) => {
  if (titleDidChange) {
    console.log(dataChangedId)
    document.getElementById(dataChangedId).value = '';
    document.getElementById(dataChangedId).placeholder = displayedClip[dataChangedId];
    console.log('placeholders changed');
  }
};

const setupTitleStuff = async () => {
  //add click listener to #changetitlebutton
  let buttons = Array.from(document.getElementsByClassName('clipTextbtn'));
  buttons.forEach(button => {
    button.addEventListener('click', async function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('title changin');
      let actualId = button.getAttribute('id').replace('-button', '');
      let newValue = document.getElementById(actualId).value;
      let dataToChange = {};
      dataToChange[actualId] = newValue;
      console.log(dataToChange);
      // await Swal.fire({actualId, newValue})
      let titleDidChange = await changeTitle(dataToChange);
      changeTitleFrontend(titleDidChange, actualId);
      return false;
    });
  });
    

  // document
  //   .getElementById('title-form').on('submit', () => {})
  // document
  //   .getElementById('title-form')
  //   .addEventListener('submit', async (e) => {
  //     e.preventDefault();
  //     e.stopPropagation();
  //     console.log('update submitted');
  //     // let titleDidChange = await changeTitle();
  //     // if (titleDidChange) {
  //     //   document.getElementById('cliptitle').value = '';
  //     //   document.getElementById('cliptitle').placeholder = displayedClip?.title;
  //     //   console.log('placeholders changed');
  //     // }
  //     return false;
  //   });

  // document.getElementById("cliptitle").addEventListener('submit', (e) => {
  //     e.preventDefault();
  //     e.stopPropagation();
  //     console.log('new title submitted');
  //     changeTitle().then(updateDisplayedSettings);
  //     return false;
  // });
};

const setupTutorial = async () => {
  document
  .getElementById('tutorial')
  .addEventListener('click', async function (event) {
    var tourguide = new Tourguide({
      "steps": clips_steps
    });
    tourguide.start();
    Swal.close();
  });
  //this code is so good holy poop
  const settings = await getSettings();
  if(settings.clipsTutorialComplete) {
    return;
  }
  var tourguide = new Tourguide({
    "steps": clips_steps,
    "onComplete": () => {
      updateSettings({ clipsTutorialComplete: true });
    },
  });
  tourguide.start();
};

const setupLoadButton = () => {
  document.getElementById('loadClips').addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('load button clicked');
    let clipsResult = await fetch('http://localhost:42074/clip/load').then(
      (res) => res.json()
    );
    if (clipsResult.status == 200) {
      if (allClips?.length === clipsResult?.allClips?.length) {
        console.log('no new clips');
        SafeSwal.fire({
          icon: 'info',
          title: 'No new clips found.',
        });
        return;
      }
      allClips = clipsResult.allClips;
    }
    return false;
  });
};

let getDelayDate = (delay) => {
  var today = new Date();
  var delayedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours() - delay, today.getMinutes(), today.getSeconds(), today.getMilliseconds());
  return delayedDate;
};

const checkClipIsOldEnough = (clip, settings) => {
  return (clip?.created_at != undefined) &&
      (clip?.created_at < getDelayDate(settings.delay).toISOString());
};


const setupApproveRejectButtons = () => {
  // add click listeners to approve button and reject button that update the clip on the backend
  document.getElementById('approve').addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    let settings = await settingsDidLoad;
    console.log('approve button clicked');
    let newSettings = getAllFieldsAsObject();
    let result = await updateClipFrontendAndBackend({
      approved: true,
      ...newSettings
    });
    if (result.status === 200) {
      setPlaceholders();
      if(checkClipIsOldEnough(allClips[currentIndex], settings)) {
        SafeSwal.fire({
          icon: 'success',
          title: 'Clip approved',
        });
      }
      else {
        SafeSwal.fire({
          icon: 'info',
          title: 'Clip approved, but not enough time has passed.',
          html: `
          Twitch policy will not allow clips to upload before 24 hours has passed.<br /><br />
          You can still approve the clip, but it will not show up or be uploaded until 24 hours has passed.<br /><br />
          To upload a clip sooner, please Approve a clip that is older than 24 hours.
          `
        });
      }
    } else {
      SafeSwal.fire({
        icon: 'error',
        title: 'Error approving clip',
      });
    }
    return false;
  });

  document.getElementById('reject').addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('reject button clicked');
    let newSettings = getAllFieldsAsObject();
    let result = await updateClipFrontendAndBackend({
      approved: false,
      ...newSettings
    });
    if (result.status === 200) {
      setPlaceholders();
      SafeSwal.fire({
        icon: 'success',
        title: 'Clip rejected',
      });
    } else {
      SafeSwal.fire({
        icon: 'error',
        title: 'Error rejecting clip',
      });
    }
    return false;
  });
};

const setupCloseButton = () => {
  document.getElementById('close').addEventListener('click', async (e) => {
    console.log('closed me!');
    e.preventDefault();
    e.stopPropagation();
    console.log('close button clicked');
    ipcRenderer.send('close_clips');
    return false;
  });
};

document.addEventListener('DOMContentLoaded', async () => {
  settingsDidLoad = fetch('http://localhost:42074/settings').then((res) =>
    res.json()
  );
});

const getClipOrientationIsVertical = async () => {
  let settings = await settingsDidLoad;
  let currentOrientation = undefined;
  if (
    displayedClip.verticalVideoEnabled == true ||
    displayedClip.verticalVideoEnabled == 'true'
  ) {
    console.log('Clip vert video enabled');
    currentOrientation = true;
  } else if (
    displayedClip.verticalVideoEnabled == false ||
    displayedClip.verticalVideoEnabled == 'false'
  ) {
    console.log('Clip vert video disabled');
    currentOrientation = false;
  } else if (
    settings.verticalVideoEnabled == true ||
    settings.verticalVideoEnabled == 'true'
  ) {
    console.log('default vert video enabled');
    currentOrientation = true;
  } else {
    console.log('default vert video disabled');
    currentOrientation = false;
  }
  return currentOrientation;
};

const setupOrientationButtons = () => {
  document
    .getElementById('customOrientation')
    .addEventListener('click', async (e) => {
      //update clip on backend with custom orientation
      e.preventDefault();
      e.stopPropagation();

      console.log('custom orientation button clicked');
      let currentOrientation = await getClipOrientationIsVertical();

      let newOrientation = !currentOrientation;

      let result = await updateClipFrontendAndBackend({
        verticalVideoEnabled: newOrientation,
      });

      Swal.fire({
        icon: 'success',
        title: 'Orientation changed.',
        html: newOrientation ? 
        'Clip is now vertical! <br><br>Click Set Custom Crop to adjust the crop' : 
        'Clip is now horizontal.',
        confirmButtonText: newOrientation ? 'Set Custom Crop' : 'OK',
        showCancelButton: newOrientation,
        cancelButtonText: newOrientation ? 'Skip' : 'Cancel',
      }).then((result) => {
        if(result.isConfirmed) {
          console.log('custom orientation confirmed');
          if(newOrientation) {
            doCustomCrop();
            console.log('new orientation is vertical');
          } else {
            console.log('new orientation is horizontal');
          }
        } 
      });
    });

  document.getElementById('customCrop').addEventListener('click', async (e) => {
    //update clip on backend with custom crop
    e.preventDefault();
    e.stopPropagation();
    doCustomCrop();
  });

  document.getElementById('reupload').addEventListener('click', async (e) => {
    //update clip on backend with custom crop
    e.preventDefault();
    e.stopPropagation();
    updateClipFrontendAndBackend({
      uploaded: false,
    }).then(Swal.fire({
      icon: 'success',
      title: 'Clip will be uploaded again.',
      text: `This clip has been marked as "Not uploaded", when the next upload time comes, this clip will be used.`
    }));
  });

  document.getElementById('saveAll').addEventListener('click', async (e) => {
    //update clip on backend with custom crop
    e.preventDefault();
    e.stopPropagation();
    saveAll().then(Swal.fire({
      icon: 'success',
      title: 'Fields updated!',
    }));
  });

  
};

const doCustomCrop = async () => {
  let settings = await settingsDidLoad;

  console.log('custom crop button clicked');
  let currentCrop = displayedClip.customCrop || {
    camCrop: settings.camCrop,
    screenCrop: settings.screenCrop,
  };

  selectCropType().then((cropType) => {
    if(cropType == null) {
      return;
    }
    ipcRenderer.once('custom_crop', async (event, cropData) => {
      console.log('custom crop received');
      let crop = JSON.parse(cropData);
      // TODO: Be wary, this might be a little confusing to users,
      // there's not a definite right answer but this _feels_ most intuitive
      let result = await updateClipFrontendAndBackend({
        customCrop: crop,
        verticalVideoEnabled: true,
      });
      if (result.status === 200) {
        console.log('custom crop updated');
        SafeSwal.fire({
          icon: 'success',
          title: 'Custom crop updated',
        });
      } else {
        console.log('error updating custom crop');
        SafeSwal.fire({
          icon: 'error',
          title: 'Custom crop failed',
        });
      }
    });

      ipcRenderer.send(
        'camvas_open',
        JSON.stringify({
          cropDetails: currentCrop,
          clip: displayedClip,
          callback: 'custom_crop',
          cropType: cropType,
        })
      );  
  });
}

const setupFilterFunctionality = () => {
  // grab all data from filter inputs, then call /clip/filter with all inputs as a query string
  document
    .getElementById('filterform')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('filter form submitted');
      // create JSON object from form data and post to /clip/filtered
      let formData = new FormData(document.getElementById('filterform'));
      let filterData = {};
      for (let [key, value] of formData.entries()) {
        filterData[key] = value;
      }
      let result = await fetch('http://localhost:42074/clip/filtered', {
        method: 'POST',
        body: JSON.stringify(filterData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (result.status === 200) {
        console.log('filter success');
        let json = await result.json();
        console.log(json);
        // ipcRenderer.send('filter_clips', JSON.stringify(json));
        setFrontendClips(json.clips);
        clipsTotal = json.clips.length;
        setClipsCount();
      } else {
        console.log('filter error');
      }
      return false;
    });
};


let clipsLoadingPopup = undefined;
let loadingPopupClosed = false;
let updateStatus = (event, data) => {
  console.log('UPDATE STATUS IN CLIPS WOOOO')
  let currStatus = data;
  if (currStatus.includes('TWITCH')) {
    let currClipsLoaded = currStatus.trim().substring(currStatus.indexOf(':') + 1);
    let clipsLoadedNum = parseInt(currClipsLoaded);
    // if(clipsLoadedNum === 0) {
    //   return;
    // }

    if(!clipsLoadingPopup && clipsLoadedNum > 0) {
      clipsLoadingPopup = SafeSwal.fire({
        title: 'Checking for new Twitch Clips...',
        showConfirmButton: false
      });
    }
    else if (clipsLoadedNum > 0 && !loadingPopupClosed) {
      // get clips number which is located after the : in currStatus
      clipsLoadingPopup.update({
        html: `Please wait while we load your clips from Twitch.<br/>This may take a few minutes${getDotsString()}<br/><br/>${currClipsLoaded} Clips Loaded`,
      });
      // clipsLoadingPopup.showLoading();
    }

  }
  else {
    if(clipsLoadingPopup) {
      clipsLoadingPopup.close();
      loadingPopupClosed = true;
      // refresh the window
      if(clipsLoadedNum > 0) {
        window.location.reload();
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', async function (event) {
  let ipcRenderer = window.ipcRenderer;
  ipcRenderer.on('status_update', updateStatus);
  console.log('prepped to update');

});

const setClipsCount = () => {
  const clipsCount = document.getElementById('clip-amount');

  if (clipsCount) {
    clipsCount.innerHTML = clipsTotal;
  }

  document
  .getElementById('loadClips')
  .addEventListener('click', async function (event) {
    // hit /clip/load endpoint on backend
    event.preventDefault();
    event.stopPropagation();
    console.log('load clips button clicked');
    fetch('http://localhost:42074/clip/load');
  });
};

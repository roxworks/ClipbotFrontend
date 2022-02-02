const addHours = function (date, h) {
  let newDate = new Date();
  newDate.setTime(date.getTime() + h * 60 * 60 * 1000);
  return newDate;
};

const clipbotOnAlertText = `While this window is open, we'll be uploading your twitch clips to TikTok/YT! Keep this program open`;
const clipbotOffAlertText = `Clipbot is Off! Until you turn Clipbot on in the settings menu, no clips will be uploaded.`;
const clipbotOnClass = 'alert-info';
const clipbotOffClass = 'alert-info-off';

let NEXT_UPLOAD_TIMEOUT_ID = undefined;
const NO_CLIPS_URL = 'images/noClips.png';

// run this to update main window fields
let newClipCheckerIntervalID = undefined;
const updateDisplayedSettings = async () => {
  let result = await fetch('http://localhost:42074/state');
  let settings = await fetch('http://localhost:42074/settings').then((res) =>
    res.json()
  );

  let licenseRequiredBlob = await fetch('http://localhost:42074/licenseRequired').then(res => res.json());
  if(licenseRequiredBlob.status == 500) {
    // licenseRequired = true;
    // Could set it to true, but... this is just safer.
    return;
  }
  let licenseRequired = licenseRequiredBlob.licenseRequired;

  const dateOptions = {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  };

  if (result.status == 200) {
    result.json().then(async (state) => {
      let currentClipId = state.currentClipId;
      console.log(currentClipId);
      let clipToDisplayBlob = await fetch(
        'http://localhost:42074/clip?id=' + currentClipId
      ).then((res) => res.json());
      console.log('got clip: ' + JSON.stringify(clipToDisplayBlob));
      let clipToDisplay = clipToDisplayBlob?.clip?.download_url;
      console.log('Last uploaded: ' + state.lastUploadToTikTokTime);
      let lastUploadedDateInternal = new Date(state.lastUploadToTikTokTime);
      let lastUploadedDate = lastUploadedDateInternal.toLocaleString(
        undefined,
        dateOptions
      );

      if (
        (document.querySelector('#videoEnabled').value !=
          settings.verticalVideoEnabled) ==
        'true'
          ? 'ON'
          : 'OFF'
      ) {
        document.querySelector('#videoEnabled').value =
          settings.verticalVideoEnabled == 'true' ? 'ON' : 'OFF';
      }
      console.log('state we got: ' + JSON.stringify(state));
      if (
        document.querySelector('video').src != (clipToDisplay || NO_CLIPS_URL)
      ) {
        document.querySelector('video').src = clipToDisplay || NO_CLIPS_URL;
        document.querySelector('video').poster = clipToDisplay ? '' : NO_CLIPS_URL;
        if (clipToDisplay == null) {
          document.querySelector('video').pause();
          document.querySelector('video').controls = false;
        } else {
          document.querySelector('video').controls = true;
        }
      }

      if (document.querySelector('video').src == NO_CLIPS_URL) {
        document.querySelector('video').controls = false;
      }
      // updateGlobalShortcut(settings?.hotkey);
      ipcRenderer.send('hotkey_changed', settings?.hotkey);
      if (document.querySelector('#hotkey').value != settings?.hotkey) {
        document.querySelector('#hotkey').value = settings?.hotkey;
      }

      if (document.getElementById('cliptitle').innerText != '') {
        document.getElementById('cliptitle').innerText = '';
      }
      if (clipToDisplay != '' && clipToDisplay != undefined) {
        document.getElementById('cliptitle').innerText =
          clipToDisplayBlob?.clip?.title;
      } else {
        document.getElementById('cliptitle').innerText = 'No clips yet!';
      }

      if (lastUploadedDate == 'Invalid Date') {
        lastUploadedDate =
          "No uploads yet! <img src='https://static-cdn.jtvnw.net/emoticons/v1/86/1.0' height=15px'/> Trying to upload...";
        if (document.querySelector('#lastUploaded').value != lastUploadedDate) {
          document.querySelector('#lastUploaded').value = lastUploadedDate;
        }
        if (document.querySelector('#nextUpload').value != lastUploadedDate) {
          document.querySelector('#nextUpload').value = lastUploadedDate;
        }
      } else {
        if (document.querySelector('#lastUploaded').value != lastUploadedDate) {
          document.querySelector('#lastUploaded').value = lastUploadedDate;
        }
        const nextUploadDate = addHours(
          lastUploadedDateInternal,
          settings.uploadFrequency
        );
        if (NEXT_UPLOAD_TIMEOUT_ID != undefined) {
          console.log('clearing previous timeout');
          clearTimeout(NEXT_UPLOAD_TIMEOUT_ID);
        }

        if (
          settings.uploadEnabled == 'false' ||
          settings.uploadEnabled == undefined
        ) {
          if (document.querySelector('#nextUpload').value != 'Clipbot is off') {
            document.querySelector('#nextUpload').value = 'Clipbot is off';
          }

          document.querySelector('.alert').classList.replace(clipbotOnClass, clipbotOffClass);
          document.getElementById('alert-message').innerText = clipbotOffAlertText;
          document.querySelector('.alert').classList.remove('hide');
        } else {
          document.querySelector('.alert').classList.replace(clipbotOffClass, clipbotOnClass);
          document.getElementById('alert-message').innerText = clipbotOnAlertText;
          if (clipToDisplay != '' && clipToDisplay != undefined) {
            if (
              document.querySelector('#nextUpload').value !=
              nextUploadDate.toLocaleString(undefined, dateOptions)
            ) {
              document.querySelector('#nextUpload').value =
                nextUploadDate.toLocaleString(undefined, dateOptions);
            }



            if (settings.broadcasterId == '' || (licenseRequired && settings.license == '')) {
              return;
            }
          
            if (
              settings.sessionId == '' &&
              (settings.tiktokUploadEnabled == true ||
                settings.tiktokUploadEnabled == 'true')
            ) {
              return;
            }
          
            if (
              settings.youtubeToken == '' &&
              (settings.youtubeUploadEnabled == true ||
                settings.youtubeUploadEnabled == 'true')
            ) {
              return;
            }
          
            if (
              (settings.youtubeUploadEnabled == false ||
                settings.youtubeUploadEnabled == 'false') &&
              (settings.tiktokUploadEnabled == false ||
                settings.tiktokUploadEnabled == 'false')
            ) {
              return;
            }

            const MINUTE = 60 * 1000;
            let msUntilUpload =
              Math.ceil((nextUploadDate.getTime() - Date.now()) / MINUTE) *
              MINUTE;
            if (msUntilUpload > 0) {
              console.log(`uploading in ${msUntilUpload / MINUTE} minutes`);
              NEXT_UPLOAD_TIMEOUT_ID = setTimeout(uploadClip, msUntilUpload);
            } else {
              console.log(`uploading now`);
              uploadClip();
            }
          } else {
            if (
              document.querySelector('#nextUpload').innerHTML !=
              'Need more clips!'
            ) {
              document.querySelector('#nextUpload').innerHTML =
                'Need more clips!';
            }
          }
        }
      }

      //<button class="btn" id="uploadEnabled" type="reset">Turn Clipbot ON</button>
      // if(document.getElementById("uploadEnabled").innerHTML != `Turn Clipbot ${settings.uploadEnabled == 'true' ? 'OFF' : 'ON'}`) {
      //     document.getElementById("uploadEnabled").innerHTML = `Turn Clipbot ${settings.uploadEnabled == 'true' ? 'OFF' : 'ON'}`;
      // }

    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const version = document.getElementById('version');

  ipcRenderer.send('app_version');
  ipcRenderer.on('app_version', (event, arg) => {
    console.log('got app version: ' + arg.version);
    version.innerText = arg.version;
  });
});

//ipcrenderer Listen for clip success/failure
document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.on('clip_success', (event, clipData) => {
    let clipBlob = JSON.parse(clipData);
    let clipURL = clipBlob.url;
    let clipID = clipBlob.id;
    console.log('clip success ' + JSON.parse(clipData));
    SafeSwal.fire({
      title: 'Clip Created!',
      icon: 'success',
      html: `Your clip has been created <a href='${clipURL}' target='_blank'>here</a>`,
      confirmButtonText: 'Awesome!',
    });
  });

  ipcRenderer.on('clip_failed', (event, arg) => {
    console.log('clip fail');
    let errorInfo = JSON.parse(arg);
    let errorMessage = errorInfo?.error;
    let endpoint = errorInfo?.endpoint;
    handleRandomError(errorMessage, endpoint);
  });
});

// add click event listener to settings button that opens a new window from settings.html
document.addEventListener('DOMContentLoaded', async function (event) {
  document
    .getElementById('settings')
    .addEventListener('click', function (event) {
      event.preventDefault();
      console.log('opening settings');
      ipcRenderer.send('open-settings');
    });
});

// add click event listener to howitworks button that opens a Swal menu with videos
document.addEventListener('DOMContentLoaded', async function (event) {
  document
    .getElementById('howitworks')
    .addEventListener('click', function (event) {
      event.preventDefault();
      console.log('opening howitworks');
      let howitworksHTML = `
        <p>Watch these videos to learn the best ways to use Clipbot!</p> <br/>
        <button type="button" role="button" onclick="window.open('https://www.youtube.com/embed/oI5VbRZTlLg?rel=0&autoplay=1&modestbranding=1','_blank');" id="basics-tutorial" tabindex="0" class="swal2-confirm swal2-styled tutorial">The Basics</button>
        <button type="button" role="button" onclick="window.open('https://www.youtube.com/embed/VeWU--KU5HA?rel=0&autoplay=1&modestbranding=1','_blank');" id="mainscreen-tutorial" tabindex="0" class="swal2-confirm swal2-styled tutorial">Main Screen</button>
        <button type="button" role="button" onclick="window.open('https://www.youtube.com/embed/kU71nAu2WDo?rel=0&autoplay=1&modestbranding=1','_blank');" id="mainsettings-tutorial" tabindex="0" class="swal2-confirm swal2-styled tutorial">Main Settings</button>
        <button type="button" role="button" onclick="window.open('https://www.youtube.com/embed/uHjJD9FBNSM?rel=0&autoplay=1&modestbranding=1','_blank');" id="videosettings-tutorial" tabindex="0" class="swal2-confirm swal2-styled tutorial">Video Settings</button>
        <button type="button" role="button" onclick="window.open('https://www.youtube.com/embed/ZDUNQAPQ9_M?rel=0&autoplay=1&modestbranding=1','_blank');" id="cliphotkey-tutorial" tabindex="0" class="swal2-confirm swal2-styled tutorial">Clip Hotkey</button>
        <button type="button" role="button" onclick="window.open('https://www.youtube.com/embed/AY9B0Ra-pGI?rel=0&autoplay=1&modestbranding=1','_blank');" id="helpmenu-tutorial" tabindex="0" class="swal2-confirm swal2-styled tutorial">Help Menu</button>
          `;

      SafeSwal.fire({
        title: 'How To Use Clipbot',
        html: howitworksHTML,
      });
    });

    const helpMenuHTML = `
      <div class="modal-buttons" id="helpmenu-buttons"> 
        <button type="button" role="button" id="forceupload" tabindex="0" style='font-size: 26px;' class="btn loginbtn">
          <i class="fas fa-upload"></i> 
          Force Upload
        </button>
        <button type="button" role="button" id="bugreport" tabindex="0" style='font-size: 26px;' class="btn loginbtn">
          <i class="fas fa-bug"></i> 
          Report Bug
        </button>
        <button type="button" role="button" id="feedback" tabindex="0" style='font-size: 26px;' class="btn loginbtn">
          <i class="far fa-comment-dots"></i> 
          Give Feedback!
        </button>
        <button type="button" role="button" id="cancelSubscription" tabindex="0" style='font-size: 26px;' class="btn loginbtn">
          <i class="fas fa-times"></i> 
          Cancel Subscription
        </button>
        <button type="button" role="button" id="hardReset" tabindex="0" style='font-size: 26px;' class="btn loginbtn">
          <i class="fas fa-times"></i> 
          Reset Clips
        </button>
        <button type="button" role="button" id="tutorial" tabindex="0" style='font-size: 26px;' class="btn loginbtn">
          <i class="fas fa-redo"></i> 
          Redo Tutorial
        </button>
      </div>`;

  //help menu button popup helpmenuhtml
  document.getElementById('helpmenu').addEventListener('click', function(event) {
    event.preventDefault();
    SafeSwal.fire({
      title: 'Help Menu',
      html: helpMenuHTML,
    });
    setupHelpMenu();
  });

  //checkForUpdates
  document.getElementById('checkForUpdates').addEventListener('click', function(event) {
    event.preventDefault();
    ipcRenderer.send('check_for_updates');
  });

});

// Update fields on settings change
document.addEventListener('DOMContentLoaded', async function (event) {
  ipcRenderer.on('settings_updated', async () => {
    await updateDisplayedSettings();
    uploadClip();
  });
});

// skip clip
document.addEventListener('DOMContentLoaded', async function (event) {
  document
    .getElementById('manageClips')
    .addEventListener('click', async function (event) {
      event.preventDefault();
      ipcRenderer.send('open_clips');
    });
});

// on/off
// document.addEventListener("DOMContentLoaded", async function (event) {
//     document.getElementById('uploadEnabled').addEventListener('click', async function (event) {
//         let result = await fetch("http://localhost:42074/settings").then(result => result.json());
//         let uploadEnabled = result?.uploadEnabled == 'true' ? true : false;

//         console.log(`Turning Clipbot ${uploadEnabled}: ${uploadEnabled ? 'OFF' : 'ON'}`);
//         uploadEnabled = !uploadEnabled;
//         //get /update endpoint with verticalVideoEnabled=true or false
//         await fetch(`http://localhost:42074/update?uploadEnabled=${uploadEnabled}`);
//         document.getElementById("uploadEnabled").innerHTML = `Turn Clipbot ${uploadEnabled ? 'OFF' : 'ON'}`;
//         ipcRenderer.send('settings_updated');
//     });
// });

let clipsLoadingPopup = undefined;
let loadingPopupClosed = false;
let updateStatus = (event, data) => {
  let currStatus = data;
  document.getElementById('status').value = currStatus;
  if (currStatus.includes('Waiting')) {
    updateDisplayedSettings();
    if(clipsLoadingPopup) {
      clipsLoadingPopup.close();
    }
  }
  else if (currStatus.includes('TWITCH')) {
    let currClipsLoaded = currStatus.trim().substring(currStatus.indexOf(':') + 1);
    let clipsLoadedNum = parseInt(currClipsLoaded);
    // if(clipsLoadedNum === 0) {
    //   return;
    // }

    if(!clipsLoadingPopup) {
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
    }
  }
};

// Update frontend status on status update
document.addEventListener('DOMContentLoaded', async function (event) {
  ipcRenderer.on('status_update', updateStatus);
});

// get last uploaded so details are accurate on startup
document.addEventListener('DOMContentLoaded', async function (event) {
  updateDisplayedSettings();
});

// run uploadClip after the page has loaded
document.addEventListener('DOMContentLoaded', async () => {
  //this code is so good holy poop
  const settings = await getSettings();
  console.log('Main tutorial complete: ' + settings.mainTutorialComplete);
  if(settings.mainTutorialComplete) {
    uploadClip();
    return;
  }
  var tourguide = new Tourguide({
    "steps": main_steps,
    "onComplete": () => {
      updateSettings({'mainTutorialComplete': true});
      uploadClip
    },
    "onStop": uploadClip
  });
  tourguide.start();
});

// i hate tiktok
document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.on('tiktok_login', async (event, data) => {
    console.log('tiktok login');
    if (data == 'failed') {
      SafeSwal.fire({
        icon: 'error',
        html: 'TikTok login failed.<br/>Click Retry below to try again.',
        confirmButtonText: 'Retry',
        showCancelButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          ipcRenderer.send('tiktok_open');
        }
      });
      return;
    }
    let successful = await fetch(
      `http://localhost:42074/update?sessionId=${decodeURIComponent(data)}`
    );
    console.log('Adding sessionId successful?: ' + successful);
    SafeSwal.fire(`Successfully logged in to TikTok!`, '', 'success');
    uploadClip();
  });
});

// Auto-Crop settings
document.addEventListener('DOMContentLoaded', async function (event) {
  document
    .getElementById('cropmenu')
    .addEventListener('click', async function () {
      let result = await fetch('http://localhost:42074/settings').then(
        (result) => result.json()
      );

      let verticalVideoEnabled =
        result?.verticalVideoEnabled == 'true' ? true : false;
      console.log('video enabled?: ' + verticalVideoEnabled);
      let cropMenuHTML = `
        <p>Use these settings to make your videos vertical by default.</p><p id='videoIsOn'>Auto-Crop is ${
          verticalVideoEnabled
            ? 'ON, so your videos will be cropped with you default cropped settings unless you customize them individually.'
            : 'OFF, so your videos will be uploaded as horizontal unless you customize them individually.'
        }</p><br>
      <div class="modal-buttons">
        <button type="button" role="button" id="toggleVertical" tabindex="0" style='font-size: 26px;' class="btn">Turn Auto-Crop ${
          verticalVideoEnabled ? 'OFF' : 'ON'
        }</button>
        <button type="button" role="button" id="camcrop" tabindex="0" style='font-size: 26px;' class="btn">Change Default Crop Camera/Gameplay</button>
      </div>
      `;

      SafeSwal.fire({
        icon: 'info',
        html: cropMenuHTML,
        title: 'Auto-Crop Menu',
        confirmButtonText: 'Close',
      });

      // cam crop
      document
        .getElementById('camcrop')
        .addEventListener('click', async function () {
          console.log('croppin cam');
          // get state from backend
          let settings = await fetch('http://localhost:42074/settings').then(
            (result) => result.json()
          );
          let state = await fetch('http://localhost:42074/state').then(
            (result) => result.json()
          );
          let allClipsRes = await fetch('http://localhost:42074/clip/all').then(
            (result) => result.json()
          );
          let allClips = allClipsRes?.clips;
          if (state.currentClipId != '' || allClips?.length > 0) {
            selectCropType().then((cropType) => {
              if(cropType == null) {
                return;
              }
              ipcRenderer.send(
                'camvas_open',
                JSON.stringify({
                  cropDetails: {
                    camCrop: settings.camCrop,
                    screenCrop: settings.screenCrop,
                  },
                  cropType: cropType,
                })
              );
            });
          } else {
            handleRandomError("Couldn't find an example clip, please set a channel and try again", 'username');
          }
        });

      // cam crop
      document
        .getElementById('toggleVertical')
        .addEventListener('click', async function () {
          console.log(
            `Turning Auto-Crop ${verticalVideoEnabled}: ${
              verticalVideoEnabled ? 'OFF' : 'ON'
            }`
          );
          verticalVideoEnabled = !verticalVideoEnabled;
          //get /update endpoint with verticalVideoEnabled=true or false
          let result = await fetch(
            `http://localhost:42074/update?verticalVideoEnabled=${verticalVideoEnabled}`
          );
          document.getElementById(
            'toggleVertical'
          ).innerHTML = `Turn Auto-Crop ${
            verticalVideoEnabled ? 'OFF' : 'ON'
          }`;
          document.getElementById('videoIsOn').innerText = `${
            'Auto-Crop is ' +
            (verticalVideoEnabled
              ? 'ON, so your videos will be cropped.'
              : 'OFF, so your videos will be uploaded with no changes.')
          }`;
          ipcRenderer.send('settings_updated');
        });
    });
});

const clearSettings = async (fields) => {
  return fetch(`http://localhost:42074/clear?fields=${JSON.stringify(fields)}`);
};

document.addEventListener('DOMContentLoaded', async function (event) {
  document
    .getElementById('logins')
    .addEventListener('click', async function () {
      let settings = await fetch('http://localhost:42074/settings').then(
        (result) => result.json()
      );

      let youtubeLoggedIn = settings?.youtubeToken != '';
      let tiktokLoggedIn = settings?.sessionId != '';
      let twitchLoggedIn = settings?.broadcasterId != '';
      let licensed = settings?.license != '';
      let cropMenuHTML = `
      <div class="modal-buttons"> 
        <button type="button" role="button" id="twitchLogin" tabindex="0" style='font-size: 26px;' class="btn loginbtn"><i class="fab fa-twitch"></i> ${
          twitchLoggedIn ? 'Change' : 'Set'
        } Twitch Channel</button>
        <button type="button" role="button" id="tiktokLogin" tabindex="0" style='font-size: 26px;' class="btn loginbtn"><i class="fab fa-tiktok"></i> ${
          tiktokLoggedIn ? 'Logout of' : 'Login to'
        } Tiktok</button>
        ${
          youtubeLoggedIn
            ? '<button type="button" role="button" id="youtubeLogin" tabindex="0" class="btn loginbtn" style="font-size: 26px;"><i class="fab fa-youtube"></i> Logout of Youtube</button>'
            : `<img id='youtubeLogin' class='googimg' 
          src='./google_signin_buttons/web/2x/btn_google_signin_dark_normal_web@2x.png'
          onmouseover="this.src='./google_signin_buttons/web/2x/btn_google_signin_dark_focus_web@2x.png'"
          onmouseout="this.src='./google_signin_buttons/web/2x/btn_google_signin_dark_normal_web@2x.png'"
          onmousedown="this.src='./google_signin_buttons/web/2x/btn_google_signin_dark_pressed_web@2x.png'"
          />
          `
        }
        <button type="button" role="button" id="addLicense" tabindex="0" style='font-size: 26px;' class="btn loginbtn">
          ${licensed ? 'Remove License' : 'Add License'}
        </button>
      </div>
      `;

      SafeSwal.fire({
        icon: 'info',
        html: cropMenuHTML,
        title: 'Logins',
        confirmButtonText: 'Close',
      });

      document
        .getElementById('addLicense')
        .addEventListener('click', async function () {
          if(licensed) {
            //clear license
            await clearSettings(['license']);
            Swal.fire({
              icon: 'success',
              title: 'License Removed',
            });
            // update license button to say add license
            document.getElementById('addLicense').innerText = 'Add License';
          }
          else {
            await justLicenseInput(false);
            // update license button to say remove license
            document.getElementById('addLicense').innerText = 'Remove License';
          }
        });
      // twitch
      document
        .getElementById('twitchLogin')
        .addEventListener('click', async function () {
          if (twitchLoggedIn) {
            await clearSettings(['broadcasterId']).then(() => {
              SafeSwal.fire({
                icon: 'success',
                title: 'Twitch Channel Unset',
                text: 'Please click Set New Channel below to set the new channel to grab clips from',
                confirmButtonText: 'Set New Channel',
              }).then(doTwitchAuth);
            });
            if (twitchLoggedIn != (settings?.broadcasterId != '')) {
              document.getElementById('twitchLoggedIn').innerHTML =
                'Set Twitch Channel';
              twitchLoggedIn = !twitchLoggedIn;
            }
          } else {
            doTwitchAuth().then(async (result) => {
              settings = await fetch('http://localhost:42074/settings').then(
                (result) => result.json()
              );
              // check if youtube login changed
              if (twitchLoggedIn != (settings?.broadcasterId != '')) {
                document.getElementById('twitchLoggedIn').innerHTML =
                  'Change Twitch Channel';
                twitchLoggedIn = !twitchLoggedIn;
              }
            });
          }
        });

      // youtube login
      document
        .getElementById('youtubeLogin')
        .addEventListener('click', async function () {
          if (youtubeLoggedIn) {
            await clearSettings(['youtubeToken']).then(() => {
              SafeSwal.fire({
                icon: 'success',
                title: 'Logged Out of Youtube',
                text: 'You will need to login again later to upload to Youtube',
              });
            });
            if (youtubeLoggedIn != (settings?.youtubeToken != '')) {
              document.getElementById('youtubeLogin').innerHTML =
                "<img src='google_signin_buttons/web/2x/btn_google_signin_dark_normal_web@2x.png' />";
              youtubeLoggedIn = !youtubeLoggedIn;
            }
          } else {
            doYoutubeAuth().then(async (result) => {
              settings = await fetch('http://localhost:42074/settings').then(
                (result) => result.json()
              );
              // check if youtube login changed
              if (youtubeLoggedIn != (settings?.youtubeToken != '')) {
                document.getElementById('youtubeLogin').innerHTML =
                  'Logout of Youtube';
                youtubeLoggedIn = !youtubeLoggedIn;
              }
            });
          }
        });

      document
        .getElementById('tiktokLogin')
        .addEventListener('click', async function () {
          if (tiktokLoggedIn) {
            await clearSettings(['sessionId']).then(() => {
              SafeSwal.fire({
                icon: 'success',
                title: 'Logged Out of Tiktok',
                text: 'You will need to login again later to upload to TikTok',
              });
            });
            if (tiktokLoggedIn != (settings?.sessionId != '')) {
              document.getElementById('tiktokLogin').innerHTML =
                'Login to TikTok';
              tiktokLoggedIn = !tiktokLoggedIn;
            }
          } else {
            doTiktokAuth().then(async (result) => {
              settings = await fetch('http://localhost:42074/settings').then(
                (result) => result.json()
              );
              // check if youtube login changed
              if (tiktokLoggedIn != (settings?.sessionId != '')) {
                document.getElementById('tiktokLogin').innerHTML =
                  'Logout of TikTok';
                tiktokLoggedIn = !tiktokLoggedIn;
              }
            });
          }
        });
    });
});

//Auto-Crop menu listeners
document.addEventListener('DOMContentLoaded', async function (event) {
  ipcRenderer.on('camvas_closed', async (event, data) => {
    let camCropDetails = JSON.parse(data);
    console.log('got data: ' + data);
    // call update endpoint with camCrop field as camCropDetails in query
    console.log('Updating settings with new cam crop...');
    // n: Update this as well
    // let result = await fetch("http://localhost:42074/update?camCrop=" + encodeURIComponent(JSON.stringify(camCropDetails)));
    // alert if the update succeeded or failed
    if(camCropDetails.cropType == 'cam-top' || camCropDetails.cropType == 'cam-freeform') {
      console.log('opening screenvas');
      ipcRenderer.send('screenvas_open', camCropDetails);
    }
    else {
      console.log('no cam crop selected, trying to close screenvas');
      ipcRenderer.send('screenvas_closed', JSON.stringify({
        camCrop: camCropDetails.camData,
        cropType: camCropDetails.cropType,
        callback: camCropDetails.callback
      }));
    }
  });

  // when screenvas is closed, update camCrop and screenCrop on backend with data provided
  // GET /update endpoint with a URL constructed from the fields given in the query
  ipcRenderer.on('screenvas_closed', async (event, data) => {
    console.log('screenvas closed');
    console.log('data: ' + data);
    let cropDetails = JSON.parse(data);
    console.log('cropDetails: ' + JSON.stringify(cropDetails));
    let crop = cropDetails.camCrop;
    let screenCrop = cropDetails.screenCrop;
    console.log('crop: ' + JSON.stringify(crop));
    console.log('screenCrop: ' + JSON.stringify(screenCrop));
    let result = await fetch(
      'http://localhost:42074/update?camCrop=' +
        encodeURIComponent(JSON.stringify(crop)) +
        (screenCrop ? '&screenCrop=' + encodeURIComponent(JSON.stringify(screenCrop)) : '') +
        `&cropType=${cropDetails.cropType}`
    );
    console.log('Adding camCrop successful?: ' + result);
    // if 200 then update successful
    if (result.status == 200) {
      SafeSwal.fire('Successfully updated crop settings!', '', 'success');
    } else {
      SafeSwal.fire(
        'Failed to update crop settings: ' + result?.error,
        '',
        'error'
      );
    }
  });

  // retry tiktok upload
  ipcRenderer.on('retry', async (event, data) => {
    console.log('Retrying upload clip ()');
    uploadClip();
  });
});

//ipc listeners for updates
document.addEventListener('DOMContentLoaded', async function (event) {
  // listen for new udpates available
  ipcRenderer.on('update_available', () => {
    console.log('update found');
    ipcRenderer.removeAllListeners('update_available');
    SafeSwal.fire({
      icon: 'info',
      text: 'A new update is available. Do you want to start downloading it?',
      showDenyButton: true,
      confirmButtonText: `Download Now`,
      denyButtonText: `Ask again later`,
    }).then((result) => {
      /* Read more about isConfirmed, isDenied below */
      if (result.isConfirmed) {
        SafeSwal.fire(
          'Download started! You will get another notification when the download is done. Clipbot must be restarted to install the update!',
          '',
          'success'
        );
        ipcRenderer.send('download_update');
      } else if (result.isDenied) {
        SafeSwal.fire('Ok! We will ask again later :)', '', 'info');
      }
    });

    // notification.classList.remove('hidden');
  });

  // when update gets downloaded
  ipcRenderer.on('update_downloaded', () => {
    console.log('update downloaded');
    ipcRenderer.removeAllListeners('update_downloaded');
    SafeSwal.fire({
      icon: 'info',
      text: `New update is ready to install! Click "Restart Now" to install the update.`,
      showDenyButton: true,
      confirmButtonText: `Restart Now`,
      denyButtonText: `Ask again later`,
    }).then((result) => {
      /* Read more about isConfirmed, isDenied below */
      if (result.isConfirmed) {
        SafeSwal.fire('Great! Restarting...', '', 'success');
        restartApp();
      } else if (result.isDenied) {
        SafeSwal.fire('Ok! We will ask again later :)', '', 'info');
      }
    });
    // restartButton.classList.remove('hidden');
    // notification.classList.remove('hidden');
  });

  function restartApp() {
    console.log('restarting send');
    ipcRenderer.send('restart_app');
  }
});

// document.addEventListener('DOMContentLoaded', async function (event) {
//   // when the #helpmenu button is clicked open a SafeSwal.fire with helpMenuHTML as the html
//   //<button type="button" role="button" id="format" tabindex="0" style='font-size: 30px;' class="swal2-confirm swal2-styled"><img src='https://static-cdn.jtvnw.net/emoticons/v1/30259/1.0' height='30px' style='margin-right: 5px;'/> Format</button>

//   let helpMenuHTML = `
//       <button type="button" role="button" id="discord" tabindex="0" style='font-size: 30px;' class="swal2-confirm swal2-styled"><img src='./images/WutFace.png' height='30px' style='margin-right: 5px;'/>Join Discord</button> <br/>
//       <button type="button" role="button" id="bugreport" tabindex="0" style='font-size: 30px;' class="swal2-confirm swal2-styled"><img src='./images/WutFace.png' height='30px' style='margin-right: 5px;'/>Bug Report</button> <br/>
//       <button type="button" role="button" id="forceupload" tabindex="0" style='font-size: 30px;' class="swal2-confirm swal2-styled"><img src='https://static-cdn.jtvnw.net/emoticons/v1/30259/1.0' height='30px' style='margin-right: 5px;'/> Force Upload Now</button>
//       `;
//   document.getElementById('helpmenu').addEventListener('click', function () {
//     SafeSwal.fire({
//       icon: 'info',
//       html: helpMenuHTML,
//       title: 'Help Menu',
//       confirmButtonText: 'Close',
//     });

//     // add click listener to bugreport button that calls backend /bug endpoint
//     document
//       .getElementById('discord')
//       .addEventListener('click', async function () {
//         console.log('Join Discord');
//         SafeSwal.fire({
//           icon: 'info',
//           title: 'Join our Discord server!',
//           text: 'Want to submit feedback? Got cool ideas? Come join the discord and give yourself the "Clipbot User" role :)',
//           confirmButtonText: 'Join Discord',
//         }).then((result) => {
//           if (result.isConfirmed) {
//             window.open('https://clipbot.tv/discord', '_blank');
//           }
//         });
//       });

//     // add click listener to bugreport button that calls backend /bug endpoint
//     document
//       .getElementById('forceupload')
//       .addEventListener('click', async function () {
//         console.log('Force uploading');
//         SafeSwal.fire({
//           icon: 'success',
//           title: 'Force Upload Started',
//         });
//         // get state from backend
//         uploadClip(true);
//       });

//     // add click listener to bugreport button that calls backend /bug endpoint
//     document
//       .getElementById('bugreport')
//       .addEventListener('click', async function (event) {
//         event.preventDefault();

//         SafeSwal.fire({
//           icon: 'info',
//           html: `What's going on? <br/> Write as much as possible, and we'll attach the internal bug logs to let Rox know`,
//           input: 'textarea',
//           inputPlaceholder: `Nothing is happening and I am confused`,
//           confirmButtonText: 'Submit',
//         }).then(async (result) => {
//           console.log(`Bug report entered: ${result?.value}`);
//           if (result.value) {
//             SafeSwal.fire({
//               icon: 'info',
//               html: `Sending your bug report... Please wait`,
//               didOpen: () => {
//                 Swal.showLoading();
//               },
//             });
//             let bug = result.value;
//             var bugreportResponse;
//             try {
//               bugreportResponse = await fetch(
//                 `http://localhost:42074/bug?bug=${bug}`
//               );
//               console.log(bugreportResponse);
//               if (bugreportResponse.status == 200) {
//                 SafeSwal.fire(
//                   'Success!',
//                   'Your bug report has been sent!',
//                   'success'
//                 );
//               } else {
//                 SafeSwal.fire(
//                   'Error!',
//                   'There was an error sending your bug report!',
//                   'error'
//                 );
//               }
//             } catch (e) {
//               console.log(e);
//               SafeSwal.fire({
//                 title: 'Error',
//                 text: 'There was an error sending your bug report!',
//                 type: 'error',
//                 confirmButtonText: 'Ok',
//               });
//             }
//           }
//         });
//       });

//     // document
//     //   .getElementById('logout')
//     //   .addEventListener('click', async function (event) {
//     //     event.preventDefault();

//     //     // Call settings endpoint with a blank sessionId and broadcasterId to clear the settings
//     //     // Then call uploadClip() again
//     //     let clearResponse;
//     //     try {
//     //       // confirm that user wants to log out and then clear settings
//     //       SafeSwal.fire({
//     //         icon: 'info',
//     //         title: 'Logout Confirmation',
//     //         text: 'Are you sure you want to log out? We only recommend doing this if you accidentally logged in to the wrong channel/account.',
//     //         type: 'warning',
//     //         showCancelButton: true,
//     //         confirmButtonText: 'Yes, log out!',
//     //         cancelButtonText: 'No, stay logged in',
//     //       }).then(async (result) => {
//     //         if (result.isConfirmed) {
//     //           let fieldsToClear = ['sessionId', 'broadcasterId'];
//     //           clearResponse = await fetch(
//     //             `http://localhost:42074/clear?fields=${JSON.stringify(
//     //               fieldsToClear
//     //             )}`
//     //           );
//     //           console.log(clearResponse);

//     //           if (clearResponse.status == 200) {
//     //             SafeSwal.fire(
//     //               'Success!',
//     //               'You have been logged out of TikTok and Twitch! Click Ok to try logging in again',
//     //               'success'
//     //             ).then(async (result) => {
//     //               // when they click confirm button call uploadClip() again
//     //               if (result.isConfirmed) {
//     //                 uploadClip();
//     //               }
//     //             });
//     //           } else {
//     //             SafeSwal.fire(
//     //               'Error!',
//     //               'There was an error clearing your settings!',
//     //               'error'
//     //             );
//     //           }
//     //         }
//     //       });
//     //     } catch (e) {
//     //       console.log(e);
//     //       SafeSwal.fire({
//     //         title: 'Error',
//     //         text: 'There was an error clearing your settings!',
//     //         type: 'error',
//     //         confirmButtonText: 'Ok',
//     //       });
//     //     }
//     //   });

//     // document.getElementById("format").addEventListener("click", async function (event) {
//     //     //Call format endpoint on backend
//     //     event.preventDefault();
//     //     await fetch(`http://localhost:42074/format`);

//     // });

//     // End of help menu
//   });
// });

// add click event listen to discord button that opens a Swal menu with discord button
document.addEventListener('DOMContentLoaded', async function (event) {
  document
    .getElementById('discord')
    .addEventListener('click', async function () {
      console.log('Join Discord');
      SafeSwal.fire({
        icon: 'info',
        title: 'Join our Discord server!',
        text: 'Want to submit feedback? Got cool ideas? Come join the discord and give yourself the "Clipbot User" role :)',
        confirmButtonText: 'Join Discord',
        showCancelButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          window.open('https://clipbot.tv/discord', '_blank');
        }
      });
    });
});


const setupHelpMenu = () => {

  document
  .getElementById('tutorial')
  .addEventListener('click', async function (event) {
    var tourguide = new Tourguide({
      steps: main_steps
    });
    tourguide.start();
    Swal.close();
  });

  document
    .getElementById('forceupload')
    .addEventListener('click', async function () {
      console.log('Force uploading');
      // dangerous
      SafeSwal.fire({
        icon: 'warning',
        title: 'Be Careful',
        html: 'Are you sure you want to force upload?<br>Be careful with this option.<br><br><b>This only works for Tiktok and will skip Youtube.</b> <br>If you upload too much too fast, you may get banned by Tiktok.',
        type: 'warning',
        confirmButtonText: 'Yes, Upload Now',
        showCancelButton: true
      }).then(result => {
        if(result.isConfirmed) {
          uploadClip(true);
          SafeSwal.fire({
            icon: 'success',
            title: 'Force Upload Started',
          });
        }
      })
    });

    document
    .getElementById('cancelSubscription')
    .addEventListener('click', async function () {
      SafeSwal.fire({
        icon: 'info',
        title: 'Cancel Subscription',
        text: 'To cancel your subscription, send an email to rox@rox.works with the email associated with your account titled "Cancel Clipbot.tv Subscription"'
      });
    });

    
    
  document
  .getElementById('hardReset')
  .addEventListener('click', async function (event) {
    event.preventDefault();
    SafeSwal.fire({
      icon: 'warning',
      html: `Are you sure you want to reset all your clips? <br> 
      This will delete all clip history within Clipbot. <br> <br> 
      Your uploads will stay on Youtube/Tiktok.
      However, Clipbot will have no memory of what you've uploaded, approved, or rejected.
      All clips will disappear from Clipbot, and you will need to set a new channel for Clipbot to pull from.`,
      confirmButtonText: "I'm sure, reset all my clips",
      showCancelButton: true,
    }).then(async (result) => {
      if(result.isConfirmed) {
        hardReset().then(async () => {return Swal.fire({
          icon: 'success',
          title: 'Hard Reset Complete. Click OK to restart Clipbot and set a new channel.',
        })}).then(() => {
          ipcRenderer.send('just_restart'); 
        });
      }
    });
  });clipbotOnAlertText

  document
  .getElementById('bugreport')
  .addEventListener('click', async function (event) {
    event.preventDefault();

    SafeSwal.fire({
      icon: 'info',
      html: `What's going on? <br/> Write as much as possible, and we'll attach the internal bug logs to let Rox know`,
      input: 'textarea',
      inputPlaceholder: `Nothing is happening and I am confused`,
      confirmButtonText: 'Submit',
      showCancelButton: true,
    }).then(async (result) => {
      sendEmail(result);
    });
  });

  document
  .getElementById('feedback')
  .addEventListener('click', async function (event) {
    event.preventDefault();

    SafeSwal.fire({
      icon: 'info',
      html: `Got a feature request? Want a change made?
      We now have a board where you can request features!
      Click below to vote on new features or submit your own requests :D`,
      confirmButtonText: 'Open New Features Board',
      showCancelButton: true,
    }).then((result) => {
      if (result.isConfirmed) {
        window.shell.openExternal('https://clipbot.tv/vote', '_blank');
        SafeSwal.fire({
          icon: 'info',
          title: 'Join our Discord server!',
          text: 'Thanks for voting on new ideas :D  Come join the discord and give yourself the "Clipbot User" role to keep up with new updates! :)',
          confirmButtonText: 'Join Discord',
          showCancelButton: true,
        }).then((result) => {
          if (result.isConfirmed) {
            window.open('https://clipbot.tv/discord', '_blank');
          }
        })
      }
    });

    // SafeSwal.fire({
    //   icon: 'info',
    //   html: `Enter your feedback or ideas here!`,
    //   input: 'textarea',
    //   inputPlaceholder: `Nothing is happening and I am confused`,
    //   confirmButtonText: 'Submit',
    //   showCancelButton: true,
    // }).then(async (result) => {
    //   sendEmail(result, true);
    // });
  });
}

const hardReset = async () => {
  return fetch(
    `http://localhost:42074/hardReset`
  );
}

const sendEmail = async (result, isFeedback) => {
  console.log(`Bug report entered: ${result?.value}`);
  if (result.value) {
    SafeSwal.fire({
      icon: 'info',
      html: `Sending your ${isFeedback ? 'feedback' : 'bug report'}... Please wait`,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    let bug = result.value;
    var bugreportResponse;
    try {
      bugreportResponse = await fetch(
        `http://localhost:42074/bug?bug=${bug}&isFeedback=${isFeedback}`
      );
      console.log(bugreportResponse);
      if (bugreportResponse.status == 200) {
        SafeSwal.fire(
          'Success!',
          `Your ${isFeedback ? 'feedback' : 'bug report'} has been sent!`,
          'success'
        );
      } else {
        bugreportResponse = await bugreportResponse.json();
        handleRandomError(bugreportResponse.error, bugreportResponse.endpoint);
      }
    } catch (e) {
      console.log(e);
      handleRandomError('There was an error sending your bug report!', 'bug')
    }
  }
}

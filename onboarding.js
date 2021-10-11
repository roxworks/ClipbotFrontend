

const OnboardingSwal = SafeSwal.mixin({
    showCancelButton: false,
});

const launchStep = async (step) => {
    if(onboardingSteps[step] === undefined) {
        return;
    }
    OnboardingSwal.fire({...onboardingSteps[step], }).then(
        async (result) => {
            if(result.isConfirmed) {
                console.log(`Step ${step}, input: ${result.value}, confirmed`);
                if(onboardingSteps[step].onConfirm) {
                    await onboardingSteps[step].onConfirm(result.value);
                }
                launchStep(onboardingSteps[step].confirmStepIndex || step + 1);
            }
            else if (result.isDenied) {
                console.log(`Step ${step}, input: ${result.value}, denied`);
                if(onboardingSteps[step].onDeny) {
                    await onboardingSteps[step].onDeny(result.value);
                }
                launchStep(onboardingSteps[step].denyStepIndex || step + 1);
            }
            else if (result.isDismissed) {
                console.log(`Step ${step}, input: ${result.value}, cancelled`);
                if(onboardingSteps[step].onCancel) {
                    await onboardingSteps[step].onCancel(result.value);
                }
                launchStep(onboardingSteps[step].cancelStepIndex || step + 1);
            }
        }
    );

}

let clipsLoadingPromise;
let clipsLoadingPopup;


// onboarding steps
const onboardingSteps = [
    { //0, intro
        title: "You're awesome!",
        text: "Congrats on taking the first steps towards growing your channel.\nWelcome to Clipbot!",
        confirmButtonText: 'LETS GO!',
    },
    { //1, stream or mod
        title: "Let's learn a bit about you!",
        text: "Are you a streamer, or a mod/editor/viewer?",
        confirmButtonText: "I'm a streamer",
        denyButtonText: "I'm a mod/editor/viewer",
        showDenyButton: true,
        confirmStepIndex: 2,
        denyStepIndex: 3,
    },
    { //2, streamer
        title: "Streamer Setup",
        text: "Enter your twitch username below. Then, we'll have you login",
        input: 'text',
        confirmButtonText: "Login to Twitch",
        confirmStepIndex: 4,
        onConfirm: async (username) => {
            await doActualTwitchAuth(false);
            await doTwitchAuth(username, false);
            let licenseRequired = await checkLicenseRequired();
            if(licenseRequired) {
                console.log("License required: ", licenseRequired);
                await doLicenseAuth(false);
            }
            else {
                console.log("License required: ", licenseRequired);
            }
            clipsLoadingPromise = loadClips();
        }
    },
    { //3, mod/viewer
        title: "Mod/Editor/Viewer Setup",
        text: "Enter the twitch username of the channel you want to see clips from. Then, we'll have you login.",
        input: 'text',
        confirmButtonText: "Login to Twitch",
        confirmStepIndex: 4,
        onConfirm: async (username) => {
            await doActualTwitchAuth(false);
            await doTwitchAuth(username);
            let licenseRequired = await checkLicenseRequired();
            if(licenseRequired) {
                console.log("License required: ", licenseRequired);
                await doLicenseAuth(false);
            }
            else {
                console.log("License required: ", licenseRequired);
            }
            clipsLoadingPromise = loadClips();
        }
    }, 
    //TODO: Start loading clips
    { //4, tiktok login
        title: "Tiktok Login",
        html: `Now, let's get you logged in to Tiktok.
        <br><br>For this step, you'll have to download the Tiktok mobile app, and use the QR code login.
        <br><br><b>Be sure to read the instructions on screen.</b>`,
        confirmButtonText: "Login to Tiktok",
        denyButtonText: "I don't want to upload to TikTok",
        showDenyButton: true,
        onConfirm: async () => {
            await doTiktokAuth(true);
            await listenForTiktokLogin();
            await updateSettings({
                tiktokUploadsEnabled: true,
            });
        }
    },
    { //5, youtube login
        title: "Youtube Login",
        html: `Now, let's get you logged in to Youtube.
        <br><br>For this step, you'll have to login with Google, then copy a code back to this screen.
        <br><br><b>Be sure to login to the account you want your clips posted to!</b>`,
        confirmButtonText: "Login to Youtube",
        denyButtonText: "I don't want to upload to Youtube",
        showDenyButton: true,
        onConfirm: async () => {
            await doYoutubeAuth();
            await updateSettings({
                youtubeUploadsEnabled: true,
            });
        }
    },
    { //6, clip hotkey
        title: "Clip Hotkey",
        html: `
        Clipbot has the awesome ability to make clips with the push of a button! :O<br><br>
        When you're live, press F10 to make a clip of the last 30 seconds automagically. <br><br>
        Don't like F10? Click the box below and press any key (or combo of keys) to change it.
        `,
        confirmButtonText: "Set Hotkey",
        input: 'text',
        inputValue: 'F10',
        inputAttributes: {
            onkeyup: "hotkeyHandler(event)",
            id: 'hotkey',
        },
        onConfirm: async (hotkey) => {
            if(hotkey) {
                let success = await updateSettings({
                    hotkey: hotkey,
                });
                if(success) {
                    await OnboardingSwal.fire({
                        icon: 'success',
                        title: "Hotkey Set!",
                    })
                }
            }
        },
    },
    { //7, time between posts
        title: "Time Between Posts",
        html: `
        Let's decide how often to upload to Tiktok/Youtube. <br><br>
        By default, we'll upload a clip every 8 hours. If you want to change that, do it here. <br><br>
        Don't set this too low, or you will get less views! <br><br>
        <b>Note:</b> This is in hours.
        `,
        confirmButtonText: "Set Time",
        input: 'number',
        inputValue: '8',
        inputAttributes: {
            type: "number",
            name: "uploadFrequency",
            min: 1,
            oninput: "checkInputIsValid(event)",
            id: "uploadFrequency",
            placeholder: "8",
        },
        onConfirm: async (uploadFrequency) => {
            if(uploadFrequency) {
                let success = await updateSettings({
                    uploadFrequency: uploadFrequency,
                });
                if(success) {
                    await OnboardingSwal.fire({
                        icon: 'success',
                        title: "Time Set!",
                    })
                }
            }
        },
    },
    {//8, hashtags
        title: "Hashtags",
        html: `
        Now, let's add some hashtags to your clips. <br><br>
        You can add as many as you want, but we recommend at least 2. <br><br>
        <b>Note:</b> These will be added to the beginning of your clip.
        `,
        confirmButtonText: "Set Hashtags",
        input: 'text',
        inputValue: '#clipbot #twitch',
        inputAttributes: {
            id: 'hashtags',
            placeholder: "#clipbot #twitch",
        },
        onConfirm: async (hashtags) => {
            if(hashtags) {
                let success = await updateSettings({
                    hashtags: hashtags,
                });
                if(success) {
                    await OnboardingSwal.fire({
                        icon: 'success',
                        title: "Hashtags Set!",
                    })
                }
            }
        },
    },
    {//9, default approve
        icon: 'question',
        title: "What clips do you want to use?",
        html: `\
        You can add/remove clips at any time.<br>
        You can change your choice later.
        `,
        confirmButtonText: "All clips",
        denyButtonText: "Popular clips",
        cancelButtonText: "Only clips I choose",
        showDenyButton: true,
        showCancelButton: true,
        confirmStepIndex: 11, //vert vid settings
        denyStepIndex: 10,
        cancelStepIndex: 11, //
        onConfirm: async () => {
            let success = await updateSettings({
                defaultApprove: true,
            });
            if(success) {
                await OnboardingSwal.fire({
                    icon: 'success',
                    title: "Clipbot will use all clips for now!",
                    text: ` You can change this at any time in the settings menu.`,
                })
            }
        },
        onDeny: async () => {
            let success = await updateSettings({
                defaultApprove: true,
            });
            if(success) {
                await OnboardingSwal.fire({
                    icon: 'success',
                    title: "Clipbot will use popular clips for now!",
                    text: ` You can change this at any time in the settings menu.`,
                })
            }
        },
        onCancel: async () => {
            let success = await updateSettings({
                defaultApprove: false,
            });
            if(success) {
                await OnboardingSwal.fire({
                    icon: 'success',
                    title: "Clipbot will only use clips you approve for now!",
                    text: ` You can change this at any time in the settings menu.`,
                })
            }
        }
    },
    {//10, min view count
        title: "Popularity",
        html: `
            How many views should a clip have on Twitch to be "Popular"?
        `,
        confirmButtonText: "Set View Count",
        input: 'number',
        inputValue: '5',
        inputAttributes: {
            type: "number",
            name: "minViewCount",
            min: 0,
            oninput: "checkInputIsValid(event)",
            id: "minViewCount",
            placeholder: "5",
        },
        onConfirm: async (minViewCount) => {
            if(minViewCount) {
                let success = await updateSettings({
                    minViewCount: minViewCount,
                });
                if(success) {
                    await OnboardingSwal.fire({
                        icon: 'success',
                        title: "View Count Set!",
                    })
                }
            }
        },
    },
    {//11, Auto-Crop (+ crop)
        title: "Auto-Crop",
        html: `
            With Clipbot, you can crop each clip to make vertical videos like this!<br><br>
            If you don't want to crop clips one by one, you can set an "Auto-Crop" now for all of your clips!<br><br>
            If your camera/game are always in the same place, this will save you a bunch of time.
        `,
        imageUrl: 'https://share.nyx.xyz/l6JIPJglW8Z',
        imageHeight: '200px',
        confirmButtonText: "Turn on Auto-Crop",
        denyButtonText: "Skip",
        showDenyButton: true,
        onConfirm: async () => {
            let success = await updateSettings({
                defaultVerticalVideo: true,
            });
            if(success) {

                await OnboardingSwal.fire({
                    icon: 'success',
                    title: "Auto-Crop on!",
                    text: `Now, let's set up your crop using a recent clip`,
                    confirmButtonText: "Choose My Crop",
                });
                clipsLoadingPopup = OnboardingSwal.fire({
                    title: 'Loading Your Twitch Clips',
                    html: `Please wait while we load your clips from Twitch.<br/>This may take a few minutes<br/><br/>0 Clips Loaded`,
                    showConfirmButton: false,
                });
                await clipsLoadingPromise;
                // set default crop
                await selectCropType().then(async (cropType) => {
                    if(cropType == null) {
                      return;
                    }
                    ipcRenderer.send(
                      'camvas_open',
                      JSON.stringify({
                        cropType: cropType,
                      })
                    );
                    await listenForCropFinish();
                });
            }
        },
        onDeny: async () => {
            let success = await updateSettings({
                defaultVerticalVideo: false,
            });
            if(success) {
                await OnboardingSwal.fire({
                    icon: 'success',
                    title: "Auto-Crop is off!",
                    text: ` You can change this at any time in the settings menu.`,
                })
            }
        }
    },
    {//12, Clip Age warning
        icon: 'warning',
        title: "IMPORTANT NOTE",
        html: `
            <b>Clipbot will not upload clips made in the last 24 hours. Ever.</b><br><br>
            This is against Twitch <a href='https://www.twitch.tv/p/en/legal/affiliate-agreement/' target='_blank' style='color: #ADD8E6'>Terms Of Service.<a/><br><br>
            If you're wondering why a recent clip hasn't uploaded, it is probably because of this.
            `,
        confirmButtonText: "I understand",
    },
    {//13, Clipbot is off
        icon: 'warning',
        title: "Clipbot is off for now.",
        html: `
            When you're ready to upload, turn Clipbot on in the settings menu.<br><br>
            <b>Until you turn Clipbot on, nothing will get uploaded.</b>
        `,
        confirmButtonText: "I understand",
    },
    {//14, done
        icon: 'success',
        title: "You're Ready!",
        html: `
            <b>Clipbot is ready to go!</b><br><br>
            You'll now be taken to your dashboard.<br><br>
            You can change any of your settings in the menus from the dashboard.
        `,
        confirmButtonText: "Go to Dashboard",
        onConfirm: async () => {
            await updateSettings({
                onboardingComplete: true,
            });
            ipcRenderer.send('dashboard_open');
        },
    }

]

const listenForCropFinish = () => {
    ipcRenderer.once('camvas_closed', async (event, data) => {
        let camCropDetails = JSON.parse(data);
        console.log('got data: ' + data);
        console.log('Updating settings with new cam crop...');
        if(camCropDetails.cropType != 'no-cam' ) {
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
      return new Promise((resolve, reject) => {
        ipcRenderer.once('screenvas_closed', async (event, data) => {
            let cropDetails = JSON.parse(data);
            let crop = cropDetails.camCrop;
            let screenCrop = cropDetails.screenCrop;
            let result = await fetch(
            'http://localhost:42074/update?camCrop=' +
                encodeURIComponent(JSON.stringify(crop)) +
                (screenCrop ? '&screenCrop=' + encodeURIComponent(JSON.stringify(screenCrop)) : '') +
                `&cropType=${cropDetails.cropType}`
            );
            console.log('Adding camCrop successful?: ' + result);
            // if 200 then update successful
            if (result.status == 200) {
            resolve(SafeSwal.fire('Successfully updated crop settings!', '', 'success'));
            } else {
            reject(SafeSwal.fire(
                'Failed to update crop settings: ' + result?.error,
                '',
                'error'
            ));
            }
        });
    });
}

let tiktokLoggedInPromise;

const listenForTiktokLogin = () => {
    if(tiktokLoggedInPromise) {
        return tiktokLoggedInPromise;
    }
    tiktokLoggedInPromise =  new Promise((resolve, reject) => {
        ipcRenderer.on('tiktok_login', async (event, data) => {
        console.log('tiktok login');
        if (data == 'failed') {
          SafeSwal.fire({
            icon: 'error',
            html: 'TikTok login failed.<br/>Click Retry below to try again.',
            confirmButtonText: 'Retry',
            showCancelButton: true,
          }).then(async (result) => {
            if (result.isConfirmed) {
              await doTiktokAuth(true);
            }
          });
          return;
        }
        let successful = await fetch(
          `http://localhost:42074/update?sessionId=${data}`
        );
        console.log('Adding sessionId successful?: ' + successful);
        resolve(SafeSwal.fire(`Successfully logged in to TikTok!`, '', 'success'));
      });
    });
    return tiktokLoggedInPromise;
}

const setupClipsLoadingPopup = () => {
    let updateStatus = (event, data) => {
        let currStatus = data;
        if (currStatus.includes('TWITCH')) {
            let currClipsLoaded = currStatus.trim().substring(currStatus.indexOf(':') + 1);
            let clipsLoadedNum = parseInt(currClipsLoaded);
            if(clipsLoadedNum === 0) {
            return;
            }

            if(clipsLoadingPopup) {
                // get clips number which is located after the : in currStatus
                clipsLoadingPopup.update({
                    html: `Please wait while we load your clips from Twitch.<br/>This may take a few minutes${getDotsString()}<br/><br/>${currClipsLoaded} Clips Loaded`,
                });
                // clipsLoadingPopup.showLoading();
            }

        }
    };
    ipcRenderer.on('status_update', updateStatus);
};


const startOnboarding = async () => {
    //launchStep(0);
    launchStep(0);
}

const checkIfOnboardingComplete = async () => {
    let settings = await getSettings();
    return settings.onboardingComplete;
}

document.addEventListener('DOMContentLoaded', async function() {
    let onboardingComplete = await checkIfOnboardingComplete();
    if(onboardingComplete) {
        ipcRenderer.send('dashboard_open');
    }
    else {
        setupClipsLoadingPopup();
        // most important
        startOnboarding();
    }
});
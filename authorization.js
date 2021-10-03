let activateLicense = async (key) => {
    let url = new URL("http://localhost:42074/activate");
    url.searchParams.append("key", key);
    try {
        console.log("fetching");
        return await fetch(url).then(result => result.json()).then(result => {
            console.log(result);
            if (result.status == 200) {
                console.log("it werked");
                // SafeSwal.fire({
                //     icon: 'success',
                //     text: "License key activated!"
                // });
                return result;
            }
            else {
                console.log('licensing failed: ' + JSON.stringify(result));
                // handleRandomError(result.error, result.endpoint);
                return result;
            }
        }).catch(
            error => {
                console.log("licensing error: " + error);
                // SafeSwal.fire({
                //     icon: 'error',
                //     text: error || "Bad news bears"
                // });
                return error;
            }
        );
    }
    catch {
        return false;
    }
};

let doTiktokAuth = () => {
    return SafeSwal.fire({
        icon: 'info',
        html: `
        Looks like you're not logged in to TikTok.<br>Please click 'Login' to open a login window<br><br>
        <b style="font-size: 2em;">You MUST use QR Code Login on the next screen.</b>`,
        confirmButtonText: 'Login',
        showCancelButton: true,
    }).then((result) => {
        if (result.isConfirmed) {
            console.log("User selected to open tiktok");
            return SafeSwal.fire({
                icon: 'success',
                text: "Opening Tiktok... To avoid issues, please use the QR Code Login option",
                didOpen: () => {
                    Swal.showLoading();
                    ipcRenderer.send("tiktok_open");
                },
            });
        }
        else if (result.isDenied) {
            console.log("User selected not to open tiktok");
            return SafeSwal.fire({
                icon: 'info',
                text: "Ok, we'll ask again in a while :) Please note, Clipbot will not upload while not logged in. You can still change settings."
            });
        }
    });
};

// This could honestly be a lot more generic...
// if i really wanted to, I could redesign all of this to come from backend...
// 
let doActualTwitchAuth = async () => {
    let twitchAuthorizeResult = await fetch("http://localhost:42074/authorizeTwitch").then(result => result.json());

    if (twitchAuthorizeResult?.status == 200) {
        return SafeSwal.fire({
            icon: 'success',
            text: "Login Successful! We'll start grabbing your clips right away!"
        }).then(uploadClip);
    }
    else {
        return handleRandomError(twitchAuthorizeResult?.error, twitchAuthorizeResult?.endpoint);
    }
}

const sendBugReport = async () => {
    let bugreportResponse = await fetch(
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
        handleRandomError(bugreportResponse.error, bugreportResponse.endpoint);
    }
}

const createClip = async () => {
    let response = await fetch(`http://localhost:42074/clip`, {
        method: 'post',
    }).then((response) => response.json());
    if (response.status == 200) {
        console.log('clip created');
        let clipBlob = response.clip;
        let clipURL = clipBlob.url;
        console.log('clip success ' + JSON.parse(clipBlob));
        SafeSwal.fire({
        title: 'Clip Created!',
        icon: 'success',
        html: `Your clip has been created <a href='${clipURL}' target='_blank'>here</a>`,
        confirmButtonText: 'Awesome!',
        });
    }
    else {
        handleRandomError(response.error, response.endpoint);
    }
}

const handleRandomError = (errorMessage, endpoint) => {
    console.log()
    let options = {
        icon: 'error',
        text: errorMessage,
        showCancelButton: true,
      }
      let endpointOptions = {};
      let onConfirm = () => {};
      if(endpoint) {
        endpointOptions = {
          confirmButtonText: 'Retry',
        }
        //authorizeTwitch, retry, clip, buyLicense, activate, bug, youtubeAuth
        switch(endpoint) {
            case 'authorizeTwitch':
                onConfirm = doActualTwitchAuth;
                break;
            case 'retry':
                onConfirm = uploadClip;
                break;
            case 'clip':
                onConfirm = createClip;
                break;
            case 'buyLicense':
                onConfirm = () => {
                    openClipbotMainSite();
                    doLicenseAuth();
                }
                endpointOptions.confirmButtonText = 'Buy License';
                break;
            case 'activate':
                onConfirm = doLicenseAuth;
                break;
            case 'bug':
                onConfirm = sendBugReport;
                break;
            case 'youtubeAuth':
                onConfirm = doYoutubeAuth;
                break;
            case 'settings':
                onConfirm = () => {ipcRenderer.send("open-settings");}
                endpointOptions.confirmButtonText = 'Open Settings';
                break;
            case 'username':
                onConfirm = doTwitchAuth;
                break;
        } 
        
      }
      console.log('regular error');
      return SafeSwal.fire({...options, ...endpointOptions}).then((result) => {
        if (result.isConfirmed) {
          onConfirm();
        }
      });
}

let doTwitchAuth = () => {
    return SafeSwal.fire({
        icon: 'info',
        text: "Looks like we don't have your channel name yet. Please enter your channel name (your twitch username) below.",
        input: 'text',
        inputPlaceholder: 'Enter your channel name (NOT LINK) here',
        confirmButtonText: 'Submit',
    }).then(async (result) => {
        console.log(`Username entered: ${result?.value}`);
        if (result.value) {
            let username = result.value;
            let idSetResult;
            try {
                idSetResult = await fetch(`http://localhost:42074/update?username=${username}`)
                    .then(res => res.json())
                    .catch((e) => { return { status: e.message.includes('JSON') ? 200 : 500 } });
                console.log(idSetResult);
            }
            catch (e) {
                console.log("Channel entered crashed stuff");
                console.log(JSON.stringify(e));
                return handleRandomError('An Error occured finding your channel', 'username');
            }

            if (idSetResult?.status == 200) {
                return SafeSwal.fire({
                    icon: 'success',
                    text: "Channel Set! We'll start grabbing your clips right away!"
                }).then(uploadClip);
            }
            else {
                console.log(`Setting channel failed: ${JSON.stringify(idSetResult)}`);
                return handleRandomError(idSetResult?.error, idSetResult?.endpoint);
            }
        }
        else {
            console.log("User did not enter a channel");
            return handleRandomError('You did not enter a channel', 'username');
        }
    });
};

const openClipbotMainSite = () => {
    console.log('why'); 
    window.shell.openExternal("https://clipbot.tv/#pricing");
    return false;
}

let doLicenseAuth = () => {
    SafeSwal.fire({
        icon: 'info',
        html: `Looks like you have more than 2000 followers<br>
        To use Clipbot, you'll need a license key. 
        Please head to <a href='#' id='mainsite' onClick='openClipbotMainSite()'>Clipbot.tv</a> 
        to sign up for the free trial.`,
        input: 'text',
        inputPlaceholder: 'Enter your license key here',
        confirmButtonText: 'Submit',
    }).then(async (result) => {
        console.log(`License entered: ${result?.value}`);
        if (result.value) {
            let licenseDetails;
            try {
                licenseDetails = await activateLicense(result?.value);
            }
            catch (e) {
                console.log("License key entered is invalid");
                SafeSwal.fire({
                    icon: 'error',
                    text: e?.message || e?.error || e
                });
            }

            if (licenseDetails?.status == 200) {
                SafeSwal.fire({
                    icon: 'success',
                    text: "License key activated!"
                });
                uploadClip();
            }
            else if(licenseDetails?.status == 303) {
                SafeSwal.fire({
                    icon: 'info',
                    text: licenseDetails?.error,
                    confirmButtonText: 'Try again',
                }).then(uploadClip); 
            }
            else {
                console.log(`Licensing failed: ${JSON.stringify(licenseDetails)}`);
                handleRandomError(licenseDetails?.error, licenseDetails?.endpoint);
            }
        }
        else {
            console.log("User did not enter a license key");
            handleRandomError("You did not enter a license key.", 'activate')
        }
    });
    // document.querySelector('#mainsite').addEventListener('click', openClipbotMainSite);
}

let doYoutubeAuth = async () => {
    // call youtube auth endpoint and open the authURL of the body in a new window if not authorized
    console.log('requesting youtube auth');
    let result = await fetch("http://localhost:42074/youtubeAuth");
    console.log('post auth req');
    if(result.status == 200) {
        console.log('we are already authed');
        return SafeSwal.fire({
            icon: 'success',
            title: 'Already Logged In',
            text: 'You are already logged in to Youtube'
        });
    }
    else {
        console.log('unauthed');
        let resJSON = await result.json();
        let authURL = resJSON.authURL;
        console.log(JSON.stringify(resJSON));
        console.log(authURL);
        // SafeSwal.fire an input textbox for the Youtube auth code
        window.shell.openExternal(authURL);
        return SafeSwal.fire({
            title: 'Enter Youtube Code',
            text: 'Please login on the other window, and copy your Youtube Code into this box to enable Youtube uploads!',
            input: 'text',
            inputAttributes: {
                autocapitalize: 'off'
            },
            confirmButtonText: 'Submit',
            showLoaderOnConfirm: true
        }).then(async (codeInput) => {
            let code = codeInput?.value;
            console.log(`code: ${code}`);
            let result = await fetch(`http://localhost:42074/youtubeAuth?code=${code}`);
            console.log(`result: ${result}`);
            if (result.status == 200) {
                console.log('we are now authed');
                ipcRenderer.send('youtube-auth-success');
                return SafeSwal.fire({
                    icon: 'success',
                    title: 'Successfully logged in to Youtube!',
                    text: 'You can now upload clips to Youtube.'
                });
            }
            else {
                console.log('failed to auth');
                let errorBody = await result.json();
                errMsg = errorBody.error;
                handleRandomError(errMsg, errorBody.endpoint);
            }
        });

    }
}
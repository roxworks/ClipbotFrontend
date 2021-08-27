const { ipcRenderer } = require("electron");

let activateLicense = async (key) => {
    let url = new URL("http://localhost:42074/activate");
    url.searchParams.append("key", key);
    try {
        console.log("fetching");
        return await fetch(url).then(result => result.json()).then(result => {
            console.log(result);
            if (result.status == 200) {
                console.log("it werked");
                Swal.fire({
                    icon: 'success',
                    text: "License key activated!"
                });
                return result;
            }
            else {
                console.log("Failed to activate license: " + result?.error);
                return result;
            }
        }).catch(
            error => {
                console.log("error: " + error);
                Swal.fire({
                    icon: 'error',
                    text: error || "Bad news bears"
                });
                return false;
            }
        );
    }
    catch {
        return false;
    }
};


// just uploadClip function
let uploadClip = async (force = false) => {
    ipcRenderer.send("check_for_updates");
    let result = await fetch(`http://localhost:42074/?force=${force}`);
    let isSuccess = result == 200;
    try {
        result = await result.json();
        console.log(JSON.stringify(result));
    }
    catch (e) {
        console.log("That aint json but thats ok");
    }

    if (isSuccess || result == 200 || result?.status == 200 || result?.statusCode == 200) {
        console.log('Clip upload finished successfully, updating frontend');
        ipcRenderer.send('settings_updated');
    }
    else if (result?.status == 302) {
        let errorMessage = result?.error;
        Swal.fire({
            icon: 'info',
            text: "Looks like you're not logged in to TikTok, please click 'Login' to open a login window",
            confirmButtonText: 'Login',
            denyButtonText: 'Later',
        }).then((result) => {
            if (result.isConfirmed) {
                console.log("User selected to open tiktok");
                Swal.fire({
                    icon: 'success',
                    text: "Opening Tiktok... To avoid issues, please use the QR Code Login option",
                    didOpen: () => {
                        Swal.showLoading()
                    },
                });
                ipcRenderer.send("tiktok_open");
            }
            else if (result.isDenied) {
                console.log("User selected not to open tiktok");
                Swal.fire({
                    icon: 'info',
                    text: "Ok, we'll ask again in a while :) Please note, TTTT will not upload while not logged in. You can still change settings."
                });
            }
        });
    }
    else if (result?.status == 303) {
        let errorMessage = result?.error;
        Swal.fire({
            icon: 'info',
            text: "Looks like you don't have a license yet. Please enter your license key below.",
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
                    Swal.fire({
                        icon: 'error',
                        text: e?.message || e?.error || e
                    });
                }

                if (licenseDetails?.status == 200) {
                    Swal.fire({
                        icon: 'success',
                        text: "License key activated!"
                    });
                    uploadClip();
                }
                else {
                    console.log(`Licensing failed: ${JSON.stringify(licenseDetails)}`);
                    Swal.fire({
                        icon: 'error',
                        text: licenseDetails?.error
                    });
                }
            }
            else {
                console.log("User did not enter a license key");
                Swal.fire({
                    icon: 'error',
                    text: "You did not enter a license key. Please restart TTTT and enter a key."
                });
            }
        });
    }
    else if (result?.status == 304) {
        let errorMessage = result?.error;
        Swal.fire({
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
                        .catch(() => { return { status: 200 } });
                    console.log(idSetResult);
                }
                catch (e) {
                    console.log("Channel entered is invalid, please restart TTTT and try again");
                    Swal.fire({
                        icon: 'error',
                        text: e?.message || e?.error || e
                    });
                    return;
                }

                if (idSetResult?.status == 200) {
                    Swal.fire({
                        icon: 'success',
                        text: "Channel Set! We'll start grabbing your clips right away!"
                    });
                    uploadClip();
                    return;
                }
                else {
                    console.log(`Setting channel failed: ${JSON.stringify(idSetResult)}`);
                    Swal.fire({
                        icon: 'error',
                        html: idSetResult?.error + "<br/>" + "Click OK below and we will ask for your username again :)"
                    }).then((result) => {
                        if (result.isConfirmed) {
                            console.log("Username retry accepted");
                            uploadClip();
                        }
                    });
                    return;
                }
            }
            else {
                console.log("User did not enter a channel");
                Swal.fire({
                    icon: 'error',
                    text: "You did not enter a channel name. Please restart TTTT and enter a key."
                });
            }
        });
    }
    else if (result?.status == 429) {
        let errorMessage = result?.error;
        if(result.force == 'true') {
            console.log('Upload too fast WE YELLING');
            Swal.fire({
                icon: 'info',
                text: "There is an upload currently running, please wait then try again :)",
                confirmButtonText: 'OK',
            });
        }
        else {
            console.log('Upload too fast but no yelling');
        }
    }
    else if (result?.status == 500) {
        let errorMessage = result?.error;
        console.log('regular error');
        Swal.fire({
            icon: 'error',
            text: errorMessage
        });
    }

    //unconditionally update status to waiting for next upload
    ipcRenderer.send('status_update', 'Waiting until next upload');
}
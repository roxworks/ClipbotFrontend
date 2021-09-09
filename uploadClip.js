const { ipcRenderer } = require("electron");

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
    else if (result?.status == 302 && result?.type == 'all') {
        Swal.fire({
            title: 'No uploads enabled',
            text: 'You have Tiktok Uploads off and Youtube Uploads off, please enable at least one in Main Settings',
            icon: 'error',
            confirmButtonText: 'Ok'
        });
    }
    else if (result?.status == 302 && result?.type == 'tiktok') {
        doTiktokAuth();
    }
    else if (result?.status == 302 && result?.type == 'youtube') {
        Swal.fire({
            title: 'Not logged in to Youtube',
            text: 'Looks like you need to login to Youtube. Please click Login below to login.',
            icon: 'error',
            confirmButtonText: 'Login'
        }).then((result) => {
            if(result.isConfirmed) {
                doYoutubeAuth();
            }
        })
    }
    else if (result?.status == 303) {
        doLicenseAuth();        
    }
    else if (result?.status == 306) {
        doTwitchAuth();
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
    if(result?.status != 429) {
        ipcRenderer.send('status_update', 'Waiting until next upload');
    }
}
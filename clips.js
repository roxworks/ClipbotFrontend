// const { ipcRenderer } = require("electron");

// load clips from /clip/all on localhost:42074
let allClips = [];
let state = {};
let displayedClip = undefined;
let currentIndex = 0;

const setClip = (newIndex) => {
    if(newIndex > -1 && newIndex < allClips.length) {
        displayedClip = allClips[newIndex];
        document.querySelector('video').src = displayedClip.download_url;
        document.getElementById("cliptitle").placeholder = displayedClip.title;
        changeFrontendStatuses();
        if(currentIndex == allClips.length - 1) {
            document.getElementById("next").disabled = true;
            document.getElementById("prev").disabled = false;
        }
        else if (currentIndex == 0) {
            document.getElementById("next").disabled = false;
            document.getElementById("prev").disabled = true;
        }
        else {
            document.getElementById("next").disabled = false;
            document.getElementById("prev").disabled = false;
        }
    }
    else {
        document.getElementById("cliptitle").placeholder = "No clips found, load more clips!";
        displayedClip = {};
        changeFrontendStatuses("Press Load Clips To Get More clips!");

    }
}

const changeClipOnFrontend = (newSettings) => {
    let keys = Object.keys(newSettings);
    for(key of keys) {
        allClips[currentIndex][key] = newSettings[key];
        displayedClip[key] = newSettings[key];
    }
    console.log('frontend clipsettings set');
    changeFrontendStatuses();
};

const changeFrontendStatuses = (customStatus) => {
    if(customStatus) {
        document.getElementById("approvalStatus").innerHTML = customStatus;
    }
    //Change approvalStatus and uploadedStatus text based on displayedClip fields
    if(displayedClip.approved == true) {
        document.getElementById("approvalStatus").innerHTML = "Approved";
    }
    else if(displayedClip.approved == false) {
        document.getElementById("approvalStatus").innerHTML = "Rejected";
    }
    else {
        document.getElementById("approvalStatus").innerHTML = "Not Yet Approved";
    }
    if(displayedClip.uploaded == true) {
        document.getElementById("uploadedStatus").innerHTML = "Uploaded";
    }
    else {
        document.getElementById("uploadedStatus").innerHTML = "Not Uploaded";
    }
};

const updateClipOnBackend = async (clipId, newSettings) => {
    //PUT to /clip with id and new settings
    let res = await fetch('http://localhost:42074/clip/', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({...newSettings, id: clipId})
    });
    ipcRenderer.send('settings_updated');
    return res;
}

const updateClipFrontendAndBackend = async (newSettings) => {
    changeClipOnFrontend(newSettings);
    return updateClipOnBackend(displayedClip.id, newSettings);
}

const changeTitle = async () => {
    console.log("Change title");
    // hit setting endpoint with new title
    let newTitle = document.getElementById("cliptitle").value;
    if(newTitle == '') {
        return false;
    }
    let result = await updateClipFrontendAndBackend({title: newTitle});
    if (result.status === 200) {
        Swal.fire({
            icon: 'success',
            title: 'Title changed to ' + newTitle,
        });
    }
    else {
        Swal.fire({
            icon: 'error',
            title: 'Error changing title',
        });
    }
    return true;
}

document.addEventListener('DOMContentLoaded', async function() {
    let clipsResult = await fetch('http://localhost:42074/clip/all').then(res => res.json());
    state = await fetch('http://localhost:42074/state').then(res => res.json());
    allClips = clipsResult.clips;

    console.log(JSON.stringify(allClips));
    //check if current clip is in allClips
    let possibleCurrentClipIndex = allClips.findIndex(clip => clip.id === state.currentClipId);
    currentIndex = possibleCurrentClipIndex >= 0 ? possibleCurrentClipIndex : 0;
    if(allClips.length == 0) {
        currentIndex = -1;
    }    
    setClip(currentIndex);

    document.getElementById('prev').addEventListener('click', function() {
        if(currentIndex > 0) {
            currentIndex--;
            setClip(currentIndex);
        }
    });

    document.getElementById('next').addEventListener('click', function() {
        if(currentIndex < allClips.length - 1) {
            currentIndex++;
            setClip(currentIndex);
        }
    });

    setupTitleStuff();
    setupLoadButton();
    setupApproveRejectButtons();
    setupCloseButton();
});

const setupTitleStuff = async() => {
    //add click listener to #changetitlebutton
    document.getElementById("changetitlebutton").addEventListener("click", async function () {
        e.preventDefault();
        e.stopPropagation();
        console.log('title changin');
        let titleDidChange = await changeTitle();
        if(titleDidChange) {
            document.getElementById("cliptitle").value = '';
            document.getElementById("cliptitle").placeholder = displayedClip.title;
            console.log('placeholders changed');
        }
        return false;
    });

    document.getElementById("clipform").addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('update submitted');
        let titleDidChange = await changeTitle();
        if(titleDidChange) {
            document.getElementById("cliptitle").value = '';
            document.getElementById("cliptitle").placeholder = displayedClip?.title;
            console.log('placeholders changed');
        }
        return false;
    });

    // document.getElementById("cliptitle").addEventListener('submit', (e) => {
    //     e.preventDefault();
    //     e.stopPropagation();
    //     console.log('new title submitted');
    //     changeTitle().then(updateDisplayedSettings);
    //     return false;
    // });
};

const setupLoadButton = () => {
    document.getElementById("loadClips").addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('load button clicked');
        let clipsResult = await fetch('http://localhost:42074/clip/load').then(res => res.json());
        if(clipsResult.status == 200) {
            if(allClips?.length === clipsResult?.allClips?.length) {
                console.log('no new clips');
                Swal.fire({
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

const setupApproveRejectButtons = () => {
    // add click listeners to approve button and reject button that update the clip on the backend
    document.getElementById("approve").addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('approve button clicked');
        let result = await updateClipFrontendAndBackend({approved: true});
        if (result.status === 200) {
            Swal.fire({
                icon: 'success',
                title: 'Clip approved',
            });
        }
        else {
            Swal.fire({
                icon: 'error',
                title: 'Error approving clip',
            });
        }
        return false;
    });

    document.getElementById("reject").addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('reject button clicked');
        let result = await updateClipFrontendAndBackend({approved: false});
        if (result.status === 200) {
            Swal.fire({
                icon: 'success',
                title: 'Clip rejected',
            });
        }
        else {
            Swal.fire({
                icon: 'error',
                title: 'Error rejecting clip',
            });
        }
        return false;
    });
}

const setupCloseButton = () => {
    document.getElementById("close").addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('close button clicked');
        ipcRenderer.send('close_clips');
        return false;
    });
}
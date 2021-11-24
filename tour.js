const main_steps = [
    {
        "title": "Welcome to your Dashboard!",
        "content": "Click the arrow to go to the next step.<br/> To stop any time click the x in the top-right corner of this popup."
    },
    {
        "title": "The Dashboard",
        "content": "This is your main screen. You can't do much here, but it will show you the current status of Clipbot."
    },
    {
        "selector": '#upload-video',
        "title": "Next Clip",
        "content": "The next clip getting uploaded. If you haven't approved any clips, or you ran out of clips, it will show a message instead."
    },
    {
        "selector": '#clipstatusdiv',
        "title": "Current Status - VERY IMPORTANT",
        "content": "This is what Clipbot is doing right now. If you aren't sure what's happening, look here!"
    },
    {
        "selector": '#nextuploaddiv',
        "title": "Next Upload Time",
        "content": "This is when your next clip will be uploaded. At first it might say January, don't worry about that :D"
    },
    {
        "selector": '#lastuploaddiv',
        "title": "Last Uploaded",
        "content": "This is when your last clip was uploaded. At first it might say January, don't worry about that :D"
    },
    {
        "selector": '#autocropdiv',
        "title": "Auto-Crop",
        "content": "This is the current status of your Auto-Crop. It's displayed here for convenience."
    },
    {
        "selector": '#hotkeydiv',
        "title": "Clip Hotkey",
        "content": "Press this button to make a clip of the last 30 seconds. You can change this in Settings at any time!"
    },
    {
        "selector": '#manageClips',
        "title": "Clips Menu",
        "content": "Choose and edit which clips get uploaded here."
    },
    {
        "selector": '#logins',
        "title": "Login/out of everything",
        "content": "Logged in to the wrong account? Want to add a license? Click here."
    },
    {
        "selector": '#howitworks',
        "title": "How It Works",
        "content": "Don't understand something? Click here for quick 30 second videos explaining how to use Clipbot."
    },
    {
        "selector": '#settings',
        "title": "Settings",
        "content": "You can change every setting you chose here! First step: turn Clipbot on :)"
    },
    {
        "selector": '#cropmenu',
        "title": "Auto-Crop",
        "content": "Set one crop for all of your videos. You can turn this on/off and adjust the crop here."
    },
    {
        "selector": '#discord',
        "title": "JOIN THE DISCORD!!",
        "content": "Clipbot gets a LOT of updates. You should really join this discord, even if you mute it."
    },
    {
        "selector": '#helpmenu',
        "title": "HELP",
        "content": "Got a bug? <br>Want to give feedback? <br>Want to see this tutorial again? <br>Click here. <br>Feedback is insanely helpful <3"
    },
    {
        "selector": '#manageClips',
        "title": "Start Here",
        "content": "Now that you know what you can do, let's pick some clips! Click the checkmark on the right, then click on this Clips button."
    }
];

const clips_steps = [
    {
        "title": "Clips Menu",
        "content": "This is the clips menu. Here you can edit and approve/reject clips."
    },
    {
        "selector": '#clip-amount',
        "title": "Clips",
        "content": "This is how many of your clips Clipbot has loaded! Don't worry - we'll help you sort through them."
    },
    {
        "selector": '#currentclip',
        "title": "Current Clip",
        "content": "This is the clip you're currently editing. Any button you press below will affect only this clip."
    },
    {
        "selector": '#title',
        "title": "Clip Title",
        "content": "This is the title of the clip you're editing. You can change the title here."
    },
    {
        "selector": '#approvaldiv',
        "title": "Clip Status",
        "content": "This will tell you if the clip has been Approved, Rejected, or Auto-Approved. Only Approved/Auto-Approved clips will get uploaded."
    },
    {
        "selector": '#uploadeddiv',
        "title": "Uploaded",
        "content": "Tells you if this clip has already been uploaded. Right now, any clip uploaded to Tiktok or Youtube will be marked as uploaded."
    },
    {
        "selector": '#approve',
        "title": "Approve",
        "content": "Approve this clip. Until a clip is approved, it won't get uploaded."
    },
    {
        "selector": '#reject',
        "title": "Reject",
        "content": "Reject this clip. A rejected clip will never be uploaded."
    },
    {
        "selector": '#next',
        "title": "Next",
        "content": "Move to the next clip"
    },
    {
        "selector": '#prev',
        "title": "Back",
        "content": "Move to the previous clip"
    },
    {
        "selector": '#customOrientation',
        "title": "Custom Orientation",
        "content": "Change the clip between horizontal/vertical."
    },
    {
        "selector": '#customCrop',
        "title": "Custom Crop",
        "content": "Change the clip's crop. Use this if you want to crop one clip in a special way."
    },
    {
        "selector": '.sidebar',
        "title": "Filters",
        "content": "Too many clips to scroll through? Use filters to see only specific clips."
    },
    {
        "selector": '#approvalgroup',
        "title": "Approval Status",
        "content": "See only clips that have been Approved/Rejected/Not Reviewed Yet."
    },
    {
        "selector": '#uploadedgroup',
        "title": "Upload Status",
        "content": "See only clips that have been Uploaded/Not Uploaded Yet."
    },
    {
        "selector": '#viewcountgroup',
        "title": "Minimum Twitch Views",
        "content": "See only clips with at least this many views on Twitch."
    },
    {
        "selector": '#startdategroup',
        "title": "Start Date",
        "content": "See only clips that were created after this date."
    },
    {
        "selector": '#enddategroup',
        "title": "End Date",
        "content": "See only clips that were created before this date."
    },
    {
        "selector": '#applyFiltersButton',
        "title": "Apply Filters",
        "content": "Apply the filters you've set. Be sure to click this after changing any filters."
    },
    {
        "selector": '#close',
        "title": "Close",
        "content": "Close the clips menu."
    },
    {
        "selector": '#tutorial',
        "title": "Replay Tutorial",
        "content": "Click here to see this tutorial again."
    }
];

// The step field is only for more complex use cases, but does have to exist
// So we can just use the index as the step number for now
const fillInSteps = (steps) => {
    for(let i = 0; i < steps.length; i++) {
        steps[i].step = i;
    }
}
fillInSteps(main_steps);
fillInSteps(clips_steps);
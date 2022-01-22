const selectCropType = async () => {
    let selection = 'cam-top';
    changeSelection = (val) => {
        selection = val;
    }
    let popup = SafeSwal.fire({
        title: 'Select crop type',
        html: /*html*/`
        <div style='margin-top: 10px' width="100%" id="cropTypeDiv">
            <input 
                type="radio" name="cropType" checked
                id="cam-top" class="input-hidden" onclick="changeSelection('cam-top')" />
            <label for="cam-top" class='radio-label'>
                <p>Cam Top</p>
                <img
                src="images/camTop.png"
                />
            </label>
            
            <input 
                type="radio" name="cropType"
                id="no-cam" class="input-hidden" 
                onclick="changeSelection('no-cam')"/>
            <label for="no-cam" class='radio-label'>
                <p>No Cam</p>
                <img
                src="images/noCam.png" 
                />
            </label>

            <input 
            type="radio" name="cropType"
            id="freeform" class="input-hidden" 
            onclick="changeSelection('freeform')"/>
            <label for="freeform" class='radio-label'>
                <p>Freeform</p>
                <img
                src="images/freeform.png" 
                />
            </label>
        </div>
        `,
        showCancelButton: true,
    }).then((result) => {
        if(result.dismiss == 'cancel') {
            return null;
        }
        console.log("Selection: " + selection); 
        return selection;
    });

    return popup;
}
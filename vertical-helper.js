const selectCropType = async () => {
    let selection = '';
    changeSelection = (val) => {
        selection = val;
    }
    let popup = Swal.fire({
        title: 'Select crop type',
        html: /*html*/`
        <div style='margin-top: 10px' id="cropTypeDiv">
            <input 
                type="radio" name="cropType" 
                id="cam-top" class="input-hidden" onclick="changeSelection('cam-top')" />
            <label for="cam-top" class='radio-label'>
                <p>Cam Top</p>
                <img
                src="https://share.nyx.xyz/l6JIPJglW8Z" 
                />
            </label>
            
            <input 
                type="radio" name="cropType"
                id="no-cam" class="input-hidden" 
                onclick="changeSelection('no-cam')"/>
            <label for="no-cam" class='radio-label'>
                <p>No Cam</p>
                <img
                src="https://share.nyx.xyz/qeDAjHo49me" 
                />
            </label>
        </div>
        `
    }).then(() => {console.log("Selection: " + selection); return selection;});

    return popup;
}


const QRCode = require('qrcode')
const fs = require('fs');
const path = require('path');
const Koder = require('@maslick/koder');
const upng = require('upng');

function decodeBase64Image(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
      response = {};
  
    if (matches?.length !== 3) {
      return new Error('Invalid input string');
    }
  
    response.type = matches[1];
    response.data = Buffer.from(matches[2], 'base64');
  
    return response;
}

const createImageBuffer = (image) => {
    var base64Image = image;   // Load base64 image 
    var decodedImg = decodeBase64Image(base64Image);
    var imageBuffer = Buffer.from(decodedImg.data, 'base64');
    return imageBuffer;
}

const qrScan = async (base64String) => {
    return new Promise(async (resolve, reject) => {
        if(!base64String) {
            resolve(undefined);
        }
        let buffer = createImageBuffer(base64String);
        const pngData = upng.decode(buffer);
        const qrArray = new Uint8ClampedArray(upng.toRGBA8(pngData));
        const koder = await new Koder().initialized;
        const foundURL = koder.decode(qrArray, pngData.width, pngData.height);

        QRCode.toDataURL(foundURL, function (err, base64Image) {   
            
            //replace qrcoode element data
            var decodedImg = decodeBase64Image(base64Image);
            var imageBuffer = Buffer.from(decodedImg.data, 'base64');
        
            fs.writeFileSync(path.join(__dirname, '/temp.png'), imageBuffer, {encoding: 'base64'}, function(err){
                if(err) {
                    console.log('error', err);
                }
                console.log('made image');
            });
            console.log('wrote image');

            let codeToRun = `document?.querySelector('img[alt=qrcode]')?.src = '${base64Image}'`;
            resolve(codeToRun);

            
        })
    });
}

module.exports = {
    qrScan
}
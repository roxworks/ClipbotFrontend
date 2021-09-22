// Listen to submit event on the <form> itself!
document.addEventListener('DOMContentLoaded', async function (event) {
  document.getElementById('update').addEventListener('submit', async (e) => {
    console.log('test2');

    e.preventDefault();

    // must match id of element in html
    let allSettings = [
      'hashtags',
      'delay',
      'minViewCount',
      'uploadFrequency',
      'hotkey',
    ];
    let params = {};
    let settingsWereChanged = false;
    for (setting of allSettings) {
      params[setting] = document.querySelector('#' + setting).value;
      if (params[setting]) {
        settingsWereChanged = true;
      }
    }

    params['defaultApprove'] =
      document.querySelector('#defaultApprove').checked;
    params['uploadEnabled'] = document.querySelector('#uploadEnabled').checked;
    params['tiktokUploadEnabled'] = document.querySelector(
      '#tiktokUploadEnabled'
    ).checked;
    params['youtubeUploadEnabled'] = document.querySelector(
      '#youtubeUploadEnabled'
    ).checked;
    settingsWereChanged = true;

    let url = new URL('http://localhost:42074/update');

    if (!settingsWereChanged) {
      Swal.fire({
        icon: 'info',
        text: 'No settings changed',
      });
      return false;
    }

    if (!checkFieldsAreValid()) {
      return false;
    }

    Object.keys(params).forEach((key) => {
      if (params[key] != undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      await fetch(url);
      updateFields(params);
      Swal.fire('Settings updated!');
      ipcRenderer.send('settings_updated');
      return true;
    } catch {
      return false;
    }
  });
});

let updateFields = (fields) => {
  for (fieldName in fields) {
    let fieldSpan = document.querySelector('#' + fieldName); //+ "-value"
    console.log('name:' + fieldName);
    console.log('span:' + fieldSpan);
    console.log('val:' + fields[fieldName]);

    if (
      fields[fieldName] !== '' &&
      fields[fieldName] !== undefined &&
      fieldSpan
    ) {
      if (
        fieldName == 'defaultApprove' ||
        fieldName.toLowerCase().includes('upload')
      ) {
        fieldSpan.checked = JSON.parse(fields[fieldName]);
      }

      fieldSpan.value = '';
      fieldSpan.placeholder = fields[fieldName];

      if (fieldName == 'delay' || fieldName == 'uploadFrequency') {
        fieldSpan.placeholder += ' hours';
      } else if (fieldName == 'minViewCount') {
        fieldSpan.placeholder += ' views';
      }
    }
  }
};

let checkFieldsAreValid = () => {
  const hashtagRegex = /^\s*(#\w+\s)*#\w+\s*$/;
  // Ensure entire hashtags string is space separated and every tag starts with #
  let hashtagsValue = document.querySelector('#hashtags').value;
  if (hashtagsValue) {
    let hashtagsAreValid = hashtagRegex.test(hashtagsValue);
    if (!hashtagsAreValid) {
      Swal.fire({
        icon: 'error',
        text: 'Looks like your hashtags are wrong, make sure to use the format: #tag #anothertag #athirdtag',
      });
      return false;
    }
  }

  let delayValue = document.querySelector('#delay').value;
  if (delayValue) {
    let delayIsValid = delayValue >= 0;
    if (!delayIsValid) {
      Swal.fire({
        icon: 'error',
        text: 'Looks like your delay is incorrect, make sure to use a number greater than or equal to 0',
      });
      return false;
    }
  }

  let minViewCountValue = document.querySelector('#minViewCount').value;
  if (minViewCountValue) {
    let minViewCountIsValid = minViewCountValue >= 0;

    if (!minViewCountIsValid) {
      Swal.fire({
        icon: 'error',
        text: 'Looks like your Min View Count is incorrect, make sure to use a number greater than or equal to 0',
      });
      return false;
    }
  }

  let uploadFrequencyValue = document.querySelector('#uploadFrequency').value;
  if (uploadFrequencyValue) {
    let uploadFrequencyIsValid = uploadFrequencyValue >= 0;

    if (!uploadFrequencyIsValid) {
      Swal.fire({
        icon: 'error',
        text: 'Looks like your Upload Frequency is incorrect, make sure to use a number greater than or equal to 0',
      });
      return false;
    }
  }

  return true;
};
// Set interval for querying backend to publish clips

function keyUp(event) {
  const keyCode = event.keyCode;
  const key = event.key;
  const charCode = event.code;

  if ((keyCode >= 16 && keyCode <= 18) || keyCode === 91) return;

  const value = [];
  event.ctrlKey ? value.push('Control') : null;
  event.shiftKey ? value.push('Shift') : null;
  event.isAlt ? value.push('Alt') : null;
  value.push(key.toUpperCase());

  document.getElementById('hotkey').value = value.join('+');
}

// Call backend settings endpoint to get current settings
document.addEventListener('DOMContentLoaded', async function (event) {
  let result = await fetch('http://localhost:42074/settings');
  if (result.status == 200) {
    result.json().then((settings) => {
      updateFields(settings);
    });
  }
});

document.addEventListener('DOMContentLoaded', async function (event) {
  // console.log( 'renderer: ' + ipcRenderer);
  let ipcRenderer = window.ipcRenderer;
  if (!ipcRenderer) {
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch {
      try {
        ipcRenderer = require('electron').ipcRenderer;
      } catch {
        console.log('rip');
      }
    }
  }
});

// Call backend settings endpoint to get current settings
let descriptions = {
  hashtags: `
    Clipbot uses the title from your clip to create a description.
    <br/><br/>
    On top of this, you can add hashtags to your tiktok descriptions to help your clips get found!
    <br/><br/>
    We recommend ~3-6 hashtags. Even simple ones like #twitch or #twitchstreamer are good!
    <br/><br/>
    Format: A list of hashtags seperated by spaces<br/>
    Example: "#twitchstreamer #streamer #twitchclip"
    `,
  delay: `
    How many hours should we wait to upload your newest clip?
    <br/><br/>
    If you're an affiliate or partner, you're required to wait 24 hours before posting content to other platforms.
    <br/><br/>
    So, for most people, this should be set to 24 hours.
    <br/><br/>
    If you're not an affiliate and not a partner, you can set this to 0.
    <br/><br/>
    Format: Positive number (hours)<br/>
    Example: 24
    `,
  minViewCount: `
    How many views should a clip have before we upload it?
    <br/><br/>
    If you're popular and get lots of clips, you may not want to upload them all.
    <br/><br/>
    This setting allows you to require a video to have at least X views to be uploaded.
    <br/><br/>
    Most small streamers can leave this as 0.
    <br/><br/>
    Format: Positive number (views)<br/>
    Example: 3
    `,
  uploadFrequency: `
    How often should we upload to TikTok? (hours)
    <br/><br/>
    Every X hours, we will try to upload another clip to TikTok.
    <br/><br/>
    While you have control over this, be careful with this setting. If you you set it too low, you may get banned from TikTok.
    <br/><br/>
    We recommend uploading at most 3-4 tiktoks a day, and therefore setting this to either 6 or 8 hours.
    <br/><br/>
    Format: Positive number (hours)<br/>
    Example: 6
    `,
};
document.addEventListener('DOMContentLoaded', async function (event) {
  let fields = Object.keys(descriptions);
  for (field of fields) {
    let whatsThis = document.querySelector(
      `#${field}-form > label > div > span.what`
    );
    if (whatsThis) {
      let storedField = field;
      let desc = descriptions[field];
      whatsThis.addEventListener('click', () => {
        Swal.fire({
          title: storedField.charAt(0).toUpperCase() + storedField.slice(1),
          html: desc,
        });
      });
    }
  }
});
console.log('garbo');

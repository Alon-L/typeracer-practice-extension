let savesLeftDOM;
let title;
let btnStillExistsInterval;

// Convert milliseconds to human readable format
const millisecondsToTime = (duration) => {
  const portions = [];

  const msInHour = 1000 * 60 * 60;
  const hours = Math.trunc(duration / msInHour);
  if (hours > 0) {
    portions.push(hours + 'h');
    duration = duration - (hours * msInHour);
  }

  const msInMinute = 1000 * 60;
  const minutes = Math.trunc(duration / msInMinute);
  if (minutes > 0) {
    portions.push(minutes + 'm');
    duration = duration - (minutes * msInMinute);
  }

  const seconds = Math.trunc(duration / 1000);
  if (seconds > 0) {
    portions.push(seconds + 's');
  }

  return portions.join(' ');
};

// Creates the saves left DOM
const createSavesLeftText = () => {
  savesLeftDOM = document.createElement('span');
  savesLeftDOM.id = 'savesLeft';
  savesLeftDOM.style = 'position: absolute; top: 100px; left: 100px; z-index: 10000;';
  document.body.appendChild(savesLeftDOM);
};

// Updates the save left text to contain the number of saves left with the time left for them to reset
const updateSavesLeftText = (savesLeft, saveTimestamp) => {
  const time = millisecondsToTime(1000 * 60 * 60 * 24 - (Date.now() - saveTimestamp));
  savesLeftDOM.innerText = `Saves Left: (${savesLeft}/2)${saveTimestamp ? '\nTime Left: ' + time : ''}`;
};

const calcSavesLeft = (saves) => {
  return 2 - saves;
};

// Fetches storage data and updates saves left text
const setSavesLeft = async (title) => {
  const res = await getStorageData(title);
  const resQuote = res[title];
  if (!resQuote) updateSavesLeftText(calcSavesLeft(0));
  else updateSavesLeftText(calcSavesLeft(resQuote.saves.length), resQuote.saves[0]);
};

(async () => {
  createSavesLeftText();
  setInterval(() => {
    // Updates saves left text when title changes
    const titleDOM = document.querySelector('.textInfoTitle a');
    if (!titleDOM) return title = '';
    if (title !== titleDOM.innerText) {
      setSavesLeft(titleDOM.innerText);
    }
    title = titleDOM.innerText;
  }, 1000);
})();

const getStorageData = async (title) => {
  return await new Promise(resolve => {
    chrome.storage.local.get([title], result => {
      resolve(result);
    });
  });
};

// Adds another save to storage field for quote
const updateStorageQuote = async (title, resQuote) => {
  if (resQuote && resQuote.saves.length >= 2) return resQuote;

  const data = resQuote
    ? {
      [title]: {
        ...resQuote,
        saves: [
          ...resQuote.saves,
          Date.now(),
        ],
      },
    }
    : {
      [title]: {
        saves: [
          Date.now(),
        ],
      },
    };

  // Applies changes to storage
  await new Promise(resolve => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });

  return data;
};

(async () => {
  while (true) {
    // Looks for save button
    clearInterval(btnStillExistsInterval);

    const saveBtn = document.querySelector('table[title="Save this score in your account"] td:nth-child(2) a');
    if (saveBtn) {
      await new Promise(async (resolve) => {
        // Checks if save button still exists
        btnStillExistsInterval = setInterval(() => {
          if (!document.querySelector('table[title="Save this score in your account"] td:nth-child(2) a'))
            return resolve();
        }, 1000);

        saveBtn.addEventListener('click', async (e) => {
          // Gets storage data for quote
          const res = await getStorageData(title);

          const resQuote = res ? res[title] : undefined;
          const data = await updateStorageQuote(title, resQuote);

          await updateSavesLeftText(calcSavesLeft(data[title].saves.length), data[title].saves[0]);

          resolve();
        });
      });
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
})();
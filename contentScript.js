console.log('Here in typeracer');

let savesLeftDOM;
let title;
let btnStillExistsInterval;

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

const createSavesLeftText = () => {
  savesLeftDOM = document.createElement('span');
  savesLeftDOM.id = 'savesLeft';
  savesLeftDOM.style = 'position: absolute; top: 100px; left: 100px; z-index: 10000;';
  document.body.appendChild(savesLeftDOM);
};

const updateSavesLeftText = (savesLeft, saveTimestamp) => {
  console.log(1000 * 60 * 60 * 24 - (Date.now() - saveTimestamp));
  console.log(saveTimestamp);
  const time = millisecondsToTime(1000 * 60 * 60 * 24 - (Date.now() - saveTimestamp));
  console.log(time);
  savesLeftDOM.innerText = `Saves Left: (${savesLeft}/2)${saveTimestamp ? '\nTime Left: ' + time : ''}`;
};

const calcSavesLeft = (saves) => {
  return 2 - saves;
};

const setSavesLeft = async (title) => {
  const res = await getStorageData(title);
  const resQuote = res[title];
  if (!resQuote) updateSavesLeftText(calcSavesLeft(0));
  else updateSavesLeftText(calcSavesLeft(resQuote.saves.length), resQuote.saves[0]);
};

(async () => {
  createSavesLeftText();
  setInterval(() => {
    // Find quote title
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

const updateStorageQuote = async (title, resQuote) => {
  // Adds another save to storage field for quote
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
    // Find save button
    clearInterval(btnStillExistsInterval);

    const saveBtn = document.querySelector('table[title="Save this score in your account"] td:nth-child(2) a');
    if (saveBtn) {
      await new Promise(async (resolve) => {
        // Check if save button still exists
        btnStillExistsInterval = setInterval(() => {
          if (!document.querySelector('table[title="Save this score in your account"] td:nth-child(2) a'))
            return resolve();
        }, 1000);

        saveBtn.addEventListener('click', async (e) => {
          // Get storage data for quote
          const res = await getStorageData(title);

          console.log(res, 1);

          const resQuote = res ? res[title] : undefined;
          console.log(resQuote, 2);
          const data = await updateStorageQuote(title, resQuote);
          console.log(data, 4);

          await updateSavesLeftText(calcSavesLeft(data[title].saves.length), data[title].saves[0]);

          resolve();
        });
      });
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
})();
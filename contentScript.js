const savesLeftId = 'savesLeft';

let savesLeftDOM;
let title;

// Creates the saves left DOM
const createSavesLeftText = () => {
  if (document.getElementById(savesLeftId)) return;

  const savesLeftDiv = document.createElement('div');
  savesLeftDiv.style = 'background-color: #fafafa; box-shadow: inset 0 0 10px rgba(0, 0, 0, .1); border-radius:  5px; padding: 1rem; margin: 1rem 0;';

  const savesLeft = document.createElement('span');
  savesLeft.id = savesLeftId;

  savesLeftDiv.appendChild(savesLeft);

  const table = document.querySelector('.themeContent .view tr:nth-child(2) td:nth-child(2)');
  if (!table) return;

  table.insertBefore(savesLeftDiv, table.firstChild);

  savesLeftDOM = savesLeft;
};

const deleteSavesLeftText = () => {
  if (!savesLeftDOM || !document.getElementById(savesLeftId)) return;

  savesLeftDOM.parentElement.remove();

  savesLeftDOM = null;
};

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

setInterval(() => {
  // Updates saves left text when title changes
  const titleDOM = document.querySelector('.textInfoTitle a');
  if (!titleDOM || !savesLeftDOM) return title = '';
  if (title !== titleDOM.innerText) {
    setSavesLeft(titleDOM.innerText);
  }
  title = titleDOM.innerText;
}, 1000);

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


const loopForDOMExistence = async (queries, cbBeforeClick, cbAfterClick) => {
  let domStillExistsInterval;
  while (true) {
    // Looks for DOM
    clearInterval(domStillExistsInterval);

    // If multiple queries - look for the first one.
    const domEle = document.querySelector(queries instanceof Array ? queries[0] : queries);
    if (domEle) {
      await new Promise(async (resolve) => {
        // Checks if DOM still exists
        domStillExistsInterval = setInterval(() => {
          // If multiple queries - check if all exist.
          if ((queries instanceof Array && queries.some(q => !document.querySelector(q))) || !document.querySelector(queries))
            return resolve();
        }, 1000);

        cbBeforeClick();

        domEle.addEventListener('click', async (e) => {
          cbAfterClick(e, resolve);
        });
      });
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

// Save practice race button.
// If button exists and pressed on - add another save score to storage.
loopForDOMExistence('table[title="Save this score in your account"] td:nth-child(2) a',
  () => {
    createSavesLeftText();
  }, async (e, resolve) => {
    // Gets storage data for quote
    const res = await getStorageData(title);

    const resQuote = res ? res[title] : undefined;
    const data = await updateStorageQuote(title, resQuote);

    await updateSavesLeftText(calcSavesLeft(data[title].saves.length), data[title].saves[0]);

    resolve();
  }
);

// Leave practice button.
// If button exists and pressed on - remove statistics bar.
loopForDOMExistence(['.navControls tr td:first-child a', 'table[title="Save this score in your account"] td:nth-child(2) a'],
  () => {},
  () => {
    deleteSavesLeftText();
  }
);
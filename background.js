const getAllStorage = async () => {
  return await new Promise(resolve => {
    chrome.storage.local.get(null, (result) => {
      resolve(result);
    });
  });
};

const updateStorage = async (res) => {
  return await new Promise(resolve => {
    chrome.storage.local.set(res, () => {
      resolve();
    });
  });
};

const clearExpiredScores = async () => {
  const res = await getAllStorage();

  for (const quote in res) {
    const data = res[quote];
    const { saves } = data;

    let removedSaves = 0;
    for (const save of saves) {
      if (Date.now() - save >= 1000 * 60 * 60 * 24) {
        removedSaves++;
      }
    }

    for (let i = 0; i < removedSaves; i++) {
      saves.shift();
    }

    if (!saves.length) delete res[quote];
  }

  console.log(res);
  await updateStorage(res);
};

setInterval(clearExpiredScores, 1000 * 60 * 10);
clearExpiredScores();
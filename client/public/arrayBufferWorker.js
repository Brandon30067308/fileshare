let chunksArray = [];

self.addEventListener('message', e => {
  if (e.data === 'download') {
    const blob = new Blob(chunksArray);
    self.postMessage(blob);
    chunksArray = [];
  } else {
    chunksArray.push(e.data);
  }
});
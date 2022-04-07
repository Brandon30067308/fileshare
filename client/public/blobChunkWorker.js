const createChunks = (file, cSize) => {
  let start = 0;
  let end = file.size;
  let chunks = [];
  while (start < end) {
    let newStart = start + cSize;
    chunks.push(file.slice(start, newStart));
    start = newStart;
  }
  return chunks;
};

self.addEventListener('message', e => {
  const blobChunks = createChunks(e.data, 16000);
  self.postMessage(blobChunks)
});
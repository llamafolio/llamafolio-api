export function range(start: number, end: number, step = 1) {
  const nums: number[] = [];

  for (let i = start; i < end; i += step) {
    nums.push(i);
  }
  return nums;
}

export function sliceIntoChunks<T>(arr: T[], chunkSize: number) {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}

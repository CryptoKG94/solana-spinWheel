export const ReturnRepeatedData = (arraytoLoop) => {
  var repeatedData = [];
  for (var i = 0, j = 0; i < 120; i++) {
    repeatedData[i] = arraytoLoop[j++];
    // eslint-disable-next-line eqeqeq
    if (j == arraytoLoop.length) j = 0;
  }
  return repeatedData;
};

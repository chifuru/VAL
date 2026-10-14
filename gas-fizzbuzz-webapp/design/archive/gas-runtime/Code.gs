/**
 * FizzBuzz GAS web app server.
 * The input is an integer from 1 to 1000 (inclusive).
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('FizzBuzz | Google Apps Script');
}

function calculateFizzBuzz(limit) {
  if (typeof limit !== 'number' ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 1000) {
    throw new Error('1から1000までの整数を入力してください。');
  }

  var results = [];
  for (var i = 1; i <= limit; i++) {
    if (i % 15 === 0) {
      results.push('FizzBuzz');
    } else if (i % 3 === 0) {
      results.push('Fizz');
    } else if (i % 5 === 0) {
      results.push('Buzz');
    } else {
      results.push(String(i));
    }
  }
  return results;
}

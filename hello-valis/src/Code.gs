/** Browser entry point for the Hello VALIS web app. */
function doGet() {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="en"><head><meta charset="UTF-8"></head>' +
    '<body><h1>Hello, VALIS</h1></body></html>'
  )
    .setTitle('Hello, VALIS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

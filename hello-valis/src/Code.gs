/** Serve the self-contained electronic ecosystem. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Hello, VALIS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

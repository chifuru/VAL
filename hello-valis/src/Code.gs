function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('VALIS — Neon Interface')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

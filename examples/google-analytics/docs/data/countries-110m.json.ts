export {};

process.stdout.write(
  await fetch(
    "https://static.observableusercontent.com/files/33f462daa7c36572a70ef54acb6e2521ea40271b4c8df544214ba731d91b9e4d927ed22f559881096780fc81711bea4ca9d12c9115c59ce2415ea7f1cb5115e3?response-content-disposition=attachment%3Bfilename*%3DUTF-8%27%27world-110m-2020.json"
  ).then((d) => d.text())
);

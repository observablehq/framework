export default {
  head: (data) => `<!-- ${JSON.stringify({fragment: "head", data})} -->`,
  header: (data) => `<!-- ${JSON.stringify({fragment: "header", data})} -->`,
  footer: (data) => `<!-- ${JSON.stringify({fragment: "footer", data})} -->`
};

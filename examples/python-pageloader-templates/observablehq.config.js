const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default {
  title: "Python Pageloader Templates",
  head: '<link rel="icon" href="observable.png" type="image/png" sizes="32x32">',
  root: "src",
  pages: [
    {
      name: "Days",
      pages: days.map((day) => ({name: `${day[0].toUpperCase()}${day.slice(1)}`, path: `/day/${day}/`}))
    }
  ],
  dynamicPaths: days.map((day) => `/day/${day}/`)
};

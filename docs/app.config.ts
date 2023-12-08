export default defineAppConfig({
  ui: {
    primary: 'yellow',
    gray: 'neutral',
  },
  header: {
    logo: {
      alt: "",
      light: "",
      dark: "",
    },
    search: true,
    colorMode: true,
    links: [
      {
        icon: "i-simple-icons-x",
        to: "https://twitter.com/unjsio",
        target: "_blank",
        "aria-label": "Unjs on X",
      },
      {
        icon: "i-simple-icons-github",
        to: "https://github.com/unjs/unstorage",
        target: "_blank",
        "aria-label": "UnJS/Unstorage on GitHub",
      },
    ],
  },
  footer: {
    credits: "Released under the MIT License.",
    links: [
      {
        to: "https://unjs.io/",
        target: "_blank",
        "aria-label": "Unjs Website",
        slot: 'unjs'
      },
      {
        icon: "i-simple-icons-x",
        to: "https://twitter.com/unjsio",
        target: "_blank",
        "aria-label": "Unjs on X",
      },
      {
        icon: "i-simple-icons-github",
        to: "https://github.com/unjs/unstorage",
        target: "_blank",
        "aria-label": "UnJS/Unstorage on GitHub",
      },
    ],
  },
});

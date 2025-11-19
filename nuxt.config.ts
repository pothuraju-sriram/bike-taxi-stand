// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    [
      "@nuxtjs/i18n",
      {
        strategy: "prefix_except_default",
        defaultLocale: "te",
        pages: {
          privacy: false,
          terms: false,
          imprint: false,
          contact: false,
          news: false,
        },
        locales: [
          {
            code: "en",
            language: "en-US",
            file: "en.json",
            name: "English",
            englishName: "English",
            isCatchallLocale: true,
          },
          {
            code: "te",
            language: "te-IN",
            file: "te.json",
            name: "తెలుగు",
            englishName: "Telugu",
          },
        ],
      },
    ],
  ],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  routeRules: {
    "/": { prerender: true },
  },

  compatibilityDate: "2025-01-15",

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },
});

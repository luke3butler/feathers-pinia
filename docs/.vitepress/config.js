module.exports = {
  title: 'Feathers-Pinia',
  description: 'Connect Feathers.',
  lang: 'en-US',
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/marshallswain/feathers-pinia',
      },
    ],
    footer: {
      message:
        'Many thanks go to the Vue, Vuex, Pinia, and FeathersJS communities for keeping software development FUN!',
      copyright: 'MIT Licensed',
    },
    nav: [
      { text: 'Guide', link: '/guide/' },
      // {
      //   text: 'Config Reference',
      //   link: '/config/basics',
      //   activeMatch: '^/config/'
      // },
      {
        text: 'Release Notes',
        link: 'https://github.com/marshallswain/feathers-pinia/releases',
      },
    ],
    sidebar: {
      '/guide/': getGuideSidebar(),
      // "/config/": getConfigSidebar(),
      '/': getGuideSidebar(),
    },
  },
}

function getGuideSidebar() {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/guide/' },
        { text: 'Getting Started', link: '/guide/setup' },
        { text: 'Module Overview', link: '/guide/module-overview' },
      ],
    },
    {
      text: 'Pinia Stores',
      items: [
        { text: 'Service Stores', link: '/guide/service-stores' },
        { text: 'Auth Stores', link: '/guide/auth-stores' },
      ],
    },
    {
      text: 'Data Modeling',
      items: [
        { text: 'Model Classes', link: '/guide/model-classes' },
        { text: 'BaseModel', link: '/guide/base-model' },
        { text: 'Model Instances', link: '/guide/model-instances' },
      ],
    },
    {
      text: 'Common Tools',
      items: [
        { text: 'useFind', link: '/guide/use-find' },
        { text: 'useGet', link: '/guide/use-get' },
        { text: 'usePagination', link: '/guide/use-pagination' },
        { text: 'useClones', link: '/guide/use-clones' },
      ],
    },
    {
      text: 'Storage Sync',
      items: [{ text: 'syncWithStorage', link: '/guide/storage-sync' }],
    },
  ]
}

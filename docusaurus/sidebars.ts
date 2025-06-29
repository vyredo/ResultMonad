import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
const sidebars : SidebarsConfig= {
  docs: [
    'quick-start',
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/overview',
        'examples/api-error-handling',
      ],
    },
  ],
};

module.exports = sidebars;

import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 700 }}>BPMCP</span>,
  project: {
    link: 'https://github.com/bpmcp/bpmcp'
  },
  docsRepositoryBase: 'https://github.com/bpmcp/bpmcp/tree/main/docs-oss/pages',
  footer: {
    content: <>BPMCP OSS — Apache-2.0</>
  },
  sidebar: {
    toggleButton: true
  }
}

export default config

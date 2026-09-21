
declare module '*.css' {
  const content: Record<string, string>
  export default content
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_DOCS_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}



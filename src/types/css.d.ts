// Allow importing CSS files as side-effect modules (e.g. `import './globals.css'`)
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import { loadTheme, saveTheme } from '@/utils/theme'

// Apply saved theme before first render
void loadTheme().then((theme) => {
  void saveTheme(theme)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

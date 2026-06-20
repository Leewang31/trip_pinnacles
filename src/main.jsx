import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

const key = import.meta.env.VITE_MAPS_KEY
if (key) {
  const s = document.createElement('script')
  s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
  s.async = true
  document.head.appendChild(s)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)

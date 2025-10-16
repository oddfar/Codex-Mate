import React from 'react'
import { Home } from './Home'
import { Settings } from './Settings'

export default function App() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 16 }}>
      <h1>Codex Mate</h1>
      <Home />
      <hr />
      <Settings />
    </div>
  )
}

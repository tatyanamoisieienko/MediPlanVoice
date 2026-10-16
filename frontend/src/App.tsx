import { useState } from 'react'
import { BuchungenAnsicht } from './features/buchungen/BuchungenAnsicht'
import { MedizingeraeteAnsicht } from './features/medizingeraete/MedizingeraeteAnsicht'
import { RaeumeAnsicht } from './features/raeume/RaeumeAnsicht'
import { Seitennavigation, type Ansicht } from './components/Seitennavigation'
import './App.css'

function App() {
  const [ansicht, setAnsicht] = useState<Ansicht>('buchungen')

  return (
    <div className="app">
      <header className="kopfzeile">
        <div className="marke" aria-hidden="true">M</div>
        <div className="markentext">
          <strong>MediPlan Voice</strong>
          <span>Interne Ressourcenplanung</span>
        </div>
        <span className="kopfzeilenhinweis">Medizinischer Betrieb</span>
      </header>

      <div className="arbeitsbereich">
        <aside className="seitenleiste">
          <Seitennavigation aktuelleAnsicht={ansicht} beimWechseln={setAnsicht} />
        </aside>

        <main className="seiteninhalt">
          {ansicht === 'buchungen' && <BuchungenAnsicht />}
          {ansicht === 'raeume' && <RaeumeAnsicht />}
          {ansicht === 'medizingeraete' && <MedizingeraeteAnsicht />}
        </main>
      </div>
    </div>
  )
}

export default App

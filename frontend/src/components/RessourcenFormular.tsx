import { useState, type FormEvent } from 'react'

export type RessourcenFormWerte = {
  name: string
  standort: string
  kapazitaet: string
  geraetetyp: string
  aktiv: boolean
}

type Props = {
  titel: string
  art: 'raum' | 'medizingeraet'
  initialWerte?: RessourcenFormWerte
  onAbbrechen: () => void
  onSpeichern: (werte: RessourcenFormWerte) => Promise<void>
}

const leereWerte: RessourcenFormWerte = {
  name: '',
  standort: '',
  kapazitaet: '0',
  geraetetyp: '',
  aktiv: true,
}

export function RessourcenFormular({ titel, art, initialWerte, onAbbrechen, onSpeichern }: Props) {
  const [werte, setWerte] = useState(initialWerte ?? leereWerte)
  const [fehler, setFehler] = useState<string[]>([])
  const [serverFehler, setServerFehler] = useState('')
  const [speichert, setSpeichert] = useState(false)

  function aktualisiere<K extends keyof RessourcenFormWerte>(feld: K, wert: RessourcenFormWerte[K]) {
    setWerte((bisher) => ({ ...bisher, [feld]: wert }))
    setFehler([])
    setServerFehler('')
  }

  async function sendeFormular(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const neueFehler: string[] = []
    if (!werte.name.trim()) neueFehler.push('Name darf nicht leer sein.')
    if (!werte.standort.trim()) neueFehler.push('Standort muss ausgefüllt sein.')

    if (art === 'raum') {
      const kapazitaet = Number(werte.kapazitaet)
      if (!werte.kapazitaet.trim() || !Number.isInteger(kapazitaet) || kapazitaet < 0) {
        neueFehler.push('Kapazität muss eine nichtnegative ganze Zahl sein.')
      }
    } else if (!werte.geraetetyp.trim()) {
      neueFehler.push('Gerätetyp muss ausgefüllt sein.')
    }

    setFehler(neueFehler)
    setServerFehler('')
    if (neueFehler.length > 0) return

    setSpeichert(true)
    try {
      await onSpeichern({
        ...werte,
        name: werte.name.trim(),
        standort: werte.standort.trim(),
        geraetetyp: werte.geraetetyp.trim(),
      })
    } catch (speicherFehler) {
      setServerFehler(speicherFehler instanceof Error ? speicherFehler.message : 'Ressource konnte nicht gespeichert werden.')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <section className="buchungsformular ressourcenformular" aria-labelledby="ressourcenformular-titel">
      <header className="formular-kopf">
        <h2 id="ressourcenformular-titel">{titel}</h2>
        <button className="sekundaerknopf" type="button" onClick={onAbbrechen} disabled={speichert}>
          Abbrechen
        </button>
      </header>

      <form onSubmit={sendeFormular} noValidate>
        <div className="formularraster">
          <label className="formularfeld">
            <span>Name</span>
            <input autoFocus maxLength={120} value={werte.name} onChange={(event) => aktualisiere('name', event.target.value)} />
          </label>

          <label className="formularfeld">
            <span>Standort</span>
            <input maxLength={120} value={werte.standort} onChange={(event) => aktualisiere('standort', event.target.value)} />
          </label>

          {art === 'raum' ? (
            <label className="formularfeld">
              <span>Kapazität</span>
              <input
                type="number"
                min="0"
                step="1"
                value={werte.kapazitaet}
                onChange={(event) => aktualisiere('kapazitaet', event.target.value)}
              />
            </label>
          ) : (
            <label className="formularfeld">
              <span>Gerätetyp</span>
              <input maxLength={120} value={werte.geraetetyp} onChange={(event) => aktualisiere('geraetetyp', event.target.value)} />
            </label>
          )}

          <label className="ressourcen-aktivfeld">
            <input type="checkbox" checked={werte.aktiv} onChange={(event) => aktualisiere('aktiv', event.target.checked)} />
            <span>Ressource ist aktiv</span>
          </label>
        </div>

        {fehler.length > 0 && (
          <div className="formularmeldung formularmeldung-fehler" role="alert">
            {fehler.map((meldung) => <p key={meldung}>{meldung}</p>)}
          </div>
        )}
        {serverFehler && <p className="formularmeldung formularmeldung-fehler" role="alert">{serverFehler}</p>}

        <div className="formularaktionen">
          <button className="primaerknopf" type="submit" disabled={speichert}>
            {speichert ? 'Speichert …' : 'Speichern'}
          </button>
        </div>
      </form>
    </section>
  )
}
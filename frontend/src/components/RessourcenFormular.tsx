import { useEffect, useId, useState, type FormEvent } from 'react'

export type RessourcenFormWerte = {
  name: string
  standort: string
  kapazitaet: string
  geraetetyp: string
  aktiv: boolean
}

type Props = {
  /** Dient als zugängliche Bezeichnung; die sichtbare Überschrift stellt die umgebende Ansicht dar. */
  titel: string
  art: 'raum' | 'medizingeraet'
  initialWerte?: RessourcenFormWerte
  onAbbrechen: () => void
  onSpeichern: (werte: RessourcenFormWerte) => Promise<void>
  /** Meldet, ob seit dem Öffnen etwas geändert wurde (für die Rückfrage beim Verlassen). */
  beimEingabestatus?: (hatAenderungen: boolean) => void
}

type Textfeld = 'name' | 'standort' | 'kapazitaet' | 'geraetetyp'
type Feldfehler = Partial<Record<Textfeld, string>>

const leereWerte: RessourcenFormWerte = {
  name: '',
  standort: '',
  kapazitaet: '0',
  geraetetyp: '',
  aktiv: true,
}

export function RessourcenFormular({ titel, art, initialWerte, onAbbrechen, onSpeichern, beimEingabestatus }: Props) {
  const [startWerte] = useState(initialWerte ?? leereWerte)
  const [werte, setWerte] = useState(startWerte)
  const [fehler, setFehler] = useState<Feldfehler>({})
  const [serverFehler, setServerFehler] = useState('')
  const [speichert, setSpeichert] = useState(false)
  const hatAenderungen = JSON.stringify(werte) !== JSON.stringify(startWerte)
  const idPraefix = useId()

  useEffect(() => {
    beimEingabestatus?.(hatAenderungen)
  }, [hatAenderungen, beimEingabestatus])

  function aktualisiere<K extends keyof RessourcenFormWerte>(feld: K, wert: RessourcenFormWerte[K]) {
    setWerte((bisher) => ({ ...bisher, [feld]: wert }))
    // Nur die Meldung des geänderten Felds verschwindet; die übrigen bleiben bis zur Korrektur sichtbar.
    setFehler((bisher) => {
      if (!(feld in bisher)) return bisher
      const rest = { ...bisher }
      delete rest[feld as Textfeld]
      return rest
    })
    setServerFehler('')
  }

  /** Eigenschaften, die ein Eingabefeld mit seiner Fehlermeldung verknüpfen. */
  function feldAttribute(feld: Textfeld) {
    return {
      id: `${idPraefix}-${feld}`,
      'aria-invalid': fehler[feld] ? true : undefined,
      'aria-describedby': fehler[feld] ? `${idPraefix}-${feld}-fehler` : undefined,
    }
  }

  function fehlertext(feld: Textfeld) {
    return fehler[feld]
      ? <p id={`${idPraefix}-${feld}-fehler`} className="feldfehler">{fehler[feld]}</p>
      : null
  }

  async function sendeFormular(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formular = event.currentTarget
    // Unveränderte Regeln, die Meldungen werden nur dem jeweiligen Feld zugeordnet.
    const neueFehler: Feldfehler = {}
    if (!werte.name.trim()) neueFehler.name = 'Name ist leer.'
    if (!werte.standort.trim()) neueFehler.standort = 'Standort ist leer.'

    if (art === 'raum') {
      const kapazitaet = Number(werte.kapazitaet)
      if (!werte.kapazitaet.trim() || !Number.isInteger(kapazitaet) || kapazitaet < 0) {
        neueFehler.kapazitaet = 'Kapazität muss eine ganze Zahl von 0 oder größer sein.'
      }
    } else if (!werte.geraetetyp.trim()) {
      neueFehler.geraetetyp = 'Gerätetyp ist leer.'
    }

    setFehler(neueFehler)
    setServerFehler('')
    if (Object.keys(neueFehler).length > 0) {
      // Fokus auf das erste fehlerhafte Feld, sobald die Markierung gerendert ist.
      requestAnimationFrame(() => formular.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus())
      return
    }

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
    <section className="buchungsformular ressourcenformular" aria-label={titel}>
      <form onSubmit={sendeFormular} noValidate>
        <div className="formularraster">
          <div className="formularfeld">
            <label htmlFor={`${idPraefix}-name`}>Name</label>
            <input {...feldAttribute('name')} autoFocus maxLength={120} value={werte.name} onChange={(event) => aktualisiere('name', event.target.value)} />
            {fehlertext('name')}
          </div>

          <div className="formularfeld">
            <label htmlFor={`${idPraefix}-standort`}>Standort</label>
            <input {...feldAttribute('standort')} maxLength={120} value={werte.standort} onChange={(event) => aktualisiere('standort', event.target.value)} />
            {fehlertext('standort')}
          </div>

          {art === 'raum' ? (
            <div className="formularfeld">
              <label htmlFor={`${idPraefix}-kapazitaet`}>Kapazität</label>
              <input
                {...feldAttribute('kapazitaet')}
                type="number"
                min="0"
                step="1"
                value={werte.kapazitaet}
                onChange={(event) => aktualisiere('kapazitaet', event.target.value)}
              />
              {fehlertext('kapazitaet')}
            </div>
          ) : (
            <div className="formularfeld">
              <label htmlFor={`${idPraefix}-geraetetyp`}>Gerätetyp</label>
              <input {...feldAttribute('geraetetyp')} maxLength={120} value={werte.geraetetyp} onChange={(event) => aktualisiere('geraetetyp', event.target.value)} />
              {fehlertext('geraetetyp')}
            </div>
          )}

          <label className="ressourcen-aktivfeld">
            <input type="checkbox" checked={werte.aktiv} onChange={(event) => aktualisiere('aktiv', event.target.checked)} />
            <span>Ressource ist aktiv</span>
          </label>
        </div>

        {serverFehler && <p className="formularmeldung formularmeldung-fehler" role="alert">{serverFehler}</p>}

        <div className="formularaktionen">
          <button className="sekundaerknopf knopf-formular-abbrechen" type="button" onClick={onAbbrechen} disabled={speichert}>
            Abbrechen
          </button>
          <button className="primaerknopf" type="submit" disabled={speichert}>
            {speichert ? 'Speichert …' : 'Speichern'}
          </button>
        </div>
      </form>
    </section>
  )
}
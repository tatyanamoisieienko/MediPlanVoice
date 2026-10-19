import { useId, useState } from 'react'
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'

export type AuswahlOption = {
  wert: string
  titel: string
  beschreibung?: string
}

const anker = { to: 'bottom start', gap: 6, padding: 12 } as const

function filtere(optionen: AuswahlOption[], suche: string): AuswahlOption[] {
  const begriff = suche.trim().toLocaleLowerCase('de-DE')
  if (!begriff) return optionen
  return optionen.filter((option) =>
    `${option.titel} ${option.beschreibung ?? ''}`.toLocaleLowerCase('de-DE').includes(begriff))
}

function Pfeil() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Haken() {
  return (
    <svg className="auswahl-haken" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="m5 10.5 3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Optionen({ optionen }: { optionen: AuswahlOption[] }) {
  return (
    <ComboboxOptions anchor={anker} className="auswahl-liste">
      {optionen.length === 0 ? (
        <div className="auswahl-leer">Keine Treffer</div>
      ) : optionen.map((option) => (
        <ComboboxOption key={option.wert} value={option.wert} className="auswahl-option">
          <Haken />
          <span className="auswahl-text">
            <span className="auswahl-titel">{option.titel}</span>
            {option.beschreibung && <span className="auswahl-beschreibung">{option.beschreibung}</span>}
          </span>
        </ComboboxOption>
      ))}
    </ComboboxOptions>
  )
}

type EinzelProps = {
  bezeichnung: string
  platzhalter: string
  optionen: AuswahlOption[]
  wert: string
  beimAendern: (wert: string) => void
}

/** Durchsuchbare Einzelauswahl, standardmäßig geschlossen. */
export function EinzelAuswahl({ bezeichnung, platzhalter, optionen, wert, beimAendern }: EinzelProps) {
  const bezeichnungId = useId()
  const [suche, setSuche] = useState('')

  return (
    <div className="formularfeld">
      <span id={bezeichnungId}>{bezeichnung}</span>
      <Combobox
        value={wert}
        onChange={(neu: string | null) => {
          if ((neu ?? '') !== wert) beimAendern(neu ?? '')
        }}
        onClose={() => setSuche('')}
        immediate
      >
        <div className="auswahl-eingabe">
          <ComboboxInput
            aria-labelledby={bezeichnungId}
            placeholder={platzhalter}
            autoComplete="off"
            displayValue={(aktuell: string) => {
              const option = optionen.find((eintrag) => eintrag.wert === aktuell)
              return option ? `${option.titel}${option.beschreibung ? ` · ${option.beschreibung}` : ''}` : ''
            }}
            onChange={(event) => setSuche(event.target.value)}
          />
          <ComboboxButton className="auswahl-pfeil" aria-label={`${bezeichnung} öffnen`}>
            <Pfeil />
          </ComboboxButton>
        </div>
        <Optionen optionen={filtere(optionen, suche)} />
      </Combobox>
    </div>
  )
}

type MehrfachProps = {
  bezeichnung: string
  zusatz?: string
  platzhalter: string
  optionen: AuswahlOption[]
  werte: string[]
  beimAendern: (werte: string[]) => void
}

/** Durchsuchbare Mehrfachauswahl; ausgewählte Einträge erscheinen als entfernbare Chips. */
export function MehrfachAuswahl({ bezeichnung, zusatz, platzhalter, optionen, werte, beimAendern }: MehrfachProps) {
  const bezeichnungId = useId()
  const [suche, setSuche] = useState('')
  const ausgewaehlt = werte.map((wert) => optionen.find((option) => option.wert === wert) ?? { wert, titel: wert })

  return (
    <div className="formularfeld">
      <span id={bezeichnungId}>{bezeichnung} {zusatz && <small>{zusatz}</small>}</span>
      <Combobox
        multiple
        value={werte}
        onChange={(neu: string[]) => {
          setSuche('')
          beimAendern(neu)
        }}
        onClose={() => setSuche('')}
        immediate
      >
        <div className="auswahl-eingabe">
          <ComboboxInput
            aria-labelledby={bezeichnungId}
            placeholder={werte.length > 0 ? `${werte.length} ausgewählt – weitere suchen …` : platzhalter}
            autoComplete="off"
            value={suche}
            onChange={(event) => setSuche(event.target.value)}
          />
          <ComboboxButton className="auswahl-pfeil" aria-label={`${bezeichnung} öffnen`}>
            <Pfeil />
          </ComboboxButton>
        </div>
        <Optionen optionen={filtere(optionen, suche)} />
      </Combobox>

      {ausgewaehlt.length > 0 && (
        <ul className="chipliste" aria-label={`Ausgewählte ${bezeichnung}`}>
          {ausgewaehlt.map((option) => (
            <li key={option.wert} className="chip">
              <span>{option.titel}</span>
              <button
                type="button"
                className="chip-entfernen"
                aria-label={`${option.titel} entfernen`}
                onClick={() => beimAendern(werte.filter((wert) => wert !== option.wert))}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="m6 6 8 8M14 6l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

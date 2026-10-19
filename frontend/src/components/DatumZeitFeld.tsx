import { useId, useState } from 'react'
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { DayPicker } from 'react-day-picker'
import { de } from 'react-day-picker/locale/de'
import 'react-day-picker/style.css'

type Props = {
  bezeichnung: string
  /** Wert im bestehenden Formularformat „YYYY-MM-DDTHH:mm“ oder leer. */
  wert: string
  beimAendern: (wert: string) => void
  /** Optionaler Bezugswert (z. B. Beginn für Ende), nur um den Kalender im passenden Monat zu öffnen. */
  bezugsWert?: string
}

type Teile = { datum: Date; stunde: number; minute: number }

const minutenSchritte = [0, 15, 30, 45]
const stunden = Array.from({ length: 24 }, (_, stunde) => stunde)

const anzeigeFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })

function zerlege(wert: string | undefined): Teile | null {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wert ?? '')
  if (!treffer) return null
  const [, jahr, monat, tag, stunde, minute] = treffer.map(Number)
  return { datum: new Date(jahr, monat - 1, tag), stunde, minute }
}

function zweistellig(zahl: number): string {
  return String(zahl).padStart(2, '0')
}

function setzeZusammen(datum: Date, stunde: number, minute: number): string {
  return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}T${zweistellig(stunde)}:${zweistellig(minute)}`
}

function Kalendersymbol() {
  return (
    <svg className="datumzeit-symbol" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.5h14M7 3v3M13 3v3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Kompakte Datum- und Uhrzeitauswahl mit Kalender, Stunden-Raster und Minuten-Schritten. */
export function DatumZeitFeld({ bezeichnung, wert, beimAendern, bezugsWert }: Props) {
  const bezeichnungId = useId()
  const wertId = useId()
  const teile = zerlege(wert)
  const anzeige = teile
    ? `${anzeigeFormat.format(teile.datum)} · ${zweistellig(teile.stunde)}:${zweistellig(teile.minute)} Uhr`
    : 'Datum und Uhrzeit wählen'

  return (
    <div className="formularfeld">
      <span id={bezeichnungId}>{bezeichnung}</span>
      <Popover className="datumzeit">
        <PopoverButton
          className={`datumzeit-ausloeser${teile ? '' : ' datumzeit-ausloeser-leer'}`}
          aria-labelledby={`${bezeichnungId} ${wertId}`}
        >
          <Kalendersymbol />
          <span id={wertId}>{anzeige}</span>
        </PopoverButton>
        <PopoverPanel
          className="datumzeit-panel"
          anchor={{ to: 'bottom start', gap: 6, padding: 12 }}
          aria-label={`${bezeichnung} auswählen`}
        >
          <Auswahlpanel teile={teile} bezug={zerlege(bezugsWert)} beimAendern={beimAendern} />
        </PopoverPanel>
      </Popover>
    </div>
  )
}

/**
 * Inhalt des geöffneten Pickers. Ein unvollständiger Entwurf (nur Datum oder nur Uhrzeit) lebt nur hier
 * und wird beim Schließen verworfen; an das Formular geht ausschließlich ein vollständiger Wert.
 */
function Auswahlpanel({ teile, bezug, beimAendern }: {
  teile: Teile | null
  bezug: Teile | null
  beimAendern: (wert: string) => void
}) {
  const [entwurf, setEntwurf] = useState<{ datum?: Date; stunde?: number }>({})
  const datum = teile?.datum ?? entwurf.datum
  const stunde = teile?.stunde ?? entwurf.stunde
  const minute = teile?.minute ?? 0
  const minuten = minutenSchritte.includes(minute) ? minutenSchritte : [...minutenSchritte, minute].sort((a, b) => a - b)

  function uebernimm(neu: { datum?: Date; stunde?: number; minute?: number }) {
    const neuesDatum = neu.datum ?? datum
    const neueStunde = neu.stunde ?? stunde
    if (neuesDatum && neueStunde !== undefined) {
      beimAendern(setzeZusammen(neuesDatum, neueStunde, neu.minute ?? minute))
    } else {
      setEntwurf({ datum: neuesDatum, stunde: neueStunde })
    }
  }

  const hinweis = !datum ? 'Bitte ein Datum wählen.' : stunde === undefined ? 'Bitte eine Uhrzeit wählen.' : null

  return (
    <>
      <div className="datumzeit-inhalt">
        <DayPicker
          mode="single"
          required
          locale={de}
          weekStartsOn={1}
          showOutsideDays
          selected={datum}
          defaultMonth={datum ?? bezug?.datum ?? new Date()}
          onSelect={(tag) => tag && uebernimm({ datum: tag })}
          className="datumzeit-kalender"
        />

        <div className="datumzeit-zeit" role="group" aria-label="Uhrzeit">
          <p className="datumzeit-titel">Stunde</p>
          <div className="datumzeit-stunden">
            {stunden.map((option) => (
              <button
                key={option}
                type="button"
                className="datumzeit-option"
                aria-pressed={stunde === option}
                aria-label={`${option} Uhr`}
                onClick={() => uebernimm({ stunde: option })}
              >
                {zweistellig(option)}
              </button>
            ))}
          </div>

          <p className="datumzeit-titel">Minute</p>
          <div className="datumzeit-minuten">
            {minuten.map((option) => (
              <button
                key={option}
                type="button"
                className="datumzeit-option"
                aria-pressed={stunde !== undefined && minute === option}
                aria-label={`${option} Minuten`}
                disabled={stunde === undefined}
                onClick={() => uebernimm({ minute: option })}
              >
                :{zweistellig(option)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="datumzeit-fuss">
        <span className="datumzeit-hinweis" role="status">
          {hinweis ?? (datum && stunde !== undefined
            ? `${anzeigeFormat.format(datum)} · ${zweistellig(stunde)}:${zweistellig(minute)} Uhr`
            : '')}
        </span>
        <div className="datumzeit-aktionen">
          {teile && (
            <button type="button" className="tabellenaktion" onClick={() => { setEntwurf({}); beimAendern('') }}>
              Zurücksetzen
            </button>
          )}
          <CloseButton className="primaerknopf datumzeit-fertig">Fertig</CloseButton>
        </div>
      </div>
    </>
  )
}

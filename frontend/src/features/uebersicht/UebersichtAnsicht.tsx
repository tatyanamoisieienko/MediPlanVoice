import { useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { holeBuchungen, holeMedizingeraete } from '../../api/client'
import { useApiDaten } from '../../api/useApiDaten'
import { Datenzustand } from '../../components/Datenzustand'
import type { Buchung } from '../../types/api'
import { MonatsAnsicht } from './MonatsAnsicht'
import { Zeitraster } from './Zeitraster'
import {
  eindeutigeBuchungen,
  kalenderwoche,
  plusTage,
  tageIm,
  tagesbeginn,
  verschiebe,
  zeitraumFuer,
  type Kalenderansicht,
} from './zeitraum'

type Uebersichtsdaten = { buchungen: Buchung[]; geraetenamen: Map<number, string> }

/** Lädt alle Buchungen und die Gerätenamen für den Tooltip; Räume stehen bereits als Name in der Buchung. */
async function ladeUebersichtsdaten(signal: AbortSignal): Promise<Uebersichtsdaten> {
  const [buchungen, geraete] = await Promise.all([holeBuchungen(signal), holeMedizingeraete(signal)])
  return { buchungen: eindeutigeBuchungen(buchungen), geraetenamen: new Map(geraete.map((geraet) => [geraet.id, geraet.name])) }
}

const ansichten: { wert: Kalenderansicht; titel: string }[] = [
  { wert: 'tag', titel: 'Tag' },
  { wert: 'woche', titel: 'Woche' },
  { wert: 'monat', titel: 'Monat' },
]

const langesDatum = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const monatJahr = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const tagMonat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' })

function zeitraumBeschriftung(ansicht: Kalenderansicht, datum: Date): string {
  if (ansicht === 'tag') return langesDatum.format(datum)
  if (ansicht === 'monat') return monatJahr.format(datum)
  const { von, bis } = zeitraumFuer('woche', datum)
  const sonntag = plusTage(bis, -1)
  return `KW ${kalenderwoche(von)} · ${tagMonat.format(von)} – ${tagMonat.format(sonntag)} ${sonntag.getFullYear()}`
}

/** Umschalter im Stil eines Segmented Controls; der gewählte Eintrag ist per aria-pressed erkennbar. */
function Segmentauswahl<T extends string>({ beschriftung, optionen, wert, beimWechseln }: {
  beschriftung: string
  optionen: { wert: T; titel: string }[]
  wert: T
  beimWechseln: (wert: T) => void
}) {
  return (
    <div className="segmentauswahl" role="group" aria-label={beschriftung}>
      {optionen.map((option) => (
        <button
          key={option.wert}
          type="button"
          className="segment"
          aria-pressed={option.wert === wert}
          onClick={() => beimWechseln(option.wert)}
        >
          {option.titel}
        </button>
      ))}
    </div>
  )
}

/** Woche bzw. Monat, aus der die Tagesansicht per Klick auf einen Tag geöffnet wurde. */
type Herkunft = { ansicht: 'woche' | 'monat'; datum: Date }

export function UebersichtAnsicht() {
  const { daten, status, fehlermeldung, erneutLaden } = useApiDaten(ladeUebersichtsdaten)
  const [ansicht, setAnsicht] = useState<Kalenderansicht>('woche')
  const [datum, setDatum] = useState(() => tagesbeginn(new Date()))
  const [herkunft, setHerkunft] = useState<Herkunft | null>(null)

  function oeffneTag(tag: Date) {
    if (ansicht === 'woche' || ansicht === 'monat') setHerkunft({ ansicht, datum })
    setDatum(tagesbeginn(tag))
    setAnsicht('tag')
  }

  // Ein bewusster Wechsel über „Tag / Woche / Monat“ beendet den Rückweg.
  function wechsleAnsicht(neueAnsicht: Kalenderansicht) {
    setHerkunft(null)
    setAnsicht(neueAnsicht)
  }

  function zurueck() {
    if (!herkunft) return
    setAnsicht(herkunft.ansicht)
    setDatum(herkunft.datum)
    setHerkunft(null)
  }

  const zeigeZurueck = ansicht === 'tag' && herkunft !== null

  return (
    <section aria-labelledby="uebersicht-titel">
      <header className="ansicht-kopf">
        <div>
          <p className="ansicht-bereich">Belegung</p>
          <h1 id="uebersicht-titel">Übersicht</h1>
        </div>
      </header>

      <div className="kalender-werkzeuge">
        <div className="kalender-navigation">
          {zeigeZurueck && (
            <button type="button" className="kalender-zurueck" onClick={zurueck}>
              <ArrowLeft aria-hidden="true" />
              {herkunft.ansicht === 'woche' ? 'Zurück zur Woche' : 'Zurück zum Monat'}
            </button>
          )}
          <button type="button" className="sekundaerknopf kalender-heute" onClick={() => setDatum(tagesbeginn(new Date()))}>
            Heute
          </button>
          <button type="button" className="kalender-pfeil" aria-label="Vorheriger Zeitraum" title="Vorheriger Zeitraum" onClick={() => setDatum((d) => verschiebe(ansicht, d, -1))}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="kalender-pfeil" aria-label="Nächster Zeitraum" title="Nächster Zeitraum" onClick={() => setDatum((d) => verschiebe(ansicht, d, 1))}>
            <ChevronRight aria-hidden="true" />
          </button>
          <h2 className="kalender-zeitraum" aria-live="polite">{zeitraumBeschriftung(ansicht, datum)}</h2>
        </div>

        <Segmentauswahl beschriftung="Kalenderansicht" optionen={ansichten} wert={ansicht} beimWechseln={wechsleAnsicht} />
      </div>

      <Datenzustand
        laedt={status === 'laedt'}
        fehler={fehlermeldung}
        leer={false}
        leertext=""
        erneutLaden={erneutLaden}
      >
        {daten && (
          <div className="kalender-inhalt">
            {ansicht === 'tag' && (
              <Zeitraster tage={[datum]} buchungen={daten.buchungen} geraetenamen={daten.geraetenamen} />
            )}
            {ansicht === 'woche' && (
              <Zeitraster tage={tageIm(zeitraumFuer('woche', datum))} buchungen={daten.buchungen} geraetenamen={daten.geraetenamen} beimTagWaehlen={oeffneTag} />
            )}
            {ansicht === 'monat' && (
              <MonatsAnsicht datum={datum} buchungen={daten.buchungen} geraetenamen={daten.geraetenamen} beimTagWaehlen={oeffneTag} />
            )}
          </div>
        )}
      </Datenzustand>
    </section>
  )
}

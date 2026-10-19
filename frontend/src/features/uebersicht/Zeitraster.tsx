import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Buchung } from '../../types/api'
import { useBuchungsTooltip } from './useBuchungsTooltip'
import {
  abschnitteIm,
  buchungsbeschreibung,
  formatiereUhrzeit,
  inSpalten,
  istGleicherTag,
  minutenProTag,
  plusTage,
  rasterLage,
} from './zeitraum'

type Props = {
  /** Ein Tag (Tagesansicht) oder sieben Tage ab Montag (Wochenansicht). */
  tage: Date[]
  buchungen: Buchung[]
  geraetenamen: Map<number, string>
  /** Wenn gesetzt, öffnet ein Klick auf den Tageskopf die Tagesansicht. */
  beimTagWaehlen?: (tag: Date) => void
}

const startStunde = 8
const stunden = Array.from({ length: 25 }, (_, stunde) => stunde)
const wochentag = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const langerTag = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const prozent = (minuten: number) => `${(minuten / minutenProTag) * 100}%`

/** Vertikale Zeitleiste von 00:00 bis 24:00 mit einer Spalte je Tag – im Stil von Teams/Outlook. */
export function Zeitraster({ tage, buchungen, geraetenamen, beimTagWaehlen }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [jetzt, setJetzt] = useState(() => new Date())
  const { ausloeser, tooltip } = useBuchungsTooltip(geraetenamen)

  // Beim Öffnen auf ca. 08:00 scrollen; frühere und spätere Zeiten bleiben per Scrollen erreichbar.
  useLayoutEffect(() => {
    const element = scrollRef.current
    const koerper = element?.querySelector<HTMLElement>('.raster-koerper')
    if (!element || !koerper) return
    // Etwas Luft über der 08:00-Linie, damit ihre Beschriftung nicht unter dem fixierten Kopf liegt.
    element.scrollTop = (koerper.offsetHeight / 24) * startStunde - 12
  }, [])

  // Die Jetzt-Linie wandert minütlich mit.
  useEffect(() => {
    const takt = window.setInterval(() => setJetzt(new Date()), 60_000)
    return () => window.clearInterval(takt)
  }, [])

  return (
    <div className="zeitraster" style={{ '--tage': tage.length } as CSSProperties}>
      <div className="raster-scroll" ref={scrollRef} data-tooltip-grenze>
        <div className="raster-kopf" data-tooltip-kopf>
          <div className="raster-ecke" />
          {tage.map((tag) => {
            const istHeute = istGleicherTag(tag, jetzt)
            const inhalt = (
              <>
                <span className="raster-wochentag">{wochentag.format(tag)}</span>
                <span className="raster-tageszahl">{tag.getDate()}</span>
              </>
            )
            return (
              <div key={tag.getTime()} className={`raster-kopf-tag${istHeute ? ' ist-heute' : ''}`} aria-current={istHeute ? 'date' : undefined}>
                {beimTagWaehlen ? (
                  <button type="button" className="raster-kopf-knopf" aria-label={`${langerTag.format(tag)} – Tagesansicht öffnen`} onClick={() => beimTagWaehlen(tag)}>
                    {inhalt}
                  </button>
                ) : (
                  <div className="raster-kopf-knopf" aria-label={langerTag.format(tag)}>{inhalt}</div>
                )}
              </div>
            )
          })}
        </div>

        <div className="raster-koerper">
          <div className="raster-zeiten" aria-hidden="true">
            {stunden.map((stunde) => (
              <span key={stunde} className="raster-uhrzeit" style={{ top: prozent(stunde * 60) }}>
                {String(stunde).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {tage.map((tag) => {
            const abschnitte = inSpalten(abschnitteIm(buchungen, { von: tag, bis: plusTage(tag, 1) }))
            const istHeute = istGleicherTag(tag, jetzt)
            return (
              <div key={tag.getTime()} className={`raster-tag${istHeute ? ' ist-heute' : ''}`} role="list" aria-label={`Buchungen am ${langerTag.format(tag)}`}>
                {istHeute && (
                  <span className="raster-jetzt" style={{ top: prozent(jetzt.getHours() * 60 + jetzt.getMinutes()) }} aria-hidden="true" />
                )}
                {abschnitte.map((abschnitt) => {
                  const { buchung, spalte, spalten, spanne } = abschnitt
                  const { oben, hoehe } = rasterLage(abschnitt)
                  const beginn = new Date(buchung.beginn)
                  const ende = new Date(buchung.ende)
                  return (
                    <div
                      key={buchung.id}
                      role="listitem"
                      tabIndex={0}
                      className={`kal-block${abschnitt.beginntVorher ? ' beginnt-vorher' : ''}${abschnitt.endetDanach ? ' endet-danach' : ''}`}
                      style={{
                        top: prozent(oben),
                        height: prozent(hoehe),
                        // Rechts bleibt etwas Luft in der Tagesspalte; nebeneinanderliegende Blöcke trennt ein schmaler Spalt.
                        left: `calc((100% - 0.6rem) * ${spalte / spalten} + 2px)`,
                        width: `calc((100% - 0.6rem) * ${spanne / spalten} - 2px)`,
                      }}
                      aria-label={buchungsbeschreibung(buchung, geraetenamen)}
                      data-buchung-id={buchung.id}
                      {...ausloeser(buchung)}
                    >
                      {/* Die Beschriftung passt sich per Container Query an Höhe und Breite des Blocks an. */}
                      <span className="kal-block-inhalt" aria-hidden="true">
                        <span className="kal-block-titel">{buchung.titel}</span>
                        <span className="kal-block-zeit">{formatiereUhrzeit(beginn)}–{formatiereUhrzeit(ende)}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      {tooltip}
    </div>
  )
}

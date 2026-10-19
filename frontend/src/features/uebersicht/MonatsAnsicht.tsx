import type { Buchung } from '../../types/api'
import { useBuchungsTooltip } from './useBuchungsTooltip'
import {
  abschnitteIm,
  buchungsbeschreibung,
  formatiereUhrzeit,
  istGleicherTag,
  plusTage,
  tageIm,
  wochenbeginn,
  zeitraumFuer,
} from './zeitraum'

type Props = {
  datum: Date
  buchungen: Buchung[]
  geraetenamen: Map<number, string>
  beimTagWaehlen: (tag: Date) => void
}

const sichtbareEintraege = 3
const wochentage = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const langerTag = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** Klassischer Monatskalender: je Tag die ersten Buchungen mit Beginnzeit und Titel, der Rest als „+ weitere“. */
export function MonatsAnsicht({ datum, buchungen, geraetenamen, beimTagWaehlen }: Props) {
  const { ausloeser, tooltip } = useBuchungsTooltip(geraetenamen)
  const monat = zeitraumFuer('monat', datum)
  // Vollständige Wochen von Montag bis Sonntag, die den Monat abdecken.
  const raster = { von: wochenbeginn(monat.von), bis: plusTage(wochenbeginn(plusTage(monat.bis, -1)), 7) }
  const tage = tageIm(raster)
  const wochen = Array.from({ length: tage.length / 7 }, (_, index) => tage.slice(index * 7, index * 7 + 7))
  const heute = new Date()

  return (
    <>
      <table className="monatsansicht">
        <thead>
          <tr>
            {wochentage.map((tag) => <th key={tag} scope="col">{tag}</th>)}
          </tr>
        </thead>
        <tbody>
          {wochen.map((woche) => (
            <tr key={woche[0].getTime()}>
              {woche.map((tag) => {
                const abschnitte = abschnitteIm(buchungen, { von: tag, bis: plusTage(tag, 1) })
                const weitere = abschnitte.length - sichtbareEintraege
                const imMonat = tag >= monat.von && tag < monat.bis
                const istHeute = istGleicherTag(tag, heute)
                const istGewaehlt = istGleicherTag(tag, datum)
                const klassen = ['monat-tag', imMonat ? '' : 'ausserhalb', istHeute ? 'ist-heute' : '', istGewaehlt ? 'ist-gewaehlt' : ''].filter(Boolean).join(' ')
                return (
                  <td key={tag.getTime()} className={klassen} onClick={() => beimTagWaehlen(tag)}>
                    <button
                      type="button"
                      className="monat-zahl"
                      aria-label={`${langerTag.format(tag)}, ${abschnitte.length === 0 ? 'keine Buchungen' : `${abschnitte.length} ${abschnitte.length === 1 ? 'Buchung' : 'Buchungen'}`} – Tagesansicht öffnen`}
                      aria-current={istHeute ? 'date' : undefined}
                    >
                      {tag.getDate()}
                    </button>
                    {abschnitte.length > 0 && (
                      <ul className="monat-eintraege">
                        {abschnitte.slice(0, weitere > 0 ? sichtbareEintraege - 1 : sichtbareEintraege).map((abschnitt) => (
                          <li
                            key={abschnitt.buchung.id}
                            className="monat-eintrag"
                            tabIndex={0}
                            aria-label={buchungsbeschreibung(abschnitt.buchung, geraetenamen)}
                            data-buchung-id={abschnitt.buchung.id}
                            {...ausloeser(abschnitt.buchung)}
                          >
                            <span className="monat-eintrag-zeit" aria-hidden="true">{formatiereUhrzeit(abschnitt.von)}</span>
                            <span className="monat-eintrag-titel" aria-hidden="true">{abschnitt.buchung.titel}</span>
                          </li>
                        ))}
                        {weitere > 0 && (
                          <li>
                            <button
                              type="button"
                              className="monat-weitere"
                              aria-label={`${weitere + 1} weitere Buchungen am ${langerTag.format(tag)} – Tagesansicht öffnen`}
                              onClick={(ereignis) => { ereignis.stopPropagation(); beimTagWaehlen(tag) }}
                            >
                              + {weitere + 1} weitere
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {tooltip}
    </>
  )
}

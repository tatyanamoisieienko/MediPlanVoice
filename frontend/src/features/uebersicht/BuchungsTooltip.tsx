import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, Clock, DoorOpen, Hourglass, Stethoscope } from 'lucide-react'
import type { Buchung } from '../../types/api'
import { buchungszeit, formatiereDauer, geraetenamenVon } from './zeitraum'

/** Sichtbarer Bereich des Buchungsblocks, an dem sich der Tooltip ausrichtet. */
export type TooltipZiel = { buchung: Buchung; rechteck: { left: number; top: number; right: number; bottom: number } }

type Props = TooltipZiel & { geraetenamen: Map<number, string> }

const abstand = 8

/**
 * Kompakte Detailkarte zu einer Buchung. Sie wird per Portal gerendert, damit der scrollbare Kalender sie nicht
 * abschneidet, und nach dem Messen neben, unter oder über dem Block vollständig im Fenster platziert.
 */
export function BuchungsTooltip({ buchung, rechteck, geraetenamen }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { datum, zeit, minuten } = buchungszeit(buchung)
  const geraete = geraetenamenVon(buchung, geraetenamen)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const breite = element.offsetWidth
    const hoehe = element.offsetHeight
    const fensterBreite = document.documentElement.clientWidth
    const fensterHoehe = window.innerHeight
    const begrenze = (wert: number, max: number) => Math.min(Math.max(wert, abstand), Math.max(abstand, max - abstand))
    const obenNeben = begrenze(rechteck.top, fensterHoehe - hoehe)
    const linksMittig = begrenze((rechteck.left + rechteck.right) / 2 - breite / 2, fensterBreite - breite)

    // Reihenfolge wie in Kalender-Apps: rechts daneben, links daneben, darunter, darüber, sonst im Fenster eingepasst.
    const kandidaten = [
      { links: rechteck.right + abstand, oben: obenNeben, passt: rechteck.right + abstand + breite <= fensterBreite - abstand },
      { links: rechteck.left - abstand - breite, oben: obenNeben, passt: rechteck.left - abstand - breite >= abstand },
      { links: linksMittig, oben: rechteck.bottom + abstand, passt: rechteck.bottom + abstand + hoehe <= fensterHoehe - abstand },
      { links: linksMittig, oben: rechteck.top - abstand - hoehe, passt: rechteck.top - abstand - hoehe >= abstand },
    ]
    const wahl = kandidaten.find((k) => k.passt) ?? { links: linksMittig, oben: begrenze(rechteck.top, fensterHoehe - hoehe) }
    element.style.left = `${wahl.links}px`
    element.style.top = `${wahl.oben}px`
    element.style.visibility = 'visible'
  }, [rechteck])

  return createPortal(
    <div ref={ref} className="buchung-tooltip" style={{ left: 0, top: 0, visibility: 'hidden' }} aria-hidden="true">
      <p className="buchung-tooltip-titel">{buchung.titel}</p>
      <dl>
        <div className="buchung-tooltip-zeile">
          <dt><CalendarDays aria-hidden="true" />Datum</dt>
          <dd>{datum}</dd>
        </div>
        <div className="buchung-tooltip-zeile">
          <dt><Clock aria-hidden="true" />Uhrzeit</dt>
          <dd>{zeit}</dd>
        </div>
        <div className="buchung-tooltip-zeile">
          <dt><Hourglass aria-hidden="true" />Dauer</dt>
          <dd>{formatiereDauer(minuten)}</dd>
        </div>
        <div className="buchung-tooltip-zeile">
          <dt><DoorOpen aria-hidden="true" />Raum</dt>
          <dd className="buchung-tooltip-wert">{buchung.raumName}</dd>
        </div>
        <div className="buchung-tooltip-zeile">
          <dt><Stethoscope aria-hidden="true" />{geraete.length === 1 ? 'Medizingerät' : 'Medizingeräte'}</dt>
          <dd>
            {geraete.length === 0 ? (
              <span className="buchung-tooltip-leer">Keine</span>
            ) : (
              <ul className="buchung-tooltip-liste">
                {geraete.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </div>,
    document.body,
  )
}

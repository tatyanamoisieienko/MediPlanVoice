import { useEffect, useRef } from 'react'
import { Dialog, DialogBackdrop, DialogDescription, DialogPanel, DialogTitle } from '@headlessui/react'
import { Trash2 } from 'lucide-react'

type Props = {
  offen: boolean
  /** z. B. „Raum löschen?“ */
  ueberschrift: string
  /** Art des Eintrags mit Artikel, z. B. „den Raum“ */
  bezeichnung: string
  /** Name bzw. Titel des zu löschenden Eintrags */
  name: string
  loescht: boolean
  fehler: string
  beimAbbrechen: () => void
  beimBestaetigen: () => void
}

/**
 * Einheitliche Löschbestätigung für Buchungen, Räume und Medizingeräte.
 * Fokus bleibt im Dialog und kehrt nach dem Schließen zum auslösenden Button zurück.
 * Während des Löschens lässt sich der Dialog weder bestätigen noch schließen.
 */
export function LoeschDialog({ offen, ueberschrift, bezeichnung, name, loescht, fehler, beimAbbrechen, beimBestaetigen }: Props) {
  // Sofort wirksame Sperre: verhindert eine zweite Anfrage, bevor „loescht“ nach dem nächsten Render greift.
  const bestaetigt = useRef(false)

  useEffect(() => {
    if (!loescht) bestaetigt.current = false
  }, [loescht, offen])

  function bestaetige() {
    if (loescht || bestaetigt.current) return
    bestaetigt.current = true
    beimBestaetigen()
  }

  return (
    <Dialog open={offen} onClose={() => { if (!loescht) beimAbbrechen() }} className="dialog">
      <DialogBackdrop className="dialog-hintergrund" />
      <div className="dialog-rahmen">
        <DialogPanel className="dialog-panel loeschdialog">
          <div className="loeschdialog-symbol" aria-hidden="true">
            <Trash2 />
          </div>
          <DialogTitle className="dialog-titel">{ueberschrift}</DialogTitle>
          <DialogDescription className="dialog-text">
            Möchten Sie {bezeichnung} „{name}“ wirklich löschen?
          </DialogDescription>

          {fehler && <p className="formularmeldung formularmeldung-fehler loeschdialog-fehler" role="alert">{fehler}</p>}

          <div className="loeschdialog-aktionen">
            <button className="sekundaerknopf knopf-abbrechen" type="button" autoFocus disabled={loescht} onClick={beimAbbrechen}>
              Abbrechen
            </button>
            <button className="primaerknopf knopf-endgueltig-loeschen" type="button" disabled={loescht} onClick={bestaetige}>
              {loescht ? 'Löscht …' : 'Endgültig löschen'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

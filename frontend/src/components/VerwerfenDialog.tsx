import { Dialog, DialogBackdrop, DialogDescription, DialogPanel, DialogTitle } from '@headlessui/react'

type Props = {
  offen: boolean
  titel: string
  text: string
  beimWeiterBearbeiten: () => void
  beimVerwerfen: () => void
}

/** Rückfrage vor dem Verlassen eines Formulars mit ungespeicherten Eingaben. Escape bedeutet „Weiter bearbeiten“. */
export function VerwerfenDialog({ offen, titel, text, beimWeiterBearbeiten, beimVerwerfen }: Props) {
  return (
    <Dialog open={offen} onClose={beimWeiterBearbeiten} className="dialog">
      <DialogBackdrop className="dialog-hintergrund" />
      <div className="dialog-rahmen">
        <DialogPanel className="dialog-panel">
          <DialogTitle className="dialog-titel">{titel}</DialogTitle>
          <DialogDescription className="dialog-text">{text}</DialogDescription>
          <div className="dialog-aktionen">
            <button className="sekundaerknopf" type="button" autoFocus onClick={beimWeiterBearbeiten}>
              Weiter bearbeiten
            </button>
            <button className="primaerknopf knopf-verwerfen" type="button" onClick={beimVerwerfen}>
              Verwerfen und zurück
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

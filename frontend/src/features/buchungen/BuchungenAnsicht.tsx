import { useState } from 'react'
import { holeBuchungen, holeMedizingeraete, loescheBuchung as loescheBuchungApi } from '../../api/client'
import { useApiDaten } from '../../api/useApiDaten'
import type { Buchung } from '../../types/api'
import { Datenzustand } from '../../components/Datenzustand'
import { NeueBuchungFormular } from './NeueBuchungFormular'

type Buchungsdaten = {
  buchungen: Buchung[]
  geraetenamen: Map<number, string>
}

type FormularModus =
  | { art: 'neu' }
  | { art: 'bearbeiten'; buchung: Buchung }

async function ladeBuchungsdaten(signal: AbortSignal): Promise<Buchungsdaten> {
  const [buchungen, geraete] = await Promise.all([
    holeBuchungen(signal),
    holeMedizingeraete(signal),
  ])

  return {
    buchungen,
    geraetenamen: new Map(geraete.map((geraet) => [geraet.id, geraet.name])),
  }
}

const deutscherZeitpunkt = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatiereZeitpunkt(zeitpunkt: string): string {
  return deutscherZeitpunkt.format(new Date(zeitpunkt))
}

export function BuchungenAnsicht() {
  const { daten, status, fehlermeldung, erneutLaden } = useApiDaten(ladeBuchungsdaten)
  const [formularModus, setFormularModus] = useState<FormularModus | null>(null)
  const [erfolgsmeldung, setErfolgsmeldung] = useState('')
  const [aktionsFehler, setAktionsFehler] = useState('')
  const [loeschbestaetigungId, setLoeschbestaetigungId] = useState<number | null>(null)
  const [loeschtBuchungId, setLoeschtBuchungId] = useState<number | null>(null)
  const buchungen = daten?.buchungen ?? []
  const formularGeoeffnet = formularModus !== null

  async function bestaetigeLoeschen(buchung: Buchung) {
    setLoeschtBuchungId(buchung.id)
    setAktionsFehler('')
    setErfolgsmeldung('')
    try {
      await loescheBuchungApi(buchung.id)
      setLoeschbestaetigungId(null)
      setErfolgsmeldung(`„${buchung.titel}“ wurde gelöscht.`)
      erneutLaden()
    } catch (fehler) {
      setAktionsFehler(fehler instanceof Error ? fehler.message : 'Buchung konnte nicht gelöscht werden.')
    } finally {
      setLoeschtBuchungId(null)
    }
  }

  return (
    <section aria-labelledby="buchungen-titel">
      <header className="ansicht-kopf">
        <div>
          <p className="ansicht-bereich">Belegung</p>
          <h1 id="buchungen-titel">Buchungen</h1>
        </div>
        <div className="ansicht-aktionen">
          {status === 'bereit' && <span className="eintragszahl">{buchungen.length} Einträge</span>}
          {!formularGeoeffnet && (
            <button
              className="primaerknopf"
              type="button"
              onClick={() => {
                setErfolgsmeldung('')
                setAktionsFehler('')
                setLoeschbestaetigungId(null)
                setFormularModus({ art: 'neu' })
              }}
            >
              Neue Buchung
            </button>
          )}
        </div>
      </header>

      {erfolgsmeldung && <p className="erfolgsmeldung" role="status">{erfolgsmeldung}</p>}
      {aktionsFehler && <p className="formularmeldung formularmeldung-fehler" role="alert">{aktionsFehler}</p>}
      {formularModus && (
        <NeueBuchungFormular
          key={formularModus.art === 'bearbeiten' ? `bearbeiten-${formularModus.buchung.id}` : 'neu'}
          buchungZumBearbeiten={formularModus.art === 'bearbeiten' ? formularModus.buchung : undefined}
          beimSchliessen={() => setFormularModus(null)}
          beimSpeichern={(buchung) => {
            const wurdeBearbeitet = formularModus.art === 'bearbeiten'
            setFormularModus(null)
            setErfolgsmeldung(wurdeBearbeitet
              ? `„${buchung.titel}“ wurde aktualisiert.`
              : `„${buchung.titel}“ wurde erfolgreich angelegt.`)
            erneutLaden()
          }}
        />
      )}

      <Datenzustand
        laedt={status === 'laedt'}
        fehler={fehlermeldung}
        leer={status === 'bereit' && buchungen.length === 0}
        leertext="Keine Buchungen vorhanden."
        erneutLaden={erneutLaden}
      >
        <div className="tabellenrahmen">
          <table className="datentabelle">
            <thead>
              <tr>
                <th scope="col">Titel / Zweck</th>
                <th scope="col">Beginn – Ende</th>
                <th scope="col">Raum</th>
                <th scope="col">Medizingeräte</th>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {buchungen.map((buchung) => (
                <tr key={buchung.id}>
                  <td className="hauptwert">{buchung.titel}</td>
                  <td>
                    <time dateTime={buchung.beginn}>{formatiereZeitpunkt(buchung.beginn)}</time>
                    <span className="unterwert">
                      bis <time dateTime={buchung.ende}>{formatiereZeitpunkt(buchung.ende)}</time>
                    </span>
                  </td>
                  <td>{buchung.raumName}</td>
                  <td>
                    {buchung.medizingeraetIds.length > 0 ? (
                      <div className="geraeteliste">
                        {buchung.medizingeraetIds.map((id) => (
                          <span key={id}>{daten?.geraetenamen.get(id) ?? `Gerät ${id}`}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="unterwert">Keine Geräte</span>
                    )}
                  </td>
                  <td>
                    <div className="buchungsaktionen">
                      <button
                        className="tabellenaktion"
                        type="button"
                        onClick={() => {
                          setErfolgsmeldung('')
                          setAktionsFehler('')
                          setLoeschbestaetigungId(null)
                          setFormularModus({ art: 'bearbeiten', buchung })
                        }}
                      >
                        Bearbeiten
                      </button>
                      <button
                        className="tabellenaktion tabellenaktion-loeschen"
                        type="button"
                        onClick={() => {
                          setErfolgsmeldung('')
                          setAktionsFehler('')
                          setLoeschbestaetigungId(buchung.id)
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                    {loeschbestaetigungId === buchung.id && (
                      <div className="loeschbestaetigung" role="group" aria-label={`Löschen von ${buchung.titel} bestätigen`}>
                        <span>„{buchung.titel}“ wirklich löschen?</span>
                        <button
                          className="sekundaerknopf loeschbestaetigung-knopf"
                          type="button"
                          disabled={loeschtBuchungId === buchung.id}
                          onClick={() => void bestaetigeLoeschen(buchung)}
                        >
                          {loeschtBuchungId === buchung.id ? 'Löscht …' : 'Endgültig löschen'}
                        </button>
                        <button
                          className="tabellenaktion"
                          type="button"
                          disabled={loeschtBuchungId === buchung.id}
                          onClick={() => setLoeschbestaetigungId(null)}
                        >
                          Abbrechen
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Datenzustand>
    </section>
  )
}
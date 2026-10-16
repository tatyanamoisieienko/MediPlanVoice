import { useState } from 'react'
import { aendereRaum, holeRaeume, legeRaumAn, loescheRaum } from '../../api/client'
import { useApiDaten } from '../../api/useApiDaten'
import { Datenzustand } from '../../components/Datenzustand'
import { RessourcenFormular, type RessourcenFormWerte } from '../../components/RessourcenFormular'
import type { Raum } from '../../types/api'

type FormularModus = { art: 'neu' } | { art: 'bearbeiten'; raum: Raum }

export function RaeumeAnsicht() {
  const { daten: raeume, status, fehlermeldung, erneutLaden } = useApiDaten(holeRaeume)
  const [formularModus, setFormularModus] = useState<FormularModus | null>(null)
  const [erfolgsmeldung, setErfolgsmeldung] = useState('')
  const [aktionsFehler, setAktionsFehler] = useState('')
  const [loeschbestaetigungId, setLoeschbestaetigungId] = useState<number | null>(null)
  const [loeschtRaumId, setLoeschtRaumId] = useState<number | null>(null)
  const eintraege = raeume ?? []

  async function speichereRaum(werte: RessourcenFormWerte) {
    const anfrage = {
      name: werte.name,
      standort: werte.standort,
      kapazitaet: Number(werte.kapazitaet),
      aktiv: werte.aktiv,
    }
    const raum = formularModus?.art === 'bearbeiten'
      ? await aendereRaum(formularModus.raum.id, anfrage)
      : await legeRaumAn(anfrage)

    setFormularModus(null)
    setErfolgsmeldung(`Raum „${raum.name}“ wurde ${formularModus?.art === 'bearbeiten' ? 'aktualisiert' : 'angelegt'}.`)
    setAktionsFehler('')
    erneutLaden()
  }

  async function bestaetigeLoeschen(raum: Raum) {
    setLoeschtRaumId(raum.id)
    setAktionsFehler('')
    setErfolgsmeldung('')
    try {
      await loescheRaum(raum.id)
      setLoeschbestaetigungId(null)
      setErfolgsmeldung(`Raum „${raum.name}“ wurde gelöscht.`)
      erneutLaden()
    } catch (fehler) {
      setAktionsFehler(fehler instanceof Error ? fehler.message : 'Raum konnte nicht gelöscht werden.')
    } finally {
      setLoeschtRaumId(null)
    }
  }

  return (
    <section aria-labelledby="raeume-titel">
      <header className="ansicht-kopf">
        <div>
          <p className="ansicht-bereich">Ressourcen</p>
          <h1 id="raeume-titel">Räume</h1>
        </div>
        <div className="ansicht-aktionen">
          {status === 'bereit' && <span className="eintragszahl">{eintraege.length} Einträge</span>}
          {!formularModus && (
            <button className="primaerknopf" type="button" onClick={() => {
              setErfolgsmeldung('')
              setAktionsFehler('')
              setLoeschbestaetigungId(null)
              setFormularModus({ art: 'neu' })
            }}>
              Neuer Raum
            </button>
          )}
        </div>
      </header>

      {erfolgsmeldung && <p className="erfolgsmeldung" role="status">{erfolgsmeldung}</p>}
      {aktionsFehler && <p className="formularmeldung formularmeldung-fehler" role="alert">{aktionsFehler}</p>}
      {formularModus && (
        <RessourcenFormular
          key={formularModus.art === 'bearbeiten' ? `raum-${formularModus.raum.id}` : 'raum-neu'}
          titel={formularModus.art === 'bearbeiten' ? 'Raum bearbeiten' : 'Neuen Raum anlegen'}
          art="raum"
          initialWerte={formularModus.art === 'bearbeiten' ? {
            name: formularModus.raum.name,
            standort: formularModus.raum.standort,
            kapazitaet: String(formularModus.raum.kapazitaet),
            geraetetyp: '',
            aktiv: formularModus.raum.aktiv,
          } : undefined}
          onAbbrechen={() => setFormularModus(null)}
          onSpeichern={speichereRaum}
        />
      )}

      <Datenzustand
        laedt={status === 'laedt'}
        fehler={fehlermeldung}
        leer={status === 'bereit' && eintraege.length === 0}
        leertext="Keine Räume vorhanden."
        erneutLaden={erneutLaden}
      >
        <div className="tabellenrahmen">
          <table className="datentabelle">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Standort</th>
                <th scope="col">Kapazität</th>
                <th scope="col">Status</th>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {eintraege.map((raum) => (
                <tr key={raum.id}>
                  <td className="hauptwert">{raum.name}</td>
                  <td>{raum.standort}</td>
                  <td>{raum.kapazitaet}</td>
                  <td>
                    <span className={`aktivstatus${raum.aktiv ? '' : ' inaktiv'}`}>
                      {raum.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td>
                    <div className="buchungsaktionen">
                      <button className="tabellenaktion" type="button" onClick={() => {
                        setErfolgsmeldung('')
                        setAktionsFehler('')
                        setLoeschbestaetigungId(null)
                        setFormularModus({ art: 'bearbeiten', raum })
                      }}>Bearbeiten</button>
                      <button className="tabellenaktion tabellenaktion-loeschen" type="button" onClick={() => {
                        setErfolgsmeldung('')
                        setAktionsFehler('')
                        setLoeschbestaetigungId(raum.id)
                      }}>Löschen</button>
                    </div>
                    {loeschbestaetigungId === raum.id && (
                      <div className="loeschbestaetigung" role="group" aria-label={`Löschen von ${raum.name} bestätigen`}>
                        <span>„{raum.name}“ wirklich löschen?</span>
                        <button className="sekundaerknopf loeschbestaetigung-knopf" type="button" disabled={loeschtRaumId === raum.id} onClick={() => void bestaetigeLoeschen(raum)}>
                          {loeschtRaumId === raum.id ? 'Löscht …' : 'Endgültig löschen'}
                        </button>
                        <button className="tabellenaktion" type="button" disabled={loeschtRaumId === raum.id} onClick={() => setLoeschbestaetigungId(null)}>Abbrechen</button>
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
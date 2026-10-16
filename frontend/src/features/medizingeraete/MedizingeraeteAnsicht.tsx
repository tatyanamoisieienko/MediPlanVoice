import { useState } from 'react'
import { aendereMedizingeraet, holeMedizingeraete, legeMedizingeraetAn, loescheMedizingeraet } from '../../api/client'
import { useApiDaten } from '../../api/useApiDaten'
import { Datenzustand } from '../../components/Datenzustand'
import { RessourcenFormular, type RessourcenFormWerte } from '../../components/RessourcenFormular'
import type { Medizingeraet } from '../../types/api'

type FormularModus = { art: 'neu' } | { art: 'bearbeiten'; geraet: Medizingeraet }

export function MedizingeraeteAnsicht() {
  const { daten: geraete, status, fehlermeldung, erneutLaden } = useApiDaten(holeMedizingeraete)
  const [formularModus, setFormularModus] = useState<FormularModus | null>(null)
  const [erfolgsmeldung, setErfolgsmeldung] = useState('')
  const [aktionsFehler, setAktionsFehler] = useState('')
  const [loeschbestaetigungId, setLoeschbestaetigungId] = useState<number | null>(null)
  const [loeschtGeraetId, setLoeschtGeraetId] = useState<number | null>(null)
  const eintraege = geraete ?? []

  async function speichereGeraet(werte: RessourcenFormWerte) {
    const anfrage = {
      name: werte.name,
      standort: werte.standort,
      geraetetyp: werte.geraetetyp,
      aktiv: werte.aktiv,
    }
    const geraet = formularModus?.art === 'bearbeiten'
      ? await aendereMedizingeraet(formularModus.geraet.id, anfrage)
      : await legeMedizingeraetAn(anfrage)

    setFormularModus(null)
    setErfolgsmeldung(`Medizingerät „${geraet.name}“ wurde ${formularModus?.art === 'bearbeiten' ? 'aktualisiert' : 'angelegt'}.`)
    setAktionsFehler('')
    erneutLaden()
  }

  async function bestaetigeLoeschen(geraet: Medizingeraet) {
    setLoeschtGeraetId(geraet.id)
    setAktionsFehler('')
    setErfolgsmeldung('')
    try {
      await loescheMedizingeraet(geraet.id)
      setLoeschbestaetigungId(null)
      setErfolgsmeldung(`Medizingerät „${geraet.name}“ wurde gelöscht.`)
      erneutLaden()
    } catch (fehler) {
      setAktionsFehler(fehler instanceof Error ? fehler.message : 'Medizingerät konnte nicht gelöscht werden.')
    } finally {
      setLoeschtGeraetId(null)
    }
  }

  return (
    <section aria-labelledby="geraete-titel">
      <header className="ansicht-kopf">
        <div>
          <p className="ansicht-bereich">Ressourcen</p>
          <h1 id="geraete-titel">Medizingeräte</h1>
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
              Neues Medizingerät
            </button>
          )}
        </div>
      </header>

      {erfolgsmeldung && <p className="erfolgsmeldung" role="status">{erfolgsmeldung}</p>}
      {aktionsFehler && <p className="formularmeldung formularmeldung-fehler" role="alert">{aktionsFehler}</p>}
      {formularModus && (
        <RessourcenFormular
          key={formularModus.art === 'bearbeiten' ? `geraet-${formularModus.geraet.id}` : 'geraet-neu'}
          titel={formularModus.art === 'bearbeiten' ? 'Medizingerät bearbeiten' : 'Neues Medizingerät anlegen'}
          art="medizingeraet"
          initialWerte={formularModus.art === 'bearbeiten' ? {
            name: formularModus.geraet.name,
            standort: formularModus.geraet.standort,
            kapazitaet: '0',
            geraetetyp: formularModus.geraet.geraetetyp,
            aktiv: formularModus.geraet.aktiv,
          } : undefined}
          onAbbrechen={() => setFormularModus(null)}
          onSpeichern={speichereGeraet}
        />
      )}

      <Datenzustand
        laedt={status === 'laedt'}
        fehler={fehlermeldung}
        leer={status === 'bereit' && eintraege.length === 0}
        leertext="Keine Medizingeräte vorhanden."
        erneutLaden={erneutLaden}
      >
        <div className="tabellenrahmen">
          <table className="datentabelle">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Gerätetyp</th>
                <th scope="col">Standort</th>
                <th scope="col">Status</th>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {eintraege.map((geraet) => (
                <tr key={geraet.id}>
                  <td className="hauptwert">{geraet.name}</td>
                  <td>{geraet.geraetetyp}</td>
                  <td>{geraet.standort}</td>
                  <td>
                    <span className={`aktivstatus${geraet.aktiv ? '' : ' inaktiv'}`}>
                      {geraet.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td>
                    <div className="buchungsaktionen">
                      <button className="tabellenaktion" type="button" onClick={() => {
                        setErfolgsmeldung('')
                        setAktionsFehler('')
                        setLoeschbestaetigungId(null)
                        setFormularModus({ art: 'bearbeiten', geraet })
                      }}>Bearbeiten</button>
                      <button className="tabellenaktion tabellenaktion-loeschen" type="button" onClick={() => {
                        setErfolgsmeldung('')
                        setAktionsFehler('')
                        setLoeschbestaetigungId(geraet.id)
                      }}>Löschen</button>
                    </div>
                    {loeschbestaetigungId === geraet.id && (
                      <div className="loeschbestaetigung" role="group" aria-label={`Löschen von ${geraet.name} bestätigen`}>
                        <span>„{geraet.name}“ wirklich löschen?</span>
                        <button className="sekundaerknopf loeschbestaetigung-knopf" type="button" disabled={loeschtGeraetId === geraet.id} onClick={() => void bestaetigeLoeschen(geraet)}>
                          {loeschtGeraetId === geraet.id ? 'Löscht …' : 'Endgültig löschen'}
                        </button>
                        <button className="tabellenaktion" type="button" disabled={loeschtGeraetId === geraet.id} onClick={() => setLoeschbestaetigungId(null)}>Abbrechen</button>
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
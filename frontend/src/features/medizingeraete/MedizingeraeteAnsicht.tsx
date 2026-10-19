import { useState } from 'react'
import { Activity, Gauge, HeartPulse, Scan, Stethoscope, Wind, type LucideIcon } from 'lucide-react'
import { aendereMedizingeraet, holeMedizingeraete, legeMedizingeraetAn, loescheMedizingeraet } from '../../api/client'
import { useApiDaten } from '../../api/useApiDaten'
import { Datenzustand } from '../../components/Datenzustand'
import { RessourcenFormular, type RessourcenFormWerte } from '../../components/RessourcenFormular'
import { LoeschDialog } from '../../components/LoeschDialog'
import { KeineTreffer, Sortierkopf, Suchleiste } from '../../components/Tabellenwerkzeuge'
import { useTabellenansicht } from '../../components/useTabellenansicht'
import { VerwerfenDialog } from '../../components/VerwerfenDialog'
import type { Medizingeraet } from '../../types/api'

/** Icon je Gerätetyp; nicht zugeordnete Typen erhalten das neutrale Stethoskop. */
const symbolNachGeraetetyp: Record<string, LucideIcon> = {
  notfallmedizin: HeartPulse,
  'überwachung': Activity,
  ueberwachung: Activity,
  beatmung: Wind,
  diagnostik: Scan,
  'messgerät': Gauge,
  messgeraet: Gauge,
}

function symbolFuer(geraetetyp: string): LucideIcon {
  return symbolNachGeraetetyp[geraetetyp.trim().toLocaleLowerCase('de-DE')] ?? Stethoscope
}

type FormularModus = { art: 'neu' } | { art: 'bearbeiten'; geraet: Medizingeraet }

export function MedizingeraeteAnsicht() {
  const { daten: geraete, status, fehlermeldung, erneutLaden } = useApiDaten(holeMedizingeraete)
  const [formularModus, setFormularModus] = useState<FormularModus | null>(null)
  const [erfolgsmeldung, setErfolgsmeldung] = useState('')
  const [loeschFehler, setLoeschFehler] = useState('')
  const [loeschbestaetigungId, setLoeschbestaetigungId] = useState<number | null>(null)
  const [loeschtGeraetId, setLoeschtGeraetId] = useState<number | null>(null)
  const [hatAenderungen, setHatAenderungen] = useState(false)
  const [verlassenBestaetigen, setVerlassenBestaetigen] = useState(false)
  const eintraege = geraete ?? []
  const zuLoeschen = eintraege.find((geraet) => geraet.id === loeschbestaetigungId) ?? null
  const tabelle = useTabellenansicht(eintraege, {
    suchtext: (geraet) => `${geraet.name} ${geraet.geraetetyp} ${geraet.standort} ${geraet.aktiv ? 'Aktiv' : 'Inaktiv'}`,
    sortierwerte: {
      name: (geraet) => geraet.name,
      geraetetyp: (geraet) => geraet.geraetetyp,
      standort: (geraet) => geraet.standort,
      status: (geraet) => (geraet.aktiv ? 'Aktiv' : 'Inaktiv'),
    },
  })

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

    kehreZurListeZurueck()
    setErfolgsmeldung(`Medizingerät „${geraet.name}“ wurde ${formularModus?.art === 'bearbeiten' ? 'aktualisiert' : 'angelegt'}.`)
    erneutLaden()
  }

  function oeffneFormular(modus: FormularModus) {
    setErfolgsmeldung('')
    setLoeschbestaetigungId(null)
    setHatAenderungen(false)
    setFormularModus(modus)
    window.scrollTo({ top: 0 })
  }

  function kehreZurListeZurueck() {
    setVerlassenBestaetigen(false)
    setHatAenderungen(false)
    setFormularModus(null)
    window.scrollTo({ top: 0 })
  }

  function verlasseFormular() {
    if (hatAenderungen) {
      setVerlassenBestaetigen(true)
      return
    }
    kehreZurListeZurueck()
  }

  async function bestaetigeLoeschen(geraet: Medizingeraet) {
    setLoeschtGeraetId(geraet.id)
    setLoeschFehler('')
    setErfolgsmeldung('')
    try {
      await loescheMedizingeraet(geraet.id)
      setLoeschbestaetigungId(null)
      setErfolgsmeldung(`Medizingerät „${geraet.name}“ wurde gelöscht.`)
      erneutLaden()
    } catch (fehler) {
      // Der Dialog bleibt offen und zeigt den Fehler an.
      setLoeschFehler(fehler instanceof Error ? fehler.message : 'Medizingerät konnte nicht gelöscht werden.')
    } finally {
      setLoeschtGeraetId(null)
    }
  }

  // Eigener Arbeitsbereich für Anlegen und Bearbeiten: Liste, Suche und Sortierung sind ausgeblendet,
  // ihr Zustand bleibt in dieser Komponente erhalten.
  if (formularModus) {
    const titel = formularModus.art === 'bearbeiten' ? 'Medizingerät bearbeiten' : 'Neues Medizingerät anlegen'
    return (
      <section aria-labelledby="geraet-formular-titel">
        <header className="ansicht-kopf">
          <div>
            <p className="ansicht-bereich">Ressourcen</p>
            <h1 id="geraet-formular-titel">{titel}</h1>
          </div>
          <div className="ansicht-aktionen">
            <button className="sekundaerknopf knopf-zurueck" type="button" onClick={verlasseFormular}>
              <span aria-hidden="true">←</span> Zurück zu Medizingeräten
            </button>
          </div>
        </header>

        <RessourcenFormular
          key={formularModus.art === 'bearbeiten' ? `geraet-${formularModus.geraet.id}` : 'geraet-neu'}
          titel={titel}
          art="medizingeraet"
          initialWerte={formularModus.art === 'bearbeiten' ? {
            name: formularModus.geraet.name,
            standort: formularModus.geraet.standort,
            kapazitaet: '0',
            geraetetyp: formularModus.geraet.geraetetyp,
            aktiv: formularModus.geraet.aktiv,
          } : undefined}
          onAbbrechen={verlasseFormular}
          onSpeichern={speichereGeraet}
          beimEingabestatus={setHatAenderungen}
        />

        <VerwerfenDialog
          offen={verlassenBestaetigen}
          titel="Änderungen verwerfen?"
          text="Ihre Eingaben wurden noch nicht gespeichert. Wenn Sie zur Geräteliste zurückkehren, gehen sie verloren."
          beimWeiterBearbeiten={() => setVerlassenBestaetigen(false)}
          beimVerwerfen={kehreZurListeZurueck}
        />
      </section>
    )
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
          <button className="primaerknopf" type="button" onClick={() => oeffneFormular({ art: 'neu' })}>
            Neues Medizingerät
          </button>
        </div>
      </header>

      {erfolgsmeldung && <p className="erfolgsmeldung" role="status">{erfolgsmeldung}</p>}

      <Datenzustand
        laedt={status === 'laedt'}
        fehler={fehlermeldung}
        leer={status === 'bereit' && eintraege.length === 0}
        leertext="Keine Medizingeräte vorhanden."
        erneutLaden={erneutLaden}
      >
        <Suchleiste
          wert={tabelle.suche}
          beimAendern={tabelle.setSuche}
          beschriftung="Medizingeräte durchsuchen"
          platzhalter="Medizingeräte durchsuchen …"
          anzahlSichtbar={tabelle.eintraege.length}
          anzahlGesamt={tabelle.anzahlGesamt}
        />
        {tabelle.eintraege.length === 0 ? (
          <KeineTreffer beimZuruecksetzen={() => tabelle.setSuche('')} />
        ) : (
        <div className="tabellenrahmen">
          <table className="datentabelle">
            <thead>
              <tr>
                <Sortierkopf spalte="name" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Name</Sortierkopf>
                <Sortierkopf spalte="geraetetyp" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Gerätetyp</Sortierkopf>
                <Sortierkopf spalte="standort" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Standort</Sortierkopf>
                <Sortierkopf spalte="status" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Status</Sortierkopf>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {tabelle.eintraege.map((geraet) => {
                const Symbol = symbolFuer(geraet.geraetetyp)
                return (
                <tr key={geraet.id}>
                  <td className="hauptwert">
                    <span className="geraetename">
                      <Symbol className="geraetesymbol" aria-hidden="true" />
                      {geraet.name}
                    </span>
                  </td>
                  <td>{geraet.geraetetyp}</td>
                  <td>{geraet.standort}</td>
                  <td>
                    <span className={`aktivstatus${geraet.aktiv ? '' : ' inaktiv'}`}>
                      {geraet.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td>
                    <div className="buchungsaktionen">
                      <button className="tabellenaktion" type="button" onClick={() => oeffneFormular({ art: 'bearbeiten', geraet })}>Bearbeiten</button>
                      <button className="tabellenaktion tabellenaktion-loeschen" type="button" onClick={() => {
                        setErfolgsmeldung('')
                        setLoeschFehler('')
                        setLoeschbestaetigungId(geraet.id)
                      }}>Löschen</button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
      </Datenzustand>

      <LoeschDialog
        offen={zuLoeschen !== null}
        ueberschrift="Medizingerät löschen?"
        bezeichnung="das Medizingerät"
        name={zuLoeschen?.name ?? ''}
        loescht={zuLoeschen !== null && loeschtGeraetId === zuLoeschen.id}
        fehler={loeschFehler}
        beimAbbrechen={() => setLoeschbestaetigungId(null)}
        beimBestaetigen={() => { if (zuLoeschen) void bestaetigeLoeschen(zuLoeschen) }}
      />
    </section>
  )
}
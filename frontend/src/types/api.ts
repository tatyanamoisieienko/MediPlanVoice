export type Raum = {
  id: number
  name: string
  standort: string
  kapazitaet: number
  aktiv: boolean
}

export type Medizingeraet = {
  id: number
  name: string
  geraetetyp: string
  standort: string
  aktiv: boolean
}

export type RaumSchreibAnfrage = Pick<Raum, 'name' | 'standort' | 'kapazitaet' | 'aktiv'>

export type MedizingeraetSchreibAnfrage = Pick<Medizingeraet, 'name' | 'geraetetyp' | 'standort' | 'aktiv'>

export type Buchung = {
  id: number
  titel: string
  beginn: string
  ende: string
  raumId: number
  raumName: string
  medizingeraetIds: number[]
}

export type BuchungAnlegenAnfrage = {
  titel: string
  beginn: string
  ende: string
  raumId: number
  medizingeraetIds: number[]
}

export type BuchungAendernAnfrage = BuchungAnlegenAnfrage

export type VerfuegbarkeitPruefenAnfrage = Omit<BuchungAnlegenAnfrage, 'titel'> & {
  auszuschliessendeBuchungId?: number
}

export type Buchungskonflikt = {
  ressourceTyp: string
  ressourceId: number
  ressourcenName: string
  buchungId: number
  buchungstitel: string
  beginn: string
  ende: string
}

export type VerfuegbarkeitsErgebnis = {
  anfrageGueltig: boolean
  verfuegbar: boolean
  fehler: string[]
  konflikte: Buchungskonflikt[]
}

export type AlternativenAnfrage = {
  beginn: string
  ende: string
  raumId?: number
  medizingeraetId?: number
}

export type AlternativVorschlag = {
  ressourceTyp: string
  id: number
  name: string
  standort: string
  geraetetyp: string | null
  gruende: string[]
}

export type AlternativenErgebnis = {
  anfrageGueltig: boolean
  alternativenGefunden: boolean
  vorschlaege: AlternativVorschlag[]
  fehler: string[]
  hinweis: string | null
}
export type TexteingabeInterpretierenAnfrage = {
  text: string
}

export type BuchungsEntwurfRessource = {
  id: number
  name: string
}

export type BuchungsEntwurf = {
  titelOderZweck: string | null
  datum: string | null
  beginn: string | null
  ende: string | null
  dauerMinuten: number | null
  raum: BuchungsEntwurfRessource | null
  medizingeraete: BuchungsEntwurfRessource[]
  fehlendeAngaben: string[]
  unsichereAngaben: string[]
}

export type TranskriptionErgebnis = {
  text: string
}

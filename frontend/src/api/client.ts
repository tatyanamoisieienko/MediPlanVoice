import type {
  AlternativenAnfrage,
  AlternativenErgebnis,
  BuchungAendernAnfrage,
  Buchung,
  BuchungAnlegenAnfrage,
  BuchungsEntwurf,
  Medizingeraet,
  MedizingeraetSchreibAnfrage,
  Raum,
  RaumSchreibAnfrage,
  TexteingabeInterpretierenAnfrage,
  TranskriptionErgebnis,
  VerfuegbarkeitsErgebnis,
  VerfuegbarkeitPruefenAnfrage,
} from '../types/api'

const apiBasisadresse = import.meta.env.VITE_API_BASE_URL || '/api'

async function holeDaten<T>(pfad: string, signal: AbortSignal): Promise<T> {
  const antwort = await fetch(`${apiBasisadresse}${pfad}`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!antwort.ok) {
    throw new Error(`Die API-Anfrage ist fehlgeschlagen (HTTP ${antwort.status}).`)
  }

  return antwort.json() as Promise<T>
}

export class ApiFehler extends Error {
  readonly status: number
  readonly daten: unknown

  constructor(status: number, daten: unknown) {
    super(`Die API-Anfrage ist fehlgeschlagen (HTTP ${status}).`)
    this.name = 'ApiFehler'
    this.status = status
    this.daten = daten
  }
}

async function sendeDaten<TAnfrage, TAntwort>(
  pfad: string,
  anfrage: TAnfrage,
  methode: 'POST' | 'PUT' = 'POST',
): Promise<TAntwort> {
  const antwort = await fetch(`${apiBasisadresse}${pfad}`, {
    method: methode,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(anfrage),
  })

  const daten: unknown = await antwort.json().catch(() => null)
  if (!antwort.ok) {
    throw new ApiFehler(antwort.status, daten)
  }

  return daten as TAntwort
}

export function holeRaeume(signal: AbortSignal): Promise<Raum[]> {
  return holeDaten<Raum[]>('/raeume', signal)
}

export function holeMedizingeraete(signal: AbortSignal): Promise<Medizingeraet[]> {
  return holeDaten<Medizingeraet[]>('/medizingeraete', signal)
}

export function legeRaumAn(anfrage: RaumSchreibAnfrage): Promise<Raum> {
  return sendeDaten<RaumSchreibAnfrage, Raum>('/raeume', anfrage)
}

export function aendereRaum(id: number, anfrage: RaumSchreibAnfrage): Promise<Raum> {
  return sendeDaten<RaumSchreibAnfrage, Raum>(`/raeume/${id}`, anfrage, 'PUT')
}

export function legeMedizingeraetAn(anfrage: MedizingeraetSchreibAnfrage): Promise<Medizingeraet> {
  return sendeDaten<MedizingeraetSchreibAnfrage, Medizingeraet>('/medizingeraete', anfrage)
}

export function aendereMedizingeraet(id: number, anfrage: MedizingeraetSchreibAnfrage): Promise<Medizingeraet> {
  return sendeDaten<MedizingeraetSchreibAnfrage, Medizingeraet>(`/medizingeraete/${id}`, anfrage, 'PUT')
}

async function loescheRessource(pfad: string): Promise<void> {
  const antwort = await fetch(`${apiBasisadresse}${pfad}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
  if (!antwort.ok) {
    const daten: unknown = await antwort.json().catch(() => null)
    throw new ApiFehler(antwort.status, daten)
  }
}

export function loescheRaum(id: number): Promise<void> {
  return loescheRessource(`/raeume/${id}`)
}

export function loescheMedizingeraet(id: number): Promise<void> {
  return loescheRessource(`/medizingeraete/${id}`)
}

export function holeBuchungen(signal: AbortSignal): Promise<Buchung[]> {
  return holeDaten<Buchung[]>('/buchungen', signal)
}

export function pruefeBuchungsverfuegbarkeit(
  anfrage: VerfuegbarkeitPruefenAnfrage,
): Promise<VerfuegbarkeitsErgebnis> {
  return sendeDaten<VerfuegbarkeitPruefenAnfrage, VerfuegbarkeitsErgebnis>(
    '/buchungen/verfuegbarkeit',
    anfrage,
  )
}

export function legeBuchungAn(anfrage: BuchungAnlegenAnfrage): Promise<Buchung> {
  return sendeDaten<BuchungAnlegenAnfrage, Buchung>('/buchungen', anfrage)
}

export function aendereBuchung(id: number, anfrage: BuchungAendernAnfrage): Promise<Buchung> {
  return sendeDaten<BuchungAendernAnfrage, Buchung>(`/buchungen/${id}`, anfrage, 'PUT')
}

export async function loescheBuchung(id: number): Promise<void> {
  const antwort = await fetch(`${apiBasisadresse}/buchungen/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })

  if (!antwort.ok) {
    const daten: unknown = await antwort.json().catch(() => null)
    throw new ApiFehler(antwort.status, daten)
  }
}

export function sucheAlternativen(anfrage: AlternativenAnfrage): Promise<AlternativenErgebnis> {
  return sendeDaten<AlternativenAnfrage, AlternativenErgebnis>('/buchungen/alternativen', anfrage)
}
export function interpretiereBuchungstext(anfrage: TexteingabeInterpretierenAnfrage): Promise<BuchungsEntwurf> {
  return sendeDaten<TexteingabeInterpretierenAnfrage, BuchungsEntwurf>('/buchungsentwuerfe/interpretieren', anfrage)
}

const dateiendungNachAudioformat: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
}

export async function transkribiereAudio(audio: Blob): Promise<TranskriptionErgebnis> {
  const format = audio.type.split(';')[0]
  const formular = new FormData()
  formular.append('audio', audio, `aufnahme.${dateiendungNachAudioformat[format] ?? 'webm'}`)

  const antwort = await fetch(`${apiBasisadresse}/sprache/transkribieren`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formular,
  })

  const daten: unknown = await antwort.json().catch(() => null)
  if (!antwort.ok) {
    throw new ApiFehler(antwort.status, daten)
  }

  return daten as TranskriptionErgebnis
}

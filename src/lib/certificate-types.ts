// Shared certificate field types — used by both the upload editor (Session 5)
// and the design editor (Session 6), and by the generation pipeline (Sessions 7–8).

export type FieldPosition =
  | 'Top Center'
  | 'Upper Middle'
  | 'Center Large'
  | 'Center Medium'
  | 'Lower Middle'
  | 'Bottom Left'
  | 'Bottom Center'
  | 'Bottom Right'

export type FieldSize = 'Small' | 'Medium' | 'Large' | 'Extra Large'

export interface CertificateField {
  id: string
  name: string
  position: FieldPosition
  size: FieldSize
  color: string
  font: string
}

export const FIELD_POSITIONS: FieldPosition[] = [
  'Top Center',
  'Upper Middle',
  'Center Large',
  'Center Medium',
  'Lower Middle',
  'Bottom Left',
  'Bottom Center',
  'Bottom Right',
]

export const FIELD_SIZES: FieldSize[] = ['Small', 'Medium', 'Large', 'Extra Large']

export const FIELD_COLOR_PRESETS = [
  { label: 'Navy',   value: '#1B2A4A' },
  { label: 'Blue',   value: '#3B5BDB' },
  { label: 'Green',  value: '#166534' },
  { label: 'Purple', value: '#6B21A8' },
  { label: 'Red',    value: '#DC2626' },
  { label: 'Amber',  value: '#CA8A04' },
  { label: 'Black',  value: '#111827' },
  { label: 'Gray',   value: '#6B7280' },
]

export const DEFAULT_CERTIFICATE_FIELDS: CertificateField[] = [
  { id: '1', name: 'Recipient Name', position: 'Center Large',  size: 'Extra Large', color: '#1B2A4A', font: 'Playfair Display' },
  { id: '2', name: 'Date',           position: 'Bottom Center', size: 'Small',       color: '#6B7280', font: 'Outfit'           },
]

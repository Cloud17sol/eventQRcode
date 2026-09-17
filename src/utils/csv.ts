export type CsvTable = {
  headers: string[]
  rows: string[][]
}

export function parseCsv(text: string): CsvTable {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let inQuotes = false

  const source = text.replace(/^\uFEFF/, '')

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(current.trim())
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(current.trim())
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
      current = ''
      continue
    }

    current += char
  }

  row.push(current.trim())
  if (row.some((cell) => cell.length > 0)) rows.push(row)

  const headers = (rows.shift() ?? []).map((header) => header.trim())
  return { headers, rows }
}

export const CSV_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'category', label: 'Category' },
  { key: 'guest_limit', label: 'Guest allowance' },
  { key: 'table', label: 'Table' },
  { key: 'notes', label: 'Notes' },
] as const

export type CsvFieldKey = (typeof CSV_FIELDS)[number]['key']

export type ColumnMap = Record<CsvFieldKey, number | null>

export function guessColumnMap(headers: string[]): ColumnMap {
  const normalized = headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, ''))

  function find(...candidates: string[]) {
    const index = normalized.findIndex((header) => candidates.includes(header))
    return index >= 0 ? index : null
  }

  return {
    name: find('name', 'guest', 'guestname', 'fullname', 'displayname'),
    email: find('email', 'mail'),
    phone: find('phone', 'mobile', 'tel', 'telephone'),
    category: find('category', 'access', 'type', 'group'),
    guest_limit: find('guestlimit', 'allowance', 'limit', 'plusones', 'admits'),
    table: find('table', 'tablename', 'seat'),
    notes: find('notes', 'note', 'comment'),
  }
}

export function cell(row: string[], index: number | null): string {
  if (index === null) return ''
  return (row[index] ?? '').trim()
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function toCsv(headers: string[], rows: Array<Array<string | null | undefined>>) {
  const lines = [
    headers.map(csvCell),
    ...rows.map((row) => row.map((value) => csvCell(value ?? ''))),
  ]
  return lines.map((line) => line.join(',')).join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

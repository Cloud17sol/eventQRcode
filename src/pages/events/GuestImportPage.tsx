import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { Field, Select } from '@/components/common/Field'
import { useGuestCategories } from '@/hooks/useGuests'
import { createGuests, ensureCategoriesByName } from '@/services/guestService'
import type { Event, GuestWriteInput } from '@/types/database'
import { cell, CSV_FIELDS, guessColumnMap, parseCsv, type ColumnMap, type CsvFieldKey } from '@/utils/csv'

type PreviewRow = {
  input: GuestWriteInput
  categoryName: string
  error: string | null
}

export function GuestImportPage() {
  const event = useOutletContext<Event>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: categories = [] } = useGuestCategories(event.id)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [columnMap, setColumnMap] = useState<ColumnMap>(guessColumnMap([]))

  const preview = useMemo<PreviewRow[]>(() => {
    return rows.map((row) => {
      const name = cell(row, columnMap.name)
      const categoryName = cell(row, columnMap.category)
      const limitValue = cell(row, columnMap.guest_limit)
      const parsedLimit = limitValue ? Number(limitValue) : 1
      const guestLimit = Number.isFinite(parsedLimit) && parsedLimit >= 1 ? parsedLimit : 1
      const category = categories.find((item) => item.name.toLowerCase() === categoryName.toLowerCase())

      return {
        categoryName,
        error: name.length < 2 ? 'Name is required' : null,
        input: {
          display_name: name,
          first_name: '',
          last_name: '',
          email: cell(row, columnMap.email),
          phone: cell(row, columnMap.phone),
          company: '',
          guest_category_id: category?.id ?? null,
          table_name: cell(row, columnMap.table),
          seat_number: '',
          guest_limit: guestLimit,
          notes: cell(row, columnMap.notes),
          status: 'active',
        },
      }
    })
  }, [categories, columnMap, rows])

  const validRows = preview.filter((row) => !row.error)
  const errorCount = preview.length - validRows.length

  const importMutation = useMutation({
    mutationFn: async () => {
      const names = [...new Set(validRows.map((row) => row.categoryName).filter(Boolean))]
      const allCategories = await ensureCategoriesByName(event.id, names)
      const inputs = validRows.map((row) => {
        const category = allCategories.find(
          (item) => item.name.toLowerCase() === row.categoryName.toLowerCase(),
        )
        return {
          ...row.input,
          guest_category_id: category?.id ?? row.input.guest_category_id,
        }
      })
      return createGuests(event.id, inputs)
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['guests'] })
      await queryClient.invalidateQueries({ queryKey: ['guest-categories'] })
      await queryClient.invalidateQueries({ queryKey: ['invitations'] })
      toast.success(`${created.length} guests imported`)
      navigate(`/events/${event.id}/guests`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not import guests')
    },
  })

  async function onFile(file: File) {
    const text = await file.text()
    const parsed = parseCsv(text)
    setFileName(file.name)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    setColumnMap(guessColumnMap(parsed.headers))
  }

  function updateMap(field: CsvFieldKey, value: string) {
    setColumnMap((current) => ({
      ...current,
      [field]: value === '' ? null : Number(value),
    }))
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Import guests</h2>
        <p className="mt-1 text-sm text-muted">
          Upload a CSV, map columns, then confirm. Nothing is saved until you import the preview.
        </p>
      </div>

      <label className="grid cursor-pointer gap-2 rounded-2xl border border-dashed border-line bg-card px-5 py-8 text-center">
        <span className="text-sm font-medium text-copy">{fileName || 'Choose a CSV file'}</span>
        <span className="text-sm text-muted">Expected fields: name, email, phone, category, guest_limit, table, notes</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void onFile(file)
          }}
        />
      </label>

      {headers.length > 0 ? (
        <>
          <section className="rounded-2xl border border-line bg-card p-5">
            <h3 className="text-sm font-semibold">Column mapping</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {CSV_FIELDS.map((field) => (
                <Field key={field.key} id={`map-${field.key}`} label={field.label}>
                  <Select
                    id={`map-${field.key}`}
                    value={columnMap[field.key] ?? ''}
                    onChange={(event) => updateMap(field.key, event.target.value)}
                  >
                    <option value="">Not imported</option>
                    {headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={index}>
                        {header || `Column ${index + 1}`}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <p className="text-sm font-medium">
                Preview · {validRows.length} ready
                {errorCount > 0 ? ` · ${errorCount} need a name` : ''}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs font-medium text-muted">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Allowance</th>
                    <th className="px-4 py-3">Table</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.slice(0, 50).map((row, index) => (
                    <tr key={index} className={row.error ? 'bg-danger/5' : ''}>
                      <td className="px-4 py-3">
                        {row.input.display_name || '—'}
                        {row.error ? <span className="mt-0.5 block text-xs text-danger">{row.error}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-muted">{row.input.email || '—'}</td>
                      <td className="px-4 py-3 text-muted">{row.input.phone || '—'}</td>
                      <td className="px-4 py-3">{row.categoryName || '—'}</td>
                      <td className="px-4 py-3">{row.input.guest_limit}</td>
                      <td className="px-4 py-3">{row.input.table_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 50 ? (
              <p className="border-t border-line px-5 py-3 text-sm text-muted">
                Showing the first 50 of {preview.length} rows. All valid rows will import.
              </p>
            ) : null}
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate(`/events/${event.id}/guests`)}>
              Cancel
            </Button>
            <Button
              disabled={importMutation.isPending || validRows.length === 0 || columnMap.name === null}
              onClick={() => importMutation.mutate()}
            >
              {importMutation.isPending ? 'Importing…' : `Import ${validRows.length} guests`}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import type { LeaderboardRow } from '~/lib/types'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string
  }
}

const col = createColumnHelper<LeaderboardRow>()

const MEDAL_TONES = ['text-gold', 'text-silver', 'text-bronze'] as const

const columns = [
  col.display({
    id: 'rank',
    header: '#',
    cell: ({ row, table }) => {
      const sorted = table.getRowModel().rows
      const index = sorted.findIndex((r) => r.id === row.id)
      return <span className="num font-bold">{index + 1}</span>
    },
  }),
  col.accessor('name', {
    header: 'Athlete',
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="text-xl">
          {row.original.emoji}
        </span>
        <span className="font-display font-bold">{row.original.name}</span>
      </span>
    ),
  }),
  col.accessor('gold', {
    header: () => <MedalHeader symbol="●" tone="text-gold" label="Gold medals" />,
    cell: (info) => <Medal count={info.getValue()} tone={0} />,
  }),
  col.accessor('silver', {
    header: () => <MedalHeader symbol="●" tone="text-silver" label="Silver medals" />,
    cell: (info) => <Medal count={info.getValue()} tone={1} />,
  }),
  col.accessor('bronze', {
    header: () => <MedalHeader symbol="●" tone="text-bronze" label="Bronze medals" />,
    cell: (info) => <Medal count={info.getValue()} tone={2} />,
  }),
  col.accessor('activitiesPlayed', {
    header: 'Played',
    meta: { className: 'hidden sm:table-cell' },
    cell: (info) => <span className="num">{info.getValue()}</span>,
  }),
  col.accessor('totalPoints', {
    header: 'Points',
    cell: (info) => (
      <span className="num text-lg font-bold text-flag">{info.getValue()}</span>
    ),
  }),
]

function MedalHeader({
  symbol,
  tone,
  label,
}: {
  symbol: string
  tone: string
  label: string
}) {
  return (
    <span className={tone} title={label}>
      <span aria-hidden="true">{symbol}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

function Medal({ count, tone }: { count: number; tone: 0 | 1 | 2 }) {
  if (count === 0) return <span className="text-ink-soft/50">–</span>
  return <span className={`num font-bold ${MEDAL_TONES[tone]}`}>{count}</span>
}

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (rows.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-ink-soft">
        No athletes registered yet. The starting line is empty.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Leaderboard sorted by total points, with gold, silver and bronze counts
        </caption>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b-2 border-ink">
              {headerGroup.headers.map((header) => {
                const sortDir = header.column.getIsSorted()
                return (
                  <th
                    key={header.id}
                    aria-sort={
                      sortDir === 'asc'
                        ? 'ascending'
                        : sortDir === 'desc'
                          ? 'descending'
                          : 'none'
                    }
                    className={`px-2 py-2 font-display text-xs font-bold uppercase tracking-wider sm:px-4 ${header.column.columnDef.meta?.className ?? ''}`}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex min-h-11 items-center gap-1 hover:text-flag"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span aria-hidden="true" className="text-[0.6rem]">
                          {sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : '△▽'}
                        </span>
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              className={`border-b border-ink/15 ${index === 0 && sorting.length === 0 ? 'bg-gold/10' : ''}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`px-2 py-3 sm:px-4 ${cell.column.columnDef.meta?.className ?? ''}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

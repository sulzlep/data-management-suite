import type { LoaderArgs, SerializeFrom } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus } from 'lucide-react'
import { DataTable } from '~/components/list-table/data-table'
import { DataTableColumnHeader } from '~/components/list-table/data-table-column-header'
import { H3, Muted } from '~/components/typography'
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { routes } from '~/routes'
import { db } from '~/utils/db.server'

export async function loader({ request }: LoaderArgs) {
  let url = new URL(request.url)
  let page = +(url.searchParams.get('page') ?? 0)

  return db.item.findMany({
    take: 20,
    skip: 20 * page,
    orderBy: {
      updatedAt: 'desc',
    },
    include: {
      collection: {
        select: {
          title: true,
          catalog: {
            select: {
              title: true,
            },
          },
        },
      },
      owner: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  })
}

let columns: ColumnDef<SerializeFrom<typeof loader>[number]>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell({ getValue }) {
      return <Badge variant="secondary">{getValue<string>().slice(-5)}</Badge>
    },
  },
  {
    id: 'owner',
    accessorFn(value) {
      return value.owner?.name
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Owner" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src="?" />
            <AvatarFallback>{row.original.owner?.name?.[0]}</AvatarFallback>
          </Avatar>
          <span>{row.original.owner?.name}</span>
        </div>
      )
    },
  },
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
  },
  {
    id: 'collection',
    header({ column }) {
      return <DataTableColumnHeader column={column} title="Collection" />
    },
    accessorFn(value) {
      return value.collection
    },
    cell({ row }) {
      return (
        <div>
          <div className="text-muted-foreground text-xs">
            {row.original.collection.catalog.title}
          </div>
          <div className="font-medium">{row.original.collection.title}</div>
        </div>
      )
    },
  },
  {
    id: 'updatedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated" />
    ),
    accessorFn(value) {
      return Intl.DateTimeFormat('nl-NL', {
        dateStyle: 'medium',
      }).format(new Date(value.updatedAt))
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem asChild>
            <Link to={routes.editItem(row.original.id)}>Edit</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export default function ListPage() {
  let data = useLoaderData<typeof loader>()

  return (
    <div className="p-8 flex flex-col">
      <div className="flex justify-between items-center">
        <H3>Items</H3>
        <Button asChild className="ml-auto" size="sm">
          <Link to={routes.createItem()}>
            <Plus className="w-4 h-4 mr-1" /> Create New
          </Link>
        </Button>
      </div>
      <div className="pt-12">
        <DataTable data={data} columns={columns} />
      </div>
    </div>
  )
}

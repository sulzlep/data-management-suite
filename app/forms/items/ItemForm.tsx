import { Link } from '@remix-run/react'
import { Button } from '~/components/ui/button'
import type { z } from 'zod'
import type { ActionArgs, SerializeFrom } from '@remix-run/node'
import { db } from '~/utils/db.server'
import { updateGeometry } from '~/services/item.server'
import { ValidatedForm, validationError } from 'remix-validated-form'
import { withZod } from '@remix-validated-form/with-zod'
import { FormSubmit } from '~/components/ui/form'
import { CollectionSelector } from '~/components/CollectionSelector'
import { Separator } from '~/components/ui/separator'
import type { Collection } from '@prisma/client'
import { BoundsSelector } from '~/components/BoundsSelector/BoundsSelector'
import { DateRangePicker } from '~/components/DateRangePicker'
import { requestJsonOrFormData } from '~/utils/requestJsonOrFormdata'
import { requireAuthentication } from '~/services/auth.server'
import { prismaToStacItem } from '~/utils/prismaToStac'
import { formTypes, createItemFormSchema } from '.'
import { Label } from '~/components/ui/label'
import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Plus, X } from 'lucide-react'

export async function submitItemForm({
  request,
  id,
  params,
}: ActionArgs & { id?: string }) {
  await requireAuthentication(request)

  let formDataRaw = await requestJsonOrFormData(request)

  let itemValidator = withZod(
    createItemFormSchema(formDataRaw.getAll('properties[__extraFormTypes]')),
  )

  let form = await itemValidator.validate(formDataRaw)

  if (form.error) {
    throw validationError(form.error)
  }

  let { geometry, datetime, start_datetime, end_datetime, ...formData } =
    form.data

  let dates =
    end_datetime && end_datetime !== start_datetime
      ? {
          start_datetime: start_datetime || undefined,
          end_datetime: end_datetime || undefined,
        }
      : {
          datetime: (datetime || undefined) ?? (start_datetime || undefined),
        }

  let data = {
    ...formData,
    ...dates,
  }

  let item = await db.item.upsert({
    where: {
      id: id ?? '',
    },
    create: data,
    update: data,
  })

  await updateGeometry({
    id: item.id,
    geometry,
  })

  return prismaToStacItem({
    ...item,
    geometry,
  })
}

export function ItemForm({
  defaultValues,
  collections,
}: {
  collections: SerializeFrom<
    Collection & { catalog: { title: string | null } }
  >[]
  defaultValues?: unknown
}) {
  let [extraFormTypes, setExtraFormTypes] = React.useState<
    (keyof typeof formTypes)[]
  >([])

  let itemSchema = React.useMemo(
    () => createItemFormSchema(extraFormTypes),
    [extraFormTypes],
  )
  let itemValidator = React.useMemo(() => withZod(itemSchema), [itemSchema])

  // TODO: Make global error view
  // let { fieldErrors } = useFormContext('myform')

  return (
    <>
      <div className="max-w-6xl w-full mx-auto py-12">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">
            Register metadata record
          </h2>
          <p className="text-muted-foreground">
            Findable metadata records are the foundation of the data catalog.
          </p>
        </div>
        <Separator className="my-6" />
        <div>
          <ValidatedForm
            id="myform"
            method="post"
            validator={itemValidator}
            defaultValues={defaultValues as z.infer<typeof itemSchema>}
            className="flex flex-col gap-y-16"
          >
            {extraFormTypes.map(formType => (
              <input
                key={formType}
                type="hidden"
                name="properties[__extraFormTypes]"
                value={formType}
              />
            ))}
            <div className="gap-14 grid grid-cols-3">
              <div id="general">
                <h3 className="text-lg font-medium">General</h3>
                <p className="text-sm text-muted-foreground">
                  Basic information about the data
                </p>
              </div>
              <div className="col-span-2 flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  {collections ? (
                    <CollectionSelector
                      label="Collection"
                      name="collectionId"
                      collections={collections}
                    />
                  ) : (
                    <Button asChild type="button">
                      <Link to="collection">Create collection</Link>
                    </Button>
                  )}
                </div>

                <div>
                  <Label>Geometry</Label>
                  <div className="pt-1.5">
                    <BoundsSelector name="geometry" />
                  </div>
                </div>

                <div>
                  <DateRangePicker label="Date or date range" />
                </div>
              </div>

              {extraFormTypes?.map(type => {
                let formType = formTypes[type]

                return (
                  <>
                    <Separator className="col-span-3" />
                    <div id="properties">
                      <h3 className="text-lg font-medium">
                        {formType.config.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Properties specific to {formType.config.title}
                      </p>
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setExtraFormTypes(c => c.filter(v => v !== type))
                        }
                      >
                        <X className="w-4 h-4 mr-1.5" /> Remove{' '}
                        {formType.config.title}
                      </Button>
                    </div>
                    <div className="col-span-2">
                      <formType.Form />
                    </div>
                  </>
                )
              })}

              {extraFormTypes.length < Object.keys(formTypes).length && (
                <>
                  <Separator className="col-span-full" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full col-span-full"
                      >
                        <Plus className="w-4 h-4 mr-1.5" /> Add more data
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {Object.entries(formTypes)
                        .filter(([key]) => !extraFormTypes.includes(key))
                        .map(([key, formType]) => (
                          <DropdownMenuItem
                            key={key}
                            onClick={() => setExtraFormTypes(c => [...c, key])}
                          >
                            {formType.config.title}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>

            <div>
              <FormSubmit>Save</FormSubmit>
            </div>
          </ValidatedForm>
        </div>
      </div>
    </>
  )
}

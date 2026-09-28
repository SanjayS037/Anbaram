import { useId, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Form'
import { useDistributionCenters, useSaveCollectionPoint, useSaveDistributionCenter } from '../../hooks/useLocations'

const initialValues = (existing) => ({
  name: existing?.name ?? '',
  short_code: existing?.short_code ?? '',
  address: existing?.address ?? '',
  zone: (existing && 'zone' in existing ? existing.zone : null) ?? '',
  contact_person_name: existing?.contact_person_name ?? '',
  contact_person_phone: existing?.contact_person_phone ?? '',
  cycle_frequency_days: String(
    (existing && 'cycle_frequency_days' in existing ? existing.cycle_frequency_days : null) ?? 30,
  ),
  default_distribution_center_id:
    (existing && 'default_distribution_center_id' in existing ? existing.default_distribution_center_id : null) ?? '',
  status: existing?.status ?? 'active',
})

function validate(values, isCp) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Please enter the name.'
  if (!values.address.trim()) errors.address = 'Please enter the address.'
  if (values.short_code && !/^[A-Z0-9-]{2,20}$/.test(values.short_code))
    errors.short_code = 'Use only capital letters, numbers and - (for example CP-014).'
  if (values.contact_person_phone && !/^[0-9+\-\s]{6,16}$/.test(values.contact_person_phone))
    errors.contact_person_phone = 'Please enter a correct phone number.'
  if (isCp) {
    const days = Number(values.cycle_frequency_days)
    if (!Number.isInteger(days) || days < 1 || days > 365)
      errors.cycle_frequency_days = 'Enter a number of days from 1 to 365.'
  }
  return errors
}

const orNull = (value) => value.trim() || null

export function LocationFormDialog({ type, existing, onClose }) {
  const isCp = type === 'collection_point'
  const noun = isCp ? 'collection point' : 'distribution center'
  const [values, setValues] = useState(() => initialValues(existing))
  const [submitted, setSubmitted] = useState(false)
  const saveCp = useSaveCollectionPoint()
  const saveDc = useSaveDistributionCenter()
  const dcs = useDistributionCenters()
  const busy = saveCp.isPending || saveDc.isPending
  const formId = useId()
  const errors = submitted ? validate(values, isCp) : {}

  const set = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: key === 'short_code' ? e.target.value.toUpperCase() : e.target.value }))

  const fieldProps = (key) => ({
    id: `${formId}-${key}`,
    value: values[key],
    onChange: set(key),
    'aria-invalid': !!errors[key] || undefined,
    'aria-describedby': errors[key] ? `${formId}-${key}-error` : undefined,
  })

  function submit(event) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validate(values, isCp)).length) return

    const common = {
      name: values.name.trim(),
      short_code: orNull(values.short_code),
      address: values.address.trim(),
      contact_person_name: orNull(values.contact_person_name),
      contact_person_phone: orNull(values.contact_person_phone),
      status: values.status,
    }
    const done = { onSuccess: (id) => onClose(id) }
    if (isCp) {
      saveCp.mutate(
        {
          id: existing?.id,
          input: {
            ...common,
            zone: orNull(values.zone),
            cycle_frequency_days: Number(values.cycle_frequency_days),
            default_distribution_center_id: values.default_distribution_center_id || null,
          },
        },
        done,
      )
    } else {
      saveDc.mutate({ id: existing?.id, input: common }, done)
    }
  }

  return (
    <Modal
      open
      onClose={() => onClose()}
      busy={busy}
      size="lg"
      title={existing ? `Edit ${existing.name}` : `Add ${noun}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onClose()} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {existing ? 'Save' : `Add ${noun}`}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${formId}-name`} required error={errors.name} className="sm:col-span-2">
          <Input {...fieldProps('name')} maxLength={120} autoFocus />
        </Field>
        <Field
          label="Code"
          htmlFor={`${formId}-short_code`}
          error={errors.short_code}
          hint={
            isCp ? 'Short code for this point, for example CP-014' : 'Short code for this center, for example DC-01'
          }
        >
          <Input {...fieldProps('short_code')} maxLength={20} placeholder={isCp ? 'CP-014' : 'DC-01'} />
        </Field>
        {isCp ? (
          <Field label="Zone / Taluk" htmlFor={`${formId}-zone`}>
            <Input {...fieldProps('zone')} maxLength={80} />
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="Address" htmlFor={`${formId}-address`} required error={errors.address} className="sm:col-span-2">
          <Textarea {...fieldProps('address')} className="min-h-16" maxLength={300} />
        </Field>
        <Field
          label="Other contact person (optional)"
          htmlFor={`${formId}-contact_person_name`}
          hint="Another person to call at this place, for example a caretaker. This does not change when the officer changes."
        >
          <Input {...fieldProps('contact_person_name')} maxLength={80} />
        </Field>
        <Field
          label="Their phone number (optional)"
          htmlFor={`${formId}-contact_person_phone`}
          error={errors.contact_person_phone}
        >
          <Input {...fieldProps('contact_person_phone')} type="tel" inputMode="tel" maxLength={16} />
        </Field>

        {isCp && (
          <>
            <Field
              label="Collect every (days)"
              htmlFor={`${formId}-cycle_frequency_days`}
              required
              error={errors.cycle_frequency_days}
              hint="If no collection happens within this many days, it shows as late."
            >
              <Input {...fieldProps('cycle_frequency_days')} type="number" min={1} max={365} step={1} />
            </Field>
            <Field
              label="Usually sends to"
              htmlFor={`${formId}-default_distribution_center_id`}
              hint="This center is already chosen in the officer's app when they send items."
            >
              <Select {...fieldProps('default_distribution_center_id')} disabled={dcs.isPending}>
                <option value="">None</option>
                {(dcs.data ?? [])
                  .filter((dc) => dc.status === 'active' || dc.id === values.default_distribution_center_id)
                  .map((dc) => (
                    <option key={dc.id} value={dc.id}>
                      {dc.name}
                      {dc.short_code ? ` (${dc.short_code})` : ''}
                      {dc.status === 'inactive' ? ' — inactive' : ''}
                    </option>
                  ))}
              </Select>
            </Field>
          </>
        )}

        <Field label="Status" htmlFor={`${formId}-status`} hint="Closed places are not shown to officers in their app.">
          <Select {...fieldProps('status')}>
            <option value="active">Open</option>
            <option value="inactive">Closed</option>
          </Select>
        </Field>
      </form>
    </Modal>
  )
}

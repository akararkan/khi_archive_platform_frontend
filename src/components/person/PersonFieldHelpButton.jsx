import { FieldHelpButton } from '@/components/ui/field-help'
import { getPersonFieldMetadata } from '@/lib/person-fields-metadata'

// Thin wrapper around the generic FieldHelpButton so the existing
// EmployeePersonPage call sites (`<PersonFieldHelpButton fieldKey="…" />`)
// keep working unchanged. New entities should use the generic
// `<FieldHelpButton metadata={...} />` directly.
function PersonFieldHelpButton({ fieldKey }) {
  return <FieldHelpButton metadata={getPersonFieldMetadata(fieldKey)} />
}

export { PersonFieldHelpButton }

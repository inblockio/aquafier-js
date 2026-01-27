import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangleIcon } from "lucide-react"

export default function NoAttestationsAlert() {
    return (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
            <AlertTriangleIcon />
            <AlertTitle>No Attestations</AlertTitle>
            <AlertDescription>
                There are no attestations for this certificate. Kindly share the certificate to get some attestations from the relevant people.
            </AlertDescription>
        </Alert>
    )
}

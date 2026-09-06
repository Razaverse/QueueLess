import ClinicDetailsClient from "./ClinicDetailsClient";

export default async function ClinicDetailsPage({ params }) {
  const { id } = await params;
  return <ClinicDetailsClient clinicId={id} />;
}

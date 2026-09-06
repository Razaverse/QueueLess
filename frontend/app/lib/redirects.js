export function routeForRole(role) {
  if (role === "CLINIC_ADMIN" || role === "CLINIC_STAFF") return "/clinic/dashboard";
  if (role === "PLATFORM_ADMIN") return "/admin/clinics";
  return "/dashboard";
}

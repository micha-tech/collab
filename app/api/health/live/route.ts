import { jsonResponse, requestIdFor } from "@/lib/observability";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = requestIdFor(request);
  return jsonResponse(
    { status: "ok", service: "v-one-collab" },
    requestId,
  );
}

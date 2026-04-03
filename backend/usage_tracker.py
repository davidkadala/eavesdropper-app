import os
from dataclasses import dataclass
from datetime import datetime, timezone

from google.cloud import firestore


CLOUD_RUN_FREE_REQUESTS_PER_MONTH = 2_000_000
CLOUD_RUN_FREE_VCPU_SECONDS_PER_MONTH = 180_000
CLOUD_RUN_FREE_GIB_SECONDS_PER_MONTH = 360_000


class FreeUsageLimitError(RuntimeError):
    pass


@dataclass
class UsageSnapshot:
    request_count: int
    vcpu_seconds: float
    gib_seconds: float
    usage_ratio: float
    threshold_ratio: float
    month_key: str


class MonthlyUsageTracker:
    def __init__(self) -> None:
        self.enabled = os.getenv("USAGE_GUARD_ENABLED", "true").strip().lower() == "true"
        self.threshold_ratio = float(os.getenv("FREE_USAGE_THRESHOLD_RATIO", "0.8"))
        self.memory_gib = float(os.getenv("CLOUD_RUN_MEMORY_GIB", "2"))
        self.vcpu_count = float(os.getenv("CLOUD_RUN_VCPU_COUNT", "1"))
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCLOUD_PROJECT")
        self._client = None

    def ensure_allowed(self) -> UsageSnapshot | None:
        if not self.enabled:
            return None

        snapshot = self.get_snapshot()
        if snapshot.usage_ratio >= snapshot.threshold_ratio:
            percent = int(snapshot.threshold_ratio * 100)
            raise FreeUsageLimitError(
                f"free usage limits reached, try again next month (limit set at {percent}% of monthly free tier)"
            )

        return snapshot

    def record_usage(self, elapsed_seconds: float) -> None:
        if not self.enabled:
            return

        document = self._document_ref()
        document.set(
            {
                "request_count": firestore.Increment(1),
                "vcpu_seconds": firestore.Increment(elapsed_seconds * self.vcpu_count),
                "gib_seconds": firestore.Increment(elapsed_seconds * self.memory_gib),
                "updated_at": firestore.SERVER_TIMESTAMP,
                "threshold_ratio": self.threshold_ratio,
            },
            merge=True,
        )

    def get_snapshot(self) -> UsageSnapshot:
        month_key = self._month_key()
        if not self.enabled:
            return UsageSnapshot(0, 0.0, 0.0, 0.0, self.threshold_ratio, month_key)

        document = self._document_ref().get()
        data = document.to_dict() or {}
        request_count = int(data.get("request_count", 0))
        vcpu_seconds = float(data.get("vcpu_seconds", 0.0))
        gib_seconds = float(data.get("gib_seconds", 0.0))

        request_ratio = request_count / CLOUD_RUN_FREE_REQUESTS_PER_MONTH
        vcpu_ratio = vcpu_seconds / CLOUD_RUN_FREE_VCPU_SECONDS_PER_MONTH
        gib_ratio = gib_seconds / CLOUD_RUN_FREE_GIB_SECONDS_PER_MONTH
        usage_ratio = max(request_ratio, vcpu_ratio, gib_ratio)

        return UsageSnapshot(
            request_count=request_count,
            vcpu_seconds=vcpu_seconds,
            gib_seconds=gib_seconds,
            usage_ratio=usage_ratio,
            threshold_ratio=self.threshold_ratio,
            month_key=month_key,
        )

    def _document_ref(self):
        client = self._firestore_client()
        return client.collection("usage_limits").document(self._month_key())

    def _firestore_client(self):
        if self._client is None:
            self._client = firestore.Client(project=self.project_id)
        return self._client

    def _month_key(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m")

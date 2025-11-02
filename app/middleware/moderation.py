from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import re


REDACT_PATTERNS = [
    re.compile(r"\b\d{10}\b"),  # simple phone number
    re.compile(r"[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}"),  # email
]


def redact_text(text: str) -> str:
    redacted = text
    for pat in REDACT_PATTERNS:
        redacted = pat.sub("[REDACTED]", redacted)
    return redacted


class ModerationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only act on JSON requests
        if request.headers.get("content-type", "").startswith("application/json"):
            try:
                body = await request.body()
                redacted = redact_text(body.decode("utf-8", errors="ignore"))
                scope = request.scope
                receive_ = request._receive

                async def receive():
                    nonlocal redacted
                    return {"type": "http.request", "body": redacted.encode("utf-8"), "more_body": False}

                request._receive = receive  # type: ignore
            except Exception:
                pass

        response: Response = await call_next(request)
        return response





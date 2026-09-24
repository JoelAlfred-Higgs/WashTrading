from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="WashGuard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    contract_address: str
    token_id: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "WashGuard"
    }


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    return {
        "status": "received",
        "contract_address": req.contract_address,
        "token_id": req.token_id,
        "message": "Temporary response. Detection engine pending."
    }

import os
import re
import httpx
from typing import List, Dict, Any, Optional

def validate_ethereum_address(address: str) -> bool:
    """Validate 0x-prefixed 40-character hex Ethereum address."""
    return bool(re.match(r"^0x[a-fA-F0-9]{40}$", address.strip()))

def validate_token_id(token_id: str) -> bool:
    """Validate token ID is numeric or valid hex."""
    cleaned = token_id.strip()
    if cleaned.isdigit():
        return True
    if cleaned.startswith("0x") or cleaned.startswith("0X"):
        try:
            int(cleaned, 16)
            return True
        except ValueError:
            return False
    return False

def to_hex_token_id(token_id: str) -> str:
    """Convert token ID string to hex string suitable for Alchemy filters."""
    cleaned = token_id.strip()
    if cleaned.isdigit():
        return hex(int(cleaned))
    if cleaned.startswith("0x") or cleaned.startswith("0X"):
        return hex(int(cleaned, 16))
    return cleaned

def get_demo_normalized_transfers(contract_address: str, token_id: str) -> List[Dict[str, Any]]:
    """
    Realistic sample normalized transfers for fallback testing 
    (e.g., when rate-limited or API key is missing during offline demo).
    """
    return [
        {
            "tx_hash": "0x3e18f2d59218d6e9f1a04d22bb4931a7f05809e2e61298c8c7283ba874559bc8",
            "from": "0x0000000000000000000000000000000000000000",
            "to": "0xaba7161a7fb69c5d67318945582962451f28b704",
            "token_id": token_id,
            "timestamp": "2021-04-30T22:14:05Z",
            "value": 0.08,
            "category": "erc721",
            "block_num": "0xc1c42f",
            "asset": "BAYC"
        },
        {
            "tx_hash": "0x7a84091e6b8c9f023d6a451e0892837264a9d7010f3c1b8529e8471b02938472",
            "from": "0xaba7161a7fb69c5d67318945582962451f28b704",
            "to": "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
            "token_id": token_id,
            "timestamp": "2021-05-02T14:30:12Z",
            "value": 0.45,
            "category": "erc721",
            "block_num": "0xc21a94",
            "asset": "BAYC"
        },
        {
            "tx_hash": "0x1b92049e8c7f6d5a4321098b7654321a0987654321f0987654321a0987654321",
            "from": "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
            "to": "0xaba7161a7fb69c5d67318945582962451f28b704",
            "token_id": token_id,
            "timestamp": "2021-05-03T09:12:00Z",
            "value": 1.20,
            "category": "erc721",
            "block_num": "0xc23b10",
            "asset": "BAYC"
        },
        {
            "tx_hash": "0x890123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
            "from": "0xaba7161a7fb69c5d67318945582962451f28b704",
            "to": "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
            "token_id": token_id,
            "timestamp": "2021-05-03T11:45:30Z",
            "value": 2.50,
            "category": "erc721",
            "block_num": "0xc23c45",
            "asset": "BAYC"
        }
    ]

async def fetch_alchemy_nft_transfers(contract_address: str, token_id: str) -> Dict[str, Any]:
    """
    Fetch raw and normalized NFT transfer history from Alchemy Ethereum Mainnet.
    Does NOT auto-classify transfers as sales or calculate risk scores.
    """
    api_key = os.getenv("ALCHEMY_API_KEY", "").strip()
    
    clean_address = contract_address.strip()
    clean_token_id = token_id.strip()

    if not validate_ethereum_address(clean_address):
        return {
            "success": False,
            "error": f"Invalid Ethereum contract address format: '{contract_address}'",
            "code": "INVALID_CONTRACT_ADDRESS"
        }

    if not validate_token_id(clean_token_id):
        return {
            "success": False,
            "error": f"Invalid token ID format: '{token_id}'",
            "code": "INVALID_TOKEN_ID"
        }

    # Check if API key is missing or explicitly placeholder
    if not api_key or api_key in ["", "your_alchemy_api_key_here"]:
        # If ALLOW_MOCK_FALLBACK is true or key missing, return clear missing key error or fallback
        if os.getenv("ALLOW_MOCK_FALLBACK", "true").lower() == "true":
            return {
                "success": True,
                "contract_address": clean_address,
                "token_id": clean_token_id,
                "total_transfers_found": 4,
                "transfers": get_demo_normalized_transfers(clean_address, clean_token_id),
                "is_fallback_demo": True,
                "note": "ALCHEMY_API_KEY not configured. Returning normalized demo transfer activity. Configure ALCHEMY_API_KEY in backend/.env for live Ethereum Mainnet data."
            }
        return {
            "success": False,
            "error": "ALCHEMY_API_KEY is missing in backend/.env environment variables.",
            "code": "MISSING_API_KEY"
        }

    target_hex_token_id = to_hex_token_id(clean_token_id)
    target_dec_token_id = str(int(target_hex_token_id, 16))

    url = f"https://eth-mainnet.g.alchemy.com/v2/{api_key}"

    payload = {
        "id": 1,
        "jsonrpc": "2.0",
        "method": "alchemy_getAssetTransfers",
        "params": [
            {
                "fromBlock": "0x0",
                "toBlock": "latest",
                "contractAddresses": [clean_address],
                "category": ["erc721", "erc1155"],
                "withMetadata": True,
                "excludeZeroValue": False,
                "maxCount": "0x3e8"
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code in [401, 403]:
                if os.getenv("ALLOW_MOCK_FALLBACK", "true").lower() == "true":
                    return {
                        "success": True,
                        "contract_address": clean_address,
                        "token_id": clean_token_id,
                        "total_transfers_found": 4,
                        "transfers": get_demo_normalized_transfers(clean_address, clean_token_id),
                        "is_fallback_demo": True,
                        "note": f"Alchemy API Key unauthorized (401). Displaying normalized demo blockchain transfer activity for test contract {clean_address}."
                    }
                return {
                    "success": False,
                    "error": "Alchemy API request unauthorized. Please check ALCHEMY_API_KEY.",
                    "code": "UNAUTHORIZED"
                }

            if response.status_code == 429:
                if os.getenv("ALLOW_MOCK_FALLBACK", "true").lower() == "true":
                    return {
                        "success": True,
                        "contract_address": clean_address,
                        "token_id": clean_token_id,
                        "total_transfers_found": 4,
                        "transfers": get_demo_normalized_transfers(clean_address, clean_token_id),
                        "is_fallback_demo": True,
                        "note": f"Alchemy rate limit (429) hit. Displaying normalized demo blockchain transfer activity for test contract {clean_address}."
                    }
                return {
                    "success": False,
                    "error": "Alchemy API rate limit exceeded. Please try again shortly.",
                    "code": "RATE_LIMITED"
                }

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"Alchemy API returned HTTP {response.status_code}: {response.text}",
                    "code": "ALCHEMY_HTTP_ERROR"
                }

            rpc_response = response.json()
            if "error" in rpc_response:
                rpc_err = rpc_response["error"]
                return {
                    "success": False,
                    "error": f"Alchemy RPC Error ({rpc_err.get('code', 'N/A')}): {rpc_err.get('message', 'Unknown error')}",
                    "code": "RPC_ERROR"
                }

            raw_transfers = rpc_response.get("result", {}).get("transfers", [])

            filtered_transfers = []
            for tx in raw_transfers:
                erc1155_metadata = tx.get("erc1155Metadata")
                tx_token_id = None
                
                if erc1155_metadata and isinstance(erc1155_metadata, list):
                    for meta in erc1155_metadata:
                        tx_token_id = meta.get("tokenId")
                        if tx_token_id:
                            break
                if not tx_token_id:
                    tx_token_id = tx.get("tokenId")

                if tx_token_id:
                    tx_token_hex = to_hex_token_id(str(tx_token_id)) if validate_token_id(str(tx_token_id)) else str(tx_token_id)
                    tx_token_dec = str(int(tx_token_hex, 16)) if tx_token_hex.startswith("0x") else str(tx_token_id)
                    
                    if (tx_token_hex == target_hex_token_id or 
                        tx_token_dec == target_dec_token_id or 
                        str(tx_token_id).strip() == clean_token_id):
                        filtered_transfers.append(tx)
                else:
                    filtered_transfers.append(tx)

            normalized_transfers = []
            for tx in filtered_transfers:
                meta = tx.get("metadata", {})
                normalized_transfers.append({
                    "tx_hash": tx.get("hash", ""),
                    "from": tx.get("from", ""),
                    "to": tx.get("to", ""),
                    "token_id": clean_token_id,
                    "timestamp": meta.get("blockTimestamp", ""),
                    "value": tx.get("value"),
                    "category": tx.get("category", "erc721"),
                    "block_num": tx.get("blockNum", ""),
                    "asset": tx.get("asset", "")
                })

            return {
                "success": True,
                "contract_address": clean_address,
                "token_id": clean_token_id,
                "total_transfers_found": len(normalized_transfers),
                "transfers": normalized_transfers,
                "note": "Normalized raw blockchain transfer activity retrieved from Alchemy Ethereum Mainnet. Transfers are not auto-classified as sales."
            }

    except httpx.TimeoutException:
        return {
            "success": False,
            "error": "Timeout while connecting to Alchemy API.",
            "code": "TIMEOUT"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Network or unexpected error while calling Alchemy: {str(e)}",
            "code": "INTERNAL_ERROR"
        }

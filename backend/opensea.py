import os
import re
import httpx
from typing import Dict, Any, Optional, List

def validate_ethereum_address(address: str) -> bool:
    return bool(re.match(r"^0x[a-fA-F0-9]{40}$", address.strip()))

def validate_token_id(token_id: str) -> bool:
    cleaned = token_id.strip()
    return cleaned.isdigit() or cleaned.startswith("0x") or cleaned.startswith("0X")

def get_demo_opensea_market_data(contract_address: str, token_id: str) -> Dict[str, Any]:
    """
    Fallback market context for test contracts when OpenSea API key is absent 
    or rate limited during offline hackathon demo.
    """
    return {
        "is_available": True,
        "is_fallback_demo": True,
        "collection": {
            "name": "Bored Ape Yacht Club",
            "slug": "boredapeyachtclub"
        },
        "floor_price": 24.5,
        "currency": "ETH",
        "sales": [
            {
                "tx_hash": "0x7a84091e6b8c9f023d6a451e0892837264a9d7010f3c1b8529e8471b02938472",
                "buyer": "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
                "seller": "0xaba7161a7fb69c5d67318945582962451f28b704",
                "price": 0.45,
                "currency": "ETH",
                "timestamp": "2021-05-02T14:30:12Z"
            },
            {
                "tx_hash": "0x1b92049e8c7f6d5a4321098b7654321a0987654321f0987654321a0987654321",
                "buyer": "0xaba7161a7fb69c5d67318945582962451f28b704",
                "seller": "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
                "price": 1.20,
                "currency": "ETH",
                "timestamp": "2021-05-03T09:12:00Z"
            },
            {
                "tx_hash": "0x890123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
                "buyer": "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
                "seller": "0xaba7161a7fb69c5d67318945582962451f28b704",
                "price": 2.50,
                "currency": "ETH",
                "timestamp": "2021-05-03T11:45:30Z"
            }
        ],
        "message": "OPENSEA_API_KEY missing or unauthorized. Returning demo market data for evaluation."
    }

async def fetch_opensea_market_data(contract_address: str, token_id: str) -> Dict[str, Any]:
    """
    Fetch market context from OpenSea v2 API.
    Returns normalized collection info, floor price, and sales activity.
    Does NOT fail if OpenSea API key is missing or errors out.
    """
    api_key = os.getenv("OPENSEA_API_KEY", "").strip()

    clean_address = contract_address.strip()
    clean_token_id = token_id.strip()

    if not validate_ethereum_address(clean_address) or not validate_token_id(clean_token_id):
        return {
            "is_available": False,
            "error": "Invalid contract address or token ID format for OpenSea query.",
            "collection": None,
            "floor_price": None,
            "sales": []
        }

    if not api_key or api_key in ["", "YOUR_KEY", "your_opensea_api_key_here"]:
        if os.getenv("ALLOW_MOCK_FALLBACK", "true").lower() == "true":
            return get_demo_opensea_market_data(clean_address, clean_token_id)
        return {
            "is_available": False,
            "error": "OPENSEA_API_KEY missing in environment.",
            "collection": None,
            "floor_price": None,
            "sales": []
        }

    headers = {
        "accept": "application/json",
        "x-api-key": api_key
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Fetch NFT details
            nft_url = f"https://api.opensea.io/api/v2/chain/ethereum/contract/{clean_address}/nfts/{clean_token_id}"
            nft_res = await client.get(nft_url, headers=headers)

            if nft_res.status_code in [401, 403]:
                if os.getenv("ALLOW_MOCK_FALLBACK", "true").lower() == "true":
                    return get_demo_opensea_market_data(clean_address, clean_token_id)
                return {
                    "is_available": False,
                    "error": "OpenSea API key unauthorized.",
                    "collection": None,
                    "floor_price": None,
                    "sales": []
                }

            if nft_res.status_code == 429:
                if os.getenv("ALLOW_MOCK_FALLBACK", "true").lower() == "true":
                    return get_demo_opensea_market_data(clean_address, clean_token_id)
                return {
                    "is_available": False,
                    "error": "OpenSea API rate limit exceeded.",
                    "collection": None,
                    "floor_price": None,
                    "sales": []
                }

            if nft_res.status_code != 200:
                return {
                    "is_available": False,
                    "error": f"OpenSea NFT lookup returned HTTP {nft_res.status_code}",
                    "collection": None,
                    "floor_price": None,
                    "sales": []
                }

            nft_data = nft_res.json().get("nft", {})
            collection_slug = nft_data.get("collection")
            collection_name = nft_data.get("name", "Unknown Collection")

            floor_price = None
            if collection_slug:
                # 2. Fetch collection floor price
                stats_url = f"https://api.opensea.io/api/v2/collections/{collection_slug}/stats"
                stats_res = await client.get(stats_url, headers=headers)
                if stats_res.status_code == 200:
                    stats_json = stats_res.json()
                    total = stats_json.get("total", {})
                    floor_price = total.get("floor_price")

            # 3. Fetch sales events for NFT
            sales = []
            events_url = f"https://api.opensea.io/api/v2/events/chain/ethereum/contract/{clean_address}/nfts/{clean_token_id}?event_type=sale"
            events_res = await client.get(events_url, headers=headers)
            if events_res.status_code == 200:
                events_data = events_res.json().get("asset_events", [])
                for ev in events_data:
                    tx_hash = ev.get("transaction")
                    payment = ev.get("payment", {})
                    unit_price = float(payment.get("quantity", 0)) / (10 ** int(payment.get("decimals", 18))) if payment.get("quantity") else None
                    sales.append({
                        "tx_hash": tx_hash,
                        "buyer": ev.get("buyer"),
                        "seller": ev.get("seller"),
                        "price": unit_price,
                        "currency": payment.get("symbol", "ETH"),
                        "timestamp": ev.get("event_timestamp")
                    })

            return {
                "is_available": True,
                "collection": {
                    "name": collection_name,
                    "slug": collection_slug
                },
                "floor_price": floor_price,
                "currency": "ETH",
                "sales": sales,
                "message": "OpenSea market data retrieved successfully."
            }

    except Exception as e:
        return {
            "is_available": False,
            "error": f"Error querying OpenSea market data: {str(e)}",
            "collection": None,
            "floor_price": None,
            "sales": []
        }

from typing import List, Dict, Any

def generate_etherscan_verification_links(
    contract_address: str, 
    token_id: str, 
    transfers: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate direct Etherscan verification URLs for contract, token, and transaction hashes.
    """
    clean_addr = contract_address.strip()
    clean_token = token_id.strip()
    
    tx_urls = []
    if transfers:
        for tx in transfers:
            tx_hash = tx.get("tx_hash")
            if tx_hash and tx_hash != "N/A":
                tx_urls.append(f"https://etherscan.io/tx/{tx_hash}")

    return {
        "contract_url": f"https://etherscan.io/address/{clean_addr}",
        "token_url": f"https://etherscan.io/token/{clean_addr}?a={clean_token}",
        "tx_urls": tx_urls
    }

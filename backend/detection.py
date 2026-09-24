from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime

def parse_iso_timestamp(ts_str: str) -> Optional[datetime]:
    """Parse ISO timestamp strings into datetime objects for time delta calculations."""
    if not ts_str:
        return None
    try:
        cleaned = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)
    except Exception:
        return None

def analyze_wash_trading(
    transfers: List[Dict[str, Any]], 
    opensea_market_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Deterministic 0-100 Wash Trading Detection Engine.
    Analyzes normalized transfer activity and OpenSea market context for 7 explainable signals.
    """
    if not transfers:
        return {
            "risk_score": 0,
            "risk_level": "LOW WASH-TRADING RISK",
            "signals": [
                {
                    "name": "Repeated Trading",
                    "score": 0,
                    "max_score": 25,
                    "detected": False,
                    "evidence": ["Insufficient transfer history to analyze."]
                },
                {
                    "name": "Circular Trading",
                    "score": 0,
                    "max_score": 20,
                    "detected": False,
                    "evidence": ["Insufficient transfer history to analyze."]
                },
                {
                    "name": "Shared Funding",
                    "score": 0,
                    "max_score": 15,
                    "detected": False,
                    "evidence": ["No shared funding patterns identified in current dataset."]
                },
                {
                    "name": "Rapid Trading",
                    "score": 0,
                    "max_score": 10,
                    "detected": False,
                    "evidence": ["Insufficient transfer history to analyze."]
                },
                {
                    "name": "Price / Value Anomaly",
                    "score": 0,
                    "max_score": 15,
                    "detected": False,
                    "evidence": ["No price anomalies identified in current dataset."]
                },
                {
                    "name": "Wallet Behavior",
                    "score": 0,
                    "max_score": 10,
                    "detected": False,
                    "evidence": ["Insufficient wallet interaction history."]
                },
                {
                    "name": "Funding / Gas Relationship",
                    "score": 0,
                    "max_score": 5,
                    "detected": False,
                    "evidence": ["No gas funding anomalies detected."]
                }
            ],
            "disclaimer": "This score represents wash-trading risk indicators based on on-chain patterns and does not constitute proof of illegal activity or confirmed wallet ownership."
        }

    # Signal 1: Repeated Trading (Max: 25 points)
    repeated_score = 0
    repeated_evidence = []
    pair_counts: Dict[Tuple[str, str], int] = {}
    
    for tx in transfers:
        from_addr = tx.get("from", "").lower()
        to_addr = tx.get("to", "").lower()
        if from_addr and to_addr and from_addr != "0x0000000000000000000000000000000000000000":
            pair = tuple(sorted([from_addr, to_addr]))
            pair_counts[pair] = pair_counts.get(pair, 0) + 1

    suspicious_pairs = {p: count for p, count in pair_counts.items() if count >= 2}
    if suspicious_pairs:
        max_interactions = max(suspicious_pairs.values())
        repeated_score = 25 if max_interactions >= 3 else 15
        for (w1, w2), count in suspicious_pairs.items():
            repeated_evidence.append(
                f"Wallets {w1[:8]}... and {w2[:8]}... traded this NFT back and forth {count} times."
            )

    # Signal 2: Circular Trading (Max: 20 points)
    circular_score = 0
    circular_evidence = []
    transfer_path = []
    for tx in transfers:
        from_addr = tx.get("from", "").lower()
        to_addr = tx.get("to", "").lower()
        if from_addr and to_addr and from_addr != "0x0000000000000000000000000000000000000000":
            transfer_path.append((from_addr, to_addr, tx.get("tx_hash", "")))

    visited_wallets = []
    cycle_detected = False
    for from_addr, to_addr, tx_hash in transfer_path:
        if not visited_wallets:
            visited_wallets.append(from_addr)
        
        if to_addr in visited_wallets:
            cycle_detected = True
            cycle_start_idx = visited_wallets.index(to_addr)
            cycle_nodes = visited_wallets[cycle_start_idx:] + [to_addr]
            short_cycle = " -> ".join([w[:8] + "..." for w in cycle_nodes])
            circular_evidence.append(f"Circular transfer path identified: {short_cycle}")
        visited_wallets.append(to_addr)

    if cycle_detected:
        circular_score = 20

    # Signal 3: Shared Funding (Max: 15 points)
    shared_funding_score = 0
    shared_funding_evidence = []
    funding_sources: Dict[str, List[str]] = {}
    for tx in transfers:
        from_addr = tx.get("from", "").lower()
        to_addr = tx.get("to", "").lower()
        funding_source = tx.get("funding_source") or tx.get("from_funding_source")
        if funding_source:
            if funding_source not in funding_sources:
                funding_sources[funding_source] = []
            if from_addr and from_addr not in funding_sources[funding_source]:
                funding_sources[funding_source].append(from_addr)
            if to_addr and to_addr not in funding_sources[funding_source]:
                funding_sources[funding_source].append(to_addr)

    for source, wallets in funding_sources.items():
        if len(wallets) >= 2:
            shared_funding_score = 15
            shared_funding_evidence.append(
                f"Wallets {', '.join([w[:8]+'...' for w in wallets])} received funding from source {source[:8]}..., indicating a shared funding relationship."
            )

    if not shared_funding_evidence:
        shared_funding_evidence.append("No shared funding source identified in available transfer data.")

    # Signal 4: Rapid Trading (Max: 10 points)
    rapid_score = 0
    rapid_evidence = []
    timestamps = []
    for tx in transfers:
        ts = parse_iso_timestamp(tx.get("timestamp"))
        if ts:
            timestamps.append((ts, tx.get("tx_hash", "")))

    timestamps.sort(key=lambda x: x[0])
    rapid_intervals = []
    for i in range(1, len(timestamps)):
        t_prev, h_prev = timestamps[i-1]
        t_curr, h_curr = timestamps[i]
        diff_hours = (t_curr - t_prev).total_seconds() / 3600.0
        if diff_hours < 24.0:
            rapid_intervals.append((diff_hours, h_prev, h_curr))

    if rapid_intervals:
        min_diff = min(item[0] for item in rapid_intervals)
        rapid_score = 10 if min_diff < 6.0 else 5
        for diff_h, h1, h2 in rapid_intervals[:3]:
            if diff_h < 1.0:
                mins = int(diff_h * 60)
                rapid_evidence.append(f"Rapid transfer occurred within {mins} minutes between Tx {h1[:8]}... and Tx {h2[:8]}...")
            else:
                rapid_evidence.append(f"Rapid transfer occurred within {diff_h:.1f} hours between Tx {h1[:8]}... and Tx {h2[:8]}...")

    # Signal 5: Price / Value Anomaly (Max: 15 points)
    price_score = 0
    price_evidence = []
    values = [tx.get("value") for tx in transfers if tx.get("value") is not None and tx.get("value") > 0]
    
    if len(values) >= 2:
        max_val = max(values)
        min_val = min(values)
        if min_val > 0 and (max_val / min_val) >= 2.5:
            price_score = 15
            price_evidence.append(f"Price anomaly detected: Maximum transfer value ({max_val} ETH) is {max_val/min_val:.1f}x the minimum non-zero value ({min_val} ETH).")
        elif len(values) != len(set(values)) and len(values) >= 3:
            price_score = 10
            price_evidence.append(f"Repeated exact transfer value of {values[0]} ETH detected across multiple transfers.")

    # Incorporate OpenSea market context as supporting evidence
    if opensea_market_data and opensea_market_data.get("is_available"):
        floor = opensea_market_data.get("floor_price")
        if floor and values:
            max_val = max(values)
            if max_val > (floor * 2.5):
                price_evidence.append(
                    f"OpenSea Market Context: Transfer value ({max_val} ETH) is significantly higher than collection floor price ({floor} ETH)."
                )

    if not price_evidence:
        price_evidence.append("No price anomalies or extreme price jumps detected in available transfer value data.")

    # Signal 6: Wallet Behavior (Max: 10 points)
    wallet_score = 0
    wallet_evidence = []
    wallet_frequency: Dict[str, int] = {}
    for tx in transfers:
        f = tx.get("from", "").lower()
        t = tx.get("to", "").lower()
        if f and f != "0x0000000000000000000000000000000000000000":
            wallet_frequency[f] = wallet_frequency.get(f, 0) + 1
        if t:
            wallet_frequency[t] = wallet_frequency.get(t, 0) + 1

    high_freq_wallets = {w: count for w, count in wallet_frequency.items() if count >= 3}
    if high_freq_wallets:
        wallet_score = 10
        for w, count in high_freq_wallets.items():
            wallet_evidence.append(f"Wallet {w[:8]}... repeatedly bought/sold this single NFT asset {count} times.")

    if not wallet_evidence:
        wallet_evidence.append("Wallet participation frequency remains within normal bounds.")

    # Signal 7: Funding / Gas Relationship (Max: 5 points)
    gas_score = 0
    gas_evidence = []
    for tx in transfers:
        if tx.get("is_zero_day_funded"):
            gas_score = 5
            gas_evidence.append(f"Wallet {tx.get('to', '')[:8]}... received gas funding immediately prior to transfer.")

    if not gas_evidence:
        gas_evidence.append("No zero-day gas funding relationships detected.")

    raw_total_score = (
        repeated_score + 
        circular_score + 
        shared_funding_score + 
        rapid_score + 
        price_score + 
        wallet_score + 
        gas_score
    )
    final_score = min(100, max(0, raw_total_score))

    if final_score >= 60:
        risk_level = "HIGH WASH-TRADING RISK"
    elif final_score >= 30:
        risk_level = "SUSPICIOUS ACTIVITY"
    else:
        risk_level = "LOW WASH-TRADING RISK"

    signals = [
        {
            "name": "Repeated Trading",
            "score": repeated_score,
            "max_score": 25,
            "detected": repeated_score > 0,
            "evidence": repeated_evidence if repeated_evidence else ["No repeated trading between identical wallet pairs detected."]
        },
        {
            "name": "Circular Trading",
            "score": circular_score,
            "max_score": 20,
            "detected": circular_score > 0,
            "evidence": circular_evidence if circular_evidence else ["No circular transfer loops detected."]
        },
        {
            "name": "Shared Funding",
            "score": shared_funding_score,
            "max_score": 15,
            "detected": shared_funding_score > 0,
            "evidence": shared_funding_evidence
        },
        {
            "name": "Rapid Trading",
            "score": rapid_score,
            "max_score": 10,
            "detected": rapid_score > 0,
            "evidence": rapid_evidence if rapid_evidence else ["Transfers occurred across normal time intervals."]
        },
        {
            "name": "Price / Value Anomaly",
            "score": price_score,
            "max_score": 15,
            "detected": price_score > 0,
            "evidence": price_evidence
        },
        {
            "name": "Wallet Behavior",
            "score": wallet_score,
            "max_score": 10,
            "detected": wallet_score > 0,
            "evidence": wallet_evidence
        },
        {
            "name": "Funding / Gas Relationship",
            "score": gas_score,
            "max_score": 5,
            "detected": gas_score > 0,
            "evidence": gas_evidence
        }
    ]

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "signals": signals,
        "disclaimer": "This score represents wash-trading risk indicators based on on-chain patterns and does not constitute proof of illegal activity or confirmed wallet ownership."
    }

import React, { useState, useMemo } from 'react';

export default function WalletGraph({ transfers = [], signals = [] }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  // Extract unique nodes and directed edges from transfers
  const graphData = useMemo(() => {
    if (!transfers || transfers.length === 0) return { nodes: [], edges: [] };

    // Limit to most relevant transfers (top 12 max to keep graph clean and readable)
    const activeTransfers = transfers.slice(0, 12);

    const nodeMap = new Map();
    const edgeList = [];

    // Identify wallets involved in circular trades for visual highlighting
    const circularSignal = signals.find((s) => s.name === 'Circular Trading' && s.detected);
    const circularWallets = new Set();
    if (circularSignal) {
      activeTransfers.forEach((tx) => {
        if (tx.from) circularWallets.add(tx.from.toLowerCase());
        if (tx.to) circularWallets.add(tx.to.toLowerCase());
      });
    }

    activeTransfers.forEach((tx, idx) => {
      const fromAddr = (tx.from || '0x0000000000000000000000000000000000000000').toLowerCase();
      const toAddr = (tx.to || '0x0000000000000000000000000000000000000000').toLowerCase();

      if (!nodeMap.has(fromAddr)) {
        nodeMap.set(fromAddr, {
          id: fromAddr,
          label: fromAddr === '0x0000000000000000000000000000000000000000' ? 'Mint (Null)' : `${fromAddr.slice(0, 6)}...${fromAddr.slice(-4)}`,
          isMint: fromAddr === '0x0000000000000000000000000000000000000000',
          isCircular: circularWallets.has(fromAddr) && fromAddr !== '0x0000000000000000000000000000000000000000',
          txCount: 0,
        });
      }
      if (!nodeMap.has(toAddr)) {
        nodeMap.set(toAddr, {
          id: toAddr,
          label: toAddr === '0x0000000000000000000000000000000000000000' ? 'Mint (Null)' : `${toAddr.slice(0, 6)}...${toAddr.slice(-4)}`,
          isMint: toAddr === '0x0000000000000000000000000000000000000000',
          isCircular: circularWallets.has(toAddr) && toAddr !== '0x0000000000000000000000000000000000000000',
          txCount: 0,
        });
      }

      nodeMap.get(fromAddr).txCount += 1;
      nodeMap.get(toAddr).txCount += 1;

      edgeList.push({
        id: `edge-${idx}`,
        source: fromAddr,
        target: toAddr,
        hash: tx.tx_hash || 'N/A',
        value: tx.value,
        timestamp: tx.timestamp,
        asset: tx.asset || 'NFT',
      });
    });

    const nodes = Array.from(nodeMap.values());
    const count = nodes.length;

    // Calculate circular layout positions
    const width = 650;
    const height = 360;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    nodes.forEach((node, i) => {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });

    return { nodes, edges: edgeList, width, height };
  }, [transfers, signals]);

  if (graphData.nodes.length === 0) {
    return (
      <div className="placeholder-text" style={{ textAlign: 'center', padding: '2rem' }}>
        No transaction graph data available.
      </div>
    );
  }

  // Find node by ID
  const getNode = (id) => graphData.nodes.find((n) => n.id === id);

  // Selected node details for evidence inspection
  const selectedNodeData = selectedNode ? getNode(selectedNode) : null;
  const selectedNodeTxs = selectedNode
    ? graphData.edges.filter((e) => e.source === selectedNode || e.target === selectedNode)
    : [];

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Graph Legend & Controls */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1a8a6b', display: 'inline-block' }}></span>
            Standard Wallet
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }}></span>
            Circular / Wash Pair
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#64748b', display: 'inline-block' }}></span>
            Mint / Null Address
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)' }}>Click any wallet node to inspect evidence</span>
      </div>

      {/* Interactive SVG Network Graph */}
      <div
        style={{
          background: 'rgba(244, 248, 246, 0.95)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox={`0 0 ${graphData.width} ${graphData.height}`}
          style={{ width: '100%', height: 'auto', maxHeight: '400px' }}
        >
          <defs>
            {/* Standard Cyan Arrow Marker */}
            <marker
              id="arrow-cyan"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#1a8a6b" />
            </marker>

            {/* Red Cycle Arrow Marker */}
            <marker
              id="arrow-red"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>

            {/* Highlight Glow Marker */}
            <marker
              id="arrow-amber"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Render Edges */}
          {graphData.edges.map((edge) => {
            const sourceNode = getNode(edge.source);
            const targetNode = getNode(edge.target);
            if (!sourceNode || !targetNode) return null;

            const isSelected = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
            const isHovered = hoveredEdge === edge.id || hoveredNode === edge.source || hoveredNode === edge.target;
            const isCircularEdge = sourceNode.isCircular && targetNode.isCircular;

            // Compute curved arc for directed edges
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.2;

            const strokeColor = isHovered || isSelected ? '#d97706' : isCircularEdge ? '#ef4444' : '#1a8a6b';
            const markerId = isHovered || isSelected ? 'url(#arrow-amber)' : isCircularEdge ? 'url(#arrow-red)' : 'url(#arrow-cyan)';
            const strokeWidth = isHovered || isSelected ? 3 : isCircularEdge ? 2.5 : 1.5;

            // Midpoint label coordinates for ETH value
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;

            return (
              <g key={edge.id} onMouseEnter={() => setHoveredEdge(edge.id)} onMouseLeave={() => setHoveredEdge(null)}>
                {/* Directed Edge Line */}
                <path
                  d={`M ${sourceNode.x} ${sourceNode.y} A ${dr} ${dr} 0 0 1 ${targetNode.x} ${targetNode.y}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isCircularEdge ? 'none' : '4,2'}
                  markerEnd={markerId}
                  style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                />

                {/* ETH Value Label on Edge */}
                {edge.value !== undefined && edge.value !== null && (
                  <text
                    x={midX}
                    y={midY - 6}
                    fill={strokeColor}
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none' }}
                  >
                    {edge.value} ETH
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {graphData.nodes.map((node) => {
            const isSelected = selectedNode === node.id;
            const isHovered = hoveredNode === node.id;
            const fillColor = node.isMint ? '#8a9baa' : node.isCircular ? '#ef4444' : '#1a8a6b';
            const strokeColor = isSelected ? '#d97706' : isHovered ? '#1a2332' : 'rgba(26, 35, 50, 0.3)';
            const radius = isSelected || isHovered ? 16 : 13;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow ring for selected or circular nodes */}
                {(isSelected || node.isCircular) && (
                  <circle
                    r={radius + 6}
                    fill="none"
                    stroke={node.isCircular ? 'rgba(239, 68, 68, 0.35)' : 'rgba(217, 119, 6, 0.35)'}
                    strokeWidth="2"
                  >
                    <animate attributeName="r" values={`${radius + 4};${radius + 9};${radius + 4}`} dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Node Circle */}
                <circle
                  r={radius}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* Node Text Label */}
                <text
                  y={radius + 14}
                  fill={isSelected ? '#d97706' : isHovered ? '#1a2332' : '#5a6b7a'}
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fontWeight={isSelected || isHovered ? '700' : '500'}
                  textAnchor="middle"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredEdge && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              background: 'rgba(255, 255, 255, 0.97)',
              border: '1px solid #1a8a6b',
              borderRadius: '8px',
              padding: '0.6rem 0.85rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: '#1a2332',
              zIndex: 10,
              boxShadow: '0 6px 16px rgba(26, 35, 50, 0.12)',
            }}
          >
            {(() => {
              const edge = graphData.edges.find((e) => e.id === hoveredEdge);
              if (!edge) return null;
              return (
                <div>
                  <div style={{ color: '#1a8a6b', fontWeight: '700', marginBottom: '0.2rem' }}>Directed Transaction Edge</div>
                  <div>Tx Hash: <span style={{ color: '#1a2332' }}>{edge.hash.slice(0, 14)}...{edge.hash.slice(-6)}</span></div>
                  <div>From: <span style={{ color: '#5a6b7a' }}>{edge.source.slice(0, 8)}...</span> → To: <span style={{ color: '#5a6b7a' }}>{edge.target.slice(0, 8)}...</span></div>
                  <div>Value: <span style={{ color: '#10b981', fontWeight: '700' }}>{edge.value !== null && edge.value !== undefined ? `${edge.value} ETH` : 'Transfer (0 ETH)'}</span></div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Wallet Inspection Panel (When a node is clicked) */}
      {selectedNodeData && (
        <div
          style={{
            marginTop: '1rem',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #d97706',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#d97706', fontSize: '1rem' }}>🔍</span>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1a2332' }}>
                Inspected Wallet: <span style={{ fontFamily: 'var(--font-mono)', color: '#1a8a6b' }}>{selectedNodeData.id}</span>
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'rgba(26, 35, 50, 0.06)',
                border: 'none',
                color: '#5a6b7a',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Close Inspection
            </button>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#5a6b7a', marginBottom: '0.75rem' }}>
            Participated in <strong style={{ color: '#1a2332' }}>{selectedNodeTxs.length}</strong> recorded transfers for this NFT.
            {selectedNodeData.isCircular && (
              <span style={{ color: '#ef4444', marginLeft: '0.5rem', fontWeight: '600' }}>
                ⚠️ Flagged in Circular Trading Pattern
              </span>
            )}
          </div>

          {/* Table of Evidence Transactions for this Wallet */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.4rem' }}>Role</th>
                  <th style={{ padding: '0.4rem' }}>Tx Hash</th>
                  <th style={{ padding: '0.4rem' }}>Counterparty</th>
                  <th style={{ padding: '0.4rem' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {selectedNodeTxs.map((tx, idx) => {
                  const isSender = tx.source === selectedNode;
                  const counterparty = isSender ? tx.target : tx.source;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(200, 215, 210, 0.4)' }}>
                      <td style={{ padding: '0.4rem', color: isSender ? '#f97316' : '#10b981', fontWeight: '600' }}>
                        {isSender ? 'SENDER (OUT)' : 'RECEIVER (IN)'}
                      </td>
                      <td style={{ padding: '0.4rem', color: '#1a8a6b' }}>
                        {tx.hash ? `${tx.hash.slice(0, 10)}...` : 'N/A'}
                      </td>
                      <td style={{ padding: '0.4rem', color: '#5a6b7a' }}>
                        {counterparty.slice(0, 8)}...{counterparty.slice(-4)}
                      </td>
                      <td style={{ padding: '0.4rem', color: '#10b981', fontWeight: 'bold' }}>
                        {tx.value !== null && tx.value !== undefined ? `${tx.value} ETH` : '0 ETH'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

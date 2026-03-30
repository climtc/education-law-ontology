import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { CURRICULUM_HIERARCHY, SUBJECT_COLORS, CURRICULUM_META } from "./curriculumData";

// ============================================================================
// HELPERS
// ============================================================================

function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function getNodeColor(node) {
  if (node.data.type === "교과") {
    return SUBJECT_COLORS[node.data.name] || "#94a3b8";
  }
  // Find parent subject (교과)
  let parent = node.parent;
  while (parent) {
    if (parent.data.type === "교과") {
      return SUBJECT_COLORS[parent.data.name] || "#94a3b8";
    }
    parent = parent.parent;
  }
  return "#94a3b8";
}

function getNodeRadius(node) {
  const depthMap = {
    교육과정: 20,
    교과: 14,
    학년군: 10,
    내용영역: 8,
    성취기준: 5,
  };
  return depthMap[node.data.type] || 8;
}

function getBreadcrumb(node) {
  const parts = [];
  let current = node;
  while (current) {
    if (current.data.type !== "교육과정") {
      parts.unshift(current.data.name);
    }
    current = current.parent;
  }
  return parts;
}

function searchMatches(node, query) {
  if (!query) return false;
  const lowerQuery = query.toLowerCase();

  if (node.data.type === "성취기준") {
    const code = node.data.name.toLowerCase();
    const text = (node.data.text || "").toLowerCase();
    return code.includes(lowerQuery) || text.includes(lowerQuery);
  }
  return false;
}

function hasMatchingDescendant(node, query) {
  if (!query) return true;
  if (searchMatches(node, query)) return true;
  if (node.children) {
    return node.children.some((child) => hasMatchingDescendant(child, query));
  }
  return false;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CurriculumOntology() {
  const svgRef = useRef(null);
  const [selectedSubjects, setSelectedSubjects] = useState(new Set(Object.keys(SUBJECT_COLORS)));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [hierarchyData, setHierarchyData] = useState(null);

  // Initialize expanded nodes (root + all 교과 nodes)
  useEffect(() => {
    const expanded = new Set();
    expanded.add("2022 개정 교육과정");
    if (CURRICULUM_HIERARCHY.children) {
      CURRICULUM_HIERARCHY.children.forEach((subject) => {
        expanded.add(subject.name);
      });
    }
    setExpandedNodes(expanded);
    setHierarchyData(CURRICULUM_HIERARCHY);
  }, []);

  // Count visible standards
  function countVisibleStandards() {
    if (!hierarchyData) return 0;

    function countMatching(node) {
      if (node.type === "성취기준") {
        return searchMatches({ data: node }, searchQuery) && selectedSubjects.has(getSubjectName(node)) ? 1 : 0;
      }
      if (!node.children) return 0;
      return node.children.reduce((sum, child) => sum + countMatching(child), 0);
    }

    return countMatching(hierarchyData);
  }

  function getSubjectName(node) {
    let current = node;
    while (current) {
      if (current.type === "교과") return current.name;
      current = current.parent;
    }
    return null;
  }

  // Toggle subject filter
  function toggleSubject(subject) {
    const newSet = new Set(selectedSubjects);
    if (newSet.has(subject)) {
      newSet.delete(subject);
    } else {
      newSet.add(subject);
    }
    setSelectedSubjects(newSet);
  }

  // Expand/collapse all
  function expandAll() {
    const expanded = new Set();
    function collectAll(node) {
      expanded.add(node.name);
      if (node.children) {
        node.children.forEach(collectAll);
      }
    }
    collectAll(hierarchyData);
    setExpandedNodes(expanded);
  }

  function collapseAll() {
    const expanded = new Set();
    expanded.add("2022 개정 교육과정");
    if (CURRICULUM_HIERARCHY.children) {
      CURRICULUM_HIERARCHY.children.forEach((subject) => {
        expanded.add(subject.name);
      });
    }
    setExpandedNodes(expanded);
  }

  // D3 Tree Visualization
  useEffect(() => {
    if (!svgRef.current || !hierarchyData) return;

    // Filter data based on subject and search
    function filterNode(node) {
      if (node.type === "교과" && !selectedSubjects.has(node.name)) {
        return false;
      }

      if (node.type === "성취기준") {
        const subject = getSubjectName(node);
        if (!selectedSubjects.has(subject)) return false;
        if (searchQuery && !searchMatches({ data: node }, searchQuery)) return false;
        return true;
      }

      if (node.children) {
        const hasValidChild = node.children.some(filterNode);
        return hasValidChild || node.type !== "성취기준";
      }

      return true;
    }

    function buildFilteredTree(node) {
      if (!filterNode(node)) return null;

      const filtered = { ...node };
      if (node.children) {
        filtered.children = node.children
          .map(buildFilteredTree)
          .filter((child) => child !== null);
      }
      return filtered;
    }

    const filteredData = buildFilteredTree(hierarchyData);
    if (!filteredData) return;

    // Create hierarchy
    const root = d3.hierarchy(filteredData);
    const treeLayout = d3.tree().size([800, 1200]);
    treeLayout(root);

    // SVG setup
    const container = svgRef.current;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 800;

    let svg = d3.select(svgRef.current).select("svg");
    if (svg.empty()) {
      svg = d3
        .select(svgRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "#0a0e17");
    } else {
      svg.attr("width", width).attr("height", height);
    }

    // Clear previous content
    svg.selectAll("*").remove();

    // Add group for zoom/pan
    let g = svg.append("g");

    // Add zoom behavior
    const zoom = d3.zoom().on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    svg.call(zoom);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3
          .linkHorizontal()
          .x((d) => d.y)
          .y((d) => d.x)
      )
      .attr("fill", "none")
      .attr("stroke", "#334155")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Nodes
    const nodes = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    // Node circles
    nodes
      .append("circle")
      .attr("r", (d) => getNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d))
      .attr("opacity", 0.8)
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("opacity", 1).attr("stroke-width", 2);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("opacity", 0.8).attr("stroke-width", 1);
      })
      .on("click", (event, d) => {
        event.stopPropagation();

        if (d.data.children && d.data.children.length > 0) {
          const newExpanded = new Set(expandedNodes);
          if (newExpanded.has(d.data.name)) {
            newExpanded.delete(d.data.name);
          } else {
            newExpanded.add(d.data.name);
          }
          setExpandedNodes(newExpanded);
        } else {
          setSelectedNode(d);
        }
      });

    // Node labels
    nodes
      .append("text")
      .attr("dy", ".35em")
      .attr("x", (d) => {
        const isLeaf = !d.children || d.children.length === 0;
        return isLeaf ? getNodeRadius(d) + 8 : -(getNodeRadius(d) + 8);
      })
      .attr("text-anchor", (d) => {
        const isLeaf = !d.children || d.children.length === 0;
        return isLeaf ? "start" : "end";
      })
      .attr("fill", "#e2e8f0")
      .attr("font-size", "12px")
      .attr("font-family", "system-ui, sans-serif")
      .attr("pointer-events", "none")
      .text((d) => d.data.name)
      .each(function (d) {
        const text = d3.select(this);
        const bbox = this.getBBox();
        if (bbox.width > 150) {
          const words = d.data.name.split(/[\[\]()]/);
          text.text(words[0] || d.data.name);
        }
      });

    // Tooltips on hover
    nodes.append("title").text((d) => {
      let title = `${d.data.name}`;
      if (d.data.type) title += ` (${d.data.type})`;
      if (d.children) title += ` [${d.children.length} children]`;
      return title;
    });

    // Initial transform
    const initialScale = 0.9;
    svg.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 4, height / 2)
        .scale(initialScale)
    );
  }, [hierarchyData, selectedSubjects, searchQuery, expandedNodes]);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100vh",
        backgroundColor: "#0a0e17",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* LEFT SIDEBAR */}
      <div
        style={{
          width: "300px",
          backgroundColor: "#111827",
          borderRight: "1px solid #1e293b",
          padding: "20px",
          overflowY: "auto",
          color: "#e2e8f0",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px" }}>
          📚 2022 개정 교육과정
        </h2>

        {/* Search Input */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="성취기준 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "6px",
              color: "#e2e8f0",
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Subject Filters */}
        <div style={{ marginBottom: "20px" }}>
          <h3
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#94a3b8",
              marginBottom: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            교과 필터
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {Object.entries(SUBJECT_COLORS).map(([subject, color]) => (
              <button
                key={subject}
                onClick={() => toggleSubject(subject)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid " + color,
                  backgroundColor: selectedSubjects.has(subject)
                    ? color + "33"
                    : "transparent",
                  color: selectedSubjects.has(subject) ? color : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (selectedSubjects.has(subject)) {
                    e.target.style.backgroundColor = color + "4d";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSubjects.has(subject)) {
                    e.target.style.backgroundColor = color + "33";
                  }
                }}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div
          style={{
            padding: "12px",
            backgroundColor: "#1e293b",
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "#cbd5e1",
          }}
        >
          <div style={{ lineHeight: "1.6" }}>
            <div>전체: {CURRICULUM_META.totalStandards}개 성취기준</div>
            <div>표시: {countVisibleStandards()}개</div>
          </div>
        </div>

        {/* Expand/Collapse Buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={expandAll}
            style={{
              flex: 1,
              padding: "8px 12px",
              backgroundColor: "#374151",
              color: "#e2e8f0",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#4b5563")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#374151")}
          >
            전체 펼치기
          </button>
          <button
            onClick={collapseAll}
            style={{
              flex: 1,
              padding: "8px 12px",
              backgroundColor: "#374151",
              color: "#e2e8f0",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#4b5563")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#374151")}
          >
            전체 접기
          </button>
        </div>
      </div>

      {/* CENTER - D3 TREE VISUALIZATION */}
      <div
        ref={svgRef}
        style={{
          flex: 1,
          backgroundColor: "#0a0e17",
          position: "relative",
          borderRight: selectedNode ? "1px solid #1e293b" : "none",
        }}
      />

      {/* RIGHT DETAIL PANEL */}
      {selectedNode && (
        <div
          style={{
            width: "350px",
            backgroundColor: "#111827",
            borderLeft: "1px solid #1e293b",
            padding: "20px",
            overflowY: "auto",
            color: "#e2e8f0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedNode(null)}
            style={{
              alignSelf: "flex-end",
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "20px",
              cursor: "pointer",
              padding: "0",
              marginBottom: "16px",
            }}
          >
            ×
          </button>

          {/* Node Type Badge */}
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              backgroundColor: getNodeColor(selectedNode) + "33",
              color: getNodeColor(selectedNode),
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "600",
              marginBottom: "12px",
              width: "fit-content",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {selectedNode.data.type}
          </div>

          {/* Node Name */}
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "700",
              marginBottom: "16px",
              color: "#f8fafc",
              wordWrap: "break-word",
            }}
          >
            {selectedNode.data.name}
          </h1>

          {/* Breadcrumb */}
          <div
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              marginBottom: "20px",
              paddingBottom: "12px",
              borderBottom: "1px solid #1e293b",
            }}
          >
            {getBreadcrumb(selectedNode)
              .map((part, idx) => (
                <span key={idx}>
                  {part}
                  {idx < getBreadcrumb(selectedNode).length - 1 && " > "}
                </span>
              ))
              .reduce((prev, curr) => (prev === null ? [curr] : [prev, " > ", curr]), null)}
          </div>

          {/* Content based on node type */}
          {selectedNode.data.type === "성취기준" ? (
            <div>
              <h3
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#94a3b8",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                성취기준 원문
              </h3>
              <div
                style={{
                  fontSize: "18px",
                  color: "#f8fafc",
                  lineHeight: "1.7",
                  backgroundColor: "#0a0e17",
                  padding: "16px",
                  borderRadius: "6px",
                  border: "1px solid #1e293b",
                  wordWrap: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedNode.data.text || "상세 설명이 없습니다."}
              </div>
            </div>
          ) : (
            <div>
              {selectedNode.children && selectedNode.children.length > 0 && (
                <>
                  <h3
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#94a3b8",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    항목 정보
                  </h3>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#cbd5e1",
                      backgroundColor: "#1e293b",
                      padding: "12px",
                      borderRadius: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    <div>하위 항목: {selectedNode.children.length}개</div>
                  </div>
                </>
              )}
              {selectedNode.data.type === "교과" && (
                <>
                  <h3
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#94a3b8",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    내용 영역
                  </h3>
                  {CURRICULUM_META.subjects[selectedNode.data.name]?.내용영역 && (
                    <ul
                      style={{
                        fontSize: "12px",
                        color: "#cbd5e1",
                        paddingLeft: "0",
                        listStyle: "none",
                      }}
                    >
                      {CURRICULUM_META.subjects[selectedNode.data.name].내용영역.map(
                        (area, idx) => (
                          <li
                            key={idx}
                            style={{
                              padding: "6px 0",
                              borderBottom:
                                idx <
                                CURRICULUM_META.subjects[selectedNode.data.name].내용영역
                                  .length -
                                  1
                                  ? "1px solid #1e293b"
                                  : "none",
                            }}
                          >
                            • {area}
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

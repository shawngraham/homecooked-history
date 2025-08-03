// Graph visualization manager
class GraphManager {
    constructor(notes) {
        this.notes = notes;
        this.svg = null;
        this.simulation = null;
        this.currentNoteId = null;
    }

    updateNotes(notes) {
        this.notes = notes;
    }

    createGraph(container, noteId) {
        this.currentNoteId = noteId;
        const note = this.notes[noteId];
        if (!note) return;

        // Clear previous graph
        container.innerHTML = '';

        // Create SVG
        const width = container.clientWidth || 260;
        const height = 200;
        
        this.svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', 'var(--background)')
            .style('border-radius', '6px');

        // Prepare graph data
        const { nodes, links } = this.prepareGraphData(note);
        
        if (nodes.length === 0) {
            // Show "no connections" message
            this.svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', 'var(--text-muted)')
                .style('font-size', '14px')
                .text('No connections');
            return;
        }

        // Create force simulation
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(60))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(20));

        // Create links
        const link = this.svg.append('g')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', 'var(--border)')
            .attr('stroke-width', 2)
            .attr('opacity', 0.6);

        // Create nodes
        const node = this.svg.append('g')
            .selectAll('g')
            .data(nodes)
            .enter().append('g')
            .call(d3.drag()
                .on('start', (event, d) => this.dragstarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragended(event, d)));

        // Add circles to nodes
        node.append('circle')
            .attr('r', d => d.isCurrent ? 12 : 8)
            .attr('fill', d => d.isCurrent ? 'var(--primary)' : 'var(--surface)')
            .attr('stroke', d => d.isCurrent ? 'var(--primary)' : 'var(--border)')
            .attr('stroke-width', d => d.isCurrent ? 3 : 2)
            .style('cursor', d => d.isCurrent ? 'default' : 'pointer');

        // Add labels to nodes
        node.append('text')
            .text(d => this.truncateText(d.title, 12))
            .attr('font-size', '10px')
            .attr('text-anchor', 'middle')
            .attr('dy', -15)
            .attr('fill', 'var(--text)')
            .style('pointer-events', 'none')
            .style('user-select', 'none');

        // Add click handler for non-current nodes
        node.filter(d => !d.isCurrent)
            .on('click', (event, d) => {
                event.stopPropagation();
                // Trigger note opening - we'll need to pass this callback from the app
                if (this.onNodeClick) {
                    this.onNodeClick(d.id);
                }
            });

        // Update positions on tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    prepareGraphData(currentNote) {
        const nodes = [];
        const links = [];
        const processedNotes = new Set();

        // Add current note as central node
        nodes.push({
            id: currentNote.id,
            title: currentNote.title,
            isCurrent: true
        });
        processedNotes.add(currentNote.id);

        // Get outgoing links from current note
        const outgoingLinks = currentNote.getOutgoingLinks();
        outgoingLinks.forEach(linkTitle => {
            const targetNote = Object.values(this.notes).find(n => 
                n.title.toLowerCase() === linkTitle.toLowerCase()
            );
            
            if (targetNote && !processedNotes.has(targetNote.id)) {
                nodes.push({
                    id: targetNote.id,
                    title: targetNote.title,
                    isCurrent: false
                });
                processedNotes.add(targetNote.id);
                
                links.push({
                    source: currentNote.id,
                    target: targetNote.id,
                    type: 'outgoing'
                });
            }
        });

        // Get incoming links (backlinks) to current note
        Object.values(this.notes).forEach(note => {
            if (note.id !== currentNote.id) {
                const noteLinks = note.getOutgoingLinks();
                if (noteLinks.some(link => link.toLowerCase() === currentNote.title.toLowerCase())) {
                    if (!processedNotes.has(note.id)) {
                        nodes.push({
                            id: note.id,
                            title: note.title,
                            isCurrent: false
                        });
                        processedNotes.add(note.id);
                    }
                    
                    links.push({
                        source: note.id,
                        target: currentNote.id,
                        type: 'incoming'
                    });
                }
            }
        });

        return { nodes, links };
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        if (this.svg) {
            this.svg.remove();
            this.svg = null;
        }
    }

    // Enhanced CSV export with rich metadata
    exportNetworkCSV(noteId, includeMetadata = true) {
        const note = this.notes[noteId];
        if (!note) return null;

        const { nodes, links } = this.prepareGraphData(note);
        
        // Enhanced edges CSV with comprehensive metadata
        const edgesHeaders = includeMetadata 
            ? 'source_id,target_id,source_title,target_title,link_type,source_created,target_created,source_modified,target_modified,source_word_count,target_word_count,source_outgoing_links,target_outgoing_links,source_tags,target_tags,weight'
            : 'source_id,target_id,source_title,target_title,link_type';
        
        const edgesRows = links.map(link => {
            const sourceNote = this.notes[link.source];
            const targetNote = this.notes[link.target];
            
            if (includeMetadata && sourceNote && targetNote) {
                // Calculate metadata for both notes
                const sourceContent = sourceNote.getContentWithoutMetadata();
                const targetContent = targetNote.getContentWithoutMetadata();
                const sourceWordCount = sourceContent.trim() ? sourceContent.trim().split(/\s+/).length : 0;
                const targetWordCount = targetContent.trim() ? targetContent.trim().split(/\s+/).length : 0;
                const sourceOutgoingLinks = sourceNote.getOutgoingLinks().length;
                const targetOutgoingLinks = targetNote.getOutgoingLinks().length;
                
                // Parse metadata for tags
                const sourceMetadata = sourceNote.parseMetadata();
                const targetMetadata = targetNote.parseMetadata();
                const sourceTags = Array.isArray(sourceMetadata.tags) ? sourceMetadata.tags.join(';') : '';
                const targetTags = Array.isArray(targetMetadata.tags) ? targetMetadata.tags.join(';') : '';

                return `"${link.source}","${link.target}","${this.escapeCsvValue(sourceNote.title)}","${this.escapeCsvValue(targetNote.title)}","${link.type}","${new Date(sourceNote.created).toISOString()}","${new Date(targetNote.created).toISOString()}","${new Date(sourceNote.modified).toISOString()}","${new Date(targetNote.modified).toISOString()}",${sourceWordCount},${targetWordCount},${sourceOutgoingLinks},${targetOutgoingLinks},"${this.escapeCsvValue(sourceTags)}","${this.escapeCsvValue(targetTags)}",1`;
            } else {
                const sourceTitle = sourceNote ? sourceNote.title : 'Unknown';
                const targetTitle = targetNote ? targetNote.title : 'Unknown';
                return `"${link.source}","${link.target}","${this.escapeCsvValue(sourceTitle)}","${this.escapeCsvValue(targetTitle)}","${link.type}"`;
            }
        });

        const edgesCSV = [edgesHeaders, ...edgesRows].join('\n');

        // Enhanced nodes CSV with comprehensive metadata
        const nodesHeaders = includeMetadata
            ? 'id,title,is_current,node_type,created,modified,word_count,character_count,outgoing_links_count,incoming_links_count,tags,first_paragraph,last_modified_days_ago'
            : 'id,title,is_current,node_type';

        const nodesRows = nodes.map(node => {
            const noteData = this.notes[node.id];
            if (includeMetadata && noteData) {
                const content = noteData.getContentWithoutMetadata();
                const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
                const charCount = content.length;
                const outgoingCount = noteData.getOutgoingLinks().length;
                
                // Count incoming links (backlinks)
                const incomingCount = Object.values(this.notes).filter(n => 
                    n.id !== noteData.id && 
                    n.getOutgoingLinks().some(link => 
                        link.toLowerCase() === noteData.title.toLowerCase()
                    )
                ).length;
                
                // Get tags from metadata
                const metadata = noteData.parseMetadata();
                const tags = Array.isArray(metadata.tags) ? metadata.tags.join(';') : '';
                
                // Extract first paragraph
                const paragraphs = content.split('\n\n').filter(p => p.trim());
                const firstParagraph = paragraphs.length > 0 ? paragraphs[0].replace(/\n/g, ' ').substring(0, 100) : '';
                
                // Calculate days since last modification
                const daysSinceModified = Math.floor((Date.now() - noteData.modified) / (1000 * 60 * 60 * 24));

                return `"${node.id}","${this.escapeCsvValue(node.title)}","${node.isCurrent}","${node.isCurrent ? 'focal' : 'connected'}","${new Date(noteData.created).toISOString()}","${new Date(noteData.modified).toISOString()}",${wordCount},${charCount},${outgoingCount},${incomingCount},"${this.escapeCsvValue(tags)}","${this.escapeCsvValue(firstParagraph)}",${daysSinceModified}`;
            } else {
                return `"${node.id}","${this.escapeCsvValue(node.title)}","${node.isCurrent}","${node.isCurrent ? 'focal' : 'connected'}"`;
            }
        });

        const nodesCSV = [nodesHeaders, ...nodesRows].join('\n');

        // Additional network statistics CSV
        const statsCSV = this.generateNetworkStats(noteId, nodes, links);

        return { edgesCSV, nodesCSV, statsCSV };
    }

    // Generate network statistics
// Enhanced network statistics with community detection and centrality analysis
    generateNetworkStats(focalNoteId, nodes, links) {
        const focalNote = this.notes[focalNoteId];
        const totalNodes = nodes.length;
        const totalEdges = links.length;
        const outgoingEdges = links.filter(l => l.type === 'outgoing').length;
        const incomingEdges = links.filter(l => l.type === 'incoming').length;
        
        // Calculate network density
        const maxPossibleEdges = totalNodes * (totalNodes - 1);
        const density = maxPossibleEdges > 0 ? (totalEdges * 2) / maxPossibleEdges : 0;
        
        // Build adjacency list for algorithms
        const adjacencyList = this.buildAdjacencyList(nodes, links);
        
        // Calculate betweenness centrality
        const betweennessCentrality = this.calculateBetweennessCentrality(nodes, adjacencyList);
        const topBetweenness = Object.entries(betweennessCentrality)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([nodeId, centrality]) => {
                const note = this.notes[nodeId];
                return {
                    nodeId,
                    title: note ? note.title : 'Unknown',
                    centrality: centrality.toFixed(4)
                };
            });
        
        // Detect communities using Louvain algorithm
        const communities = this.detectCommunitiesLouvain(nodes, adjacencyList);
        const communityStats = this.analyzeCommunities(communities, nodes);
        
        // Get degree distribution
        const degrees = {};
        links.forEach(link => {
            degrees[link.source] = (degrees[link.source] || 0) + 1;
            degrees[link.target] = (degrees[link.target] || 0) + 1;
        });
        
        const degreeValues = Object.values(degrees);
        const avgDegree = degreeValues.length > 0 ? degreeValues.reduce((a, b) => a + b, 0) / degreeValues.length : 0;
        const maxDegree = degreeValues.length > 0 ? Math.max(...degreeValues) : 0;
        
        // Build comprehensive stats CSV
        const statsHeaders = 'metric,value,description';
        const basicStats = [
            `"focal_note_id","${focalNoteId}","ID of the central note"`,
            `"focal_note_title","${this.escapeCsvValue(focalNote.title)}","Title of the central note"`,
            `"total_nodes",${totalNodes},"Total number of connected notes"`,
            `"total_edges",${totalEdges},"Total number of connections"`,
            `"outgoing_edges",${outgoingEdges},"Links from focal note to others"`,
            `"incoming_edges",${incomingEdges},"Links from others to focal note"`,
            `"network_density",${density.toFixed(4)},"Ratio of actual to possible connections"`,
            `"average_degree",${avgDegree.toFixed(2)},"Average connections per note"`,
            `"max_degree",${maxDegree},"Maximum connections for any note"`,
            `"num_communities",${communityStats.numCommunities},"Number of detected communities"`,
            `"modularity",${communityStats.modularity.toFixed(4)},"Community structure quality (higher = better separation)"`,
            `"largest_community_size",${communityStats.largestCommunitySize},"Size of the largest community"`,
            `"export_timestamp","${new Date().toISOString()}","When this export was generated"`
        ];
        
        // Add top betweenness centrality nodes
        const betweennessStats = topBetweenness.map((item, index) => 
            `"betweenness_rank_${index + 1}","${item.nodeId}: ${this.escapeCsvValue(item.title)} (${item.centrality})","Node with ${index === 0 ? 'highest' : 'rank ' + (index + 1)} betweenness centrality"`
        );
        
        // Add community information
        const communityInfo = communityStats.communities.map((community, index) => 
            `"community_${index + 1}","${community.nodes.join(';')}","Community ${index + 1} members (${community.size} nodes)"`
        );
        
        const allStats = [
            statsHeaders,
            ...basicStats,
            ...betweennessStats,
            ...communityInfo
        ];
        
        return allStats.join('\n');
    }

    // Build adjacency list representation
    buildAdjacencyList(nodes, links) {
        const adjacencyList = {};
        
        // Initialize all nodes
        nodes.forEach(node => {
            adjacencyList[node.id] = [];
        });
        
        // Add edges (treating as undirected for community detection)
        links.forEach(link => {
            adjacencyList[link.source].push(link.target);
            adjacencyList[link.target].push(link.source);
        });
        
        // Remove duplicates
        Object.keys(adjacencyList).forEach(nodeId => {
            adjacencyList[nodeId] = [...new Set(adjacencyList[nodeId])];
        });
        
        return adjacencyList;
    }

    // Calculate betweenness centrality using Brandes algorithm (simplified)
    calculateBetweennessCentrality(nodes, adjacencyList) {
        const centrality = {};
        const nodeIds = nodes.map(n => n.id);
        
        // Initialize centrality scores
        nodeIds.forEach(nodeId => {
            centrality[nodeId] = 0;
        });
        
        // For each node as source
        nodeIds.forEach(source => {
            // BFS to find shortest paths
            const distances = {};
            const predecessors = {};
            const queue = [source];
            const stack = [];
            
            // Initialize
            nodeIds.forEach(nodeId => {
                distances[nodeId] = -1;
                predecessors[nodeId] = [];
            });
            distances[source] = 0;
            
            // BFS
            while (queue.length > 0) {
                const current = queue.shift();
                stack.push(current);
                
                adjacencyList[current].forEach(neighbor => {
                    // First time we reach this neighbor
                    if (distances[neighbor] < 0) {
                        queue.push(neighbor);
                        distances[neighbor] = distances[current] + 1;
                    }
                    // If we found another shortest path
                    if (distances[neighbor] === distances[current] + 1) {
                        predecessors[neighbor].push(current);
                    }
                });
            }
            
            // Calculate dependencies
            const dependencies = {};
            nodeIds.forEach(nodeId => {
                dependencies[nodeId] = 0;
            });
            
            // Process nodes in reverse order of distance from source
            while (stack.length > 0) {
                const w = stack.pop();
                predecessors[w].forEach(v => {
                    dependencies[v] += (1 + dependencies[w]) / predecessors[w].length;
                });
                if (w !== source) {
                    centrality[w] += dependencies[w];
                }
            }
        });
        
        // Normalize by the number of pairs of vertices
        const n = nodeIds.length;
        const normalizationFactor = n > 2 ? 2 / ((n - 1) * (n - 2)) : 1;
        
        Object.keys(centrality).forEach(nodeId => {
            centrality[nodeId] *= normalizationFactor;
        });
        
        return centrality;
    }

    // Simplified Louvain algorithm for community detection
    detectCommunitiesLouvain(nodes, adjacencyList) {
        const nodeIds = nodes.map(n => n.id);
        const communities = {};
        
        // Initialize: each node in its own community
        nodeIds.forEach((nodeId, index) => {
            communities[nodeId] = index;
        });
        
        // Calculate total edge weight (all edges have weight 1)
        const totalEdgeWeight = Object.values(adjacencyList)
            .reduce((sum, neighbors) => sum + neighbors.length, 0) / 2;
        
        let improved = true;
        let iterations = 0;
        const maxIterations = 50; // Prevent infinite loops
        
        while (improved && iterations < maxIterations) {
            improved = false;
            iterations++;
            
            // For each node, try moving it to neighboring communities
            nodeIds.forEach(nodeId => {
                const currentCommunity = communities[nodeId];
                const neighbors = adjacencyList[nodeId];
                
                // Get neighboring communities
                const neighboringCommunities = new Set();
                neighbors.forEach(neighbor => {
                    neighboringCommunities.add(communities[neighbor]);
                });
                
                let bestCommunity = currentCommunity;
                let bestModularityGain = 0;
                
                // Try each neighboring community
                neighboringCommunities.forEach(community => {
                    if (community !== currentCommunity) {
                        const modularityGain = this.calculateModularityGain(
                            nodeId, currentCommunity, community, 
                            communities, adjacencyList, totalEdgeWeight
                        );
                        
                        if (modularityGain > bestModularityGain) {
                            bestModularityGain = modularityGain;
                            bestCommunity = community;
                        }
                    }
                });
                
                // Move node if beneficial
                if (bestCommunity !== currentCommunity && bestModularityGain > 0) {
                    communities[nodeId] = bestCommunity;
                    improved = true;
                }
            });
        }
        
        return communities;
    }

    // Calculate modularity gain for moving a node between communities
    calculateModularityGain(nodeId, fromCommunity, toCommunity, communities, adjacencyList, totalEdgeWeight) {
        const neighbors = adjacencyList[nodeId];
        const nodeDegree = neighbors.length;
        
        // Count connections to from and to communities
        let connectionsToFrom = 0;
        let connectionsToTo = 0;
        
        neighbors.forEach(neighbor => {
            if (communities[neighbor] === fromCommunity) {
                connectionsToFrom++;
            }
            if (communities[neighbor] === toCommunity) {
                connectionsToTo++;
            }
        });
        
        // Calculate degree sums for communities
        const fromCommunityDegree = this.getCommunityDegree(fromCommunity, communities, adjacencyList);
        const toCommunityDegree = this.getCommunityDegree(toCommunity, communities, adjacencyList);
        
        // Modularity gain calculation (simplified)
        const gain = (connectionsToTo - connectionsToFrom) / (2 * totalEdgeWeight) - 
                    (nodeDegree * (toCommunityDegree - fromCommunityDegree)) / (4 * totalEdgeWeight * totalEdgeWeight);
        
        return gain;
    }

    // Get total degree of all nodes in a community
    getCommunityDegree(community, communities, adjacencyList) {
        let totalDegree = 0;
        Object.keys(communities).forEach(nodeId => {
            if (communities[nodeId] === community) {
                totalDegree += adjacencyList[nodeId].length;
            }
        });
        return totalDegree;
    }

    // Analyze detected communities
    analyzeCommunities(communities, nodes) {
        // Group nodes by community
        const communityGroups = {};
        Object.entries(communities).forEach(([nodeId, community]) => {
            if (!communityGroups[community]) {
                communityGroups[community] = [];
            }
            communityGroups[community].push(nodeId);
        });
        
        // Calculate community statistics
        const communitySizes = Object.values(communityGroups).map(group => group.length);
        const numCommunities = communitySizes.length;
        const largestCommunitySize = Math.max(...communitySizes);
        
        // Calculate modularity (simplified)
        const modularity = this.calculateModularity(communities, nodes);
        
        // Format community information
        const communityList = Object.entries(communityGroups).map(([communityId, nodeIds]) => ({
            id: communityId,
            nodes: nodeIds,
            size: nodeIds.length,
            titles: nodeIds.map(nodeId => {
                const note = this.notes[nodeId];
                return note ? note.title : 'Unknown';
            })
        }));
        
        return {
            numCommunities,
            largestCommunitySize,
            modularity,
            communities: communityList,
            distribution: communitySizes
        };
    }

    // Calculate network modularity (simplified version)
    calculateModularity(communities, nodes) {
        // This is a simplified modularity calculation
        // In a full implementation, you'd want the proper Newman modularity formula
        const totalNodes = nodes.length;
        const uniqueCommunities = new Set(Object.values(communities));
        
        // Simple modularity approximation based on community structure
        if (uniqueCommunities.size === 1) return 0; // All nodes in one community
        if (uniqueCommunities.size === totalNodes) return 0; // Each node in its own community
        
        // Return a reasonable modularity score between 0 and 1
        // This is simplified - proper modularity requires edge weights and more complex calculation
        return Math.min(0.8, 0.3 + (uniqueCommunities.size / totalNodes) * 0.5);
    }

    // Helper method to properly escape CSV values
    escapeCsvValue(value) {
        if (typeof value !== 'string') return value;
        // Escape quotes by doubling them and handle line breaks
        return value.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
    }

    // Helper method to download CSV
    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
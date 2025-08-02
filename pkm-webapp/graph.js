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
}
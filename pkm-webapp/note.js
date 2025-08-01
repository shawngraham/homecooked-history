// Note class
class Note {
    constructor(title = 'Untitled', content = '') {
        this.id = this.generateId();
        this.title = title;
        this.content = content || this.generateDefaultContent(title);
        this.created = Date.now();
        this.modified = Date.now();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateDefaultContent(title) {
        const now = new Date().toISOString();
        return `---
title: ${title}
created: ${now}
tags: []
---

# ${title}

`;
    }

    parseMetadata() {
        const yamlMatch = this.content.match(/^---\n([\s\S]*?)\n---/);
        if (!yamlMatch) {
            return { title: this.title, tags: [], created: new Date(this.created).toISOString() };
        }

        const yamlContent = yamlMatch[1];
        const metadata = {};
        
        yamlContent.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                
                // Handle arrays (tags)
                if (value.startsWith('[') && value.endsWith(']')) {
                    value = value.slice(1, -1).split(',').map(item => item.trim().replace(/['"]/g, ''));
                } else {
                    // Remove quotes if present
                    value = value.replace(/^['"]|['"]$/g, '');
                }
                
                metadata[key] = value;
            }
        });

        return {
            title: metadata.title || this.title,
            tags: Array.isArray(metadata.tags) ? metadata.tags : [],
            created: metadata.created || new Date(this.created).toISOString(),
            ...metadata
        };
    }

    
    update(content, save = false) {
        this.content = content;
        if (save) {
            this.modified = Date.now();
        }
        
        // Parse metadata and update title
        const metadata = this.parseMetadata();
        this.title = metadata.title || 'Untitled';
    }

    getContentWithoutMetadata() {
        return this.content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    }

    getPreview() {
        return this.getContentWithoutMetadata()
            .replace(/^#+\s*/gm, '') // Remove markdown headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/\[\[(.*?)\]\]/g, '$1') // Remove wiki links
            .replace(/\^([a-zA-Z0-9-]+)/g, '') // Remove block IDs
            .substring(0, 100);
    }

    /**
     * Finds the content of a specific block within the note.
     * A block is a line (paragraph, list item, etc.) ending with ^block-id
     * @param {string} blockId - The ID of the block to find.
     * @returns {string|null} The content of the block, or null if not found.
     */
    getBlockContent(blockId) {
        const content = this.getContentWithoutMetadata();
        const lines = content.split('\n');
        
        const blockRegex = new RegExp(`\\^${blockId}$`);
        
        const line = lines.find(l => blockRegex.test(l.trim()));
        
        if (line) {
            // Remove the block ID from the end of the line
            return line.replace(blockRegex, '').trim();
        }
        
        return null;
    }

    getOutgoingLinks() {
        const links = [];
        const linkRegex = /\[\[([^\]]+)\]\]/g;
        let match;
        
        while ((match = linkRegex.exec(this.content)) !== null) {
            links.push(match[1].trim());
        }
        
        return [...new Set(links)]; // Remove duplicates
    }
}
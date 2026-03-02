const resourceConfigs = [
    { file: 'data/general.txt',   color: 'cat-start',     header: 'Finding General Building and Landlord Info' },
    { file: 'data/gov_search.txt',     color: 'cat-legal',     header: 'Gov and Court Search' },
    { file: 'data/map_search.txt', color: 'cat-geo',   header: 'Map Searching' },
    { file: 'data/person.txt', color: 'cat-person', header: 'Person Search, Number Search, Google Search' },
    { file: 'data/groups.txt', color: 'cat-grocom',   header: 'Groups/Communities' },
        { file: 'data/legal_reporting.txt', color: 'cat-report',   header: 'Legal Resources and Reporting' },
    { file: 'data/data_extras.txt', color: 'cat-data',    header: 'Data Search and Extras' }
];

function parseSpecialText(text) {
    if (!text) return '';
    return text
        .replace(/\[\[(.*?)\|(.*?)]]/g, '<span class="$1">$2</span>')
        .replace(/\[\[(.*?)]]/g, '<span class="gay-rainbow">$1</span>');
}

function parsePlaintextFile(text) {
    const lines = text.split(/\r?\n/);
    const root = [];
    const stack = [{ items: root, indent: -1 }];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const indentMatch = line.match(/^(\t*)/);
        const indent = indentMatch ? indentMatch[0].length : 0;
        const cleanLine = line.trim();

        const nextLine = (lines[i + 1] || "").trim();
        const thirdLine = (lines[i + 2] || "").trim();

        let newItem = null;

        // If next line is a URL, it's a link
        if (nextLine.toLowerCase().startsWith("http")) {
            newItem = {
                title: cleanLine,
                url: nextLine,
                subtitle: thirdLine
            };
            i += 2; 
        } else {
            // Otherwise, it's a folder
            newItem = {
                groupTitle: cleanLine,
                items: []
            };
        }

        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        stack[stack.length - 1].items.push(newItem);

        if (newItem.items) {
            stack.push({ items: newItem.items, indent: indent });
        }
    }
    return root;
}

/**
 * UPDATED RENDERER: Matches your CSS classes exactly
 */
function renderItem(item, folderColor, isNested = false) {
    if (item.groupTitle) {
        const childrenHtml = item.items ? item.items.map(child => renderItem(child, folderColor, true)).join('') : '';
        return `
            <details class="nested-details ${folderColor}">
                <summary class="nested-summary ${folderColor}">
                    ${parseSpecialText(item.groupTitle)}
                </summary>
                <div class="nested-box">
                    ${childrenHtml}
                </div>
            </details>`;
    }

    const title = parseSpecialText(item.title);
    const subtitle = parseSpecialText(item.subtitle);
    
    // If it's inside a folder, use the 'sub-link' class from your CSS
    // Otherwise, use 'resource-item'
    const itemClass = isNested ? 'sub-link' : `resource-item ${folderColor}`;
    
    return `
        <a href="${item.url}" target="_blank" class="${itemClass}">
            <strong>${title}</strong><br>
            <span class="link-text ${folderColor}">${subtitle}</span>
        </a>`;
}

async function initTenantTools() {
    const container = document.getElementById('resource-menu-content');
    if (!container) return;

    let masterHtml = '';

    for (const config of resourceConfigs) {
        try {
            const response = await fetch(config.file);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const rawText = await response.text();
            const data = parsePlaintextFile(rawText);

            // Create the Main Category Dropdown
            // We use 'resource-group' and 'resource-header' from your CSS
            masterHtml += `
                <details class="resource-group">
                    <summary class="resource-header ${config.color}">
                        ${config.header}
                    </summary>
                    <div class="dropdown-content">
                        ${data.map(item => renderItem(item, config.color)).join('')}
                    </div>
                </details>`;
            
        } catch (error) {
            console.error(`Could not load ${config.file}:`, error);
            masterHtml += `<p style="color:red;">Error loading ${config.header}</p>`;
        }
    }

    container.innerHTML = masterHtml;
}

document.addEventListener('DOMContentLoaded', initTenantTools);
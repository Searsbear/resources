// 1. GLOBAL STATE & DICTIONARY
window.currentLang = 'en';

const translations = {
    'en': {
        'main-title': 'TENANT RESOURCES',
        'qr-header': 'QR CODE',
        'bitchat-title': 'BITCHAT',
        'bitchat-desc': 'For proximity text chat using bluetooth with no login, no phone number, no email, no data collection, and end to end encryption. Great for tenants in a building to communicate with each other without giving their info to a third party app.',
        'loading': 'Loading resources...'
    },
    'fr': {
        'main-title': 'RESSOURCES LOCATAIRES',
        'qr-header': 'CODE QR',
        'bitchat-title': 'BITCHAT',
        'bitchat-desc': 'Pour un chat de texte de proximité utilisant le bluetooth sans connexion, sans numéro de téléphone, sans email, sans collecte de données et avec chiffrement de bout en bout. Idéal pour les locataires d\'un immeuble pour communiquer entre eux sans donner leurs informations à une application tierce.',
        'loading': 'Chargement des ressources...'
    }
};

// 2. CONFIGURATIONS
const getResourceConfigs = (lang) => [
    { file: `data/${lang}/general.txt`,   color: 'cat-start',     header: lang === 'fr' ? 'Recherche Infos Bâtiment' : 'Finding General Building and Landlord Info' },
    { file: `data/${lang}/gov_search.txt`,     color: 'cat-legal',     header: lang === 'fr' ? 'Recherche Gouvernementale' : 'Gov and Court Search' },
    { file: `data/${lang}/map_search.txt`, color: 'cat-geo',   header: lang === 'fr' ? 'Recherche Cartographique' : 'Map Searching' },
    { file: `data/${lang}/person.txt`, color: 'cat-person', header: lang === 'fr' ? 'Recherche de Personne' : 'Person Search, Number Search, Google Search' },
    { file: `data/${lang}/groups.txt`, color: 'cat-grocom',   header: lang === 'fr' ? 'Groupes / Communautés' : 'Groups/Communities' },
    { file: `data/${lang}/legal_reporting.txt`, color: 'cat-report',   header: lang === 'fr' ? 'Ressources Juridiques' : 'Legal Resources and Reporting' },
    { file: `data/${lang}/data_extras.txt`, color: 'cat-data',    header: lang === 'fr' ? 'Données et Extras' : 'Data Search and Extras' }
];

// 3. HELPERS
function updateStaticText(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
}

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

        if (nextLine.toLowerCase().startsWith("http")) {
            newItem = { title: cleanLine, url: nextLine, subtitle: thirdLine };
            i += 2; 
        } else {
            newItem = { groupTitle: cleanLine, items: [] };
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

function renderItem(item, folderColor, isNested = false) {
    if (item.groupTitle) {
        const childrenHtml = item.items ? item.items.map(child => renderItem(child, folderColor, true)).join('') : '';
        return `
            <details class="nested-details">
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
    const itemClass = isNested ? 'sub-link' : `resource-item ${folderColor}`;
    
    return `
        <a href="${item.url}" target="_blank" class="${itemClass}">
            <strong>${title}</strong><br>
            <span class="link-text ${folderColor}">${subtitle}</span>
        </a>`;
}

// 4. MAIN LOADER
async function initTenantTools() {
    const container = document.getElementById('resource-menu-content');
    if (!container) return;

    let masterHtml = '';
    const configs = getResourceConfigs(window.currentLang); 

    for (const config of configs) {
        try {
            const response = await fetch(config.file);
            if (!response.ok) throw new Error();
            const rawText = await response.text();
            const data = parsePlaintextFile(rawText);

            masterHtml += `
                <details class="resource-group">
                    <summary class="resource-header ${config.color}">${config.header}</summary>
                    <div class="dropdown-content">
                        ${data.map(item => renderItem(item, config.color)).join('')}
                    </div>
                </details>`;
        } catch (error) {
            console.error(`Missing file: ${config.file}`);
        }
    }
    container.innerHTML = masterHtml;
}

// 5. EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    updateStaticText(window.currentLang); // Run translation on load
    initTenantTools();

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.currentLang = btn.getAttribute('data-lang');
            
            updateStaticText(window.currentLang); // Update static HTML text
            initTenantTools(); // Update dynamic list
            
            if (typeof initContactTools === 'function') {
                initContactTools();
            }

            document.querySelectorAll('.lang-btn').forEach(b => b.style.borderColor = '#334155');
            btn.style.borderColor = '#6366f1';
        });
    });
});

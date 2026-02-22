let groups = JSON.parse(localStorage.getItem('groups_db')) || {};
let currentGroupId = null;

// Инициализация дат
const headerRow = document.getElementById('header-row');
if (headerRow) {
    for (let i = 0; i < 10; i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        const th = document.createElement('th');
        th.textContent = d.toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'});
        headerRow.appendChild(th);
    }
}

// Рендер
function render() {
    const gScreen = document.getElementById('group-screen');
    const aScreen = document.getElementById('attendance-screen');
    
    if (currentGroupId === null) {
        gScreen.classList.add('active');
        aScreen.classList.remove('active');
        aScreen.classList.add('hidden');
        gScreen.classList.remove('hidden');
        
        const list = document.getElementById('group-list');
        list.innerHTML = '';
        Object.keys(groups).forEach(id => {
            const wrap = document.createElement('div');
            wrap.className = 'group-card-wrapper';
            wrap.innerHTML = `
                <div class="group-card" data-id="${id}">${id}</div>
                <button class="btn-del" data-del-group="${id}">×</button>
            `;
            list.appendChild(wrap);
        });
    } else {
        gScreen.classList.remove('active');
        gScreen.classList.add('hidden');
        aScreen.classList.remove('hidden');
        aScreen.classList.add('active');
        
        document.getElementById('current-group-title').textContent = currentGroupId;
        const body = document.getElementById('table-body');
        body.innerHTML = '';
        (groups[currentGroupId] || []).forEach((row, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="sticky-col">
                    <button class="btn-del-row" data-del-row="${idx}">×</button>
                    <span contenteditable="true" class="edit-name" data-idx="${idx}">${row.name}</span>
                </td>
                ${row.data.map((val, dIdx) => `
                    <td class="cell-${val}">
                        <select class="status-select" data-row="${idx}" data-day="${dIdx}">
                            <option value="" ${val===''?'selected':''}>-</option>
                            <option value="Б" ${val==='Б'?'selected':''}>Б</option>
                            <option value="О" ${val==='О'?'selected':''}>О</option>
                            <option value="Н" ${val==='Н'?'selected':''}>Н</option>
                        </select>
                    </td>
                `).join('')}
            `;
            body.appendChild(tr);
        });
    }
}

// Обработка кликов
document.addEventListener('click', (e) => {
    const t = e.target;

    // Группы
    if (t.classList.contains('group-card')) { currentGroupId = t.dataset.id; render(); }
    if (t.dataset.delGroup) {
        if (confirm(`Удалить группу ${t.dataset.delGroup}?`)) {
            delete groups[t.dataset.delGroup]; save(); render();
        }
    }
    
    // Строки таблицы
    if (t.dataset.delRow !== undefined) {
        if (confirm("Удалить запись?")) {
            groups[currentGroupId].splice(t.dataset.delRow, 1); save(); render();
        }
    }

    // Кнопки док-бара и навигации
    if (t.id === 'btn-main-add') {
        if (currentGroupId === null) {
            const name = prompt("Название группы:");
            if (name && !groups[name]) { groups[name] = []; save(); render(); }
        } else {
            groups[currentGroupId].push({ name: "ФИО", data: Array(10).fill("") });
            save(); render();
        }
    }
    if (t.id === 'btn-back') { currentGroupId = null; render(); }

    // Кнопка настроек
    if (t.id === 'btn-open-settings') {
        document.getElementById('settings-modal').classList.remove('hidden');
    }
    if (t.id === 'btn-close-settings' || t.id === 'settings-modal') {
        document.getElementById('settings-modal').classList.add('hidden');
    }
    if (t.id === 'btn-theme-toggle') {
        const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
});

// Сохранение изменений в таблице
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('status-select')) {
        const el = e.target;
        groups[currentGroupId][el.dataset.row].data[el.dataset.day] = el.value;
        save(); render();
    }
});

document.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('edit-name')) {
        groups[currentGroupId][e.target.dataset.idx].name = e.target.textContent;
        save();
    }
});

function save() { localStorage.setItem('groups_db', JSON.stringify(groups)); }

document.addEventListener('DOMContentLoaded', () => {
    document.body.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
    render();
});

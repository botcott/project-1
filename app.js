let groups = JSON.parse(localStorage.getItem('attendance_archive_v1')) || {};
let currentGroupId = null;
let currentMonthKey = new Date().toISOString().slice(0, 7); // Формат "2026-02"

// 1. Инициализация выбора месяца (текущий + полгода назад)
function initMonthPicker() {
    const select = document.getElementById('month-select');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 0; i > -12; i--) { // Можно смотреть архив за год
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        const val = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        const opt = new Option(label, val);
        if (val === currentMonthKey) opt.selected = true;
        select.add(opt);
    }
}

// 2. Отрисовка дат месяца
function renderTableHeaders() {
    const headerRow = document.getElementById('header-row');
    headerRow.innerHTML = '<th class="sticky-col">ФИО</th>';
    
    const [year, month] = currentMonthKey.split('-').map(Number);
    const daysCount = new Date(year, month, 0).getDate();
    const today = new Date();
    const isThisMonth = today.toISOString().slice(0, 7) === currentMonthKey;

    for (let i = 1; i <= daysCount; i++) {
        const th = document.createElement('th');
        th.textContent = i < 10 ? '0' + i : i;
        if (isThisMonth && i === today.getDate()) th.className = 'today-mark';
        headerRow.appendChild(th);
    }
}

// 3. Основной рендер
function render() {
    const gScreen = document.getElementById('group-screen');
    const aScreen = document.getElementById('attendance-screen');

    if (currentGroupId === null) {
        gScreen.classList.add('active');
        aScreen.classList.remove('active');
        aScreen.classList.add('hidden');
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
        aScreen.classList.remove('hidden');
        aScreen.classList.add('active');
        document.getElementById('current-group-title').textContent = currentGroupId;
        
        initMonthPicker();
        renderTableHeaders();

        const body = document.getElementById('table-body');
        body.innerHTML = '';

        if (!groups[currentGroupId][currentMonthKey]) groups[currentGroupId][currentMonthKey] = [];
        
        const monthData = groups[currentGroupId][currentMonthKey];
        const [year, month] = currentMonthKey.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        monthData.forEach((row, idx) => {
            const tr = document.createElement('tr');
            let cells = '';
            for (let d = 0; d < daysInMonth; d++) {
                const val = row.data[d] || "";
                cells += `<td class="cell-${val}">
                    <select class="status-select" data-row="${idx}" data-day="${d}">
                        <option value="" ${val===''?'selected':''}>-</option>
                        <option value="Б" ${val==='Б'?'selected':''}>Б</option>
                        <option value="О" ${val==='О'?'selected':''}>О</option>
                        <option value="Н" ${val==='Н'?'selected':''}>Н</option>
                    </select></td>`;
            }

            // Создаем ячейку ФИО с поддержкой placeholder
            const tdName = document.createElement('td');
            tdName.className = 'sticky-col';
            tdName.innerHTML = `<button class="btn-del-row" data-del-row="${idx}">×</button>`;
            
            const span = document.createElement('span');
            span.contentEditable = true;
            span.className = 'edit-name';
            span.setAttribute('data-idx', idx);
            span.setAttribute('data-placeholder', 'Введите ФИО...'); // Placeholder
            span.textContent = row.name;
            
            tdName.appendChild(span);
            tr.appendChild(tdName);
            tr.innerHTML += cells;
            body.appendChild(tr);
        });
    }
}

// 4. Обработка кликов
document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.classList.contains('group-card')) { currentGroupId = t.dataset.id; render(); }
    if (t.dataset.delGroup) {
        if (confirm("Удалить группу и ВСЮ историю?")) { delete groups[t.dataset.delGroup]; save(); render(); }
    }
    if (t.dataset.delRow !== undefined) {
        if (confirm("Удалить запись за этот месяц?")) {
            groups[currentGroupId][currentMonthKey].splice(t.dataset.delRow, 1);
            save(); render();
        }
    }
    if (t.id === 'btn-main-add') {
        if (currentGroupId === null) {
            const name = prompt("Название группы:");
            if (name && !groups[name]) { groups[name] = {}; save(); render(); }
        } else {
            const [y, m] = currentMonthKey.split('-').map(Number);
            const days = new Date(y, m, 0).getDate();
            groups[currentGroupId][currentMonthKey].push({ name: "", data: Array(days).fill("") });
            save(); render();
        }
    }
    if (t.id === 'btn-back') { currentGroupId = null; render(); }
    if (t.id === 'btn-open-settings') document.getElementById('settings-modal').classList.remove('hidden');
    if (t.id === 'btn-close-settings' || t.id === 'settings-modal') document.getElementById('settings-modal').classList.add('hidden');
    
    if (t.id === 'btn-theme-toggle') {
        const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
});

// 5. Изменения селектов и месяца
document.addEventListener('change', (e) => {
    if (e.target.id === 'month-select') {
        currentMonthKey = e.target.value;
        render();
    }
    if (e.target.classList.contains('status-select')) {
        const s = e.target;
        groups[currentGroupId][currentMonthKey][s.dataset.row].data[s.dataset.day] = s.value;
        save();
        s.parentElement.className = s.value ? `cell-${s.value}` : '';
    }
});

document.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('edit-name')) {
        groups[currentGroupId][currentMonthKey][e.target.dataset.idx].name = e.target.textContent;
        save();
    }
});

function save() { localStorage.setItem('attendance_archive_v1', JSON.stringify(groups)); }

document.addEventListener('DOMContentLoaded', () => {
    document.body.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
    render();
});

// --- ЛОГИКА ЭКСПОРТА И ИМПОРТА ---

document.getElementById('btn-export').onclick = () => {
    const dataStr = JSON.stringify(groups, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `academ_backup_${currentMonthKey}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

document.getElementById('btn-import').onclick = () => {
    document.getElementById('import-file').click();
};

document.getElementById('import-file').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (typeof importedData === 'object' && !Array.isArray(importedData)) {
                if (confirm("Это заменит все текущие данные. Продолжить?")) {
                    groups = importedData;
                    save();
                    location.reload();
                }
            } else { alert("Ошибка: Неверный формат файла."); }
        } catch (err) { alert("Ошибка при чтении файла: " + err.message); }
    };
    reader.readAsText(file);
};

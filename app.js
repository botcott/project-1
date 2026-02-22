let groups = JSON.parse(localStorage.getItem('attendance_archive_v1')) || {};
let currentGroupId = null;
let currentMonthKey = new Date().toISOString().slice(0, 7);

function initMonthPicker() {
    const select = document.getElementById('month-select');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 0; i > -12; i--) {
        const d = new Date(); d.setMonth(d.getMonth() + i);
        const val = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        const opt = new Option(label, val);
        if (val === currentMonthKey) opt.selected = true;
        select.add(opt);
    }
}

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

function render() {
    const gScreen = document.getElementById('group-screen');
    const aScreen = document.getElementById('attendance-screen');

    if (currentGroupId === null) {
        gScreen.classList.add('active'); aScreen.classList.remove('active'); aScreen.classList.add('hidden');
        const list = document.getElementById('group-list');
        list.innerHTML = '';
        Object.keys(groups).forEach(id => {
            const wrap = document.createElement('div');
            wrap.className = 'group-card-wrapper';
            wrap.innerHTML = `<div class="group-card" data-id="${id}">${id}</div><button class="btn-del" data-del-group="${id}">×</button>`;
            list.appendChild(wrap);
        });
    } else {
        gScreen.classList.remove('active'); aScreen.classList.remove('hidden'); aScreen.classList.add('active');
        document.getElementById('current-group-title').textContent = currentGroupId;
        initMonthPicker(); renderTableHeaders();

        if (!groups[currentGroupId][currentMonthKey]) {
            const monthKeys = Object.keys(groups[currentGroupId]).sort();
            const lastMonthKey = monthKeys[monthKeys.length - 1];
            const prevMonthData = lastMonthKey ? groups[currentGroupId][lastMonthKey] : [];
            const [y, m] = currentMonthKey.split('-').map(Number);
            const days = new Date(y, m, 0).getDate();
            groups[currentGroupId][currentMonthKey] = prevMonthData.map(row => ({ name: row.name, data: Array(days).fill("") }));
            save();
        }

        const body = document.getElementById('table-body'); body.innerHTML = '';
        groups[currentGroupId][currentMonthKey].forEach((row, idx) => {
            const tr = document.createElement('tr');
            let cells = row.data.map((valObj, d) => {
                const val = typeof valObj === 'object' ? valObj.status : valObj;
                const solved = typeof valObj === 'object' ? valObj.solved : false;
                return `<td class="cell-${val}">
                    ${val === 'О' ? `<div class="duty-status-mark ${solved ? 'mark-solved' : 'mark-unsolved'}" data-row="${idx}" data-day="${d}">${solved ? '✓' : '×'}</div>` : ''}
                    <select class="status-select" data-row="${idx}" data-day="${d}">
                        <option value="" ${val===''?'selected':''}>-</option>
                        <option value="Б" ${val==='Б'?'selected':''}>Б</option>
                        <option value="О" ${val==='О'?'selected':''}>О</option>
                        <option value="Н" ${val==='Н'?'selected':''}>Н</option>
                    </select></td>`;
            }).join('');
            tr.innerHTML = `<td class="sticky-col"><button class="btn-del-row" data-del-row="${idx}">×</button><span contenteditable="true" class="edit-name" data-idx="${idx}" data-placeholder="Введите ФИО...">${row.name}</span></td>${cells}`;
            body.appendChild(tr);
        });
    }
}

function updateDuty() {
    const qty = parseInt(document.getElementById('duty-qty').value) || 2;
    let priority = []; // Список должников (неотработанные "О")
    let others = [];   // Все остальные студенты текущего месяца

    const currentMonthData = groups[currentGroupId][currentMonthKey] || [];
    const studentNames = currentMonthData.map(s => s.name).filter(name => name.trim() !== "");

    // Проходим по всем месяцам этой группы
    Object.keys(groups[currentGroupId]).forEach(monthKey => {
        groups[currentGroupId][monthKey].forEach(student => {
            const name = student.name;
            // Проверяем каждое поле данных в истории
            student.data.forEach(cell => {
                if (typeof cell === 'object' && cell.status === 'О' && !cell.solved) {
                    // Если нашли долг, добавляем имя в приоритет (если его там еще нет)
                    if (!priority.includes(name) && studentNames.includes(name)) {
                        priority.push(name);
                    }
                }
            });
        });
    });

    studentNames.forEach(name => {
        if (!priority.includes(name)) others.push(name);
    });

    const dayOfMonth = new Date().getDate();
    const rotation = dayOfMonth % (others.length || 1);
    const sortedOthers = [...others.slice(rotation), ...others.slice(0, rotation)];

    const finalDuty = [...priority, ...sortedOthers].slice(0, qty);

    document.getElementById('duty-list-display').innerHTML = finalDuty.length > 0 
        ? finalDuty.map(n => `<div class="duty-name">${n}</div>`).join('')
        : "Пусто";
}


document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.classList.contains('group-card')) { currentGroupId = t.dataset.id; render(); }
    if (t.dataset.delGroup) { if (confirm("Удалить?")) { delete groups[t.dataset.delGroup]; save(); render(); } }
    if (t.dataset.delRow !== undefined) { if (confirm("Удалить строку?")) { groups[currentGroupId][currentMonthKey].splice(t.dataset.delRow, 1); save(); render(); } }
    
    // Переключатель отработки
    if (t.classList.contains('duty-status-mark')) {
        const r = t.dataset.row, d = t.dataset.day;
        const current = groups[currentGroupId][currentMonthKey][r].data[d];
        if (typeof current === 'object') current.solved = !current.solved;
        save(); render();
    }

    if (t.id === 'btn-main-add') {
        if (!currentGroupId) {
            const n = prompt("Группа:"); if (n && !groups[n]) { groups[n] = {}; save(); render(); }
        } else {
            const [y, m] = currentMonthKey.split('-').map(Number);
            groups[currentGroupId][currentMonthKey].push({ name: "", data: Array(new Date(y, m, 0).getDate()).fill("") });
            save(); render();
        }
    }
    if (t.id === 'btn-back') { currentGroupId = null; render(); }
    if (t.id === 'btn-open-settings') document.getElementById('settings-modal').classList.remove('hidden');
    if (t.id === 'btn-close-settings' || t.id === 'settings-modal') document.getElementById('settings-modal').classList.add('hidden');
    if (t.id === 'btn-duty-open') { if(currentGroupId) { updateDuty(); document.getElementById('duty-modal').classList.remove('hidden'); } }
    if (t.id === 'btn-close-duty' || t.id === 'duty-modal') document.getElementById('duty-modal').classList.add('hidden');
    if (t.id === 'btn-refresh-duty') updateDuty();
    if (t.id === 'btn-theme-toggle') {
        const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', theme); localStorage.setItem('theme', theme);
    }
});

document.addEventListener('change', (e) => {
    if (e.target.id === 'month-select') { currentMonthKey = e.target.value; render(); }
    if (e.target.classList.contains('status-select')) {
        const s = e.target;
        const val = s.value;
        groups[currentGroupId][currentMonthKey][s.dataset.row].data[s.dataset.day] = (val === 'О') ? { status: 'О', solved: false } : val;
        save(); render();
    }
});

document.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('edit-name')) {
        groups[currentGroupId][currentMonthKey][e.target.dataset.idx].name = e.target.textContent; save();
    }
});

document.getElementById('btn-export').onclick = () => {
    const blob = new Blob([JSON.stringify(groups, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `academ_backup.json`; a.click();
};

document.getElementById('btn-import').onclick = () => document.getElementById('import-file').click();
document.getElementById('import-file').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        try { groups = JSON.parse(ev.target.result); save(); location.reload(); } catch(err) { alert("Ошибка файла"); }
    };
    reader.readAsText(e.target.files[0]);
};

function save() { localStorage.setItem('attendance_archive_v1', JSON.stringify(groups)); }
document.addEventListener('DOMContentLoaded', () => {
    document.body.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
    render();
});

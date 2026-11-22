// assets/js/admin-codes.js
// Trang admin: tạo / sửa / đổi mã / bật-tắt / xóa code. Dữ liệu lưu ở bảng Supabase "secret_codes".

document.addEventListener('DOMContentLoaded', () => {
    const sb = window.supabaseClient;

    const $ = (id) => document.getElementById(id);
    const codeInput = $('codeValue');
    const titleInput = $('codeTitle');
    const activeInput = $('codeActive');
    const editor = $('blocksEditor');
    const formMsg = $('formMsg');
    const listEl = $('codeList');
    const btnSave = $('btnSave');
    const btnCancel = $('btnCancel');

    let blocks = [];        // [{type:'text', value} | {type:'image', url, name} | {type:'file', url, name}]
    let editingId = null;   // null = đang tạo mới
    let codes = [];

    function sanitizeFilename(name) {
        return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                   .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                   .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
    }
    function setMsg(text, type) {
        formMsg.textContent = text;
        formMsg.className = 'message' + (type ? ' ' + type : '');
    }
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    // ---------------- 1. KIỂM TRA QUYỀN ADMIN ----------------
    async function checkAdmin() {
        if (!sb) return false;
        const { data: { user } } = await sb.auth.getUser();
        if (!user) {
            alert('Vui lòng đăng nhập tài khoản Admin!');
            window.location.href = 'login.html';
            return false;
        }
        const { data: profile, error } = await sb.from('profiles').select('role').eq('id', user.id).single();
        const role = profile && profile.role ? profile.role.trim().toLowerCase() : '';
        if (error || role !== 'admin') {
            alert('Truy cập bị từ chối! Bạn không phải là Admin.');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    // ---------------- 2. TRÌNH SOẠN KHỐI NỘI DUNG ----------------
    function renderEditor() {
        editor.innerHTML = '';
        if (blocks.length === 0) {
            editor.innerHTML = '<p style="color:#9ca3af; font-size:0.9rem;">Chưa có nội dung. Bấm các nút phía trên để thêm.</p>';
            return;
        }
        blocks.forEach((b, i) => {
            const box = document.createElement('div');
            box.className = 'sc-edit-block';

            const label = b.type === 'text' ? 'Văn bản' : b.type === 'image' ? 'Ảnh' : 'Tệp đính kèm';
            const top = document.createElement('div');
            top.className = 'sc-edit-top';
            top.innerHTML = `<span><b>#${i + 1}</b> ${label}</span>
                <span class="sc-acts">
                    <button type="button" class="sc-small" data-act="up" ${i === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="sc-small" data-act="down" ${i === blocks.length - 1 ? 'disabled' : ''}>↓</button>
                    <button type="button" class="sc-small danger" data-act="del">Xóa</button>
                </span>`;
            top.querySelector('[data-act="up"]').onclick = () => { [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; renderEditor(); };
            top.querySelector('[data-act="down"]').onclick = () => { [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]]; renderEditor(); };
            top.querySelector('[data-act="del"]').onclick = () => { blocks.splice(i, 1); renderEditor(); };
            box.appendChild(top);

            if (b.type === 'text') {
                const ta = document.createElement('textarea');
                ta.value = b.value || '';
                ta.placeholder = 'Nhập đoạn văn bản...';
                ta.addEventListener('input', () => { b.value = ta.value; });
                box.appendChild(ta);
            } else if (b.type === 'image') {
                box.insertAdjacentHTML('beforeend', `<div style="font-size:0.85rem; word-break:break-all;">${esc(b.name)}</div><img src="${esc(b.url)}" alt="">`);
            } else {
                box.insertAdjacentHTML('beforeend', `<div style="font-size:0.9rem; word-break:break-all;"><i class="fas fa-file"></i> ${esc(b.name)}</div>`);
            }
            editor.appendChild(box);
        });
    }

    $('btnAddText').onclick = () => { blocks.push({ type: 'text', value: '' }); renderEditor(); };
    $('btnAddImage').onclick = () => $('pickImage').click();
    $('btnAddFile').onclick = () => $('pickFile').click();

    async function uploadAndAdd(file, type) {
        if (!file) return;
        setMsg('Đang upload "' + file.name + '"...', '');
        const bucket = type === 'image' ? 'images' : 'files';
        const path = `secret_${Date.now()}_${sanitizeFilename(file.name)}`;
        const { error } = await sb.storage.from(bucket).upload(path, file);
        if (error) { setMsg('Lỗi upload: ' + error.message, 'error'); return; }
        const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(path);
        blocks.push({ type, url: publicUrl, name: file.name });
        setMsg('', '');
        renderEditor();
    }
    $('pickImage').addEventListener('change', async function () { await uploadAndAdd(this.files[0], 'image'); this.value = ''; });
    $('pickFile').addEventListener('change', async function () { await uploadAndAdd(this.files[0], 'file'); this.value = ''; });

    // ---------------- 3. TẠO MÃ NGẪU NHIÊN ----------------
    $('btnRandom').onclick = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const arr = new Uint32Array(10);
        crypto.getRandomValues(arr);
        codeInput.value = Array.from(arr, (n) => chars[n % chars.length]).join('');
    };

    // ---------------- 4. LƯU (TẠO MỚI / CẬP NHẬT) ----------------
    function resetForm() {
        editingId = null;
        codeInput.value = '';
        titleInput.value = '';
        activeInput.checked = true;
        blocks = [];
        $('formTitle').innerHTML = '<i class="fas fa-key"></i> Tạo code mới';
        btnSave.textContent = 'Lưu code';
        btnCancel.style.display = 'none';
        renderEditor();
    }
    btnCancel.onclick = () => { resetForm(); setMsg('', ''); };

    btnSave.onclick = async () => {
        const code = codeInput.value.trim();
        if (code.length < 4) { setMsg('Mã code phải có ít nhất 4 ký tự.', 'error'); return; }
        if (/\s/.test(code)) { setMsg('Mã code không được chứa khoảng trắng.', 'error'); return; }
        if (blocks.length === 0) { setMsg('Hãy thêm ít nhất 1 nội dung (văn bản, ảnh hoặc tệp).', 'error'); return; }

        btnSave.disabled = true;
        setMsg('Đang lưu...', '');

        const payload = {
            code,
            title: titleInput.value.trim(),
            blocks,
            is_active: activeInput.checked,
            updated_at: new Date().toISOString()
        };

        const { error } = editingId
            ? await sb.from('secret_codes').update(payload).eq('id', editingId)
            : await sb.from('secret_codes').insert(payload);

        btnSave.disabled = false;
        if (error) {
            setMsg(error.code === '23505' ? 'Mã này đã tồn tại, hãy chọn mã khác.' : 'Lỗi: ' + error.message, 'error');
            return;
        }
        setMsg(editingId ? 'Đã cập nhật code!' : 'Đã tạo code mới!', 'success');
        resetForm();
        loadCodes();
    };

    // ---------------- 5. DANH SÁCH ----------------
    async function loadCodes() {
        const { data, error } = await sb.from('secret_codes').select('*').order('created_at', { ascending: false });
        if (error) {
            listEl.innerHTML = `<p style="color:#EF4444;">Lỗi tải danh sách: ${esc(error.message)}<br>Bạn đã chạy file supabase_secret_codes.sql chưa?</p>`;
            return;
        }
        codes = data || [];
        if (codes.length === 0) { listEl.innerHTML = '<p style="color:#9ca3af;">Chưa có code nào.</p>'; return; }

        listEl.innerHTML = '';
        codes.forEach((c) => {
            const row = document.createElement('div');
            row.className = 'sc-list-item' + (c.is_active ? '' : ' sc-off');
            const n = Array.isArray(c.blocks) ? c.blocks.length : 0;
            row.innerHTML = `
                <div>
                    <span class="sc-code-tag">${esc(c.code)}</span>
                    <div style="font-size:0.9rem; margin-top:6px;">${esc(c.title) || '<i>(Không tiêu đề)</i>'}
                        <span style="color:#9ca3af;"> · ${n} mục · ${c.is_active ? 'Đang bật' : 'Đã tắt'}</span></div>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button type="button" class="sc-small" data-a="copy">Copy mã</button>
                    <button type="button" class="sc-small" data-a="toggle">${c.is_active ? 'Tắt' : 'Bật'}</button>
                    <button type="button" class="sc-small" data-a="edit">Sửa / Đổi mã</button>
                    <button type="button" class="sc-small danger" data-a="del">Xóa</button>
                </div>`;

            row.querySelector('[data-a="copy"]').onclick = async (e) => {
                try { await navigator.clipboard.writeText(c.code); e.target.textContent = 'Đã copy'; setTimeout(() => (e.target.textContent = 'Copy mã'), 1200); } catch (_) {}
            };
            row.querySelector('[data-a="toggle"]').onclick = async () => {
                const { error: er } = await sb.from('secret_codes').update({ is_active: !c.is_active, updated_at: new Date().toISOString() }).eq('id', c.id);
                if (er) alert('Lỗi: ' + er.message); else loadCodes();
            };
            row.querySelector('[data-a="edit"]').onclick = () => {
                editingId = c.id;
                codeInput.value = c.code;
                titleInput.value = c.title || '';
                activeInput.checked = !!c.is_active;
                blocks = JSON.parse(JSON.stringify(c.blocks || []));
                $('formTitle').innerHTML = '<i class="fas fa-pen"></i> Sửa code';
                btnSave.textContent = 'Cập nhật code';
                btnCancel.style.display = 'inline-block';
                setMsg('', '');
                renderEditor();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            row.querySelector('[data-a="del"]').onclick = async () => {
                if (!confirm('Xóa code "' + c.code + '"? Hành động này không thể hoàn tác.')) return;
                const { error: er } = await sb.from('secret_codes').delete().eq('id', c.id);
                if (er) alert('Lỗi: ' + er.message);
                else { if (editingId === c.id) resetForm(); loadCodes(); }
            };
            listEl.appendChild(row);
        });
    }

    // ---------------- KHỞI ĐỘNG ----------------
    renderEditor();
    checkAdmin().then((ok) => { if (ok) loadCodes(); });
});
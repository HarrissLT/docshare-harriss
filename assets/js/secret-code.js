// assets/js/secret-code.js
// Nút "Nhập code" cạnh "Kho tài liệu" + popup hiển thị thông tin mật theo mã.
// File này được auth.js tự nạp trên mọi trang có thanh menu.

(function () {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks || document.getElementById('scNavItem')) return;

    // ---------- 1. NÚT TRÊN MENU (chèn ngay sau "Kho tài liệu") ----------
    const libLink = navLinks.querySelector('a[href="library.html"]');
    const li = document.createElement('li');
    li.id = 'scNavItem';
    li.innerHTML = '<a href="#" class="sc-nav-btn"><i class="fas fa-key" style="margin-right: 8px;"></i> Nhập code</a>';
    if (libLink && libLink.closest('li')) libLink.closest('li').after(li);
    else navLinks.appendChild(li);

    // ---------- 2. POPUP ----------
    const overlay = document.createElement('div');
    overlay.className = 'sc-overlay';
    overlay.innerHTML = `
        <div class="sc-box">
            <div class="sc-head">
                <h3><i class="fas fa-key"></i> Nhập code đặc quyền</h3>
                <button type="button" class="sc-close" aria-label="Đóng"><i class="fas fa-times"></i></button>
            </div>
            <div class="sc-body">
                <div class="sc-row">
                    <input type="text" id="scInput" placeholder="Nhập code..." autocomplete="off" maxlength="64">
                    <button type="button" class="btn btn-primary" id="scSubmit">Mở</button>
                </div>
                <div class="sc-msg" id="scMsg"></div>
                <div class="sc-result" id="scResult"></div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#scInput');
    const msg = overlay.querySelector('#scMsg');
    const result = overlay.querySelector('#scResult');
    const submitBtn = overlay.querySelector('#scSubmit');

    function openModal() {
        overlay.classList.add('active');
        input.value = '';
        msg.textContent = '';
        result.innerHTML = '';
        setTimeout(() => input.focus(), 150);
    }
    function closeModal() { overlay.classList.remove('active'); }

    li.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        // đóng menu mobile nếu đang mở
        navLinks.classList.remove('active');
        const mo = document.getElementById('menuOverlay');
        if (mo) mo.classList.remove('active');
        openModal();
    });
    overlay.querySelector('.sc-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    submitBtn.addEventListener('click', submit);

    // ---------- 3. COPY ----------
    async function copyText(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (_) {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        const old = btn.innerHTML;
        btn.classList.add('done');
        btn.innerHTML = '<i class="fas fa-check"></i> Đã copy';
        setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = old; }, 1500);
    }

    // ---------- 4. HIỂN THỊ NỘI DUNG ----------
    function renderBlocks(title, blocks) {
        result.innerHTML = '';
        if (title) {
            const h = document.createElement('div');
            h.className = 'sc-result-title';
            h.textContent = title;
            result.appendChild(h);
        }
        (blocks || []).forEach((b) => {
            const box = document.createElement('div');
            box.className = 'sc-block';

            if (b.type === 'text') {
                const t = document.createElement('div');
                t.className = 'sc-text';
                t.textContent = b.value || '';
                const c = document.createElement('button');
                c.type = 'button';
                c.className = 'sc-copy';
                c.innerHTML = '<i class="far fa-copy"></i> Copy';
                c.addEventListener('click', () => copyText(b.value || '', c));
                box.append(t, c);
            } else if (b.type === 'image') {
                const img = document.createElement('img');
                img.src = b.url;
                img.alt = b.name || 'Ảnh';
                img.loading = 'lazy';
                box.appendChild(img);
            } else if (b.type === 'file') {
                const a = document.createElement('a');
                a.className = 'sc-file';
                a.href = b.url;
                a.target = '_blank';
                a.rel = 'noopener';
                a.innerHTML = '<i class="fas fa-file-download"></i>';
                const span = document.createElement('span');
                span.textContent = b.name || 'Tải tệp đính kèm';
                a.appendChild(span);
                box.appendChild(a);
            } else {
                return;
            }
            result.appendChild(box);
        });
    }

    // ---------- 5. TRA CỨU MÃ ----------
    async function submit() {
        const code = input.value.trim();
        msg.className = 'sc-msg';
        result.innerHTML = '';
        if (!code) { msg.textContent = 'Vui lòng nhập code.'; msg.classList.add('error'); return; }
        if (!window.supabaseClient) { msg.textContent = 'Chưa kết nối được máy chủ.'; msg.classList.add('error'); return; }

        submitBtn.disabled = true;
        msg.textContent = 'Đang kiểm tra...';

        const { data, error } = await window.supabaseClient.rpc('get_secret_by_code', { p_code: code });

        submitBtn.disabled = false;
        if (error) {
            console.error(error);
            msg.textContent = 'Có lỗi xảy ra, vui lòng thử lại.';
            msg.classList.add('error');
            return;
        }
        if (!data || data.length === 0) {
            msg.textContent = 'Code không đúng hoặc đã hết hiệu lực.';
            msg.classList.add('error');
            return;
        }
        msg.textContent = '';
        renderBlocks(data[0].title, data[0].blocks);
    }
})();
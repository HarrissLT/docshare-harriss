// assets/js/library.js
// PHIÊN BẢN: TÌM KIẾM + LỌC GIÁ + LỌC MÔN HỌC

document.addEventListener('DOMContentLoaded', () => {
    const libraryList = document.getElementById('libraryList');
    const searchInput = document.getElementById('searchInput');
    const subjectSelect = document.getElementById('subjectSelect'); // <--- MỚI
    const searchBtn = document.getElementById('searchBtn');
    const resultTitle = document.getElementById('resultTitle');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Biến lưu trạng thái hiện tại
    let currentFilter = 'all'; // all, free, paid
    let currentKeyword = '';
    let currentSubject = ''; // <--- MỚI

    // 1. Hàm định dạng tiền
    const formatPrice = (price) => {
        if (price === 0) return '<span class="tag free">Miễn phí</span>';
        return `<span class="tag premium">${new Intl.NumberFormat('vi-VN').format(price)}đ</span>`;
    };

    // 2. Hàm tải tài liệu (Kết hợp 3 bộ lọc)
    async function loadDocuments() {
        if (libraryList) {
            libraryList.innerHTML = '<p style="text-align: center; grid-column: 1/-1;"><i class="fas fa-spinner fa-spin"></i> Đang tìm kiếm...</p>';
        }

        // Tạo Query cơ bản
        let query = window.supabaseClient
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false });

        // A. Lọc theo Từ khóa
        if (currentKeyword.trim() !== "") {
            query = query.ilike('title', `%${currentKeyword}%`);
        }

        // B. Lọc theo Giá (Free/Paid)
        if (currentFilter === 'free') {
            query = query.eq('price', 0);
        } else if (currentFilter === 'paid') {
            query = query.gt('price', 0);
        }

        // C. Lọc theo Môn học (MỚI)
        if (currentSubject !== "") {
            query = query.eq('category', currentSubject);
        }

        // Gọi dữ liệu
        const { data: documents, error } = await query;

        if (error) {
            console.error("Lỗi:", error);
            libraryList.innerHTML = `<p style="color: red; text-align: center;">Lỗi tải dữ liệu: ${error.message}</p>`;
            return;
        }

        if (!documents || documents.length === 0) {
            libraryList.innerHTML = `
                <div style="text-align:center; grid-column: 1/-1; padding: 50px;">
                    <i class="fas fa-search" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i>
                    <p style="color: #666;">Không tìm thấy tài liệu nào phù hợp.</p>
                    <button onclick="resetFilters()" class="btn btn-outline" style="margin-top:15px">Xóa bộ lọc</button>
                </div>`;
            return;
        }

        // Render HTML
        libraryList.innerHTML = '';
        documents.forEach(doc => {
            const thumb = doc.thumbnail_url || 'https://placehold.co/300x200?text=No+Image';
            
            const card = document.createElement('div');
            card.className = 'doc-card';
            card.innerHTML = `
                <div class="card-thumb">
                    ${formatPrice(doc.price)}
                    <img src="${thumb}" alt="${doc.title}" onerror="this.src='https://placehold.co/300x200?text=Error'">
                    <div class="overlay">
                        <a href="detail.html?id=${doc.id}" class="btn-icon" style="display:flex;align-items:center;justify-content:center;text-decoration:none">
                            <i class="fas fa-eye"></i>
                        </a>
                    </div>
                </div>
                <div class="card-body">
                    <div class="cat-date">
                        <span class="category">${doc.category || 'Tài liệu'}</span>
                        <span class="date">${new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <h3 class="doc-title">
                        <a href="detail.html?id=${doc.id}" style="color:inherit">${doc.title}</a>
                    </h3>
                    <div class="card-footer">
                        <div class="price">${doc.price === 0 ? 'Free' : new Intl.NumberFormat('vi-VN').format(doc.price) + 'đ'}</div>
                        <div class="downloads"><i class="fas fa-download"></i> ${doc.downloads || 0}</div>
                    </div>
                </div>
            `;
            libraryList.appendChild(card);
        });
    }

    // 3. Cập nhật tiêu đề kết quả
    function updateTitle() {
        let text = "Tài liệu";
        if (currentSubject) text += ` môn ${currentSubject}`;
        if (currentFilter === 'free') text += " (Miễn phí)";
        if (currentFilter === 'paid') text += " (Có phí)";
        if (currentKeyword) text += ` có chứa "${currentKeyword}"`;
        
        if (resultTitle) resultTitle.textContent = text === "Tài liệu" ? "Tất cả tài liệu" : "Kết quả lọc: " + text;
    }

    // --- CÁC SỰ KIỆN ---

    // Sự kiện Tìm kiếm
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentKeyword = searchInput.value;
            currentSubject = subjectSelect.value; // Lấy giá trị môn học
            updateTitle();
            loadDocuments();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchBtn.click();
        });
    }

    // Sự kiện thay đổi Môn học (Chọn xong tự tìm luôn)
    if (subjectSelect) {
        subjectSelect.addEventListener('change', () => {
            currentSubject = subjectSelect.value;
            updateTitle();
            loadDocuments();
        });
    }

    // Sự kiện Lọc Giá (Free/Paid)
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            updateTitle();
            loadDocuments();
        });
    });

    // Hàm reset bộ lọc (dùng trong HTML string)
    window.resetFilters = function() {
        searchInput.value = '';
        subjectSelect.value = '';
        currentKeyword = '';
        currentSubject = '';
        currentFilter = 'all';
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
        updateTitle();
        loadDocuments();
    };

    // Chạy lần đầu
    loadDocuments();
});